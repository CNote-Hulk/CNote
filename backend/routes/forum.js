/**
 * Forum Routes — /api/forum
 * Thread list, thread detail, create, reply, upvote.
 * Uses PostgreSQL pool from db.js.
 */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// ── Console whitelist ──
const VALID_CONSOLES = ['ps', 'xbox', 'nintendo', 'pc', 'general'];
const VALID_TAGS = ['General', 'Help', 'Discussion', 'News', 'Bug', 'Guide', 'Modding'];

// ── GET /api/forum/recent ────────────────────────────────
router.get('/recent', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, t.title, t.console, t.created_at, u.username
            FROM forum_threads t
            JOIN users u ON u.id = t.user_id
            ORDER BY t.created_at DESC
            LIMIT 3
        `);
        res.json({ success: true, threads: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── GET /api/forum/:console/threads ─────────────────────
router.get('/:console/threads', async (req, res) => {
    const consoleKey = req.params.console;
    if (!VALID_CONSOLES.includes(consoleKey)) {
        return res.status(400).json({ success: false, error: 'Consolă invalidă.' });
    }
    try {
        const result = await pool.query(`
            SELECT t.id, t.title, t.tag, t.views, t.upvotes, t.created_at,
                   u.username, u.avatar,
                   (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) AS reply_count
            FROM forum_threads t
            JOIN users u ON u.id = t.user_id
            WHERE t.console = $1
            ORDER BY t.created_at DESC
            LIMIT 100
        `, [consoleKey]);

        res.json({ success: true, threads: result.rows });
    } catch (err) {
        console.error('Forum threads GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── GET /api/forum/:console/threads/:id ─────────────────
router.get('/:console/threads/:id', async (req, res) => {
    const { console: consoleKey, id } = req.params;
    const threadId = parseInt(id);
    if (!VALID_CONSOLES.includes(consoleKey) || isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'Parametri invalizi.' });
    }
    try {
        // Increment views
        await pool.query('UPDATE forum_threads SET views = views + 1 WHERE id = $1', [threadId]);

        const threadResult = await pool.query(`
            SELECT t.id, t.title, t.body, t.tag, t.views, t.upvotes, t.created_at,
                   u.username, u.avatar
            FROM forum_threads t
            JOIN users u ON u.id = t.user_id
            WHERE t.id = $1 AND t.console = $2
        `, [threadId, consoleKey]);

        if (threadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Thread negăsit.' });
        }

        const repliesResult = await pool.query(`
            SELECT r.id, r.body, r.upvotes, r.created_at,
                   u.username, u.avatar
            FROM forum_replies r
            JOIN users u ON u.id = r.user_id
            WHERE r.thread_id = $1
            ORDER BY r.created_at ASC
        `, [threadId]);

        const thread = threadResult.rows[0];
        thread.replies = repliesResult.rows;

        res.json({ success: true, thread });
    } catch (err) {
        console.error('Forum thread GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/forum/:console/threads ────────────────────
router.post('/:console/threads', authRequired, async (req, res) => {
    const consoleKey = req.params.console;
    if (!VALID_CONSOLES.includes(consoleKey)) {
        return res.status(400).json({ success: false, error: 'Consolă invalidă.' });
    }

    const { title, body, tag } = req.body;
    if (!title || !body || String(title).trim().length === 0 || String(body).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Titlu și descriere obligatorii.' });
    }

    const safeTag = VALID_TAGS.includes(tag) ? tag : 'General';
    const safeTitle = String(title).trim().slice(0, 120);
    const safeBody = String(body).trim().slice(0, 5000);

    try {
        const result = await pool.query(`
            INSERT INTO forum_threads (user_id, console, title, body, tag)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, body, tag, views, upvotes, created_at
        `, [req.user.id, consoleKey, safeTitle, safeBody, safeTag]);

        const thread = result.rows[0];
        thread.username = req.user.username;
        thread.reply_count = 0;

        res.status(201).json({ success: true, thread });
    } catch (err) {
        console.error('Forum thread POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/forum/:console/threads/:id/reply ──────────
router.post('/:console/threads/:id/reply', authRequired, async (req, res) => {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'ID invalid.' });
    }

    const { body } = req.body;
    if (!body || String(body).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Răspunsul nu poate fi gol.' });
    }

    const safeBody = String(body).trim().slice(0, 3000);

    try {
        // Verify thread exists
        const thread = await pool.query('SELECT id FROM forum_threads WHERE id = $1', [threadId]);
        if (thread.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Thread negăsit.' });
        }

        const result = await pool.query(`
            INSERT INTO forum_replies (thread_id, user_id, body)
            VALUES ($1, $2, $3)
            RETURNING id, body, upvotes, created_at
        `, [threadId, req.user.id, safeBody]);

        const reply = result.rows[0];
        reply.username = req.user.username;

        // Notify thread author (if not self-reply)
        try {
            const threadOwner = await pool.query('SELECT user_id, title FROM forum_threads WHERE id = $1', [threadId]);
            const ownerId = threadOwner.rows[0]?.user_id;
            if (ownerId && ownerId !== req.user.id) {
                const { createNotification } = require('./notifications');
                const threadTitle = String(threadOwner.rows[0].title).slice(0, 60);
                await createNotification(
                    ownerId,
                    'forum_reply',
                    `${req.user.username} a răspuns la "${threadTitle}"`,
                    ''
                );
            }
        } catch { /* notification is non-critical */ }

        res.status(201).json({ success: true, reply });
    } catch (err) {
        console.error('Forum reply POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/forum/:console/threads/:id/upvote ─────────
router.post('/:console/threads/:id/upvote', authRequired, async (req, res) => {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'ID invalid.' });
    }

    try {
        // Check if already upvoted
        const existing = await pool.query(
            'SELECT id FROM forum_upvotes WHERE user_id = $1 AND thread_id = $2',
            [req.user.id, threadId]
        );

        if (existing.rows.length > 0) {
            // Remove upvote
            await pool.query('DELETE FROM forum_upvotes WHERE user_id = $1 AND thread_id = $2', [req.user.id, threadId]);
            await pool.query('UPDATE forum_threads SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = $1', [threadId]);
        } else {
            // Add upvote
            await pool.query('INSERT INTO forum_upvotes (user_id, thread_id) VALUES ($1, $2)', [req.user.id, threadId]);
            await pool.query('UPDATE forum_threads SET upvotes = upvotes + 1 WHERE id = $1', [threadId]);
        }

        const result = await pool.query('SELECT upvotes FROM forum_threads WHERE id = $1', [threadId]);
        res.json({ success: true, upvotes: result.rows[0]?.upvotes || 0 });
    } catch (err) {
        console.error('Forum upvote error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/forum/:console/replies/:replyId/upvote (shorthand)
router.post('/:console/replies/:replyId/upvote', authRequired, async (req, res) => {
    const replyId = parseInt(req.params.replyId);
    if (isNaN(replyId)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        const existing = await pool.query(
            'SELECT id FROM forum_upvotes WHERE user_id = $1 AND reply_id = $2',
            [req.user.id, replyId]
        );

        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM forum_upvotes WHERE user_id = $1 AND reply_id = $2', [req.user.id, replyId]);
            await pool.query('UPDATE forum_replies SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = $1', [replyId]);
        } else {
            await pool.query('INSERT INTO forum_upvotes (user_id, reply_id) VALUES ($1, $2)', [req.user.id, replyId]);
            await pool.query('UPDATE forum_replies SET upvotes = upvotes + 1 WHERE id = $1', [replyId]);
        }

        const result = await pool.query('SELECT upvotes FROM forum_replies WHERE id = $1', [replyId]);
        res.json({ success: true, upvotes: result.rows[0]?.upvotes || 0 });
    } catch (err) {
        console.error('Forum reply upvote error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/forum/:console/threads/:id/replies/:replyId/upvote (full path)
router.post('/:console/threads/:id/replies/:replyId/upvote', authRequired, async (req, res) => {
    const replyId = parseInt(req.params.replyId);
    if (isNaN(replyId)) {
        return res.status(400).json({ success: false, error: 'ID invalid.' });
    }

    try {
        const existing = await pool.query(
            'SELECT id FROM forum_upvotes WHERE user_id = $1 AND reply_id = $2',
            [req.user.id, replyId]
        );

        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM forum_upvotes WHERE user_id = $1 AND reply_id = $2', [req.user.id, replyId]);
            await pool.query('UPDATE forum_replies SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = $1', [replyId]);
        } else {
            await pool.query('INSERT INTO forum_upvotes (user_id, reply_id) VALUES ($1, $2)', [req.user.id, replyId]);
            await pool.query('UPDATE forum_replies SET upvotes = upvotes + 1 WHERE id = $1', [replyId]);
        }

        const result = await pool.query('SELECT upvotes FROM forum_replies WHERE id = $1', [replyId]);
        res.json({ success: true, upvotes: result.rows[0]?.upvotes || 0 });
    } catch (err) {
        console.error('Forum reply upvote error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
