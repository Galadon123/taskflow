import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import Navbar from "./components/Navbar";

function PrivateRoute({ children }) {
    const { token } = useAuth();
    return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
    const { token } = useAuth();
    return !token ? children : <Navigate to="/dashboard" replace />;
}

function AppLayout({ children }) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <PublicRoute>
                                <RegisterPage />
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute>
                                <AppLayout>
                                    <DashboardPage />
                                </AppLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/projects/:projectId"
                        element={
                            <PrivateRoute>
                                <AppLayout>
                                    <ProjectPage />
                                </AppLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
