'use client';

import { redirect } from 'next/navigation';
import { useState, Suspense } from 'react';
import axios from 'axios';

function RegisterContent() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
                formData
            );

            // Set cookie via API route
            await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response.data),
            });

            redirect('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
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
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input mb-4"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input mb-4"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input mb-6"
                        required
                    />
                    <button type="submit" className="btn-primary w-full mb-4" disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                <p className="text-center">
                    Already have an account?{" "}
                    <a href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                        Login
                    </a>
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
