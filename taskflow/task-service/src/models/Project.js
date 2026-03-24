const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner_id: { type: String, required: true },
    members: [{ type: String }],
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Project', projectSchema);
