
const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const port = process.env.PORT || 4003;

app.listen(port, () => {
    console.log(`Notification service is running on port ${port}`)
})
