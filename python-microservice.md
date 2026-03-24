# Python Microservice — TaskFlow

Build all three backend services using **Python + FastAPI**.

- **Auth Service** → PostgreSQL (via SQLAlchemy)
- **Task Service** → MongoDB (via Motor async driver)
- **Notification Service** → MySQL (via aiomysql)

---

## 1. Auth Service

### Setup

```bash
mkdir auth-service && cd auth-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy asyncpg passlib[bcrypt] python-jose[cryptography] python-dotenv pydantic[email]
pip freeze > requirements.txt
```

### File Structure

```
auth-service/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── dependencies.py
│   └── routers/
│       └── auth.py
├── .env
├── requirements.txt
└── Dockerfile
```

### `.env`

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/taskflow_auth
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15
REFRESH_TOKEN_EXPIRES_IN=10080
PORT=4001
```

### `app/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import text
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized")
```

### `app/models.py`

```python
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    role = Column(String(20), default="member")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), nullable=False)
    token = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### `app/schemas.py`

```python
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    avatar: Optional[str]
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    user: UserResponse
    accessToken: str
    refreshToken: str
```

### `app/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

SECRET = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

bearer_scheme = HTTPBearer()

def create_access_token(data: dict, expires_minutes: int = 15) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_minutes: int = 10080) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
```

### `app/routers/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os

from ..database import get_db
from ..models import User, RefreshToken
from ..schemas import RegisterRequest, LoginRequest, UpdateProfileRequest, UserResponse, TokenResponse
from ..dependencies import create_access_token, create_refresh_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password=pwd_context.hash(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"id": str(user.id), "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"id": str(user.id)})

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=7)
    ))
    await db.commit()

    return TokenResponse(user=user, accessToken=access_token, refreshToken=refresh_token)

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"id": str(user.id), "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"id": str(user.id)})

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=7)
    ))
    await db.commit()

    return TokenResponse(user=user, accessToken=access_token, refreshToken=refresh_token)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=UserResponse)
async def update_me(body: UpdateProfileRequest, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name:
        user.name = body.name
    if body.avatar:
        user.avatar = body.avatar
    user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)
    return user

@router.post("/logout")
async def logout(body: dict, db: AsyncSession = Depends(get_db)):
    refresh_token = body.get("refreshToken")
    if refresh_token:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
        token_obj = result.scalar_one_or_none()
        if token_obj:
            await db.delete(token_obj)
            await db.commit()
    return {"message": "Logged out"}
```

### `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .routers import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="TaskFlow Auth Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### `Dockerfile`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 4001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4001"]
```

---

## 2. Task Service

### Setup

```bash
mkdir task-service && cd task-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn motor python-dotenv httpx python-jose[cryptography] pydantic
pip freeze > requirements.txt
```

### File Structure

```
task-service/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── dependencies.py
│   ├── schemas.py
│   └── routers/
│       ├── projects.py
│       └── tasks.py
├── .env
├── requirements.txt
└── Dockerfile
```

### `app/database.py` — MongoDB with Motor

```python
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/taskflow_tasks")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()

projects_collection = db["projects"]
tasks_collection = db["tasks"]

async def init_indexes():
    await projects_collection.create_index("owner_id")
    await projects_collection.create_index("members")
    await tasks_collection.create_index("project_id")
    await tasks_collection.create_index("assignee_id")
    print("MongoDB indexes created")
```

### `app/schemas.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"

class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: TaskPriority = TaskPriority.medium
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None

class StatusUpdate(BaseModel):
    status: TaskStatus

class AssignTask(BaseModel):
    assignee_id: str
```

### `app/routers/projects.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from ..database import projects_collection
from ..schemas import ProjectCreate, ProjectUpdate
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/tasks/projects", tags=["projects"])

def serialize(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/")
async def list_projects(user=Depends(get_current_user)):
    cursor = projects_collection.find({
        "$or": [{"owner_id": user["id"]}, {"members": user["id"]}]
    }).sort("created_at", -1)
    return [serialize(p) async for p in cursor]

@router.post("/", status_code=201)
async def create_project(body: ProjectCreate, user=Depends(get_current_user)):
    doc = {
        "name": body.name,
        "description": body.description,
        "owner_id": user["id"],
        "members": [user["id"]],
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await projects_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@router.get("/{project_id}")
async def get_project(project_id: str, user=Depends(get_current_user)):
    doc = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize(doc)

@router.put("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    await projects_collection.update_one({"_id": ObjectId(project_id)}, {"$set": updates})
    doc = await projects_collection.find_one({"_id": ObjectId(project_id)})
    return serialize(doc)

@router.delete("/{project_id}")
async def delete_project(project_id: str, user=Depends(get_current_user)):
    await projects_collection.delete_one({"_id": ObjectId(project_id)})
    return {"message": "Project deleted"}
```

### `app/routers/tasks.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
import httpx, os
from ..database import tasks_collection
from ..schemas import TaskCreate, TaskUpdate, StatusUpdate, AssignTask
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
NOTIFY_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:4003")

async def notify(user_id, type_, title, message, data):
    async with httpx.AsyncClient() as client:
        try:
            await client.post(f"{NOTIFY_URL}/api/notify/internal",
                json={"user_id": user_id, "type": type_, "title": title, "message": message, "data": data})
        except Exception as e:
            print(f"Notification failed: {e}")

def serialize(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["project_id"] = str(doc["project_id"])
    return doc

@router.get("/projects/{project_id}/tasks")
async def list_tasks(project_id: str, user=Depends(get_current_user)):
    cursor = tasks_collection.find({"project_id": ObjectId(project_id)}).sort("created_at", -1)
    return [serialize(t) async for t in cursor]

@router.post("/projects/{project_id}/tasks", status_code=201)
async def create_task(project_id: str, body: TaskCreate, user=Depends(get_current_user)):
    doc = {
        "project_id": ObjectId(project_id),
        "title": body.title,
        "description": body.description,
        "status": "todo",
        "priority": body.priority,
        "assignee_id": None,
        "created_by": user["id"],
        "due_date": body.due_date,
        "tags": body.tags,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await tasks_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    doc["project_id"] = project_id
    return doc

@router.get("/{task_id}")
async def get_task(task_id: str, user=Depends(get_current_user)):
    doc = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize(doc)

@router.put("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    await tasks_collection.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
    doc = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    return serialize(doc)

@router.patch("/{task_id}/status")
async def update_status(task_id: str, body: StatusUpdate, user=Depends(get_current_user)):
    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": body.status, "updated_at": datetime.utcnow()}}
    )
    doc = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if body.status == "done" and doc.get("assignee_id"):
        await notify(doc["assignee_id"], "task_completed", "Task Completed",
                     f'"{doc["title"]}" marked as done', {"task_id": task_id})
    return serialize(doc)

@router.post("/{task_id}/assign")
async def assign_task(task_id: str, body: AssignTask, user=Depends(get_current_user)):
    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"assignee_id": body.assignee_id, "updated_at": datetime.utcnow()}}
    )
    doc = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    await notify(body.assignee_id, "task_assigned", "Task Assigned",
                 f'You have been assigned "{doc["title"]}"', {"task_id": task_id})
    return serialize(doc)

@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    await tasks_collection.delete_one({"_id": ObjectId(task_id)})
    return {"message": "Task deleted"}
```

### `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_indexes
from .routers import projects, tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    yield

app = FastAPI(title="TaskFlow Task Service", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(projects.router)
app.include_router(tasks.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## 3. Notification Service

### Setup

```bash
mkdir notification-service && cd notification-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn aiomysql sqlalchemy python-dotenv python-jose[cryptography]
pip freeze > requirements.txt
```

### `app/database.py` — MySQL with aiomysql

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Enum, JSON, Index
from sqlalchemy import text
from datetime import datetime
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+aiomysql://root:password@mysql:3306/taskflow_notify"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False)
    type = Column(Enum("task_assigned","task_updated","task_completed","project_invite"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_user_id", "user_id"),
        Index("idx_user_read", "user_id", "is_read"),
    )

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Notification DB initialized")
```

### `app/routers/notifications.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import Optional
from ..database import get_db, Notification
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/notify", tags=["notifications"])

@router.get("/")
async def get_notifications(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user["id"])
        .order_by(Notification.created_at.desc()).limit(50)
    )
    return result.scalars().all()

@router.patch("/{notification_id}/read")
async def mark_read(notification_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user["id"])
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Marked as read"}

@router.patch("/read-all")
async def mark_all_read(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification).where(Notification.user_id == user["id"]).values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user["id"])
    )
    await db.commit()
    return {"message": "Deleted"}

# Internal endpoint — called by task-service, no auth
@router.post("/internal", status_code=201)
async def create_notification(body: dict, db: AsyncSession = Depends(get_db)):
    notif = Notification(
        user_id=body["user_id"],
        type=body["type"],
        title=body["title"],
        message=body["message"],
        data=body.get("data", {}),
    )
    db.add(notif)
    await db.commit()
    return {"message": "Notification created"}
```

### `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .routers import notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="TaskFlow Notification Service", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(notifications.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### `Dockerfile` (same for all Python services, adjust port)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 4001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4001"]
```
