export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Forbidden: Access denied. Required role(s): [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=requireRole.js.map