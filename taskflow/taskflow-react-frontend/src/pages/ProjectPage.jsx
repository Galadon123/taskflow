import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tasksAPI } from "../api/axios";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";

export default function ProjectPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    const fetchTasks = async () => {
        try {
            const response = await tasksAPI.list(projectId);
            setTasks(response.data);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (data) => {
        try {
            await tasksAPI.create(projectId, data);
            fetchTasks();
        } catch (err) {
            console.error("Failed to create task:", err);
        }
    };

    const handleStatusChange = async (taskId, status) => {
        try {
            await tasksAPI.updateStatus(taskId, status);
            fetchTasks();
        } catch (err) {
            console.error("Failed to update task status:", err);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await tasksAPI.delete(taskId);
            fetchTasks();
        } catch (err) {
            console.error("Failed to delete task:", err);
        }
    };

    const handleAssignTask = async (taskId, userEmail) => {
        try {
            const response = await tasksAPI.assign(taskId, userEmail);
            const updatedTask = response.data;

            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task._id === taskId ? { ...task, ...updatedTask } : task
                )
            );

            fetchTasks();
            return updatedTask;
        } catch (err) {
            console.error("Failed to assign task:", err);
            throw err;
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                    ← Back to Projects
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    Create Task
                </button>
            </div>

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTask}
            />

            <div className="space-y-4">
                {tasks.length === 0 ? (
                    <div className="text-center py-12 card">
                        <p className="text-gray-600">No tasks yet. Create one to get started!</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <TaskCard
                            key={task._id}
                            task={task}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteTask}
                            onAssign={handleAssignTask}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
