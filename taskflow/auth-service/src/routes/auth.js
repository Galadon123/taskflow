const router = require('express').Router();
const { register, login, getMe, updateMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.post('/logout', logout);

module.exports = router;
