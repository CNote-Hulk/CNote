/**
 * Repair Routes — /api/repair
 * AI-free symptom-based diagnosis + submit for technician review.
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

/* ── Diagnosis knowledge base ──
   Maps symptom keywords to diagnosis templates.
   No external AI needed — rule-based analysis. */
const DIAGNOSIS_MAP = {
    'No power':          { severity: 'high', diag: 'Possible power supply or motherboard issue.', cost: [30, 120], time: '2-5 days' },
    'Overheating':       { severity: 'medium', diag: 'Deteriorated thermal paste or blocked fan. Internal cleaning required.', cost: [20, 60], time: '1-2 days' },
    'Disc read error':   { severity: 'medium', diag: 'Worn laser lens or defective disc motor.', cost: [25, 80], time: '2-4 days' },
    'No video output':   { severity: 'high', diag: 'Damaged HDMI port or defective GPU (reballing may be needed).', cost: [40, 150], time: '3-7 days' },
    'Controller drift':  { severity: 'low', diag: 'Worn analog joystick. Analog module replacement needed.', cost: [10, 35], time: '1 day' },
    'Blue screen / crash': { severity: 'high', diag: 'Possible software corruption or HDD/SSD defect.', cost: [20, 100], time: '2-5 days' },
    'Slow performance':  { severity: 'low', diag: 'Full storage or cache cleanup/system reinstall needed.', cost: [0, 30], time: '1-2 days' },
    'Network issues':    { severity: 'medium', diag: 'Defective Wi-Fi/Bluetooth module or firmware issues.', cost: [25, 90], time: '2-4 days' },
    'Strange noises':    { severity: 'medium', diag: 'Deteriorated fan or disc drive with mechanical issues.', cost: [15, 60], time: '1-3 days' },
    'Eject problems':    { severity: 'low', diag: 'Defective eject button or worn rubber roller.', cost: [10, 40], time: '1-2 days' },
    'Won\'t update':     { severity: 'low', diag: 'Software issue — firmware reinstall or safe mode boot required.', cost: [0, 25], time: '1 day' },
    'Battery drain':     { severity: 'medium', diag: 'Degraded battery, replacement needed.', cost: [15, 50], time: '1-2 days' }
};

// ── POST /api/repair/analyze ─────────────────────────────
router.post('/analyze', authRequired, async (req, res) => {
    const { consoleCategory, symptoms, description } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ success: false, error: 'Select at least one symptom.' });
    }

    const safeSymptoms = symptoms.map(s => String(s).slice(0, 100)).slice(0, 12);
    const safeDesc = String(description || '').trim().slice(0, 2000);
    const safeConsole = String(consoleCategory || '').trim().slice(0, 20);

    // Build diagnosis from matched symptoms
    let totalCostMin = 0, totalCostMax = 0;
    let maxSeverity = 'low';
    const diagParts = [];
    const sevOrder = { low: 1, medium: 2, high: 3 };

    for (const symptom of safeSymptoms) {
        const match = DIAGNOSIS_MAP[symptom];
        if (match) {
            diagParts.push(`• ${symptom}: ${match.diag}`);
            totalCostMin += match.cost[0];
            totalCostMax += match.cost[1];
            if (sevOrder[match.severity] > sevOrder[maxSeverity]) {
                maxSeverity = match.severity;
            }
        } else {
            diagParts.push(`• ${symptom}: Physical inspection required for accurate diagnosis.`);
            totalCostMin += 20;
            totalCostMax += 80;
        }
    }

    const diagnosis = diagParts.join('\n');
    const estimatedTime = safeSymptoms.length > 3 ? '5-10 days' : safeSymptoms.length > 1 ? '3-5 days' : '1-3 days';
    const recommendation = maxSeverity === 'high'
        ? 'We recommend sending to a certified technician as soon as possible.'
        : maxSeverity === 'medium'
        ? 'The issue can be fixed by a technician. Not urgent, but do not delay too long.'
        : 'Minor issue. Can be easily fixed, possibly at home with instructions.';

    try {
        const result = await pool.query(`
            INSERT INTO repair_requests (user_id, console, symptoms, description, severity, ai_diagnosis, estimated_cost_min, estimated_cost_max, estimated_time, recommendation)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, severity, ai_diagnosis, estimated_cost_min, estimated_cost_max, estimated_time, recommendation, status, created_at
        `, [req.user.id, safeConsole, safeSymptoms.join(', '), safeDesc, maxSeverity, diagnosis, totalCostMin, totalCostMax, estimatedTime, recommendation]);

        const repair = result.rows[0];
        res.json({ success: true, repair });
    } catch (err) {
        console.error('Repair analyze error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/repair/:id/submit ──────────────────────────
router.post('/:id/submit', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    try {
        const check = await pool.query('SELECT user_id, status FROM repair_requests WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Request not found.' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, error: 'You do not have permission.' });

        await pool.query("UPDATE repair_requests SET status = 'submitted' WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Repair submit error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
