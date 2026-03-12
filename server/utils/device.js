/**
 * Device / browser detection utilities
 * Uses ua-parser-js to extract device info from User-Agent header.
 */

const UAParser = require('ua-parser-js');

/**
 * Parse request to extract device information.
 * @param {import('express').Request} req
 * @returns {{ deviceType: string, browser: string, os: string, ip: string }}
 */
function parseDevice(req) {
    const ua = new UAParser(req.headers['user-agent']);
    const device = ua.getDevice();
    const browser = ua.getBrowser();
    const os = ua.getOS();

    // Determine device type
    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';

    // Format browser string
    const browserStr = browser.name
        ? `${browser.name}${browser.version ? ' ' + browser.version : ''}`
        : 'Unknown';

    // Format OS string
    const osStr = os.name
        ? `${os.name}${os.version ? ' ' + os.version : ''}`
        : 'Unknown';

    // Get IP address (handle proxies)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.connection?.remoteAddress
        || req.socket?.remoteAddress
        || '';

    return { deviceType, browser: browserStr, os: osStr, ip };
}

module.exports = { parseDevice };
