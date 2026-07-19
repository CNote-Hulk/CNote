/* ── Share helper ────────────────────────────────────────
   Tries the native Web Share sheet (mobile/supported browsers); falls
   back to copying the URL to the clipboard everywhere else. */

/**
 * shareOrCopy
 * @param {{title?: string, text?: string, url: string}} payload
 * @returns {Promise<'shared'|'copied'|null>} null on failure/user cancel
 */
export async function shareOrCopy({ title, text, url }) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            return 'shared';
        } catch {
            return null; // user cancelled the share sheet — not an error
        }
    }
    try {
        await navigator.clipboard.writeText(url);
        return 'copied';
    } catch {
        return null;
    }
}
