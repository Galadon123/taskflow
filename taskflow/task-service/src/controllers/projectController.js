const Project = require('../models/Project');

exports.listProjects = async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [{ owner_id: req.user.id }, { members: req.user.id }],
        }).sort({ created_at: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Project name is required' });

        const project = await Project.create({
            name,
            description,
            owner_id: req.user.id,
            members: [req.user.id],
        });
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
