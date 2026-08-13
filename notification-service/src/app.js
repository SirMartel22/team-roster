const express = require('express');

const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((value) => value.trim()) : false }));

app.get('/health', (req, res)=> {
    res.json({
        service: 'notification-service',
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});


app.use('/', notificationRoutes);

module.exports = app;
