'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isDisposableEmail } = require('../utils/disposableEmail');

test('isDisposableEmail: flags known throwaway providers, case-insensitively', () => {
    assert.equal(isDisposableEmail('someone@mailinator.com'), true);
    assert.equal(isDisposableEmail('someone@MAILINATOR.COM'), true);
    assert.equal(isDisposableEmail('x@10minutemail.com'), true);
    assert.equal(isDisposableEmail('x@guerrillamail.com'), true);
});

test('isDisposableEmail: does not flag ordinary email providers', () => {
    assert.equal(isDisposableEmail('someone@gmail.com'), false);
    assert.equal(isDisposableEmail('someone@yahoo.com'), false);
    assert.equal(isDisposableEmail('someone@consolenotebook.com'), false);
});

test('isDisposableEmail: handles malformed input without throwing', () => {
    assert.equal(isDisposableEmail(''), false);
    assert.equal(isDisposableEmail(undefined), false);
    assert.equal(isDisposableEmail('not-an-email'), false);
});
