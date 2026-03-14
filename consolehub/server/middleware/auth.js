const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authRequired(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token necesar.' });
    }
    try {
        const decoded = jwt.verify(header.slice(7), JWT_SECRET);
        req.userId = decoded.id;
        req.username = decoded.username;
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalid sau expirat.' });
    }
}

function signToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

module.exports = { authRequired, signToken, JWT_SECRET };
