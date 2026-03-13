const UAParser = require('ua-parser-js');

function parseDevice(req) {
    const ua = new UAParser(req.headers['user-agent']);
    const device = ua.getDevice();
    const browser = ua.getBrowser();
    const os = ua.getOS();

    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';

    const browserStr = browser.name
        ? `${browser.name}${browser.version ? ' ' + browser.version : ''}`
        : 'Unknown';

    const osStr = os.name
        ? `${os.name}${os.version ? ' ' + os.version : ''}`
        : 'Unknown';

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.connection?.remoteAddress
        || req.socket?.remoteAddress
        || '';

    return { deviceType, browser: browserStr, os: osStr, ip };
}

module.exports = { parseDevice };
