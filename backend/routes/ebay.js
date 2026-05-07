const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// GET /api/ebay/account-deletion — eBay endpoint verification challenge
router.get('/account-deletion', (req, res) => {
    const challengeCode = req.query.challenge_code;
    if (!challengeCode) {
        return res.status(400).json({ error: 'Missing challenge_code' });
    }

    const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || '';
    const endpointUrl = process.env.EBAY_DELETION_ENDPOINT_URL || '';

    const hash = crypto
        .createHash('sha256')
        .update(challengeCode + verificationToken + endpointUrl)
        .digest('hex');

    return res.json({ challengeResponse: hash });
});

// POST /api/ebay/account-deletion — Marketplace Account Deletion notification
router.post('/account-deletion', async (req, res) => {
    try {
        const notification = req.body?.notification;
        const data = notification?.data || {};
        const userId = data.userId;
        const username = data.username;

        if (userId) {
            try {
                const db = require('../db');
                await db.query(
                    'DELETE FROM ebay_connections WHERE ebay_user_id = $1',
                    [userId]
                );
            } catch (dbErr) {
                // Table may not exist yet — not a fatal error
                if (dbErr.code !== '42P01') {
                    console.error('eBay deletion DB error:', dbErr.message);
                }
            }
            console.log('eBay account deletion processed:', userId, username || '');
        }

        return res.json({ acknowledged: true });
    } catch (err) {
        console.error('eBay account-deletion handler error:', err.message);
        // Always return 200 — eBay retries on 5xx
        return res.json({ acknowledged: true });
    }
});

module.exports = router;
