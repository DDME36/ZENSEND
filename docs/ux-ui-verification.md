# UX/UI verification — 2026-09-08

## Delivered

- Clear page heading, onboarding instructions, QR action, help and feedback links in the empty state.
- Responsive spacing and shared focus styles, larger icon targets, mobile zoom, scrollable dialogs and wrapping long content.
- Room entry supports typing/pasting numeric codes, Enter submission, pending state, persistent errors and a retry timeout.
- Shared dialog focus containment, scroll locking and focus restoration across the principal dialogs.
- Device count excludes temporarily offline peers; transfer progress exposes accessible progress semantics and clamps invalid percentages.
- Incoming text notifications provide a persistent read action. Full messages can be opened directly, or revisited through keyboard-accessible history entries.
- Toast timers are cleaned up on unmount; errors and notifications with actions remain until dismissed.

## Verified

- `npm run build`: passed, including the production client and server TypeScript compilation. Google Fonts required network access during this build.
- TypeScript `--noEmit`: passed.
- ESLint for all edited TypeScript/TSX files: passed.
- Browser: desktop, 390px mobile in light/dark themes, and 320px width (document scroll width equals viewport width).
- Room input strips nonnumeric characters, enables submission for five digits, and successfully enters a room.
- Shift+Tab from the room input wraps to Cancel.
- QR renders; Escape closes its dialog and restores focus to the QR opener.
- Two locally isolated browser origins discover one another and send/receive Thai text. The received notification remains available; its read action opens the exact full message.

## Remaining release checks

- Physical iOS/Android devices, camera permissions and native download behavior.
- Large-file transfers and TURN traversal across separate real networks.
- Comprehensive assistive-technology and automated contrast auditing.

This is a local implementation and verification pass; no deployment was performed.

## Animation follow-up

- Splash now starts the staggered workspace entrance during its 480ms dissolve, with transition completion and a timer fallback. Repeated skips no longer abruptly cut the exit.
- Fixed the missing visible states on the sparkle and skip hint.
- One-time stage entrances wait until the splash begins revealing the workspace; device discovery has a scoped entrance animation.
- Removed motion-suppression blocks from workspace.css and usability.css as requested. No new !important declarations or reduced-motion rules were added.
- Browser verified splash content, simultaneous splash-exiting/workspace-revealed state, Escape skip with inert removed, and entry into the device list. Production build and edited-file lint passed.

## Production polish pass

- Preserved the approved UI snapshot at `backups/ui-before-production-pass-2026-09-08`.
- Consolidated the home radar around a 136–148px mobile stage; every ring is now painted inside that boundary, and short screens hide the optional step strip before shrinking primary actions.
- Replaced the triangular conic sweep, needle and leading dot with one short rotating SVG sonar arc. Reduced the ambient pulse count from three to two.
- The central beacon now uses a flat mode-tinted surface with a quiet inner border and no glow shadow.
- Replaced hover lift and decorative shadows in the touched workspace, History, sound settings and primary-action surfaces with borders and tonal state changes.
- History now uses stable icon/content/time/action columns, retaining a compact action column on narrow screens.
- Rebuilt audio as one automatic Zen Pulse identity with layered tone/noise motifs, stereo placement, one shared AudioContext, mute persistence, cooldowns and iOS unlock. Removed palette, volume and preview controls; the transfer lifecycle now plays distinct start, sending/receiving, 25/50/75%, confirming and completion cues.
- Restored the detailed PNG horse used by the intro across the header, favicon, PWA icons and 1200×630 Open Graph image after rejecting the compact SVG direction.
- Centralized canonical, Open Graph and Twitter metadata; corrected product naming and removed the unsupported absolute-safety statement.
- Mode switching now removes its temporary color wash after 1.1 seconds. Desktop renders two transform-only rings; mobile renders one. Blur and large shadow animation were removed.
- Performance tiers are explicit: desktop full visuals, mobile Lite visuals, and Eco static decoration. Eco keeps functional feedback while stopping continuous background, radar and avatar animation.
- Source search confirms no reduced-motion rules remain and the final production layer contains no `!important` declarations.
- Browser verified the PNG horse, History alignment, sound palette controls, the short WiFi transition, normal-color restoration, and the static Eco presentation.
- Automated verification: 8 focused tests, TypeScript, ESLint and the production build pass. Open Graph output is a verified 1200×630 PNG.

## Transfer reliability and abuse protection — 2026-09-09

- Socket.IO now owns a 30-second offer ticket and validates the sender, receiver and `fileId` for accept, reject, cancel, preparation, relay and completion events.
- Either participant can cancel. The matching ticket, relay, writer, pending timer, completion waiter and peer connection are cleaned up, while unrelated transfers and stale terminal events are left alone.
- A receiver can have one live inbound offer. Further offers receive an immediate busy response and no longer replace the visible confirmation dialog.
- The server returns immediate terminal errors for unavailable peers, invalid offers, expiry and rate limiting. The client maps busy, blocked, expired, cancelled and rate-limited results to distinct Thai status text.
- Offer abuse is limited by a stable IP and peer identity plus a per-target sliding window. Manual blocks require confirmation, persist in local storage, synchronize to the active server and can be removed from the new blocked-device screen.
- Pending, save preparation and WebRTC setup use an indeterminate status. Numeric progress begins on the first chunk and later updates are throttled by bytes or elapsed time to reduce React work.
- WebRTC file delivery uses a reliable ordered DataChannel. Relay startup has a bounded ready wait, chunk acknowledgements and receiver completion acknowledgement.
- Live integration verification used two Socket.IO clients against the real server for reject, concurrent-offer busy, sender cancel, accept/cancel race, block, unblock and a new transfer after race cleanup.
- Automated verification: 17 focused policy, lifecycle and UI-contract tests pass; ESLint passes; client/server TypeScript compilation and the production build pass.

### Remaining physical-device release checks

- Repeat large-file transfer and cancellation on the target iPad/iPhone while switching Wi-Fi or locking the screen.
- Verify TURN traversal and sustained relay throughput across two separate real networks.
- Confirm native save-picker cancellation behavior on Safari and Chromium with files large enough to use streaming.

## Notification, radar and history polish — 2026-09-09

- Removed paint containment from the radar stage so the circular ambient glow is no longer clipped into a visible square, while layout containment remains in place.
- Rebuilt toast surfaces around a 20px clipped radius, an internal status rail and tonal border. The toast stack allows its rounded edges to render outside the container and uses no drop shadow.
- Toast entrance and exit use short opacity and transform transitions only; stacked notifications remain separate without exposing a rectangular scrollport.
- History entries now group peer, time, item, result and size into one readable hierarchy. Direction and failure state use a slim side rail instead of card shadows.
- On a 402×874 viewport, history keeps a compact icon/content/action grid so message and file rows do not expand into oversized action sections.
- The message reader now uses a bordered reading surface and a simple one-column mobile action layout with no modal or button shadow.
- Browser verification covered light and dark history, two stacked toasts, the message reader, the desktop radar and a 402×874 mobile viewport.
- Automated verification: 10 UI-contract tests, project TypeScript, ESLint and the production client/server build pass. ESLint reports four pre-existing unused-variable warnings in `useBlockedPeers.ts` and no errors.

## History density and download discard fix — 2026-09-09

- History grid rows now keep their content height and scroll as a list, preventing long histories from compressing filenames, status pills and file sizes into clipped rows.
- Removed the inherited negative list margin and aligned row copy to the start edge. Long peer and file names truncate consistently without moving timestamps or actions.
- The download-ready sheet is hidden while discard confirmation is open, preventing two simultaneous focus traps and Escape handlers.
- Discard confirmation now renders above the download-ready overlay. Cancel returns to the same pending file; confirm clears it.
- Browser verification covered 18 long history entries plus cancel and confirm paths on desktop and a 402×874 viewport.
- Automated verification: 11 UI-contract tests, TypeScript, edited-file ESLint and the production client/server build pass.
