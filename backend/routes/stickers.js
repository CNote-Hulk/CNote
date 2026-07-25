/* ─────────────────────────────────────────
   FILE: stickers.js
   DESCRIPTION: Synced sticker library — /api/stickers. Metadata-only
   (POST/GET/DELETE) against user_stickers; the actual sticker bytes are
   uploaded straight to object storage by the client via POST
   /api/uploads/presign (kind: 'sticker'), same pattern as chat/DM
   attachments. Mirrors the table the Android app already reads/writes
   directly via Supabase PostgREST, so stickers stay in sync between app
   and site.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { publicUrlForKey } = require('../utils/objectStorage');

const router = express.Router();

// ── GET /api/stickers ─────────────────────────────────────────────────────────
router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, storage_key, created_at FROM user_stickers
             WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        const stickers = result.rows.map(row => ({
            id: row.id,
            key: row.storage_key, // needed to send the sticker as a DM/chat attachment
            url: publicUrlForKey(row.storage_key),
            createdAt: row.created_at,
        }));
        res.json({ success: true, stickers });
    } catch (err) {
        console.error('Stickers GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/stickers ────────────────────────────────────────────────────────
router.post('/', authRequired, async (req, res) => {
    const { storageKey } = req.body || {};

    if (typeof storageKey !== 'string' || !storageKey.startsWith(`chat/stickers/${req.user.id}/`)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing storageKey.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_stickers (user_id, storage_key) VALUES ($1, $2)
             RETURNING id, storage_key, created_at`,
            [req.user.id, storageKey]
        );
        const sticker = result.rows[0];
        res.status(201).json({
            success: true,
            sticker: {
                id: sticker.id,
                key: sticker.storage_key,
                url: publicUrlForKey(sticker.storage_key),
                createdAt: sticker.created_at,
            },
        });
    } catch (err) {
        console.error('Sticker POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── DELETE /api/stickers/:id ──────────────────────────────────────────────────
router.delete('/:id', authRequired, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    try {
        const check = await pool.query('SELECT user_id FROM user_stickers WHERE id = $1', [id]);
        if (!check.rows.length) return res.status(404).json({ success: false, error: 'Sticker not found.' });
        if (check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have permission.' });
        }

        await pool.query('DELETE FROM user_stickers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Sticker DELETE error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
