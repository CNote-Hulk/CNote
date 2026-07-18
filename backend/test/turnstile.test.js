'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { verifyTurnstileToken } = require('../utils/turnstile');

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    global.fetch = ORIGINAL_FETCH;
});

test('verifyTurnstileToken: skips verification in development when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = 'development';
    const result = await verifyTurnstileToken(undefined);
    assert.equal(result.success, true);
});

test('verifyTurnstileToken: fails closed in production when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = 'production';
    const result = await verifyTurnstileToken('some-token');
    assert.equal(result.success, false);
});

test('verifyTurnstileToken: rejects a missing token when a secret IS configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const result = await verifyTurnstileToken(undefined);
    assert.equal(result.success, false);
});

test('verifyTurnstileToken: succeeds when Cloudflare reports success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    global.fetch = async () => ({ json: async () => ({ success: true }) });
    const result = await verifyTurnstileToken('valid-token', '1.2.3.4');
    assert.equal(result.success, true);
});

test('verifyTurnstileToken: fails when Cloudflare reports failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    global.fetch = async () => ({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
    const result = await verifyTurnstileToken('bad-token');
    assert.equal(result.success, false);
});

test('verifyTurnstileToken: treats a network error as verification failure, not a throw', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    global.fetch = async () => { throw new Error('network down'); };
    const result = await verifyTurnstileToken('some-token');
    assert.equal(result.success, false);
});
