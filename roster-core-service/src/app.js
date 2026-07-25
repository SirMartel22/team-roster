const express = require('express');
const cors = require('cors');
const subunitRoutes = require('./routes/subunitRoutes');
const memberRoutes = require('./routes/memberRoutes')
const rosterRoutes = require('./routes/rosterRoutes')
const dutyRoutes = require('./routes/dutyRoutes')
const requireAuth = require('./middleware/authMiddleware')


const app = express();

// Middlewares
app.use(express.json());
app.use(cors());


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

module.exports = app;



