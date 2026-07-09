//The actual logic: hashing, DB calls, responses

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); //For signing tokens
const supabase = require('../config/supabaseClient');

const BHBC_CHURCH_ID = process.env.BHBC_CHURCH_ID
const JWT_SECRET = process.env.JWT_SECRET;

//Each controller function has the exact same signature express expects
// Register Function here
async function register(req, res) {
    const { email, password, name, role } = req.body;

    if (!name || !password || !name ){
        return res.status(400).json({
            message: "Email, password, and name are required"
        });
    }

    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const { data, error } = await supabase
        .from('users')
        .insert({
            church_id: BHBC_CHURCH_ID,
            email,
            password_hash: passwordHash,
            name, 
            role: role || 'member',
        })
        .select('id, email, name, role, created_at');

        if(error) {
            console.error('Supabase insert error:', error);
            if(error.code === '23505') {
                return res.status(409)
                .json({
                    message: 'An account with this email already exists'
                });
            }
            return res.status(500)
            .json({
                message: 'Registration failed, Try again!'
            });
        }

        res.status(201)
        .json({
            message: "User registered successfully", user: data[0]
        });

    } catch(error) {
        console.error("Unexpected error:", error);
        res.status(500)
        .json({
            message: "Something went wrong"
        })
    }
}



// Login Function here

async function login(req, res) {
    //get the email and password input values
    const {email, password} = req.body

    // validate the correctness of the login values
    if(!email || !password) {
        return res.status(400)
        .json({
            message: 'Email and password are required'
        });
    }

    try{
        // compare data coming from supabase
        
        const { data: user, error} = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('church_id', BHBC_CHURCH_ID)
        .single();


        if(error || !user) {
            return res.status(401)
            .json({
                message: "Invalid email or password"
            })
        }

        // json web token
        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if(!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        //Sign in with JWT
        // The payload is the actual data we embedded in the token - kept minimal and non sensitive
        const payload = {
            userId: user.id,
            churchId: user.church_id,
            role: user.role,
        };

        // jwt.sign(payload, secret, options) -> produces the actual token string.
        // expiresIn: '2h' means the token becomes invalid 2 hours after issuance 

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: '2h'
        });


        res.status(200).json({
            message: "Login successful",
            token, // the client stores this and sends it back on future request
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                church_id: user.church_id,
            },
        });

    } catch(error){
        console.error("Unexpected error during login", error);
        res.status(500).json({
            message: "Something went wrong"
        });
    }
}

// Export both functions so authRoute.js can import them and attach them to paths.
module.exports = { register, login}