/* ─────────────────────────────────────────
   FILE: firebaseAdmin.js
   DESCRIPTION: Firebase Admin SDK — sends FCM push notifications
   (currently: direct-message push). Auto-prunes tokens FCM reports
   as dead (uninstalled app / expired registration).
   ───────────────────────────────────────── */
// firebase-admin v11+ dropped the old namespaced API (admin.credential.cert,
// admin.apps, admin.messaging()) from the package root — it now lives in these
// per-feature submodules instead.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const pool = require('../db');

// Railway stores multi-line env vars with literal "\n" sequences, not real
// newlines — the PEM key must be unescaped or cert() rejects it.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// cert() throws synchronously if any field is missing/empty — which, requiring this
// module at server startup (via routes/dm.js), would crash the ENTIRE backend, not
// just DM push, whenever the three FIREBASE_* env vars aren't set yet. Guard it so a
// not-yet-configured deploy just runs with push disabled instead of refusing to boot.
const firebaseConfigured =
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!privateKey;

if (firebaseConfigured && !getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey
        })
    });
} else if (!firebaseConfigured) {
    console.warn('[firebaseAdmin] FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY not set — push notifications disabled.');
}

// FCM's error code for a dead registration token differs by SDK version/transport;
// check both the modern and legacy forms so a stale token actually gets pruned.
const DEAD_TOKEN_ERRORS = new Set([
    'messaging/invalid-argument',
    'messaging/registration-token-not-registered',
    'INVALID_ARGUMENT',
    'NOT_FOUND'
]);

/**
 * sendPushNotification
 * @description Sends one FCM push message. Never throws — on a dead-token
 * error it deletes that row from user_fcm_tokens so it stops accumulating.
 */
async function sendPushNotification(fcmToken, title, body, data) {
    if (!firebaseConfigured) return;
    try {
        await getMessaging().send({
            token: fcmToken,
            notification: { title, body },
            data: data || {}
        });
    } catch (err) {
        const code = err && (err.code || err.errorInfo?.code);
        if (DEAD_TOKEN_ERRORS.has(code)) {
            try {
                await pool.query('DELETE FROM user_fcm_tokens WHERE fcm_token = $1', [fcmToken]);
            } catch (dbErr) {
                console.error('Failed to prune dead FCM token:', dbErr);
            }
        } else {
            console.error('FCM send error:', err);
        }
    }
}

/**
 * sendPushToUser
 * @description Fans one push message out to every device a user has registered
 * in user_fcm_tokens. Silently does nothing when the user has no tokens (the
 * normal case for users who never opened the Android app).
 */
async function sendPushToUser(userId, title, body, data) {
    if (!firebaseConfigured) return;
    const tokensResult = await pool.query(
        'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1',
        [userId]
    );
    if (tokensResult.rows.length === 0) return;
    await Promise.all(
        tokensResult.rows.map(row => sendPushNotification(row.fcm_token, title, body, data))
    );
}

module.exports = { sendPushNotification, sendPushToUser };
