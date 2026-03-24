'use client';

import { useState } from 'react';

export default function CreateProjectModal({
    isOpen,
    onClose,
    onCreate,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(formData);
        setFormData({ name: '', description: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <h2 className="text-2xl font-bold mb-4">Create Project</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Project name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input mb-4"
                        required
                    />
                    <textarea
                        placeholder="Project description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input mb-4 resize-none"
                        rows={4}
                    ></textarea>
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
