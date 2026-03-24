import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsAPI } from "../api/axios";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const response = await notificationsAPI.getUnreadCount();
            setUnreadCount(response.data.unread_count || 0);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await notificationsAPI.list();
            setNotifications(response.data || []);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    const handleToggleNotifications = async () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        if (nextOpen) {
            await fetchNotifications();
            await fetchUnreadCount();
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationsAPI.markAsRead(id);
            setNotifications((prev) =>
                prev.map((item) =>
                    item.id === id ? { ...item, is_read: 1 } : item
                )
            );
            fetchUnreadCount();
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all notifications as read:", err);
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchUnreadCount();
        const intervalId = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(intervalId);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <nav className="bg-primary-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">TaskFlow</h1>
                {user && (
                    <div className="flex items-center gap-6">
                        <span>Welcome, {user.name}!</span>
                        <div className="relative" ref={panelRef}>
                            <button
                                onClick={handleToggleNotifications}
                                className="relative px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                                aria-label="Open notifications"
                                title="Notifications"
                            >
                                <span className="text-xl" role="img" aria-hidden="true">\uD83D\uDD14</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-semibold">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {isOpen && (
                                <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white text-gray-900 rounded-lg shadow-xl z-50">
                                    <div className="flex justify-between items-center px-4 py-3 border-b">
                                        <h3 className="font-semibold">Notifications</h3>
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                className="text-sm text-primary-600 hover:text-primary-700"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    {notifications.length === 0 ? (
                                        <p className="px-4 py-6 text-sm text-gray-600">No notifications yet</p>
                                    ) : (
                                        notifications.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`px-4 py-3 border-b ${item.is_read ? "bg-white" : "bg-blue-50"}`}
                                            >
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm">{item.title}</p>
                                                        <p className="text-sm text-gray-600 break-words">{item.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(item.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    {!item.is_read && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(item.id)}
                                                            className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap"
                                                        >
                                                            Mark read
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
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
