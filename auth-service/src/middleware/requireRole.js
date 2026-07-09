function requireRole(role) {
    return (req, res, next) => {
        // This middleware assumes requireAuth already ran first and set req.user —
        // ordering matters when we wire these into routes.
        if(!req.user || req.user.role !== role) {
            return res.status(403).json({
                message: "Insufficient permissions"
            });
        }
        next();
    }
}

// module.exports = requireRole;
module.exports = requireRole;