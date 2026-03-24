const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );
    return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
            [name, email, hashed]
        );

        const user = result.rows[0];
        const { accessToken, refreshToken } = generateTokens(user);

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
            [user.id, refreshToken]
        );

        res.status(201).json({ user, accessToken, refreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
            [user.id, refreshToken]
        );

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, accessToken, refreshToken });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, avatar, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateMe = async (req, res) => {
    try {
        const { name, avatar } = req.body;
        const result = await pool.query(
            'UPDATE users SET name = COALESCE($1, name), avatar = COALESCE($2, avatar), updated_at = NOW() WHERE id = $3 RETURNING id, name, email, avatar, role',
            [name, avatar, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }
        res.json({ message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
