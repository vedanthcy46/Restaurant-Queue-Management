const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send({ message: 'Access denied' });

    jwt.verify(token, 'secret_key', (err, user) => {
        if (err) return res.status(403).send({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Only admin can access
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).send({ message: 'Admin access required' });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin };
