const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;


// Express middleware signature: (req, res, next).
// `next` is a function you call to say "this request passed my check,
function requireAuth(req, res, next){
    // The client sends the token in the authorization
    //header, formatted as: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        //401 = "You didn't provide credentials" (distinct from the wrong credentials)
        return res.status(401).json({
            message: "No token provided"
        });
    }

    //Bearer abc123... -> Split on the space, take the second part...
    const token = authHeader.split(' ')[1];


    try{
        
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach the decoded identity onto the request object itself.
        req.user = decoded;

        //pass the control to the next thing in the chain...
        next();

    } catch(error){
        console.error("Unexpected error occured", error);
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = requireAuth;