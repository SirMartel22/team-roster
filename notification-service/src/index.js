const express = require ('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 4003   

// Middleware 
app.use(express.json());
app.use(cors());


app.get('health', (req, res) => {
    res.json({
        service: 'notification-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`Notification service is running on pot ${port}`)
})
