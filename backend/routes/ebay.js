const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const EbayProvider = require('../providers/EbayProvider');
const MarketplaceSyncService = require('../services/marketplace-sync');

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

// ── GET /api/ebay/connect ─────────────────────────────────
// Generate eBay OAuth authorization URL and return it to the frontend
router.get('/connect', authRequired, async (req, res) => {
    try {
        const state = crypto.randomBytes(32).toString('hex');
        if (!global.oauthStates) global.oauthStates = {};
        global.oauthStates[state] = { userId: req.user.id, provider: 'ebay', createdAt: Date.now() };

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.EBAY_CLIENT_ID,
            redirect_uri: process.env.EBAY_RU_NAME,
            state,
            scope: [
                'https://api.ebay.com/oauth/api_scope',
                'https://api.ebay.com/oauth/api_scope/sell.inventory',
                'https://api.ebay.com/oauth/api_scope/sell.account.readonly'
            ].join(' ')
        });
        const authUrl = `https://auth.ebay.com/oauth2/authorize?${params}`;
        res.json({ success: true, authUrl });
    } catch (err) {
        console.error('eBay connect error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/ebay/callback ────────────────────────────────
// eBay redirects here after user authorizes. Exchanges code for tokens,
// saves to marketplace_accounts, kicks off background sync.
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    const frontendBase = process.env.FRONTEND_URL || '';

    if (!code || !state || !global.oauthStates?.[state]) {
        return res.redirect(`${frontendBase}/html/pages/profil.html?marketplace_connected=0&ebay=error`);
    }

    const stateData = global.oauthStates[state];
    if (stateData.provider !== 'ebay') {
        return res.redirect(`${frontendBase}/html/pages/profil.html?ebay=error`);
    }
    delete global.oauthStates[state];

    try {
        const userId = stateData.userId;
        const basicAuth = Buffer
            .from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`)
            .toString('base64');
        const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
            method: 'POST',
            headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.EBAY_RU_NAME
            }).toString()
        });
        if (!tokenRes.ok) throw new Error(`eBay token exchange failed: ${await tokenRes.text()}`);
        const tokenData = await tokenRes.json();

        let providerUserId = '';
        try {
            const userRes = await fetch('https://api.ebay.com/commerce/identity/v1/user/', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const userData = await userRes.json();
            providerUserId = userData.username || userData.userId || '';
        } catch (_) {}

        const auth = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        };

        const existing = await pool.query(
            'SELECT id FROM marketplace_accounts WHERE user_id = $1 AND provider = $2',
            [userId, 'ebay']
        );

        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE marketplace_accounts
                 SET access_token = $1, refresh_token = $2, expires_at = $3,
                     provider_user_id = $4, updated_at = NOW()
                 WHERE user_id = $5 AND provider = $6`,
                [auth.accessToken, auth.refreshToken, auth.expiresAt,
                 providerUserId, userId, 'ebay']
            );
        } else {
            await pool.query(
                `INSERT INTO marketplace_accounts
                 (user_id, provider, access_token, refresh_token, expires_at, provider_user_id, last_sync, connected_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
                [userId, 'ebay', auth.accessToken, auth.refreshToken,
                 auth.expiresAt, providerUserId]
            );
        }

        MarketplaceSyncService.syncUserListings(userId, 'ebay').catch(err =>
            console.error('eBay background sync error:', err)
        );

        res.redirect(`${frontendBase}/html/pages/profil.html?marketplace_connected=1`);
    } catch (err) {
        console.error('eBay callback error:', err);
        res.redirect(`${frontendBase}/html/pages/profil.html?ebay=error`);
    }
});

// ── GET /api/ebay/status ──────────────────────────────────
// Returns whether current user has eBay connected
router.get('/status', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT provider_user_id, connected_at FROM marketplace_accounts WHERE user_id = $1 AND provider = $2',
            [req.user.id, 'ebay']
        );
        if (result.rows.length === 0) return res.json({ success: true, connected: false });
        const row = result.rows[0];
        res.json({
            success: true,
            connected: true,
            ebayUsername: row.provider_user_id || 'eBay User',
            connectedAt: row.connected_at
        });
    } catch (err) {
        console.error('eBay status error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── DELETE /api/ebay/disconnect ───────────────────────────
// Remove eBay connection and delete imported listings
router.delete('/disconnect', authRequired, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM marketplace_accounts WHERE user_id = $1 AND provider = $2',
            [req.user.id, 'ebay']
        );
        await pool.query(
            "DELETE FROM listings WHERE user_id = $1 AND provider = 'ebay'",
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('eBay disconnect error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/ebay/listings/import ────────────────────────
// Fetch active listings from eBay and import new ones into listings table
router.get('/listings/import', authRequired, async (req, res) => {
    try {
        const result = await MarketplaceSyncService.syncUserListings(req.user.id, 'ebay');
        res.json({
            success: result.success,
            imported: result.listingsAdded || 0,
            skipped: result.listingsUpdated || 0,
            total: (result.listingsAdded || 0) + (result.listingsUpdated || 0),
            errors: []
        });
    } catch (err) {
        console.error('eBay import error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
