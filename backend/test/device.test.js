'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDevice } = require('../utils/device');

function fakeReq(headers) {
    return { headers, connection: {}, socket: {} };
}

test('parseDevice: extracts browser/OS from a real desktop Chrome user-agent', () => {
    const req = fakeReq({
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const result = parseDevice(req);
    assert.equal(result.deviceType, 'desktop');
    assert.match(result.browser, /Chrome/);
    assert.match(result.os, /Windows/);
});

test('parseDevice: detects mobile device type from a phone user-agent', () => {
    const req = fakeReq({
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const result = parseDevice(req);
    assert.equal(result.deviceType, 'mobile');
});

test('parseDevice: falls back to "Unknown" instead of throwing when there is no user-agent', () => {
    const result = parseDevice(fakeReq({}));
    assert.equal(result.browser, 'Unknown');
    assert.equal(result.os, 'Unknown');
    assert.equal(result.deviceType, 'desktop');
});

test('parseDevice: prefers the first IP in X-Forwarded-For over the socket address', () => {
    const req = {
        headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
        connection: { remoteAddress: '10.0.0.1' },
        socket: { remoteAddress: '10.0.0.1' },
    };
    assert.equal(parseDevice(req).ip, '203.0.113.5');
});

test('parseDevice: falls back to socket.remoteAddress when there is no X-Forwarded-For', () => {
    const req = { headers: {}, connection: {}, socket: { remoteAddress: '192.168.1.1' } };
    assert.equal(parseDevice(req).ip, '192.168.1.1');
});
