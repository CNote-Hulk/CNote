'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ALLOWED_LANGS, DEFAULT_LANG } = require('../utils/languages');

test('languages: DEFAULT_LANG is one of ALLOWED_LANGS', () => {
    assert.ok(ALLOWED_LANGS.includes(DEFAULT_LANG));
});

test('languages: no duplicate language codes', () => {
    assert.equal(new Set(ALLOWED_LANGS).size, ALLOWED_LANGS.length);
});
