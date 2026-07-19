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
const { awardXP } = require('../utils/gamification');
const { isMuted } = require('../utils/moderation');

const router = express.Router();

// ── Console whitelist ──
const VALID_CONSOLES = ['ps', 'xbox', 'nintendo', 'pc', 'general'];
const VALID_TAGS = ['General', 'Help', 'Discussion', 'News', 'Bug', 'Guide', 'Modding'];

// ── Forum spam prevention — in-memory, resets on server restart ────────────

// Pattern 3a: forum thread spam — 5 threads per 10 minutes per user
const forumThreadMap = new Map();
// Pattern 3b: forum reply spam — 20 replies per 5 minutes per user
const forumReplyMap = new Map();

/**
 * checkForumThreadLimit
 * Returns { blocked, msBeforeNext }.
 * Limit: 5 threads per 10 minutes per user.
 */
function checkForumThreadLimit(userId) {
    const key = `forum_threads:${userId}`;
    const now = Date.now();
    const window = 600 * 1000; // 10 minutes
    const limit = 5;
    let entry = forumThreadMap.get(key);
    if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + window };
        forumThreadMap.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
        return { blocked: true, msBeforeNext: entry.resetTime - now };
    }
    return { blocked: false };
}

/**
 * checkForumReplyLimit
 * Returns { blocked, msBeforeNext }.
 * Limit: 20 replies per 5 minutes per user.
 */
function checkForumReplyLimit(userId) {
    const key = `forum_replies:${userId}`;
    const now = Date.now();
    const window = 300 * 1000; // 5 minutes
    const limit = 20;
    let entry = forumReplyMap.get(key);
    if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + window };
        forumReplyMap.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
        return { blocked: true, msBeforeNext: entry.resetTime - now };
    }
    return { blocked: false };
}

// ── GET /api/forum/search?q= ─────────────────────────────
// Global-search backing endpoint (frontend/js/modules/search.js) — searches
// thread titles/bodies across all consoles, not scoped to a single console.
router.get('/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, threads: [] });
    try {
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 8));
        const result = await pool.query(`
            SELECT t.id, t.title, t.console, t.tag, t.created_at, u.username,
                   LEFT(t.body, 140) AS snippet
            FROM forum_threads t
            JOIN users u ON u.id = t.user_id
            WHERE t.title ILIKE $1 OR t.body ILIKE $1
            ORDER BY t.created_at DESC
            LIMIT $2
        `, [`%${q}%`, limit]);
        res.json({ success: true, threads: result.rows });
    } catch (err) {
        console.error('Forum search GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

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
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/forum/:console/threads ─────────────────────
router.get('/:console/threads', async (req, res) => {
    const consoleKey = req.params.console;
    if (!VALID_CONSOLES.includes(consoleKey)) {
        return res.status(400).json({ success: false, error: 'Invalid console.' });
    }
    try {
        const result = await pool.query(`
            SELECT t.id, t.title, t.tag, t.views, t.upvotes, t.created_at, t.solved_reply_id,
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
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/forum/:console/threads/:id ─────────────────
router.get('/:console/threads/:id', async (req, res) => {
    const { console: consoleKey, id } = req.params;
    const threadId = parseInt(id);
    if (!VALID_CONSOLES.includes(consoleKey) || isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'Invalid parameters.' });
    }
    try {
        // Increment views
        await pool.query('UPDATE forum_threads SET views = views + 1 WHERE id = $1', [threadId]);

        const threadResult = await pool.query(`
            SELECT t.id, t.title, t.body, t.tag, t.views, t.upvotes, t.created_at, t.solved_reply_id, t.user_id,
                   u.username, u.avatar
            FROM forum_threads t
            JOIN users u ON u.id = t.user_id
            WHERE t.id = $1 AND t.console = $2
        `, [threadId, consoleKey]);

        if (threadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Thread not found.' });
        }

        const repliesResult = await pool.query(`
            SELECT r.id, r.body, r.upvotes, r.created_at, r.reply_to_id,
                   u.username, u.avatar,
                   pu.username AS reply_to_username,
                   LEFT(pr.body, 140) AS reply_to_snippet
            FROM forum_replies r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN forum_replies pr ON pr.id = r.reply_to_id
            LEFT JOIN users pu ON pu.id = pr.user_id
            WHERE r.thread_id = $1
            ORDER BY r.created_at ASC
        `, [threadId]);

        const thread = threadResult.rows[0];
        thread.replies = repliesResult.rows;

        res.json({ success: true, thread });
    } catch (err) {
        console.error('Forum thread GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/forum/:console/threads ────────────────────
router.post('/:console/threads', authRequired, async (req, res) => {
    if (isMuted(req.user)) {
        return res.status(403).json({ success: false, error: `You are restricted from posting until ${new Date(req.user.muted_until).toISOString()}.` });
    }
    const consoleKey = req.params.console;
    if (!VALID_CONSOLES.includes(consoleKey)) {
        return res.status(400).json({ success: false, error: 'Invalid console.' });
    }

    const { title, body, tag } = req.body;
    if (!title || !body || String(title).trim().length === 0 || String(body).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Title and description are required.' });
    }

    const safeTag = VALID_TAGS.includes(tag) ? tag : 'General';
    const safeTitle = String(title).trim().slice(0, 120);
    const safeBody = String(body).trim().slice(0, 5000);

    // ── Pattern 3a: thread spam check ─────────────────────────────────────
    try {
        const threadLimit = checkForumThreadLimit(req.user.id);
        if (threadLimit.blocked) {
            res.set('Retry-After', Math.ceil(threadLimit.msBeforeNext / 1000));
            return res.status(429).json({ success: false, error: 'Postezi prea multe topicuri. Așteaptă 10 minute.' });
        }
    } catch (limiterErr) {
        console.error('Forum thread limiter error:', limiterErr.message);
        // Never block request on limiter failure
    }

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
        awardXP(pool, req.app.get('io'), req.user.id, 'forum_post', thread.id.toString()).catch(() => {});
    } catch (err) {
        console.error('Forum thread POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/forum/:console/threads/:id/reply ──────────
router.post('/:console/threads/:id/reply', authRequired, async (req, res) => {
    if (isMuted(req.user)) {
        return res.status(403).json({ success: false, error: `You are restricted from posting until ${new Date(req.user.muted_until).toISOString()}.` });
    }
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID.' });
    }

    const { body, reply_to_id } = req.body;
    if (!body || String(body).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Reply cannot be empty.' });
    }

    const safeBody = String(body).trim().slice(0, 3000);

    let replyToId = null;
    if (reply_to_id !== undefined && reply_to_id !== null) {
        replyToId = parseInt(reply_to_id);
        if (isNaN(replyToId)) {
            return res.status(400).json({ success: false, error: 'Invalid reply_to_id.' });
        }
    }

    // ── Pattern 3b: reply spam check ──────────────────────────────────────
    try {
        const replyLimit = checkForumReplyLimit(req.user.id);
        if (replyLimit.blocked) {
            res.set('Retry-After', Math.ceil(replyLimit.msBeforeNext / 1000));
            return res.status(429).json({ success: false, error: 'Postezi prea repede. Așteaptă câteva minute.' });
        }
    } catch (limiterErr) {
        console.error('Forum reply limiter error:', limiterErr.message);
        // Never block request on limiter failure
    }

    try {
        // Verify thread exists
        const thread = await pool.query('SELECT id FROM forum_threads WHERE id = $1', [threadId]);
        if (thread.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Thread not found.' });
        }

        // Verify the quoted reply (if any) actually belongs to this thread
        if (replyToId !== null) {
            const parentReply = await pool.query(
                'SELECT id FROM forum_replies WHERE id = $1 AND thread_id = $2',
                [replyToId, threadId]
            );
            if (parentReply.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'That reply does not belong to this thread.' });
            }
        }

        const result = await pool.query(`
            INSERT INTO forum_replies (thread_id, user_id, body, reply_to_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, body, upvotes, created_at, reply_to_id
        `, [threadId, req.user.id, safeBody, replyToId]);

        const reply = result.rows[0];
        reply.username = req.user.username;

        if (replyToId !== null) {
            const parentInfo = await pool.query(
                'SELECT r.body, u.username FROM forum_replies r JOIN users u ON u.id = r.user_id WHERE r.id = $1',
                [replyToId]
            );
            if (parentInfo.rows[0]) {
                reply.reply_to = {
                    id: replyToId,
                    username: parentInfo.rows[0].username,
                    body_snippet: String(parentInfo.rows[0].body).slice(0, 140),
                };
            }
        }

        // Notify thread author (if not self-reply), and separately notify
        // the author of the specific reply being quoted (if different from
        // both the replier and the thread author, to avoid double-notifying).
        try {
            const threadOwner = await pool.query('SELECT user_id, title, console FROM forum_threads WHERE id = $1', [threadId]);
            const ownerId = threadOwner.rows[0]?.user_id;
            const threadTitle = String(threadOwner.rows[0]?.title || '').slice(0, 60);
            const consoleKey = threadOwner.rows[0]?.console;
            const link = `/html/pages/community.html#forum/${consoleKey}/thread/${threadId}`;
            const { createNotification } = require('./notifications');

            if (ownerId && ownerId !== req.user.id) {
                await createNotification(
                    ownerId,
                    'forum_reply',
                    `${req.user.username} replied to "${threadTitle}"`,
                    link,
                    req
                );
            }

            if (replyToId !== null) {
                const quotedAuthor = await pool.query(
                    'SELECT user_id FROM forum_replies WHERE id = $1',
                    [replyToId]
                );
                const quotedUserId = quotedAuthor.rows[0]?.user_id;
                if (quotedUserId && quotedUserId !== req.user.id && quotedUserId !== ownerId) {
                    await createNotification(
                        quotedUserId,
                        'forum_reply',
                        `${req.user.username} replied to your message in "${threadTitle}"`,
                        link,
                        req
                    );
                }
            }
        } catch { /* notification is non-critical */ }

        res.status(201).json({ success: true, reply });
        awardXP(pool, req.app.get('io'), req.user.id, 'forum_reply', reply.id.toString()).catch(() => {});
    } catch (err) {
        console.error('Forum reply POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/forum/:console/threads/:id/solve ──────────
// Marks a reply as the solution (reply_id in body), or clears it (reply_id
// omitted/null). Thread-owner only.
router.post('/:console/threads/:id/solve', authRequired, async (req, res) => {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID.' });
    }

    try {
        const threadResult = await pool.query('SELECT user_id FROM forum_threads WHERE id = $1', [threadId]);
        const thread = threadResult.rows[0];
        if (!thread) {
            return res.status(404).json({ success: false, error: 'Thread not found.' });
        }
        if (thread.user_id !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Only the thread author can mark a solution.' });
        }

        const { reply_id } = req.body;

        if (reply_id === null || reply_id === undefined) {
            await pool.query('UPDATE forum_threads SET solved_reply_id = NULL WHERE id = $1', [threadId]);
            return res.json({ success: true, solved_reply_id: null });
        }

        const replyId = parseInt(reply_id);
        if (isNaN(replyId)) {
            return res.status(400).json({ success: false, error: 'Invalid reply ID.' });
        }

        const replyResult = await pool.query(
            'SELECT id FROM forum_replies WHERE id = $1 AND thread_id = $2',
            [replyId, threadId]
        );
        if (replyResult.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'That reply does not belong to this thread.' });
        }

        await pool.query('UPDATE forum_threads SET solved_reply_id = $1 WHERE id = $2', [replyId, threadId]);
        res.json({ success: true, solved_reply_id: replyId });
    } catch (err) {
        console.error('Forum solve POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/forum/:console/threads/:id/upvote ─────────
router.post('/:console/threads/:id/upvote', authRequired, async (req, res) => {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID.' });
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
            // Add upvote — award XP to thread author
            await pool.query('INSERT INTO forum_upvotes (user_id, thread_id) VALUES ($1, $2)', [req.user.id, threadId]);
            await pool.query('UPDATE forum_threads SET upvotes = upvotes + 1 WHERE id = $1', [threadId]);
            const authorRes = await pool.query('SELECT user_id, console, title FROM forum_threads WHERE id = $1', [threadId]);
            const authorId = authorRes.rows[0]?.user_id;
            if (authorId && authorId !== req.user.id) {
                awardXP(pool, req.app.get('io'), authorId, 'post_upvoted', threadId.toString()).catch(() => {});
                const { createNotification } = require('./notifications');
                const thread = authorRes.rows[0];
                createNotification(
                    authorId, 'upvote',
                    `${req.user.username} upvoted your thread "${thread.title}"`,
                    `/html/pages/community.html#forum/${thread.console}/thread/${threadId}`,
                    req
                ).catch(() => {});
            }
        }

        const result = await pool.query('SELECT upvotes FROM forum_threads WHERE id = $1', [threadId]);
        res.json({ success: true, upvotes: result.rows[0]?.upvotes || 0 });
    } catch (err) {
        console.error('Forum upvote error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/forum/:console/replies/:replyId/upvote (shorthand)
router.post('/:console/replies/:replyId/upvote', authRequired, async (req, res) => {
    const replyId = parseInt(req.params.replyId);
    if (isNaN(replyId)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

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

            const authorRes = await pool.query(
                `SELECT fr.user_id, ft.id AS thread_id, ft.console
                 FROM forum_replies fr JOIN forum_threads ft ON ft.id = fr.thread_id
                 WHERE fr.id = $1`, [replyId]);
            const authorRow = authorRes.rows[0];
            if (authorRow && authorRow.user_id !== req.user.id) {
                const { createNotification } = require('./notifications');
                createNotification(
                    authorRow.user_id, 'upvote',
                    `${req.user.username} upvoted your reply`,
                    `/html/pages/community.html#forum/${authorRow.console}/thread/${authorRow.thread_id}`,
                    req
                ).catch(() => {});
            }
        }

        const result = await pool.query('SELECT upvotes FROM forum_replies WHERE id = $1', [replyId]);
        res.json({ success: true, upvotes: result.rows[0]?.upvotes || 0 });
    } catch (err) {
        console.error('Forum reply upvote error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/forum/:console/threads/:id/replies/:replyId/upvote (full path)
router.post('/:console/threads/:id/replies/:replyId/upvote', authRequired, async (req, res) => {
    const replyId = parseInt(req.params.replyId);
    if (isNaN(replyId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID.' });
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

            const authorRes = await pool.query(
                `SELECT fr.user_id, ft.id AS thread_id, ft.console
                 FROM forum_replies fr JOIN forum_threads ft ON ft.id = fr.thread_id
                 WHERE fr.id = $1`, [replyId]);
            const authorRow = authorRes.rows[0];
            if (authorRow && authorRow.user_id !== req.user.id) {
                const { createNotification } = require('./notifications');
                createNotification(
                    authorRow.user_id, 'upvote',
                    `${req.user.username} upvoted your reply`,
                    `/html/pages/community.html#forum/${authorRow.console}/thread/${authorRow.thread_id}`,
                    req
                ).catch(() => {});
            }
        }

        const result = await pool.query('SELECT upvotes FROM forum_replies WHERE id = $1', [replyId]);
        res.json({ success: true, upvotes: result.rows[0]?.upvotes || 0 });
    } catch (err) {
        console.error('Forum reply upvote error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
