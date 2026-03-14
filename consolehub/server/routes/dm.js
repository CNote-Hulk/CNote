const express = require('express');
const mongoose = require('mongoose');
const DirectMessage = require('../models/DirectMessage');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Get conversation list (unique partners)
router.get('/conversations', authRequired, async (req, res) => {
    try {
        const uid = new mongoose.Types.ObjectId(req.userId);
        const convos = await DirectMessage.aggregate([
            { $match: { $or: [{ senderId: uid }, { receiverId: uid }] } },
            { $sort: { createdAt: -1 } },
            { $addFields: { partnerId: { $cond: [{ $eq: ['$senderId', uid] }, '$receiverId', '$senderId'] } } },
            { $group: { _id: '$partnerId', lastMessage: { $first: '$$ROOT' }, unread: { $sum: { $cond: [{ $and: [{ $eq: ['$receiverId', uid] }, { $eq: ['$read', false] }] }, 1, 0] } } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'partner' } },
            { $unwind: '$partner' },
            { $project: { _id: 1, lastMessage: { content: 1, createdAt: 1, senderId: 1 }, unread: 1, partner: { _id: 1, username: 1, avatar: 1, badges: 1 } } },
            { $sort: { 'lastMessage.createdAt': -1 } },
        ]);
        res.json(convos);
    } catch (err) {
        console.error('DM conversations:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get messages with a specific user
router.get('/:partnerId', authRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.partnerId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const uid = new mongoose.Types.ObjectId(req.userId);
        const pid = new mongoose.Types.ObjectId(req.params.partnerId);
        const messages = await DirectMessage.find({
            $or: [
                { senderId: uid, receiverId: pid },
                { senderId: pid, receiverId: uid },
            ]
        }).sort({ createdAt: 1 }).limit(100).populate('listingRef', 'title price images').lean();

        // Mark as read
        await DirectMessage.updateMany(
            { senderId: pid, receiverId: uid, read: false },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (err) {
        console.error('DM messages:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get total unread count
router.get('/unread/count', authRequired, async (req, res) => {
    try {
        const count = await DirectMessage.countDocuments({ receiverId: req.userId, read: false });
        res.json({ count });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
