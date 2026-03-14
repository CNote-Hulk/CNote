const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 24) {
            return res.status(400).json({ error: 'Username: 2-24 caractere.' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Parola: minim 6 caractere.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Adaugă o adresă de email validă.' });
        }
        const clean = username.trim();
        if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
            return res.status(400).json({ error: 'Username: doar litere, cifre, underscore.' });
        }
        const exists = await User.findOne({ username: { $regex: new RegExp(`^${clean}$`, 'i') } });
        if (exists) return res.status(409).json({ error: 'Username-ul este deja folosit.' });

        const hash = await bcrypt.hash(password, 12);
        const user = await User.create({ username: clean, password: hash, email: email.trim().toLowerCase() });
        const token = signToken(user);
        res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar, role: user.role, badges: user.badges } });
    } catch (err) {
        console.error('Register:', err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Completează toate câmpurile.' });

        const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });
        if (!user) return res.status(401).json({ error: 'Username sau parolă incorectă.' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Username sau parolă incorectă.' });

        const token = signToken(user);
        res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar, role: user.role, badges: user.badges } });
    } catch (err) {
        console.error('Login:', err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// Get current user
router.get('/me', require('../middleware/auth').authRequired, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
