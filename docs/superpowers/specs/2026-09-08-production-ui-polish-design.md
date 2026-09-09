# ZenSend production UI polish design

Date: 2026-09-08

## Purpose

Finish the existing ZenSend interface without replacing its recognizable visual identity. The work focuses on reliable mobile proportions, a consistent interaction language, clearer transfer history, a maintainable sound system, a simplified brand asset set, and accurate metadata for the Vercel release.

The primary mobile reference is iPhone 16 Pro at a 402 × 874 CSS viewport with Safari chrome reducing the usable vertical area. The complete first action should remain visible without the radar dominating the page.

## Visual direction

The direction is **Calm Signal Utility**: precise, light, and technical, with cyan/indigo as the signal accent and neutral surfaces carrying most of the interface. The radar remains the visual anchor. Depth comes from borders, surface contrast, restrained gradients, and motion rather than hover elevation or blurred shadows.

The existing horse mark remains the brand mark during this pass. It will be simplified into a small-size vector variant for the header, favicon, and PWA icons while keeping the full mark for larger brand uses. Light and dark themes use the same geometry with theme-specific colors; they do not use unrelated logo shapes.

## Mobile workspace and radar

- Consolidate radar sizing into one component-level variable rather than allowing multiple breakpoint files to override it.
- At an iPhone 16 Pro viewport, the radar stage targets 136–148 px. The visible pulse envelope should remain within roughly 190 px.
- Use width and available viewport height together. Small-height screens reduce the stage before text or actions are pushed below the fold.
- Tighten the toolbar-to-radar and radar-to-heading spacing. Keep enough separation to show hierarchy without creating an empty vertical band.
- Keep the three-step helper hidden on mobile. The headline, mode hint, QR action, and help action are sufficient.
- Keep QR as the primary action. Render the connection guide as a quieter bordered or text action.
- Preserve continuous radar motion while discovery is active. Reduce beam width, pulse expansion, and glow opacity so the apparent footprint matches the layout footprint.
- Do not add `!important` declarations or reduced-motion overrides in this pass. Remove conflicting declarations from the touched component rules as they are consolidated.

## Motion and effects

- Splash plays once and dissolves into the workspace with no blank frame.
- Discovery-to-device-list transition collapses or softens the radar and reveals the device list in 220–320 ms.
- Mode changes use color, border, and a short signal sweep rather than elevation.
- Buttons and cards use surface tint, border color, inset line, or a short accent-line movement for hover/focus feedback.
- Remove hover lift, colored drop shadows, and decorative glow from the touched workspace, history, modal, and primary-action styles.
- Continuous animation is reserved for discovery and active transfer. Other motion is event-driven.

## Sound system

Replace the long conditional oscillator implementation with a declarative sound engine:

- A shared audio context, master gain, mute state, volume state, cue cooldowns, and iOS unlock behavior.
- Reusable primitives for tones, filtered noise, envelopes, and note sequences.
- Semantic cues grouped into UI, discovery, transfer, and warning families.
- A default **Zen Pulse** palette with clear, restrained cues.
- An optional **Signal Lab** palette with stranger digital and spatial cues.
- Sound settings expose mute, volume, palette selection, and cue previews.
- No hover sounds. Routine taps remain quiet or extremely short. Important events such as peer discovery, incoming offers, successful transfers, and failures remain unmistakable.
- Missing or suspended audio must never block the underlying action.

## Transfer history

Use a stable row layout:

- Leading monochrome SVG icon.
- Main column containing filename or message preview, peer/direction, and status.
- Trailing time column on wide screens.
- Actions move to a bottom row on narrow screens.
- File size and status align to the content column instead of floating independently.
- Remove card lift and drop shadow. Separate records with surface tone, border, and a direction accent.
- Keep emoji only for user/device avatars. Replace all other emoji status, file, warning, and error symbols in the touched flows with Lucide-style SVG icons.
- Preserve keyboard access to message records, forwarding, individual deletion, and clear-history confirmation.

## Brand assets and metadata

- Keep the existing horse concept and redraw/simplify it as a compact SVG suitable for 16–48 px use.
- Use one logo geometry with light and dark color treatments through CSS or theme-aware assets.
- Keep the detailed horse asset available as a reversible fallback and for large promotional use.
- Generate a new 1200 × 630 Open Graph image consistent with the final interface and simplified mark.
- Align title, description, Open Graph, Twitter, manifest, icons, canonical production URL, and theme colors.
- Remove unsupported absolute security claims such as “ปลอดภัย 100%”. Describe direct P2P behavior accurately.
- Use `NEXT_PUBLIC_SITE_URL` for the canonical Vercel production domain and verify the fallback domain.

## Implementation boundaries

The work is split into reviewable stages:

1. CSS consolidation and mobile radar/layout.
2. Motion and non-shadow interaction effects.
3. History layout and non-avatar icon cleanup.
4. Sound engine and sound settings.
5. Simplified vector brand asset, icons, Open Graph asset, and metadata.
6. Cross-device verification and production build.

Each stage should preserve current behavior and be independently reversible using the snapshot at `backups/ui-before-production-pass-2026-09-08`.

## Verification

- Viewports: 320 × 740, 375 × 812, 390 × 844, 402 × 874, 768 × 1024, 1024 × 768, and 1440 × 900.
- Light and dark themes at mobile and desktop widths.
- Splash, discovery, peer arrival, mode switching, modal entry/exit, transfer progress, success, failure, and history flows.
- Touch targets, keyboard focus order, dialog focus containment, long device names, long filenames, Thai and Latin text, and horizontal overflow.
- Sound playback and mute/volume/palette persistence on desktop and iOS Safari after a user gesture.
- P2P text and representative file transfers between isolated browser origins.
- Production build, TypeScript, lint, PWA manifest, icons, metadata, and the 1200 × 630 social preview.

## Out of scope

- Replacing the horse concept with an unrelated brand identity.
- Changing signaling, WebRTC, storage, or transfer protocols unless verification reveals a regression caused by this UI work.
- Adding hover-only actions or sound feedback.
