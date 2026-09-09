# ZenSend Production UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish ZenSend's existing interface for production by correcting mobile proportions, refining transitions and slash effects, rebuilding sound feedback, stabilizing History layout, simplifying the brand mark, and completing share metadata.

**Architecture:** Preserve the current React/Next.js component structure and visual direction. Add one final scoped polish stylesheet for authoritative responsive sizing and interaction states, move sound cues into declarative palette data behind a reusable audio engine, and centralize site metadata. Keep the current UI snapshot in `backups/ui-before-production-pass-2026-09-08` as the rollback reference.

**Tech Stack:** Next.js, React, TypeScript, CSS, Web Audio API, Node test runner, Playwright/browser inspection, Sharp for raster brand assets when available.

**Spec:** `docs/superpowers/specs/2026-09-08-production-ui-polish-design.md`

**Status:** Complete on 2026-09-08. Verification details are recorded in `docs/ux-ui-verification.md`. This workspace is not a Git repository, so no merge or pull-request step applies.

## Global Constraints

- Preserve the existing product identity and interaction flow.
- Do not add `!important` declarations.
- Do not add reduced-motion media queries or animation suppression rules.
- Keep emoji only where they are intentionally used as avatars.
- Replace hover lift, colored drop shadows, and decorative card shadows in touched surfaces with border, color, opacity, or restrained background changes.
- Treat 402×874 CSS pixels as the main iPhone 16 Pro reference and verify the additional viewports named in the design spec.
- Keep every change reversible against `backups/ui-before-production-pass-2026-09-08`.

---

## Task 1: Establish enforceable UI contracts

**Files:**
- Create: `src/__tests__/production-ui-contracts.test.ts`
- Modify: `package.json`

- [ ] Add a source-level test that checks the production polish stylesheet is imported last, contains one authoritative radar size system, and contains neither `!important` nor reduced-motion rules.
- [ ] Add contract checks for compact brand SVG availability, centralized metadata, declarative sound palettes, and History's stable row hooks.
- [ ] Run the focused test and confirm it fails because the new production files and hooks do not exist yet.
- [ ] Add a `test:ui-contracts` script using the repository's existing TypeScript test setup.

## Task 2: Correct mobile proportions and hierarchy

**Files:**
- Create: `src/app/production-polish.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/workspace.css`
- Modify: `src/app/brand.css`
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/components/ModeSelector.tsx`

- [ ] Import `production-polish.css` after all existing application styles.
- [ ] Remove conflicting radar size overrides from the touched mobile rules in `workspace.css` and `brand.css`.
- [ ] Define a single responsive radar stage using width and viewport-height bounds; target a 136–148px core stage and about a 190px visible pulse envelope at 402×874.
- [ ] Tighten the vertical rhythm between toolbar, radar, heading, helper text, discovery status, Wi-Fi hint, QR action, and connection guide.
- [ ] Keep the current three-step discovery message while making the QR action visually primary and the guide action quieter.
- [ ] Replace touched card/button shadows with borders and tonal surfaces; keep keyboard focus visible.
- [ ] Run UI contract tests until the radar and stylesheet constraints pass.
- [ ] Inspect 320×740, 375×812, 390×844, 402×874, and 768×1024 in the browser; capture screenshots for comparison with the supplied iPhone image.

## Task 3: Refine page transitions and slash effects

**Files:**
- Modify: `src/app/production-polish.css`
- Modify: `src/app/page.tsx`
- Modify: relevant splash/transition component under `src/components`

- [ ] Add explicit state classes/data attributes for splash exit, workspace entrance, discovery-to-peer transition, and mode switching.
- [ ] Keep the existing slash visual language but constrain its travel, opacity, and clipping so it never covers primary copy or controls.
- [ ] Use short 220–320ms transitions with transform and opacity only for page/state entry; use border/background/signal sweep for mode changes.
- [ ] Remove hover lift and shadow growth from touched interactive components.
- [ ] Verify navigation and state changes replay reliably without adding reduced-motion overrides.

## Task 4: Stabilize History layout and icon language

**Files:**
- Modify: `src/components/HistoryModal.tsx`
- Modify: `src/app/production-polish.css`
- Modify: shared icon component(s) if present

- [ ] Add stable semantic hooks for History row icon, main content, timestamp, metadata, preview, and actions.
- [ ] Use a three-column grid on wider screens and move actions to a full-width bottom row on narrow screens.
- [ ] Align filename, peer, time, size, and status to a consistent baseline and spacing scale.
- [ ] Replace non-avatar emoji in the History flow with the existing SVG icon system.
- [ ] Remove History card lift and drop shadows; use border, divider, and background tone for grouping.
- [ ] Verify long filenames, Thai text, text previews, empty state, success, failure, and incoming/outgoing records.

## Task 5: Rebuild the sound system around palettes

**Files:**
- Create: `src/lib/audio/types.ts`
- Create: `src/lib/audio/palettes.ts`
- Create: `src/lib/audio/engine.ts`
- Create: `src/lib/audio/engine.test.ts`
- Modify: `src/hooks/useSound.ts`
- Modify: sound settings UI in `src/components`

- [ ] Write failing unit tests for volume clamping, mute state, per-cue cooldown, palette lookup, and deterministic cue scheduling.
- [ ] Define reusable oscillator/noise primitives and semantic cues rather than a long conditional chain.
- [ ] Provide two palettes: `Zen Pulse` as the restrained default and `Signal Lab` as the stranger digital option.
- [ ] Reuse one AudioContext and master gain; support iOS unlock, persisted mute, persisted volume, persisted palette, and cooldown protection.
- [ ] Keep the existing `playSound(type)` public API so current call sites continue to work.
- [ ] Add settings controls for mute, volume, palette selection, and preview buttons without hover sounds.
- [ ] Run the audio unit tests and manually verify key cues: tap, mode change, peer found, sending, progress milestones, success, reject, and notification.

## Task 6: Simplify the logo and complete production metadata

**Files:**
- Create: `public/zensend-mark.svg`
- Create: `src/lib/siteMetadata.ts`
- Create/Modify: `public/og-image.png`
- Modify: `src/app/layout.tsx`
- Modify: `public/manifest.json`
- Modify: header/brand component under `src/components`

- [ ] Create a compact horse/Z SVG with one geometry that reads clearly from 16–48px and inherits theme-specific colors.
- [ ] Keep the detailed horse asset available as a fallback in the backup and public assets.
- [ ] Update the header to use the compact mark with consistent sizing in light and dark modes.
- [ ] Centralize product title, Thai/English description, canonical base URL, Open Graph fields, and Twitter fields; use `NEXT_PUBLIC_SITE_URL` with the current production URL as fallback.
- [ ] Remove the `Zend` typo and unsupported absolute-safety claim.
- [ ] Update manifest naming, colors, and icons to match ZenSend.
- [ ] Generate a 1200×630 Open Graph image matching the simplified brand and verify its dimensions and legibility.
- [ ] Run UI contract tests for logo and metadata.

## Task 7: Production verification and cleanup

**Files:**
- Modify: `docs/ux-ui-verification.md`
- Modify: any touched source needed to resolve verified defects

- [ ] Search touched/new files to confirm there are no new `!important`, reduced-motion rules, non-avatar emoji icons, hover lifts, or decorative shadows.
- [ ] Run focused unit tests, the complete test suite, lint, type checking, and production build.
- [ ] Test light and dark themes at 320×740, 375×812, 390×844, 402×874, 768×1024, 1024×768, and 1440×900.
- [ ] Exercise first load, splash transition, mode change, QR flow, peer discovery, text send/read, file send, History, settings, modal focus, and sound unlock.
- [ ] Record final verification evidence and any environment-only limitations in `docs/ux-ui-verification.md`.
- [ ] Compare the final 402×874 screenshot with the supplied iPhone screenshot and confirm that the radar no longer crowds or pushes the primary content below the usable area.
