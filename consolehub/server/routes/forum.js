const express = require('express');
const mongoose = require('mongoose');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const VALID = ['playstation', 'xbox', 'nintendo', 'pc'];
const TAGS = ['Help', 'Fix', 'Showcase', 'Buy & Sell', 'General'];
const isOid = (id) => mongoose.Types.ObjectId.isValid(id);

// List threads
router.get('/:console', async (req, res) => {
    const c = req.params.console.toLowerCase();
    if (!VALID.includes(c)) return res.status(400).json({ error: 'Invalid console.' });
    try {
        const threads = await Thread.aggregate([
            { $match: { consoleCategory: c } },
            { $sort: { createdAt: -1 } },
            { $project: { title: 1, body: 1, username: 1, tag: 1, upvotes: 1, views: 1, createdAt: 1, replyCount: { $size: { $ifNull: ['$replies', []] } } } }
        ]);
        res.json(threads);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Get thread
router.get('/:console/:id', async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const thread = await Thread.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true }).lean();
        if (!thread) return res.status(404).json({ error: 'Not found.' });
        res.json(thread);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Create thread
router.post('/:console', authRequired, async (req, res) => {
    const c = req.params.console.toLowerCase();
    if (!VALID.includes(c)) return res.status(400).json({ error: 'Invalid console.' });
    const { title, body, tag } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and body required.' });
    try {
        const thread = await Thread.create({
            consoleCategory: c,
            title: title.trim().slice(0, 200),
            body: body.trim().slice(0, 10000),
            authorId: req.userId,
            username: req.username,
            tag: TAGS.includes(tag) ? tag : 'General',
        });
        res.status(201).json(thread);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Reply
router.post('/:console/:id/reply', authRequired, async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Body required.' });
    try {
        const thread = await Thread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Not found.' });
        thread.replies.push({ authorId: req.userId, username: req.username, body: body.trim().slice(0, 5000) });
        await thread.save();
        const reply = thread.replies[thread.replies.length - 1];

        // Notify thread author
        if (String(thread.authorId) !== req.userId) {
            const notif = await Notification.create({
                userId: thread.authorId, type: 'forum_reply',
                message: `${req.username} ți-a răspuns în forum: ${thread.title.slice(0, 40)}`,
                link: `thread:${thread._id}:${thread.consoleCategory}`,
            });
            req.app.get('io')?.to(`user:${thread.authorId}`).emit('notification', notif);
        }
        res.status(201).json({ reply });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Upvote thread
router.post('/:console/:id/upvote', authRequired, async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const thread = await Thread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Not found.' });
        const uid = new mongoose.Types.ObjectId(req.userId);
        const idx = thread.upvotedBy.findIndex(id => id.equals(uid));
        if (idx === -1) { thread.upvotedBy.push(uid); thread.upvotes++; }
        else { thread.upvotedBy.splice(idx, 1); thread.upvotes = Math.max(0, thread.upvotes - 1); }
        await thread.save();
        res.json({ upvotes: thread.upvotes, upvotedBy: thread.upvotedBy });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Upvote reply
router.post('/:console/:id/reply/:replyId/upvote', authRequired, async (req, res) => {
    if (!isOid(req.params.id) || !isOid(req.params.replyId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const thread = await Thread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Not found.' });
        const reply = thread.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ error: 'Reply not found.' });
        const uid = new mongoose.Types.ObjectId(req.userId);
        const idx = reply.upvotedBy.findIndex(id => id.equals(uid));
        if (idx === -1) { reply.upvotedBy.push(uid); reply.upvotes++; }
        else { reply.upvotedBy.splice(idx, 1); reply.upvotes = Math.max(0, reply.upvotes - 1); }
        await thread.save();
        res.json({ upvotes: reply.upvotes, upvotedBy: reply.upvotedBy });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
