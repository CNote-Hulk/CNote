'use strict';

/**
 * installMockDb
 * @description Pre-populates require.cache for '../../db' with a fake pool BEFORE
 * any route/middleware file requires it, so `require('../db')` never executes the
 * real db.js module — which opens a real Postgres connection at import time and
 * calls process.exit(1) if that connection fails (fatal for CI, where no DB is
 * reachable). Must be called before any require() of a route or middleware file.
 * @param {(sql: string, params?: any[]) => Promise<{rows: any[]}>} [queryImpl]
 * @returns {{query: Function}} the installed mock pool, so tests can override .query per-case
 */
function installMockDb(queryImpl) {
    const dbPath = require.resolve('../../db');
    const mockPool = { query: queryImpl || (async () => ({ rows: [] })) };
    require.cache[dbPath] = {
        id: dbPath,
        filename: dbPath,
        loaded: true,
        exports: mockPool,
    };
    return mockPool;
}

module.exports = { installMockDb };
