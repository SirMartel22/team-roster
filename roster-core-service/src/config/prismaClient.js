// Centralizes the Prisma Client instance so every file that needs database
// access imports the SAME instance, rather than creating a new database
// connection every time a file needs one.
// const { PrismaClient } = require('../generated/prisma');

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');


const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);


const prisma = new PrismaClient({ adapter })
// const prisma = new PrismaClient({
//     datasourceUrl: process.env.DATABASE_URL,
// });

module.exports = prisma;