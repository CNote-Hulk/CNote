'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const { installMockDb } = require('./helpers/mockDb');

const JWT_SECRET = 'test-secret-for-auth-middleware';

// Must run before middleware/auth.js (or anything else that does require('../db'))
// is ever required, otherwise the real db.js module loads and tries to open a
// live Postgres connection — fatal in CI, where no DB is reachable.
const mockPool = installMockDb();

const { authRequired, authOptional } = require('../middleware/auth');

function buildApp() {
    const app = express();
    app.set('JWT_SECRET', JWT_SECRET);
    app.get('/protected', authRequired, (req, res) => {
        res.json({ success: true, userId: req.user.id });
    });
    app.get('/optional', authOptional, (req, res) => {
        res.json({ success: true, userId: req.user ? req.user.id : null });
    });
    return app;
}

async function withServer(fn) {
    const server = buildApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    try {
        await fn(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

const FAKE_USER = { id: 42, username: 'tester' };

test('authRequired: no token at all is rejected with 401', async () => {
    mockPool.query = async () => { throw new Error('pool.query should not be called when there is no token'); };
    await withServer(async (base) => {
        const res = await fetch(`${base}/protected`);
        assert.equal(res.status, 401);
        const body = await res.json();
        assert.equal(body.success, false);
    });
});

test('authRequired: valid JWT for an existing user attaches req.user and proceeds', async () => {
    mockPool.query = async (sql, params) => {
        assert.match(sql, /FROM users WHERE id = \$1/);
        assert.deepEqual(params, [FAKE_USER.id]);
        return { rows: [FAKE_USER] };
    };
    const token = jwt.sign({ userId: FAKE_USER.id }, JWT_SECRET);
    await withServer(async (base) => {
        const res = await fetch(`${base}/protected`, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.userId, FAKE_USER.id);
    });
});

test('authRequired: valid JWT for a since-deleted user is rejected with 401', async () => {
    mockPool.query = async () => ({ rows: [] });
    const token = jwt.sign({ userId: 999 }, JWT_SECRET);
    await withServer(async (base) => {
        const res = await fetch(`${base}/protected`, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(res.status, 401);
    });
});

test('authRequired: garbage token with no matching session is rejected with 401', async () => {
    mockPool.query = async (sql) => {
        // Falls through to the session-token fallback lookup, which finds nothing.
        assert.match(sql, /FROM user_sessions/);
        return { rows: [] };
    };
    await withServer(async (base) => {
        const res = await fetch(`${base}/protected`, { headers: { Authorization: 'Bearer not-a-real-jwt' } });
        assert.equal(res.status, 401);
    });
});

test('authOptional: no token proceeds anonymously without touching the DB', async () => {
    mockPool.query = async () => { throw new Error('pool.query should not be called when there is no token'); };
    await withServer(async (base) => {
        const res = await fetch(`${base}/optional`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.userId, null);
    });
});

test('authOptional: valid JWT attaches req.user', async () => {
    mockPool.query = async () => ({ rows: [FAKE_USER] });
    const token = jwt.sign({ userId: FAKE_USER.id }, JWT_SECRET);
    await withServer(async (base) => {
        const res = await fetch(`${base}/optional`, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.userId, FAKE_USER.id);
    });
});
