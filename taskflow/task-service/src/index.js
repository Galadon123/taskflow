require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/tasks', taskRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4002;

connectDB().then(() => {
    app.listen(PORT, () => console.log(`Task service running on port ${PORT}`));
}).catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
});
