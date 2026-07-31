//The actual logic: hashing, DB calls, responses

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); //For signing tokens
const supabase = require("../config/supabaseClient");

const BHBC_CHURCH_ID = process.env.BHBC_CHURCH_ID;
const JWT_SECRET = process.env.JWT_SECRET;

//Each controller function has the exact same signature express expects
// Register Function here
const register = async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!name || !password || !name) {
    return res.status(400).json({
      message: "Email, password, and name are required",
    });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from("users")
      .insert({
        church_id: BHBC_CHURCH_ID,
        email,
        password_hash: passwordHash,
        name,
        role: role || "member",
      })
      .select("id, email, name, role, created_at");

    if (error) {
      console.error("Supabase insert error:", error);
      if (error.code === "23505") {
        return res.status(409).json({
          message: "An account with this email already exists",
        });
      }
      return res.status(500).json({
        message: "Registration failed, Try again!",
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: data[0],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Login Function here

const login = async (req, res) => {
  // TEMPORARY DEBUG - remove after diagnosing
  console.log("Content-Type header:", req.headers["content-type"]);
  console.log("req.body:", req.body);
  console.log("typeof req.body:", typeof req.body);

  //get the email and password input values
  const { email, password } = req.body;

  // validate the correctness of the login values
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    // compare data coming from supabase

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("church_id", BHBC_CHURCH_ID)
      .single();

    if (error || !user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // json web token
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
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
      expiresIn: "30d",
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
  } catch (error) {
    console.error("Unexpected error during login", error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// POST /teams — creates a brand new team (church) AND its first admin
// user, in one flow. This is fundamentally different from /register,
// which joins an EXISTING team as a regular member.

const createTeam = async (req, res) => {
  const { teamName, name, email, password } = req.body;

  if (!teamName || !name || !email || !password) {
    return res.status(400).json({
      message: "teamName, name, email, and password are required",
    });
  }

  try {
    //Step 1: Create the new team (church) row
    const { data: newChurch, error: churchError } = await supabase
      .from("churches")
      .insert({ name: teamName })
      .select("id, name, created_at")
      .single();

    if (churchError) {
      console.error("Error creating team:", churchError);
      return res.status(500).json({
        message: "Failed to create team",
      });
    }
    // Step 2: Hash the password, same as regular registration.
    const passwordHash = await bcrypt.hash(password, 10);

    // Step 3: Create the user as an ADMIN for this brand new team —
    // this is the one place in the whole system where role: 'admin'
    // gets assigned automatically, since whoever creates a team is,
    // by definition, its first administrator.

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        church_id: newChurch.id,
        email,
        password_hash: passwordHash,
        name,
        role: "admin",
      })
      .select("id, email, name, role, church_id")
      .single();

    if (userError) {
      console.error("Error creating admin user:", userError);
      // Note: at this point the church row exists but the user creation
      // failed — a real production system would wrap both inserts in a
      // single database transaction so this couldn't happen. Supabase's
      // JS client doesn't expose multi-table transactions directly, so
      // for now we're accepting this as a known limitation, same as the
      // signup flow's two-step user+member creation we flagged earlier.
      if (userError.code === "23505") {
        return res.status(409).json({
          message: "An account with this email already exist",
        });
      }
      return res.status(409).json({
        message: "Team created, but admin account creation failed",
      });
    }

    // Step 4: Sign a token immediately — since this user just created
    // their team, auto-logging them in (rather than making them log in
    // separately right after) is a reasonable convenience here.
    const payload = {
        userId: newUser.id,
        churchId: newUser.church_id,
        role: newUser.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn: '30d'});

    res.status(201).json({
        message: 'Team created successfully',
        token,
        user: newUser,
        team: newChurch,
    });
  } catch (error) {
    console.error('Unexpected error creating team:', error);
    res.status(500).json({ message: 'Something went wrong'})
  }
};


// GET /churches — public list of all teams, used by the signup flow
// so a new member can pick which team they're joining.

const getChurches = async(req, res)=> {
    try{
        const { data: churches, error } = await supabase
        .from('churches')
        .select('id, name')
        .order('name', {ascending: true});

        if(error){
            console.error('Error fetching churches:', error);
            return res.status(500).json({
                message: 'Failed to fetch teams'
            });
        }
        res.status(200).json({churches});
    } catch(error){
        console.error("Unexpected error fetching churches", error);
        return res.status(500).json({
            message: 'Something went wrong'
        });
    }
}

// Export both functions so authRoute.js can import them and attach them to paths.
module.exports = { register, login, createTeam, getChurches };
