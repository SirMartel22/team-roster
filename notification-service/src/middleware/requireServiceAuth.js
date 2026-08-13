const crypto = require("crypto");

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const requireServiceAuth = (req, res, next) => {
  const configured = process.env.NOTIFICATION_SERVICE_KEY;
  if (!configured) return res.status(503).json({ message: "Service authentication is not configured" });
  if (!safeEqual(req.headers["x-service-key"], configured)) return res.status(401).json({ message: "Invalid service credentials" });
  next();
};

module.exports = requireServiceAuth;
