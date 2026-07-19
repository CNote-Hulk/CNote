/* ─────────────────────────────────────────
   FILE: community-photos.js
   DESCRIPTION: Community photo gallery — /api/community. Metadata-only
   (POST/GET/DELETE); the actual image bytes are uploaded straight to
   object storage by the client via POST /api/uploads/presign (kind:
   'gallery'), same pattern as chat/DM attachments.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');
const { publicUrlForKey } = require('../utils/objectStorage');

const router = express.Router();

// ── POST /api/community/photos ───────────────────────────────────────────────
router.post('/photos', authRequired, async (req, res) => {
    const { imageKey, caption, consoleType } = req.body || {};

    if (typeof imageKey !== 'string' || !imageKey.startsWith(`community/gallery/${req.user.id}/`)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing imageKey.' });
    }

    const safeCaption = caption ? String(caption).trim().slice(0, 300) : '';
    const safeConsoleType = consoleType ? String(consoleType).trim().slice(0, 100) : '';

    try {
        const result = await pool.query(
            `INSERT INTO community_photos (user_id, image_key, caption, console_type)
             VALUES ($1, $2, $3, $4)
             RETURNING id, image_key, caption, console_type, created_at`,
            [req.user.id, imageKey, safeCaption, safeConsoleType]
        );
        const photo = result.rows[0];
        res.status(201).json({
            success: true,
            photo: {
                id: photo.id,
                imageUrl: publicUrlForKey(photo.image_key),
                caption: photo.caption,
                consoleType: photo.console_type,
                createdAt: photo.created_at,
                username: req.user.username,
                userId: req.user.id,
            },
        });
    } catch (err) {
        console.error('Community photo POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/community/photos ─────────────────────────────────────────────────
router.get('/photos', authOptional, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 24;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT cp.id, cp.image_key, cp.caption, cp.console_type, cp.created_at,
                    cp.user_id, u.username, u.avatar
             FROM community_photos cp
             JOIN users u ON u.id = cp.user_id
             ORDER BY cp.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const photos = result.rows.map(row => ({
            id: row.id,
            imageUrl: publicUrlForKey(row.image_key),
            caption: row.caption,
            consoleType: row.console_type,
            createdAt: row.created_at,
            userId: row.user_id,
            username: row.username,
            avatar: row.avatar || '',
        }));

        res.json({ success: true, photos, page });
    } catch (err) {
        console.error('Community photos GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── DELETE /api/community/photos/:id ──────────────────────────────────────────
router.delete('/photos/:id', authRequired, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    try {
        const check = await pool.query('SELECT user_id FROM community_photos WHERE id = $1', [id]);
        if (!check.rows.length) return res.status(404).json({ success: false, error: 'Photo not found.' });
        if (check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have permission.' });
        }

        await pool.query('DELETE FROM community_photos WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Community photo DELETE error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
