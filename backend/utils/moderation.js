/* ─────────────────────────────────────────
   FILE: moderation.js
   DESCRIPTION: Shared moderation helpers. isMuted() checks the
   users.muted_until timestamp (set by admin mute actions in
   routes/reports.js) against the current time.
   ───────────────────────────────────────── */

'use strict';

/**
 * isMuted
 * @description True if req.user.muted_until is set and still in the future.
 * @param {{ muted_until?: string|Date|null }} user
 */
function isMuted(user) {
    return !!(user && user.muted_until && new Date(user.muted_until) > new Date());
}

module.exports = { isMuted };
