const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    getUnreadCount,
} = require('../controllers/notificationController');

// Protected routes - require authentication
router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markAsRead);
router.patch('/read-all', authenticate, markAllAsRead);
router.delete('/:id', authenticate, deleteNotification);
router.get('/unread-count', authenticate, getUnreadCount);

// Internal route - no auth required (called by other services)
router.post('/internal', createNotification);

module.exports = router;
