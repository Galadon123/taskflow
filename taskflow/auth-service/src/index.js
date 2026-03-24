require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4001;

initDB().then(() => {
    app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
}).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
