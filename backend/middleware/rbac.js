function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Forbidden: Access restricted to ${allowedRoles.join(', ')} roles. Your role is ${req.user.role}.`
            });
        }
        next();
    };
}

module.exports = { authorize };
