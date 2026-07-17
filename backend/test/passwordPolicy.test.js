'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('../utils/passwordPolicy');

test('validatePassword: rejects passwords missing each required character class', () => {
    assert.equal(validatePassword('short1!').valid, false, 'too short');
    assert.equal(validatePassword('nouppercase1!').valid, false, 'no uppercase');
    assert.equal(validatePassword('NOLOWERCASE1!').valid, false, 'no lowercase');
    assert.equal(validatePassword('NoNumberHere!').valid, false, 'no digit');
    assert.equal(validatePassword('NoSpecial123').valid, false, 'no special char');
});

test('validatePassword: accepts a password satisfying every rule', () => {
    const result = validatePassword('Str0ng!Passw0rd');
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
});

test('validatePassword: rejects passwords over the bcrypt 72-byte limit', () => {
    const tooLong = 'Aa1!' + 'x'.repeat(70); // 74 bytes total
    const result = validatePassword(tooLong);
    assert.equal(result.valid, false);
    assert.match(result.error, /72 bytes/);
});

test('validatePassword: rejects password equal to the user\'s own email/username (case-insensitive)', () => {
    // Password must otherwise satisfy every char-class rule, so it exposes
    // the email/username check rather than the length/complexity ones.
    const matchingEmail = 'Ex@mple123';
    assert.equal(
        validatePassword(matchingEmail, { email: matchingEmail }).valid,
        false
    );
    assert.equal(
        validatePassword('Us3rname!', { username: 'Us3rname!' }).valid,
        false
    );
});

test('validatePassword: handles null/undefined input without throwing', () => {
    assert.equal(validatePassword(undefined).valid, false);
    assert.equal(validatePassword(null).valid, false);
});
