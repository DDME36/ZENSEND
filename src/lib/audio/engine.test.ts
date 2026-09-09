import assert from 'node:assert/strict';
import test from 'node:test';

import { createCooldownGate } from './engine';
import { zenPulseCues } from './palettes';

test('prevents the same cue from stacking inside its cooldown', () => {
  const gate = createCooldownGate();
  assert.equal(gate('tap', 1000, 30), true);
  assert.equal(gate('tap', 1010, 30), false);
  assert.equal(gate('tap', 1031, 30), true);
  assert.equal(gate('success', 1010, 120), true);
});

test('Zen Pulse covers every semantic cue with distinct layered moments', () => {
  const pulseCues = Object.keys(zenPulseCues).sort();
  assert.ok(pulseCues.includes('notification'));
  assert.ok(pulseCues.includes('progress75'));
  assert.ok(zenPulseCues.connect.steps.length >= 3);
  assert.ok(zenPulseCues.complete.steps.length >= 4);
  assert.notDeepEqual(zenPulseCues.notification.steps, zenPulseCues.complete.steps);
});
