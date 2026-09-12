import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const serverPath = path.resolve(process.cwd(), 'server.ts');
const server = readFileSync(serverPath, 'utf8');

test('wires terminal transfer lifecycle events on the signaling server', () => {
  for (const event of ['file-preparing', 'file-cancel', 'file-complete', 'block-peer', 'unblock-peer']) {
    assert.match(server, new RegExp(`socket\\.on\\('${event}'`));
  }
  assert.match(server, /OFFER_TTL_MS/);
  assert.match(server, /hasLiveInboundTicket/);
});

test('rejects blocked, busy and rate-limited offers with terminal responses', () => {
  assert.match(server, /reason: 'blocked'/);
  assert.match(server, /(?:reason:\s*|rejectOffer\()'busy'/);
  assert.match(server, /targetedOfferLimiter\.attempt/);
});
