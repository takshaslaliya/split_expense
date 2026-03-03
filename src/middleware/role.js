const { ROLES } = require('../config/constants');

/**
 * Middleware to check if the user has the required role
 * Usage: roleMiddleware(ROLES.ADMIN) or roleMiddleware(ROLES.ADMIN, ROLES.USER)
 */
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, message: 'Access denied. Not authenticated.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
            });
        }

        next();
    };
};

module.exports = roleMiddleware;
