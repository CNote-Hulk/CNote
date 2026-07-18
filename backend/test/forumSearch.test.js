'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { installMockDb } = require('./helpers/mockDb');

// Must run before forum.js (or anything it requires) ever does require('../db').
const mockPool = installMockDb();

const forumRoutes = require('../routes/forum');

async function withServer(fn) {
    const app = express();
    app.use('/api/forum', forumRoutes);
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    try {
        await fn(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

test('GET /api/forum/search with no query returns an empty list without touching the DB', async () => {
    mockPool.query = async () => { throw new Error('pool.query should not be called for an empty query'); };
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/forum/search`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.deepEqual(body, { success: true, threads: [] });
    });
});

test('GET /api/forum/search?q= runs a case-insensitive title/body search and returns matches', async () => {
    const fakeThread = {
        id: 7, title: 'Retro repair tips', console: 'general', tag: 'Guide',
        created_at: '2026-01-01T00:00:00.000Z', username: 'tester', snippet: 'Some tips for retro repair...',
    };
    mockPool.query = async (sql, params) => {
        assert.match(sql, /WHERE t\.title ILIKE \$1 OR t\.body ILIKE \$1/);
        assert.equal(params[0], '%repair%');
        assert.equal(params[1], 8); // default limit
        return { rows: [fakeThread] };
    };
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/forum/search?q=repair`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.deepEqual(body.threads, [fakeThread]);
    });
});

test('GET /api/forum/search?q=&limit= clamps the limit into [1, 20]', async () => {
    mockPool.query = async (sql, params) => {
        assert.equal(params[1], 20);
        return { rows: [] };
    };
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/forum/search?q=nes&limit=999`);
        assert.equal(res.status, 200);
    });
});

test('GET /api/forum/search returns 500 on a DB error instead of crashing', async () => {
    mockPool.query = async () => { throw new Error('boom'); };
    await withServer(async (base) => {
        const res = await fetch(`${base}/api/forum/search?q=nes`);
        assert.equal(res.status, 500);
        const body = await res.json();
        assert.equal(body.success, false);
    });
});
