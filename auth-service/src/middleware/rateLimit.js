const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20 } = {}) =>
  (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    current.count += 1;
    next();
  };

module.exports = rateLimit;
