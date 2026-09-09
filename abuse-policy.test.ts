import assert from 'node:assert/strict';
import test from 'node:test';

import { SlidingWindowLimiter, blockKey, isBlocked } from './abuse-policy';

test('blocks the same peer pair after the configured burst and reports retry time', () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  assert.equal(limiter.attempt('ip-a:receiver', 1_000).allowed, true);
  assert.equal(limiter.attempt('ip-a:receiver', 2_000).allowed, true);
  assert.equal(limiter.attempt('ip-a:receiver', 3_000).allowed, true);
  const denied = limiter.attempt('ip-a:receiver', 4_000);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterMs, 57_000);
  assert.equal(limiter.attempt('ip-a:receiver', 61_001).allowed, true);
});

test('uses directional block relationships', () => {
  const blocked = new Set([blockKey('receiver-peer', 'sender-peer')]);
  assert.equal(isBlocked(blocked, 'receiver-peer', 'sender-peer'), true);
  assert.equal(isBlocked(blocked, 'sender-peer', 'receiver-peer'), false);
});

