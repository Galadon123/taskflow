const { pool } = require('../db');

const getUserKeys = (req) => {
    // Some notifications are created with user UUID and some with email.
    // Support both to keep assignment notifications visible.
    const keys = [req.user.id];
    if (req.user.email) keys.push(req.user.email);
    return keys;
};

exports.getNotifications = async (req, res) => {
    try {
        const userKeys = getUserKeys(req);
        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE user_id IN (?, ?) ORDER BY created_at DESC LIMIT 50',
            [userKeys[0], userKeys[1] || userKeys[0]]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userKeys = getUserKeys(req);
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id IN (?, ?)',
            [id, userKeys[0], userKeys[1] || userKeys[0]]
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userKeys = getUserKeys(req);
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id IN (?, ?) AND is_read = FALSE',
            [userKeys[0], userKeys[1] || userKeys[0]]
        );
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userKeys = getUserKeys(req);
        await pool.query(
            'DELETE FROM notifications WHERE id = ? AND user_id IN (?, ?)',
            [id, userKeys[0], userKeys[1] || userKeys[0]]
        );
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Internal endpoint for other services to create notifications
exports.createNotification = async (req, res) => {
    try {
        const { user_id, type, title, message, data } = req.body;
        if (!user_id || !type || !title || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)',
            [user_id, type, title, message, JSON.stringify(data || {})]
        );
        res.status(201).json({ message: 'Notification created' });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userKeys = getUserKeys(req);
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id IN (?, ?) AND is_read = FALSE',
            [userKeys[0], userKeys[1] || userKeys[0]]
        );
        res.json({ unread_count: rows[0].count });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
