require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const notifyRoutes = require('./routes/notify');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/notify', notifyRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4003;

initDB().then(() => {
    app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
}).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
