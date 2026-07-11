const prisma = require('../config/prismaClient')

// GET /subunits — list all subunits for BHBC (or eventually, per-church once
// multi-tenancy is actually in use beyond a single hardcoded church).

async function getSubunits(req, res) {
    try {

        const subunits = await prisma.subunit.findMany({

            //orderBy sorts the result - here, alphabetically by name
            orderBy: { name: 'asc'},
        });

        // return standard success status for a GET request
        res.status(200).json({ subunits });
    }
    catch(error){

        //Catch some unexpected failure that might be 
        //coming from maybe the database connection issue
        console.error('Error fetching subunits:', error);
        res.status(500).json({message: "Failed to fetch subunits"})
    }
} 

// POST /subunits — create a new subunit (e.g. "Videography", "Photography").
async function createSubunit(req, res) {
    const { name } = req.body;

    if(!name) {
        return res.status(400).json({message: "Subunit name is required"});
    }

    try {

        // prisma.subunit.create() -> INSERT INTO subunits (...) VALUES (...), roughly
        const subunit = await prisma.subunit.create({
            data: {
                churchId: process.env.BHBC_CHURCH_ID, //same hardcoded tenant pattern as auth-service
                name,
            },
        });

        // 201 = Created, same convention as auth-service's /register route.
        res.status(200).json({message: "Subunit Created Successfully", subunit});
    } catch(error) {
        console.error('Error creating subunit name:', error);
        if (error.code === 'P2002'){
            return res.status(409).json({message: "A subunit with this name already exists"})
        }
        res.status(500).json({message: "Failed to create subunit" })
    }
}

module.exports = { getSubunits, createSubunit }