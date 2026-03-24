const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignee_id: { type: String, default: null },
    created_by: { type: String, required: true },
    due_date: { type: Date, default: null },
    tags: [{ type: String }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Task', taskSchema);
