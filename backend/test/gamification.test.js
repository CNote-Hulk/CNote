'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS, XP_ACTIONS, ACHIEVEMENTS, getLevelFromXP } = require('../utils/gamification');

test('getLevelFromXP: 0 XP is level 1, not max, positive progress to next', () => {
    const result = getLevelFromXP(0);
    assert.equal(result.level, 1);
    assert.equal(result.isMaxLevel, false);
    assert.equal(result.progressPercent, 0);
});

test('getLevelFromXP: exact threshold lands on that level, not the one below', () => {
    const result = getLevelFromXP(400);
    assert.equal(result.level, 3);
    assert.equal(result.name, 'Player');
});

test('getLevelFromXP: XP above the top level caps at max level with 100% progress', () => {
    const topLevel = LEVELS[LEVELS.length - 1];
    const result = getLevelFromXP(topLevel.xpRequired + 999999);
    assert.equal(result.level, topLevel.level);
    assert.equal(result.isMaxLevel, true);
    assert.equal(result.progressPercent, 100);
    assert.equal(result.nextLevelName, null);
});

test('getLevelFromXP: negative or non-numeric XP is clamped to 0, never throws', () => {
    assert.equal(getLevelFromXP(-500).xp, 0);
    assert.equal(getLevelFromXP(NaN).xp, 0);
    assert.equal(getLevelFromXP('not a number').xp, 0);
    assert.equal(getLevelFromXP(undefined).xp, 0);
});

test('LEVELS: xpRequired is strictly increasing (no ties, no regressions)', () => {
    for (let i = 1; i < LEVELS.length; i++) {
        assert.ok(
            LEVELS[i].xpRequired > LEVELS[i - 1].xpRequired,
            `level ${LEVELS[i].level} requires ${LEVELS[i].xpRequired} XP, not more than level ${LEVELS[i - 1].level}'s ${LEVELS[i - 1].xpRequired}`
        );
    }
});

test('XP_ACTIONS: every action has a positive integer xp value and a known limit shape', () => {
    const validLimits = /^(once|per_item|daily_cap_\d+)$/;
    for (const [key, action] of Object.entries(XP_ACTIONS)) {
        assert.ok(Number.isInteger(action.xp) && action.xp > 0, `${key}.xp must be a positive integer`);
        assert.match(action.limit, validLimits, `${key}.limit "${action.limit}" doesn't match a known shape`);
    }
});

test('ACHIEVEMENTS: ids are unique and every condition has a positive threshold', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate achievement id found');
    for (const ach of ACHIEVEMENTS) {
        assert.ok(ach.condition && typeof ach.condition.type === 'string', `${ach.id} missing condition.type`);
        assert.ok(ach.condition.threshold > 0, `${ach.id}.condition.threshold must be positive`);
        assert.ok(Number.isInteger(ach.xpReward) && ach.xpReward > 0, `${ach.id}.xpReward must be a positive integer`);
    }
});

test('ACHIEVEMENTS: completionist threshold matches the actual achievement count minus itself', () => {
    const completionist = ACHIEVEMENTS.find(a => a.id === 'completionist');
    assert.ok(completionist, 'completionist achievement must exist');
    // Everyone else must unlock before completionist can, so its threshold
    // should equal "all achievements except itself".
    assert.equal(completionist.condition.threshold, ACHIEVEMENTS.length - 1);
});
