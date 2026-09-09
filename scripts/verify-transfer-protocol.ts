import assert from 'node:assert/strict';
import { io, type Socket } from 'socket.io-client';

const url = process.env.ZENSEND_TEST_URL || 'http://127.0.0.1:3999';

function once<T>(socket: Socket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = (data: T) => {
      clearTimeout(timeout);
      resolve(data);
    };
    socket.once(event, onEvent);
  });
}

function peer(id: string, name: string) {
  return {
    id,
    tabId: `${id}-tab`,
    name,
    device: 'Protocol test',
    critter: { emoji: 'T', name: 'Test', color: '#00aa88' },
  };
}

async function main() {
  const a = io(url, { transports: ['websocket'], reconnection: false });
  const b = io(url, { transports: ['websocket'], reconnection: false });

  try {
  await Promise.all([once(a, 'connect', 10_000), once(b, 'connect', 10_000)]);
  a.emit('join', { peer: peer('protocol-a', 'Sender'), mode: 'public' });
  b.emit('join', { peer: peer('protocol-b', 'Receiver'), mode: 'public' });
  await new Promise(resolve => setTimeout(resolve, 150));

  const firstOffer = once<{ fileId: string }>(b, 'file-offer');
  const firstReject = once<{ fileId: string; reason: string }>(a, 'file-reject');
  a.emit('file-offer', { to: 'protocol-b', fileId: 'reject-case', file: { name: 'one.txt', size: 3, type: 'text/plain' } });
  assert.equal((await firstOffer).fileId, 'reject-case');
  b.emit('file-reject', { to: 'protocol-a', fileId: 'reject-case', reason: 'rejected' });
  assert.deepEqual(await firstReject, { from: 'protocol-b', fileId: 'reject-case', reason: 'rejected' });

  const heldOffer = once<{ fileId: string }>(b, 'file-offer');
  a.emit('file-offer', { to: 'protocol-b', fileId: 'held-case', file: { name: 'held.txt', size: 4, type: 'text/plain' } });
  await heldOffer;
  const busy = once<{ fileId: string; error: string }>(a, 'file-error');
  a.emit('file-offer', { to: 'protocol-b', fileId: 'busy-case', file: { name: 'busy.txt', size: 4, type: 'text/plain' } });
  assert.equal((await busy).fileId, 'busy-case');
  const cancelAtReceiver = once<{ fileId: string; reason: string }>(b, 'file-cancel');
  a.emit('file-cancel', { to: 'protocol-b', fileId: 'held-case', reason: 'cancelled' });
  assert.equal((await cancelAtReceiver).fileId, 'held-case');

  b.emit('block-peer', { to: 'protocol-a' });
  await new Promise(resolve => setTimeout(resolve, 50));
  const blocked = once<{ fileId: string; reason: string }>(a, 'file-reject');
  a.emit('file-offer', { to: 'protocol-b', fileId: 'blocked-case', file: { name: 'blocked.txt', size: 7, type: 'text/plain' } });
  assert.equal((await blocked).reason, 'blocked');

  b.emit('unblock-peer', { to: 'protocol-a' });
  await new Promise(resolve => setTimeout(resolve, 50));
  const unblockedOffer = once<{ fileId: string }>(b, 'file-offer');
  a.emit('file-offer', { to: 'protocol-b', fileId: 'unblocked-case', file: { name: 'ok.txt', size: 2, type: 'text/plain' } });
  assert.equal((await unblockedOffer).fileId, 'unblocked-case');
  b.emit('file-reject', { to: 'protocol-a', fileId: 'unblocked-case', reason: 'rejected' });

  const raceOffer = once<{ fileId: string }>(a, 'file-offer');
  b.emit('file-offer', { to: 'protocol-a', fileId: 'race-case', file: { name: 'race.txt', size: 4, type: 'text/plain' } });
  await raceOffer;
  const cancelledAfterAccept = once<{ fileId: string; reason: string }>(a, 'file-cancel');
  a.emit('file-accept', { to: 'protocol-b', fileId: 'race-case' });
  b.emit('file-cancel', { to: 'protocol-a', fileId: 'race-case', reason: 'cancelled' });
  assert.equal((await cancelledAfterAccept).fileId, 'race-case');

  const afterRaceOffer = once<{ fileId: string }>(a, 'file-offer');
  b.emit('file-offer', { to: 'protocol-a', fileId: 'after-race-case', file: { name: 'again.txt', size: 5, type: 'text/plain' } });
  assert.equal((await afterRaceOffer).fileId, 'after-race-case');
  a.emit('file-reject', { to: 'protocol-b', fileId: 'after-race-case', reason: 'rejected' });

  console.log('Transfer protocol integration checks passed');
  } finally {
    a.close();
    b.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
