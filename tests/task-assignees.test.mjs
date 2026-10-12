import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesTaskAssignee } from '../src/lib/taskAssignees.js';
import { computeWorkload } from '../src/lib/taskStats.js';

test('my tasks match the account ID even when names overlap or change', () => {
  assert.equal(matchesTaskAssignee({ assignedUserId: 'recA', assignedTo: 'Renamed' }, 'Mine', 'recA'), true);
  assert.equal(matchesTaskAssignee({ assignedUserId: 'recB', assignedTo: 'Haitham' }, 'Mine', 'recA'), false);
  assert.equal(matchesTaskAssignee({ assignedTo: 'Haitham' }, 'Mine', 'recA'), false);
  assert.equal(matchesTaskAssignee({}, 'Mine', undefined), false);
});

test('responsible filter uses account IDs and all preserves legacy tasks', () => {
  assert.equal(matchesTaskAssignee({ assignedUserId: 'recB' }, 'recB', 'recA'), true);
  assert.equal(matchesTaskAssignee({ assignedUserId: 'recA' }, 'recB', 'recA'), false);
  assert.equal(matchesTaskAssignee({ assignedTo: 'Legacy' }, 'All', 'recA'), true);
});

test('workload has only actual assignees without fixed names', () => {
  assert.deepEqual(computeWorkload([]), []);
  assert.deepEqual(computeWorkload([{ assignedTo: 'New user', status: 'Todo' }]).map(row => row.name), ['New user']);
});
