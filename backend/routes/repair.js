/**
 * Repair Routes — /api/repair
 * Submit repair requests, view own/all requests, admin reply/status.
 * Uses PostgreSQL pool from db.js.
 */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { sendRepairRequestNotification, sendRepairReplyNotification } = require('../services/email');

const router = express.Router();

/* ── Per-console symptom lists ── */
const CONSOLE_SYMPTOMS = {
    xbox: [
        'No power', 'Overheating', 'Disc read error', 'No video output',
        'Controller drift', 'Blue screen / crash', 'Slow performance',
        'Network issues', 'Strange noises', 'Eject problems', "Won't update",
        'HDMI port damaged', 'Power supply failure'
    ],
    ps: [
        'No power', 'Overheating', 'Disc read error', 'No video output',
        'Controller drift', 'Blue screen / crash', 'Slow performance',
        'Network issues', 'Strange noises', 'Eject problems', "Won't update",
        'HDMI port damaged', 'Rest mode freeze'
    ],
    nintendo: [
        'No power', 'Overheating', 'Joy-Con drift', 'No video output',
        'Screen issues', 'Blue screen / crash', 'Slow performance',
        'Network issues', 'Strange noises', 'Charging problems',
        "Won't update", 'Battery drain'
    ],
    pc: [
        'No power', 'Overheating', 'Blue screen / crash', 'No video output',
        'Slow performance', 'Network issues', 'Strange noises',
        'Boot loop', 'GPU artifacts', 'RAM errors',
        'Driver issues', 'Storage failure'
    ],
    other: [
        'No power', 'Overheating', 'No video output', 'Strange noises',
        "Won't turn on", 'Disc read error', 'Controller issues',
        'Slow performance', 'Network issues'
    ]
};

/** Admin role check */
function isAdmin(req) {
    return req.user && req.user.role === 'admin';
}

// ── GET /api/repair/symptoms/:console ────────────────────
router.get('/symptoms/:console', (req, res) => {
    const con = req.params.console;
    const list = CONSOLE_SYMPTOMS[con];
    if (!list) return res.status(400).json({ success: false, error: 'Unknown console type.' });
    res.json({ success: true, symptoms: list });
});

// ── POST /api/repair — Submit a new repair request ───────
router.post('/', authRequired, async (req, res) => {
    const { consoleType, consoleModel, symptoms, customSymptom, description } = req.body;

    if (!consoleType || !CONSOLE_SYMPTOMS[consoleType]) {
        return res.status(400).json({ success: false, error: 'Invalid console type.' });
    }
    const safeModel = String(consoleModel || '').trim().slice(0, 200);
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ success: false, error: 'Select at least one symptom.' });
    }

    const validSymptoms = CONSOLE_SYMPTOMS[consoleType];
    const safeSymptoms = symptoms
        .map(s => String(s).trim())
        .filter(s => validSymptoms.includes(s))
        .slice(0, 15);

    if (safeSymptoms.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid symptoms selected.' });
    }

    const safeCustom = String(customSymptom || '').trim().slice(0, 500);
    const safeDesc = String(description || '').trim().slice(0, 2000);

    try {
        const result = await pool.query(`
            INSERT INTO repair_requests (user_id, username, console, console_model, symptoms, custom_symptom, description, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING id, console, console_model, symptoms, custom_symptom, description, status, created_at
        `, [req.user.id, req.user.username, consoleType, safeModel, safeSymptoms.join(', '), safeCustom, safeDesc]);

        const repair = result.rows[0];

        // Notify admin by email (fire-and-forget)
        sendRepairRequestNotification({
            username: req.user.username,
            console: consoleType,
            consoleModel: safeModel,
            symptoms: safeSymptoms,
            customSymptom: safeCustom,
            description: safeDesc,
            requestId: repair.id
        }).catch(err => console.error('Repair admin email error:', err));

        res.json({ success: true, repair });
    } catch (err) {
        console.error('Repair submit error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/repair — Get current user's repair requests ─
router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, console, console_model, symptoms, custom_symptom, description, status, admin_reply, created_at
             FROM repair_requests WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        console.error('Repair list error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/repair/all — Admin: get all repair requests ─
router.get('/all', authRequired, async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    try {
        const result = await pool.query(
            `SELECT r.id, r.user_id, r.username, r.console, r.console_model, r.symptoms, r.custom_symptom,
                    r.description, r.status, r.admin_reply, r.created_at,
                    u.email AS user_email
             FROM repair_requests r
             LEFT JOIN users u ON u.id = r.user_id
             ORDER BY r.created_at DESC`
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        console.error('Repair admin list error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── PATCH /api/repair/:id — Admin: update status / reply ─
router.patch('/:id', authRequired, async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    const { status, adminReply } = req.body;
    const validStatuses = ['pending', 'in_progress', 'resolved'];

    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    try {
        const check = await pool.query(
            `SELECT r.id, r.user_id, r.status, r.console, r.symptoms, u.email AS user_email, r.username
             FROM repair_requests r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = $1`,
            [id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found.' });
        }

        const existing = check.rows[0];
        const newStatus = status || existing.status;
        const newReply = adminReply !== undefined ? String(adminReply).trim().slice(0, 2000) : (existing.admin_reply || '');

        await pool.query(
            `UPDATE repair_requests SET status = $1, admin_reply = $2 WHERE id = $3`,
            [newStatus, newReply, id]
        );

        // Notify user by email if status changed or reply added
        if (existing.user_email && (status !== existing.status || adminReply)) {
            sendRepairReplyNotification({
                to: existing.user_email,
                username: existing.username,
                console: existing.console,
                status: newStatus,
                adminReply: newReply,
                requestId: id
            }).catch(err => console.error('Repair user email error:', err));
        }

        res.json({ success: true, status: newStatus, admin_reply: newReply });
    } catch (err) {
        console.error('Repair admin update error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── Legacy: POST /api/repair/analyze (kept for backwards compat) ──
router.post('/analyze', authRequired, async (req, res) => {
    res.status(410).json({ success: false, error: 'This endpoint has been replaced. Please use POST /api/repair.' });
});

module.exports = router;
