/* ─────────────────────────────────────────
   FILE: adminOnly.js
   DESCRIPTION: Authorization middleware. Must run AFTER authRequired
   (relies on req.user populated by it). Rejects with 403 unless the
   authenticated user has role === 'admin'.
   ───────────────────────────────────────── */

/**
 * adminOnly
 * @description Express middleware that gates a route to admin users.
 *              Responds 403 for any authenticated non-admin.
 */
function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Acces interzis.' });
    }
    next();
}

module.exports = { adminOnly };
