import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsAPI } from "../api/axios";
import CreateProjectModal from "../components/CreateProjectModal";

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await projectsAPI.list();
            setProjects(response.data);
        } catch (err) {
            console.error("Failed to fetch projects:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (data) => {
        try {
            await projectsAPI.create(data);
            fetchProjects();
        } catch (err) {
            console.error("Failed to create project:", err);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            try {
                await projectsAPI.delete(projectId);
                fetchProjects();
            } catch (err) {
                console.error("Failed to delete project:", err);
            }
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">My Projects</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    Create Project
                </button>
            </div>

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateProject}
            />

            {projects.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">No projects yet. Create one to get started!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project._id}
                            className="card hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => navigate(`/projects/${project._id}`)}
                        >
                            <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                            <p className="text-gray-600 mb-4">{project.description}</p>
                            <div className="flex justify-between items-center">
                                <span className={`text-xs px-2 py-1 rounded ${project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {project.status}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProject(project._id);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
