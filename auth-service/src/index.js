const dotenv = require('dotenv')

dotenv.config()

const app = require('./app');

const PORT = process.env.PORT || PORT;

app.listen(PORT, () => console.log(`auth-service is running on port ${PORT}`))