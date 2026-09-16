import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ZenBeacon } from '@/components/ZenBeacon';

test('renders the scanning beacon as an accessible transparent SVG', () => {
  const markup = renderToStaticMarkup(
    <ZenBeacon state="scanning" label="กำลังค้นหาอุปกรณ์" />,
  );

  assert.match(markup, /<svg/);
  assert.match(markup, /role="img"/);
  assert.match(markup, /aria-label="กำลังค้นหาอุปกรณ์"/);
  assert.match(markup, /zen-beacon--scanning/);
  assert.match(markup, /zen-beacon__sweep/);
  assert.match(markup, /zen-beacon__ticks/);
  assert.doesNotMatch(markup, /<rect[^>]+fill=/);
});

test('reuses the beacon geometry for connecting and success states', () => {
  const connecting = renderToStaticMarkup(
    <ZenBeacon state="connecting" decorative />,
  );
  const success = renderToStaticMarkup(
    <ZenBeacon state="success" decorative />,
  );

  assert.match(connecting, /aria-hidden="true"/);
  assert.match(connecting, /zen-beacon--connecting/);
  assert.match(connecting, /zen-beacon__orbit/);
  assert.match(success, /zen-beacon--success/);
  assert.match(success, /zen-beacon__check/);
});
