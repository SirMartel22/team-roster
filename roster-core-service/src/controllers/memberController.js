const prisma = require("../config/prismaClient")

const BHBC_CHURCH_ID = process.env.BHBC_CHURCH_ID;


// GET /members - list of all members for BHBC
async function getMembers(req, res){

    try{

        const members = await prisma.member.findMany({
            where: { churchId: BHBC_CHURCH_ID },
            include: {
                subunit: true, // join members.subunit_id -> subunits.id
                user: true, // join members.user_id -> users.id
            },
            orderBy: { createdAt: 'desc'}
        });
        res.status(200).json({members})

    } catch(error){
        console.error("Error fetching members: ", errro);
        res.status(500).json({message: "Failed to fetch members"})
    }
}

// POST /members — create a new member profile
// Expects: { userId, subunitId, phone?, whatsapp? }


async function createMember(req, res){

    const { userId, subunitId, phone, whatsapp } = req.body;

    if(!userId || !subunitId){
        res.status(400).json({
            message: "UserID and SubunitId required"
        });
    }

    try{
        //Verify the subunit actually exists (and it belongs to this church)
        const subunit = await prisma.subunit.findUnique({
            where: {id: subunitId }
    });

    if(!subunit || subunit.churchId !== BHBC_CHURCH_ID) {
        return res.status(404).json({
            message: "Subunit not found"
        });
    }

    const member = await prisma.member.create({
        data: {
            churchId: BHBC_CHURCH_ID,
            userId,
            subunitId,
            phone: phone || null,
            whatsapp: whatsapp || null,
        },
        include: { subunit: true, user: true},
    });

    res.status(201).json({message: "Member created", member})

    } catch (error) {
        console.error("Error Creating member:", error);

        // Check for duplicate userId
        if(error.code === 'P2002'){
            res.status(409).json({
                message: "This user already has a member profile"
            });
        }

        // Check if likely the subunit or userID doesn't exist
        if(error.code === 'P2003'){
            res.status(400).json({message: "Referenced user or subunit does not exist"});
        }

        res.status(500).json({ message: "Failed to add member"})
      }
    }


// GET /members/:id — fetch a specific member with relations
async function getMemberById(req, res){
    const { id } = req.params;

    try{
        const member = await prisma.member.findUnique({
            where: { id },
            include: { subunit: true, user: true },
        });

        // Check if member doesn't exist

        if(!member) {
            return res.status(404).json({message: "Member not found"});
        }

        res.status(200).json({ member })

    } catch(error){
        console.error("Error fetching member", error);
        res.status(500).json({ message: 'Failed to fetch member' })
    }
}


// Update a member
async function updateMember(req, res){
    const { id } = req.params;
    const { phone, whatsapp, isActive } = req.body;

    try{
        const member = await prisma.member.update({
            where: { id },
            data: {
                phone: phone !== undefined ? phone : undefined,
                whatsapp: whatsapp !== undefined ? whatsapp : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
            include: { subunit: true, user: true }
        })
        
        res.status(200).json({message: "Member Updated", member});
    } catch (error){
        console.error('Failed to update member', error);

        if(error.code === "P2025"){
            //Record not found
            return res.status(404).json({ message: 'Member not found' })
        }
        res.status(500).json({ message: "Failed to update member"})
    }
}


//Later work on delete member


module.exports = { getMembers, createMember, getMemberById, updateMember}