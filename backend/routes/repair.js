/**
 * Repair Routes — /api/repair
 * AI-free symptom-based diagnosis + submit for technician review.
 * Uses PostgreSQL pool from db.js.
 */

const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

/* ── Diagnosis knowledge base ──
   Maps symptom keywords to diagnosis templates.
   No external AI needed — rule-based analysis. */
const DIAGNOSIS_MAP = {
    'No power':          { severity: 'high', diag: 'Posibilă problemă cu sursa de alimentare sau placa de bază.', cost: [30, 120], time: '2-5 zile' },
    'Overheating':       { severity: 'medium', diag: 'Pasta termică deteriorată sau ventilator blocat. Necesită curățare internă.', cost: [20, 60], time: '1-2 zile' },
    'Disc read error':   { severity: 'medium', diag: 'Lentila laser uzată sau motor disc defect.', cost: [25, 80], time: '2-4 zile' },
    'No video output':   { severity: 'high', diag: 'Port HDMI deteriorat sau GPU defect (reballing posibil necesar).', cost: [40, 150], time: '3-7 zile' },
    'Controller drift':  { severity: 'low', diag: 'Joystick analog uzat. Înlocuire modul analog.', cost: [10, 35], time: '1 zi' },
    'Blue screen / crash': { severity: 'high', diag: 'Posibilă corupție software sau defect HDD/SSD.', cost: [20, 100], time: '2-5 zile' },
    'Slow performance':  { severity: 'low', diag: 'Spațiu de stocare plin sau necesitate curățare cache/reinstalare sistem.', cost: [0, 30], time: '1-2 zile' },
    'Network issues':    { severity: 'medium', diag: 'Modul Wi-Fi/Bluetooth defect sau probleme firmware.', cost: [25, 90], time: '2-4 zile' },
    'Strange noises':    { severity: 'medium', diag: 'Ventilator deteriorat sau disc drive cu probleme mecanice.', cost: [15, 60], time: '1-3 zile' },
    'Eject problems':    { severity: 'low', diag: 'Buton eject defect sau rolă de cauciuc uzată.', cost: [10, 40], time: '1-2 zile' },
    'Won\'t update':     { severity: 'low', diag: 'Problemă software — necesită reinstalare firmware sau safe mode boot.', cost: [0, 25], time: '1 zi' },
    'Battery drain':     { severity: 'medium', diag: 'Baterie degradată, necesită înlocuire.', cost: [15, 50], time: '1-2 zile' }
};

// ── POST /api/repair/analyze ─────────────────────────────
router.post('/analyze', authRequired, async (req, res) => {
    const { consoleCategory, symptoms, description } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ success: false, error: 'Selectează cel puțin un simptom.' });
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
            diagParts.push(`• ${symptom}: Necesită inspecție fizică pentru diagnostic precis.`);
            totalCostMin += 20;
            totalCostMax += 80;
        }
    }

    const diagnosis = diagParts.join('\n');
    const estimatedTime = safeSymptoms.length > 3 ? '5-10 zile' : safeSymptoms.length > 1 ? '3-5 zile' : '1-3 zile';
    const recommendation = maxSeverity === 'high'
        ? 'Recomandăm trimiterea la un tehnician certificat cât mai curând posibil.'
        : maxSeverity === 'medium'
        ? 'Problema poate fi rezolvată de un tehnician. Nu este urgentă, dar nu o amâna prea mult.'
        : 'Problemă minoră. Poate fi rezolvată ușor, eventual și acasă cu instrucțiuni.';

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
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/repair/:id/submit ──────────────────────────
router.post('/:id/submit', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        const check = await pool.query('SELECT user_id, status FROM repair_requests WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Cerere negăsită.' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Nu ai permisiunea.' });

        await pool.query("UPDATE repair_requests SET status = 'submitted' WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Repair submit error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
