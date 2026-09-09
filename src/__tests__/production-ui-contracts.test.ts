import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('loads one final production polish layer without animation suppressors', () => {
  const layout = read('src/app/layout.tsx');
  const css = read('src/app/production-polish.css');

  assert.match(layout, /import ['"]\.\/production-polish\.css['"];?\s*\nimport \{ ErrorBoundary/);
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /prefers-reduced-motion|reduced-motion/);
  assert.equal((css.match(/--home-radar-core:/g) || []).length, 1);
  assert.match(css, /contain: layout;/);
});

test('ships stable history hooks, one automatic sound identity, horse artwork and centralized metadata', () => {
  const history = read('src/components/modals/HistoryModal.tsx');
  const palettes = read('src/lib/audio/palettes.ts');
  const soundHook = read('src/hooks/useSound.ts');
  const metadata = read('src/lib/siteMetadata.ts');
  const header = read('src/components/Header.tsx');

  for (const hook of ['history-row__icon', 'history-row__main', 'history-row__time', 'history-row__actions']) {
    assert.match(history, new RegExp(hook));
  }
  assert.match(palettes, /zenPulseCues/);
  assert.doesNotMatch(palettes, /signalLab|soundPalettes/);
  assert.doesNotMatch(header, /sound-settings|sound-palette|sound-volume|setPalette|setVolume/);
  assert.doesNotMatch(soundHook, /zensend_sound_palette|zensend_sound_volume|setPalette|setVolume/);
  assert.match(metadata, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(metadata, /Zend|100%/);
  assert.match(header, /zensend-z-horse\.png/);
});

test('plays Zen Pulse cues across the real transfer lifecycle', () => {
  const page = read('src/app/page.tsx');

  for (const cue of ['whoosh', 'sending', 'progress25', 'progress50', 'progress75', 'complete']) {
    assert.match(page, new RegExp(`play\\('${cue}'\\)`));
  }
});

test('keeps the mode wave lightweight and restores the normal palette quickly', () => {
  const radar = read('src/components/ZenRadar.tsx');
  const header = read('src/components/Header.tsx');
  assert.doesNotMatch(radar, /ripple-3/);
  assert.match(radar, /}, 1100\)/);
  assert.match(header, /zensend-z-horse\.png/);
});

test('keeps the home radar contained and uses a curved sonar sweep', () => {
  const emptyState = read('src/components/EmptyState.tsx');
  const css = read('src/app/production-polish.css');

  assert.match(emptyState, /radar-sonar-sweep/);
  assert.match(emptyState, /radar-sonar-arc/);
  assert.doesNotMatch(emptyState, /radar-sweep-beam|pulse-3/);
  assert.match(css, /@keyframes radarSonarOrbit/);
  assert.match(css, /@keyframes radarPulseContained/);
  assert.doesNotMatch(css, /--home-radar-envelope/);
});

test('ships deterministic transfer cancellation, busy handling and indeterminate startup states', () => {
  const hook = read('src/hooks/usePeerConnection.ts');
  const progress = read('src/components/TransferProgress.tsx');

  assert.match(hook, /socket\.on\('file-cancel'/);
  assert.match(hook, /socket\.on\('file-error'/);
  assert.match(hook, /reason:\s*'busy'/);
  assert.match(hook, /socketRef\.current\?\.emit\('file-cancel'/);
  assert.match(hook, /createDataChannel\('file-transfer', \{ ordered: true \}\)/);
  assert.match(progress, /\{showProgress && \(\s*<div className="transfer-progress-container">/);
});

test('requires confirmation before blocking and provides persistent unblock management', () => {
  const page = read('src/app/page.tsx');
  const header = read('src/components/Header.tsx');
  const peerCard = read('src/components/PeerCard.tsx');
  const modal = read('src/components/modals/BlockedPeersModal.tsx');

  assert.match(page, /setPendingBlock\(\{ peer, rejectOffer: true \}\)/);
  assert.match(page, /confirmText="Block"/);
  assert.match(page, /unblockRemotePeer\(peerId\)/);
  assert.match(header, /Blocked/);
  assert.match(modal, /[Uu]nblock/);
  assert.match(modal, /blockedAt/);
  assert.doesNotMatch(peerCard, /🚫/);
  assert.doesNotMatch(page, /auto.?block|block.*automat/i);
});

test('keeps radar and notification effects clipped to their rounded geometry', () => {
  const css = read('src/app/production-polish.css');

  assert.match(css, /\.compact-workspace \.empty-radar-stage\s*\{[^}]*contain:\s*layout;/);
  assert.doesNotMatch(css, /\.compact-workspace \.empty-radar-stage\s*\{[^}]*contain:\s*layout paint;/);
  assert.match(css, /#toastContainer\s*\{[^}]*overflow:\s*visible;/);
  assert.match(css, /\.toast\s*\{[^}]*overflow:\s*clip;/);
  assert.match(css, /\.toast\s*\{[^}]*box-shadow:\s*none;/);
});

test('uses structured history metadata and a restrained message reader', () => {
  const history = read('src/components/modals/HistoryModal.tsx');
  const css = read('src/app/production-polish.css');

  assert.match(history, /history-row__meta/);
  assert.match(history, /history-status-pill/);
  assert.match(css, /\.modal-history \.history-status-pill/);
  assert.match(css, /\.modal-text-view \.text-view-scroll-area/);
  assert.match(css, /\.modal-history \.history-card\s*\{[^}]*box-shadow:\s*none;/);
});

test('keeps long history rows readable and discard confirmation above the save sheet', () => {
  const page = read('src/app/page.tsx');
  const css = read('src/app/production-polish.css');

  assert.match(page, /<DownloadReadyModal\s+show=\{!showDiscardConfirm\}/);
  assert.match(page, /onDiscard=\{\(\) => setShowDiscardConfirm\(true\)\}/);
  assert.match(page, /onConfirm=\{\(\) => \{\s*setShowDiscardConfirm\(false\);\s*dismissPendingDownload\(\);/);
  assert.match(css, /\.modal-history \.history-list\s*\{[^}]*grid-auto-rows:\s*max-content;/);
  assert.match(css, /\.modal-history \.history-list\s*\{[^}]*align-content:\s*start;/);
  assert.match(css, /\.modal-history \.history-peer\s*\{[^}]*text-overflow:\s*ellipsis;/);
  assert.match(css, /\.modal-history \.history-row__main\s*\{[^}]*text-align:\s*start;/);
  assert.match(css, /\.confirm-overlay\s*\{[^}]*z-index:\s*10010;/);
});

test('ships opaque self-dismissing toasts and allows rapid file sending', () => {
  const toast = read('src/components/Toast.tsx');
  const css = read('src/app/globals.css');
  const page = read('src/app/page.tsx');

  // Toasts must auto-dismiss even for errors
  assert.match(toast, /timeoutMs/);
  assert.doesNotMatch(toast, /if \(!action && type !== 'error'\)/);

  // Toast container and background must be opaque
  assert.match(css, /#toastContainer/);
  assert.match(css, /background: #221115/);
  assert.match(css, /background: #ffffff/);

  // No spam-strike or auto-block on file offer
  assert.doesNotMatch(page, /recordRejection/);
});
