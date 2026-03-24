import React, { useState } from "react";

export default function TaskCard({ task, onStatusChange, onDelete, onAssign }) {
    const [assignEmail, setAssignEmail] = useState("");
    const [showAssignInput, setShowAssignInput] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState("");

    const statusColors = {
        todo: "bg-gray-100 text-gray-800",
        in_progress: "bg-yellow-100 text-yellow-800",
        done: "bg-green-100 text-green-800",
    };

    const priorityColors = {
        low: "text-blue-600",
        medium: "text-yellow-600",
        high: "text-red-600",
    };

    const displayAssignee =
        task.assignee_id || task.assignedTo || task.assignee?.email || task.assignee?.name;

    const handleAssign = async () => {
        if (!assignEmail.trim()) return;

        setAssigning(true);
        setAssignError("");
        try {
            await onAssign(task._id, assignEmail.trim());
            setAssignEmail("");
            setShowAssignInput(false);
        } catch (err) {
            setAssignError("Assignment failed. Please try again.");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="card mb-4">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold flex-1">{task.title}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAssignInput(!showAssignInput)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                        Assign
                    </button>
                    <button
                        onClick={() => onDelete(task._id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
            <p className="text-gray-600 text-sm mb-3">{task.description}</p>

            {showAssignInput && (
                <div className="mb-3 flex gap-2">
                    <input
                        type="email"
                        placeholder="Email to assign"
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        className="input flex-1 text-sm py-1"
                    />
                    <button
                        onClick={handleAssign}
                        disabled={assigning}
                        className="btn-primary text-sm px-3 py-1"
                    >
                        {assigning ? "Assigning..." : "Assign"}
                    </button>
                </div>
            )}

            {assignError && (
                <p className="text-sm text-red-600 mb-2">{assignError}</p>
            )}

            {displayAssignee && (
                <p className="text-sm text-green-600 mb-2">Assigned to: {displayAssignee}</p>
            )}

            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs ${statusColors[task.status]}`}>
                        {task.status}
                    </span>
                    <span className={`text-xs font-semibold ${priorityColors[task.priority]}`}>
                        {task.priority}
                    </span>
                </div>
                <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task._id, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
            </div>
        </div>
    );
}
