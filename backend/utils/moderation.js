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

/**
 * mutedUntilMessage
 * @description (2026-09-01) Every "restricted from posting" 403 (chat.js, forum.js x2,
 *              marketplace.js, dm.js) used to build this with `.toISOString()` — raw
 *              "2026-09-04T15:57:57.914Z" shown verbatim in a plain alert() to the user
 *              (Andrei: "repara data aia pe site sa se vada corect"). No per-user language
 *              is known this deep in a route handler, so this picks a single readable,
 *              locale-agnostic format (UTC, explicit "UTC" suffix so it isn't mistaken for
 *              local time) rather than guessing a language.
 * @param {string|Date} mutedUntil
 */
function mutedUntilMessage(mutedUntil) {
    const formatted = new Date(mutedUntil).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'UTC'
    });
    return `You are restricted from posting until ${formatted} UTC.`;
}

module.exports = { isMuted, mutedUntilMessage };
