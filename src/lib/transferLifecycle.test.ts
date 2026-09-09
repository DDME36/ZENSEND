import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesTransfer, shouldReportProgress } from './transferLifecycle';

test('terminal events only affect their matching transfer', () => {
  assert.equal(matchesTransfer('file-a', 'file-a'), true);
  assert.equal(matchesTransfer('file-a', 'file-b'), false);
  assert.equal(matchesTransfer(null, 'file-a'), false);
});

test('progress reports the first chunk immediately, then throttles updates', () => {
  assert.equal(shouldReportProgress(64_000, 1_000_000, 0, 1_000, 1_010), true);
  assert.equal(shouldReportProgress(96_000, 1_000_000, 64_000, 1_010, 1_050), false);
  assert.equal(shouldReportProgress(330_000, 1_000_000, 64_000, 1_010, 1_050), true);
  assert.equal(shouldReportProgress(100_000, 1_000_000, 64_000, 1_010, 1_150), true);
  assert.equal(shouldReportProgress(1_000_000, 1_000_000, 900_000, 1_100, 1_101), true);
});
