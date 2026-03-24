const axios = require('axios');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/me`, {
            headers: { Authorization: authHeader },
        });
        req.user = response.data;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

module.exports = { authenticate };
