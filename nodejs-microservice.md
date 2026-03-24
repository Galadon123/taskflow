# Node.js Microservice — TaskFlow

Build all three backend services using **Node.js + Express**.

- **Auth Service** → PostgreSQL
- **Task Service** → MongoDB
- **Notification Service** → MySQL

---

## 1. Auth Service

### Setup

```bash
mkdir auth-service && cd auth-service
npm init -y
npm install express pg bcryptjs jsonwebtoken dotenv cors helmet
npm install -D nodemon
```

### `package.json` scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

### File Structure

```
auth-service/
├── src/
│   ├── index.js
│   ├── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   └── auth.js
│   └── controllers/
│       └── authController.js
├── .env
└── Dockerfile
```

### `src/db.js` — PostgreSQL connection

```js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => console.log('Connected to PostgreSQL'));

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(500),
      role VARCHAR(20) DEFAULT 'member',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Database initialized');
};

module.exports = { pool, initDB };
```

### `src/middleware/auth.js` — JWT middleware

```js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };
```

### `src/controllers/authController.js`

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
      [name, email, hashed]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), avatar = COALESCE($2, avatar), updated_at = NOW() WHERE id = $3 RETURNING id, name, email, avatar, role',
      [name, avatar, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

### `src/routes/auth.js`

```js
const router = require('express').Router();
const { register, login, getMe, updateMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.post('/logout', logout);

module.exports = router;
```

### `src/index.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4001;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
});
```

### `Dockerfile`

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 4001
CMD ["node", "src/index.js"]
```

---

## 2. Task Service

### Setup

```bash
mkdir task-service && cd task-service
npm init -y
npm install express mongoose dotenv cors axios
npm install -D nodemon
```

### File Structure

```
task-service/
├── src/
│   ├── index.js
│   ├── db.js
│   ├── models/
│   │   ├── Project.js
│   │   └── Task.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   └── tasks.js
│   └── controllers/
│       ├── projectController.js
│       └── taskController.js
├── .env
└── Dockerfile
```

### `src/db.js` — MongoDB connection

```js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### `src/models/Project.js`

```js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner_id: { type: String, required: true },
  members: [{ type: String }],
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Project', projectSchema);
```

### `src/models/Task.js`

```js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  assignee_id: { type: String, default: null },
  created_by: { type: String, required: true },
  due_date: { type: Date, default: null },
  tags: [{ type: String }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Task', taskSchema);
```

### `src/middleware/auth.js` — Validate JWT with Auth Service

```js
const axios = require('axios');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/me`, {
      headers: { Authorization: authHeader },
    });
    req.user = response.data;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { authenticate };
```

### `src/controllers/projectController.js`

```js
const Project = require('../models/Project');

exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner_id: req.user.id }, { members: req.user.id }],
    }).sort({ created_at: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const project = await Project.create({
      name,
      description,
      owner_id: req.user.id,
      members: [req.user.id],
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

### `src/controllers/taskController.js`

```js
const Task = require('../models/Task');
const axios = require('axios');

const notifyUser = async (userId, type, title, message, data) => {
  try {
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notify/internal`, {
      user_id: userId, type, title, message, data,
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

exports.listTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ project_id: req.params.id }).sort({ created_at: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, due_date, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const task = await Task.create({
      project_id: req.params.id,
      title, description, priority, due_date, tags,
      created_by: req.user.id,
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.taskId, { status }, { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (status === 'done' && task.assignee_id) {
      await notifyUser(task.assignee_id, 'task_completed',
        'Task Completed', `"${task.title}" marked as done`, { task_id: task._id });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.assignTask = async (req, res) => {
  try {
    const { assignee_id } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.taskId, { assignee_id }, { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await notifyUser(assignee_id, 'task_assigned',
      'Task Assigned', `You have been assigned "${task.title}"`, { task_id: task._id });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

### `src/routes/tasks.js`

```js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  listProjects, createProject, getProject, updateProject, deleteProject,
} = require('../controllers/projectController');
const {
  listTasks, createTask, getTask, updateTask, updateStatus, assignTask, deleteTask,
} = require('../controllers/taskController');

router.use(authenticate);

// Projects
router.get('/projects', listProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProject);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

// Tasks
router.get('/projects/:id/tasks', listTasks);
router.post('/projects/:id/tasks', createTask);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);
router.patch('/:taskId/status', updateStatus);
router.post('/:taskId/assign', assignTask);

module.exports = router;
```

### `src/index.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/tasks', taskRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4002;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Task service running on port ${PORT}`));
});
```

---

## 3. Notification Service

### Setup

```bash
mkdir notification-service && cd notification-service
npm init -y
npm install express mysql2 dotenv cors
npm install -D nodemon
```

### File Structure

```
notification-service/
├── src/
│   ├── index.js
│   ├── db.js
│   ├── routes/
│   │   └── notifications.js
│   └── controllers/
│       └── notificationController.js
├── .env
└── Dockerfile
```

### `src/db.js` — MySQL connection

```js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'taskflow_notify',
  waitForConnections: true,
  connectionLimit: 10,
});

const initDB = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      type ENUM('task_assigned','task_updated','task_completed','project_invite') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSON,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_user_read (user_id, is_read)
    )
  `);
  console.log('Notification DB initialized');
};

module.exports = { pool, initDB };
```

### `src/controllers/notificationController.js`

```js
const { pool } = require('../db');

exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Internal endpoint — called by task-service (no auth required)
exports.createNotification = async (req, res) => {
  try {
    const { user_id, type, title, message, data } = req.body;
    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)',
      [user_id, type, title, message, JSON.stringify(data || {})]
    );
    res.status(201).json({ message: 'Notification created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

### `src/routes/notifications.js`

```js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const {
  getNotifications, markRead, markAllRead, deleteNotification, createNotification,
} = require('../controllers/notificationController');

// Simple inline JWT middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markRead);
router.patch('/read-all', authenticate, markAllRead);
router.delete('/:id', authenticate, deleteNotification);

// Internal — no auth, called by other services
router.post('/internal', createNotification);

module.exports = router;
```

### `src/index.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const notifyRoutes = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/notify', notifyRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4003;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
});
```

---

## Testing the APIs

### Register a user

```bash
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"secret123"}'
```

### Login

```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"secret123"}'
# Save the accessToken from the response
```

### Create a project

```bash
curl -X POST http://localhost:4002/api/tasks/projects \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Project","description":"Testing TaskFlow"}'
```

### Create a task

```bash
curl -X POST http://localhost:4002/api/tasks/projects/<projectId>/tasks \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Implement login","priority":"high","due_date":"2026-04-01"}'
```

### Update task status

```bash
curl -X PATCH http://localhost:4002/api/tasks/<taskId>/status \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

### Get notifications

```bash
curl http://localhost:4003/api/notify \
  -H "Authorization: Bearer <accessToken>"
```
