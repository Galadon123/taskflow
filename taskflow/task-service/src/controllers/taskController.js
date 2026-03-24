const Task = require('../models/Task');
const axios = require('axios');

const notifyUser = async (userId, type, title, message, data) => {
    try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notify/internal`, {
            user_id: userId, type, title, message, data,
        });
    } catch (err) {
        console.error('Notification error:', err.message);
    }
};

exports.listTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ project_id: req.params.id }).sort({ created_at: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createTask = async (req, res) => {
    try {
        const { title, description, priority, due_date, tags } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const task = await Task.create({
            project_id: req.params.id,
            title, description, priority, due_date, tags,
            created_by: req.user.id,
        });
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.taskId, { status }, { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (status === 'done' && task.assignee_id) {
            await notifyUser(task.assignee_id, 'task_completed',
                'Task Completed', `"${task.title}" marked as done`, { task_id: task._id });
        }
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.assignTask = async (req, res) => {
    try {
        const { assignee_id } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.taskId, { assignee_id }, { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });

        await notifyUser(assignee_id, 'task_assigned',
            'Task Assigned', `You have been assigned "${task.title}"`, { task_id: task._id });

        res.json(task);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.taskId);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
