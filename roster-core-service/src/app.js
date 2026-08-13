const express = require('express');
const cors = require('cors');
const subunitRoutes = require('./routes/subunitRoutes');
const memberRoutes = require('./routes/memberRoutes')
const rosterRoutes = require('./routes/rosterRoutes')
const dutyRoutes = require('./routes/dutyRoutes')
const requireAuth = require('./middleware/authMiddleware')
const invitationRoutes = require('./routes/invitationRoutes');
const switchRequestRoutes = require('./routes/switchRequestRoutes');


const app = express();

// Middlewares
app.use(express.json({ limit: '100kb' }));
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((value) => value.trim()) : true }));


app.get('/health', (req, res) => {
    res.json({
        service: 'roster-core-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.use('/', subunitRoutes);
app.use('/', memberRoutes);
app.use('/', dutyRoutes) 
app.use('/', rosterRoutes)
app.use('/', invitationRoutes)
app.use('/', switchRequestRoutes)

module.exports = app;
