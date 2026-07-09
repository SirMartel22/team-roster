const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 4003

//middlewrae
app.use(express.json());
app.use(cors());

app.get('/health', (req, res) => {
    res.json({
        service: 'roster-core-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`Roster core service is running on port ${port}`);
})
