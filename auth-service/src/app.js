const express = require('express');
const cors = require('cors')
const authRoutes = require('./routes/authRoutes');
// const dotenv = require('dotenv');


// dotenv.config()
const app = express()

app.use(express.json({ limit: '100kb' }));
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((value) => value.trim()) : true }));

app.get('/health', (req, res) => {
    res.json({
        service: 'auth-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
})

app.use('/', authRoutes);


module.exports = app;
