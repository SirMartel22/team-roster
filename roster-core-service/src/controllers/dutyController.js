const prisma = require('../config/prismaClient');

const BHBC_CHURCH_ID = process.env.BHBC_CHURCH_ID;

// GET /duties — list all duties, optionally filtered by subunit
const getDuties = async(req, res) => {
    // Optional query param: /duties?subunitId=xxx
    // Lets the client ask "just show me duties for Videography" instead
    // of always getting every duty across every subunit.

    const { subunitId } = req.query;

    try {
        const duties = await prisma.duty.findMany({
            where: {
                churchId: BHBC_CHURCH_ID,
                  // Conditionally include subunitId in the filter only if it was
                // provided — if subunitId is undefined, Prisma just ignores
                // that key entirely and returns duties across all subunits.
                ...(subunitId ? {subunitId} : {}),
            },
            include: { subunit: true }, //join in the subunit name, not just its ID
            orderBy: { name: 'asc' },
        });

        res.status(200).json({ duties })
    } catch(error){
        console.error("Error fetching duties:", error);
        res.status(500).json({ message: 'Failed to fetch duties '})
    }
} 

// POST /duties — create a new duty under a subunit
// Expects: { subunitId, name }

const createDuty = async(req, res) => {
    const { subunitId, name } = req.body;

    if(!subunitId || !name ){
        return res.status(400).json({
            message: 'SubunitId and name are required'
        });
    }

    try{
        // Verify the subunit actually exists before creating a duty under it —
        // fails fast with a clear message rather than letting the foreign key
        // constraint produce a less obvious database-level error.

        const subunit = await prisma.subunit.findUnique({
            where: {
                id: subunitId
            },
        });

        if(!subunit || subunit.churchId !== BHBC_CHURCH_ID){
            return res.status(400).json({
                message: 'Subunit not found'
            });
        }

        const duty = await prisma.duty.create({
            data: {
                churchId: BHBC_CHURCH_ID,
                subunitId,
                name,
            },
        });

        res.status(201).json({
            message: 'Duty Created', duty
        });
    } catch(error){
        console.error("Error creating duty: ", error)
        res.status(500).json({
            message: 'Failed to create duty'
        });
    }
}


// DELETE /duties/:id — remove a duty
// Worth having for cleanup during testing/admin correction of mistakes.

const deleteDuty= async(req, res) => {
    const { id } = req.param;

    try{
        await prisma.duty.delete({ 
            where: { id }
        });
        res.status(200).json({
            message: 'Duty deleted successfully'
        })

    } catch(error){
        console.error("Error deleting duty", error);

        if(error.code === 'P2025') {
            // Prisma's "record to delete does not exist" error
            res.status(404).json({message: 'Duty not found'})
        }

        if(err.code === 'P2003'){
             // Foreign key violation — this duty is referenced by existing
            // Roster entries, so Postgres refuses to delete it (since our
            // schema didn't specify ON DELETE CASCADE for that relation).
            return res.status(409).json({
                message: 'Cannot delete this duty - it has existing roster assignment',
            });
        }

        res.status(500).json({
            message: 'Failed to delete duty'
        })
    }
}

module.exports = { getDuties, createDuty, deleteDuty };