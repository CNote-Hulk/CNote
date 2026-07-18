/* ─────────────────────────────────────────
   FILE: disposableEmail.js
   DESCRIPTION: Blocks known disposable/temporary-inbox email domains at
   registration. A static list can't ever be exhaustive — new throwaway
   services appear constantly — but it stops the overwhelming majority of
   bulk-signup abuse without needing a paid verification API. Revisit
   periodically; consider a maintained external list/service if abuse
   through unlisted providers becomes a real problem.
   ───────────────────────────────────────── */

'use strict';

const DISPOSABLE_DOMAINS = new Set([
    '10minutemail.com', '10minutemail.net', '20minutemail.com',
    'temp-mail.org', 'tempmail.com', 'tempmail.net', 'temp-mail.io',
    'mytemp.email', 'tempinbox.com', 'tempinbox.net',
    'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
    'guerrillamailblock.com', 'sharklasers.com', 'grr.la', 'pokemail.net',
    'mailinator.com', 'mailinator.net', 'mailinator2.com', 'mailinator.org',
    'yopmail.com', 'yopmail.net', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
    'trashmail.com', 'trashmail.net', 'trashmail.me', 'trash-mail.com',
    'throwawaymail.com', 'throwam.com',
    'getnada.com', 'nada.email',
    'dispostable.com', 'fakeinbox.com', 'fakemailgenerator.com',
    'maildrop.cc', 'mintemail.com', 'moakt.com', 'moakt.ws', 'mohmal.com',
    'emailondeck.com', 'spamgourmet.com', '33mail.com',
    'discard.email', 'discardmail.com', 'mailnesia.com', 'mailcatch.com',
    'tempr.email', 'tmpmail.org', 'tmpmail.net', 'tmail.ws',
    'mail-temporaire.fr', 'wegwerfemail.de', 'einrot.com', 'spam4.me',
    'burnermail.io', 'inboxbear.com', 'mailsac.com',
    'anonaddy.me', 'emailfake.com', 'crazymailing.com', 'fakemail.net',
]);

/**
 * isDisposableEmail
 * @description True if the email's domain is a known disposable/temp-mail provider.
 * @param {string} email
 * @returns {boolean}
 */
function isDisposableEmail(email) {
    const domain = String(email || '').trim().toLowerCase().split('@')[1];
    if (!domain) return false;
    return DISPOSABLE_DOMAINS.has(domain);
}

module.exports = { isDisposableEmail, DISPOSABLE_DOMAINS };
