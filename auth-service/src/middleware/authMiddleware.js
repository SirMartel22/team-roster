const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabaseClient");

const createAuthMiddleware = ({
  jwtLib = jwt,
  supabaseClient = supabase,
  jwtSecret = process.env.JWT_SECRET,
  cryptoLib = crypto,
} = {}) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwtLib.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const tokenHash = cryptoLib.createHash("sha256").update(token).digest("hex");
    const { data: revoked, error } = await supabaseClient
      .from("revoked_sessions")
      .select("id")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) return res.status(503).json({ message: "Authentication service is temporarily unavailable" });
    if (revoked) return res.status(401).json({ message: "Session has been signed out" });

    req.user = decoded;
    req.authToken = token;
    next();
  } catch {
    return res.status(503).json({ message: "Authentication service is temporarily unavailable" });
  }
};

const requireAuth = createAuthMiddleware();

module.exports = requireAuth;
module.exports.createAuthMiddleware = createAuthMiddleware;
