/* ─────────────────────────────────────────
   FILE: device.js
   DESCRIPTION: Parses user-agent headers to extract
   device type, browser, OS, and IP address.
   ───────────────────────────────────────── */
const UAParser = require('ua-parser-js');

/**
 * parseDevice
 * @description Extracts device type, browser, OS, and IP from the request.
 *              Uses ua-parser-js to parse the User-Agent header.
 * @param {import('express').Request} req - Express request object
 * @returns {{ deviceType: string, browser: string, os: string, ip: string }}
 */
function parseDevice(req) {
    const ua = new UAParser(req.headers['user-agent']);
    const device = ua.getDevice();
    const browser = ua.getBrowser();
    const os = ua.getOS();

    // Determine device category from ua-parser type field
    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';

    const browserStr = browser.name
        ? `${browser.name}${browser.version ? ' ' + browser.version : ''}`
        : 'Unknown';

    // Stable identifier: browser name only (no version) — survives auto-updates
    const browserStable = browser.name || 'Unknown';

    const osStr = os.name
        ? `${os.name}${os.version ? ' ' + os.version : ''}`
        : 'Unknown';

    // Stable identifier: OS name only (no version)
    const osStable = os.name || 'Unknown';

    // Extract client IP: prefer X-Forwarded-For (first entry) behind proxies
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.connection?.remoteAddress
        || req.socket?.remoteAddress
        || '';

    return { deviceType, browser: browserStr, os: osStr, ip, browserStable, osStable };
}

module.exports = { parseDevice };
