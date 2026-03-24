import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData.name, formData.email, formData.password);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
            <div className="card w-96 shadow-2xl">
                <h1 className="text-3xl font-bold mb-6 text-center">Create Account</h1>
                <form onSubmit={handleSubmit}>
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        className="input mb-4"
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input mb-4"
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="input mb-6"
                        required
                    />
                    <button type="submit" className="btn-primary w-full mb-4">
                        Register
                    </button>
                </form>
                <p className="text-center">
                    Already have an account?{" "}
                    <button
                        onClick={() => navigate("/login")}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                    >
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
}
