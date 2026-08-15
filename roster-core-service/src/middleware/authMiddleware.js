const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");

const createAuthMiddleware = ({
  jwtLib = jwt,
  prismaClient = prisma,
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
    const revoked = await prismaClient.revokedSession.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
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
