const express = require('express');
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Get notifications
router.get('/', authRequired, async (req, res) => {
    try {
        const notifs = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50).lean();
        res.json(notifs);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Unread count
router.get('/unread', authRequired, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ userId: req.userId, read: false });
        res.json({ count });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Mark one as read
router.post('/:id/read', authRequired, async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { read: true });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Mark all as read
router.post('/read-all', authRequired, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
