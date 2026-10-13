import assert from 'node:assert/strict';
import test from 'node:test';
import { isStoryVoteMilestone } from '../backend/notificationMilestones.ts';

test('vote milestones are tens below 100 and hundreds from 100 onward', () => {
  for (const total of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 1000, 10000]) {
    assert.equal(isStoryVoteMilestone(total), true, `total ${total}`);
  }
});

test('adjacent totals and other positive integers are not milestones', () => {
  for (const total of [1, 9, 11, 29, 31, 89, 91, 99, 101, 109, 110, 111, 190, 199, 201, 230, 999]) {
    assert.equal(isStoryVoteMilestone(total), false, `total ${total}`);
  }
});

test('zero, negative, fractional, nonfinite and unsafe totals are rejected', () => {
  for (const total of [0, -0, -10, -30, -100, 0.5, 9.5, 10.5, 29.5, 30.5, 100.1,
    NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 1e20]) {
    assert.equal(isStoryVoteMilestone(total), false, `total ${total}`);
  }
});

test('invalid input is rejected without coercion', () => {
  for (const total of [undefined, null, true, false, '', '10', '30', '100', 30n,
    Symbol('30'), [], [30], {}, new Number(30), { valueOf() { throw new Error('no coercion'); } }]) {
    assert.equal(isStoryVoteMilestone(total), false);
  }
});
