import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        localStorage.setItem("token", response.data.accessToken);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setToken(response.data.accessToken);
        setUser(response.data.user);
        return response.data;
    };

    const register = async (name, email, password) => {
        const response = await authAPI.register({ name, email, password });
        localStorage.setItem("token", response.data.accessToken);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setToken(response.data.accessToken);
        setUser(response.data.user);
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        if (token) {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
