import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OFFER_TTL_MS,
  canCancelTicket,
  hasLiveInboundTicket,
  isOfferExpired,
  validPacket,
  type TransferTicket,
} from './signaling-policy';

const ticket = (overrides: Partial<TransferTicket> = {}): TransferTicket => ({
  from: 'sender-socket',
  to: 'receiver-socket',
  name: 'photo.jpg',
  size: 128,
  type: 'image/jpeg',
  accepted: false,
  createdAt: 1_000,
  updatedAt: 1_000,
  ...overrides,
});

test('validates cancellation, preparation, completion and block packets', () => {
  assert.equal(validPacket('file-preparing', { to: 'sender', fileId: 'file-1' }), true);
  assert.equal(validPacket('file-cancel', { to: 'receiver', fileId: 'file-1', reason: 'cancelled' }), true);
  assert.equal(validPacket('file-complete', { to: 'receiver', fileId: 'file-1' }), true);
  assert.equal(validPacket('block-peer', { to: 'peer-2' }), true);
  assert.equal(validPacket('unblock-peer', { to: 'peer-2' }), true);
  assert.equal(validPacket('file-cancel', { to: 'receiver' }), false);
});

test('expires unanswered offers but keeps accepted tickets live', () => {
  assert.equal(isOfferExpired(ticket(), 1_000 + OFFER_TTL_MS - 1), false);
  assert.equal(isOfferExpired(ticket(), 1_000 + OFFER_TTL_MS), true);
  assert.equal(isOfferExpired(ticket({ accepted: true }), 1_000 + OFFER_TTL_MS * 2), false);
});

test('allows either participant to cancel only their bound ticket', () => {
  const offered = ticket();
  assert.equal(canCancelTicket(offered, 'sender-socket', 'receiver-socket'), true);
  assert.equal(canCancelTicket(offered, 'receiver-socket', 'sender-socket'), true);
  assert.equal(canCancelTicket(offered, 'attacker-socket', 'sender-socket'), false);
});

test('detects a live inbound offer and ignores expired or excluded tickets', () => {
  const tickets = new Map([
    ['expired', ticket({ createdAt: 0, updatedAt: 0 })],
    ['live', ticket({ createdAt: 39_000, updatedAt: 39_000 })],
  ]);
  assert.equal(hasLiveInboundTicket(tickets, 'receiver-socket', 40_000), true);
  assert.equal(hasLiveInboundTicket(tickets, 'receiver-socket', 40_000, 'live'), false);
  assert.equal(hasLiveInboundTicket(tickets, 'other-receiver', 40_000), false);
});
