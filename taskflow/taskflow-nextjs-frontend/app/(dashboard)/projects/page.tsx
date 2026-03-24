'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import { Project } from '@/types';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/projects`,
                {
                    headers: {
                        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
                    },
                }
            );
            setProjects(response.data);
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (data: any) => {
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/projects`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            fetchProjects();
        } catch (err) {
            console.error('Failed to create project:', err);
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div
                        key={project._id}
                        className="card hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => router.push(`/projects/${project._id}`)}
                    >
                        <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                        <p className="text-gray-600">{project.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
