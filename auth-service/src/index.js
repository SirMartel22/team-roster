const dotenv = require('dotenv')

dotenv.config()

const app = require('./app');

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => console.log(`auth-service is running on port ${PORT}`))