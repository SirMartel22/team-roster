const express = require('express');

const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(express.json());
app.use(cors());

app.get('/health', (req, res)=> {
    res.status({
        service: 'notification-service', status: 'ok', timestamp: new Date().toISOString()
    });
});


app.use('/', notificationRoutes);

module.exports = app;