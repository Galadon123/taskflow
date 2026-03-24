import React, { useState } from "react";

export default function CreateTaskModal({ isOpen, onClose, onCreate }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium",
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onCreate(formData);
        setFormData({ title: "", description: "", priority: "medium" });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <h2 className="text-2xl font-bold mb-4">Create Task</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="title"
                        placeholder="Task title"
                        value={formData.title}
                        onChange={handleChange}
                        className="input mb-4"
                        required
                    />
                    <textarea
                        name="description"
                        placeholder="Task description"
                        value={formData.description}
                        onChange={handleChange}
                        className="input mb-4 resize-none"
                        rows="3"
                    ></textarea>
                    <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="input mb-4"
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                    <div className="flex gap-2">
                        <button type="submit" className="btn-primary flex-1">
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
