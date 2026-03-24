'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <nav className="bg-primary-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">TaskFlow</h1>
                {user && (
                    <div className="flex items-center gap-6">
                        <span>Welcome, {user.name}!</span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
