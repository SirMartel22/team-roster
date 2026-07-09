const express = require('express');
const cors = require('cors')
const authRoutes = require('./routes/authRoutes');
// const dotenv = require('dotenv');


// dotenv.config()
const app = express()

app.use(express.json());
app.use(cors());

app.get('/health', (req, res) => {
    res.json({
        service: 'auth-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
})

app.use('/', authRoutes);


module.exports = app;
