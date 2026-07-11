const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const port = process.env.PORT || 4002

app.listen(port, () => {
    console.log(`Roster core service is running on port ${port}`);
})
