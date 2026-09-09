# Transfer Reliability and Abuse Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make offer races, cancellation, disconnects, blocking, spam, and slow transfer startup deterministic and production-ready.

**Architecture:** Keep Socket.IO as the authority for offer lifecycle and participant authorization. Extract pure policy helpers for expiry, participant checks, busy detection, and sliding-window abuse limits so edge cases are testable without browsers. The React hook mirrors only the active `fileId`, cleans matching resources, and presents protocol phases rather than a misleading 0%.

**Tech Stack:** TypeScript, React 19, Next.js 16, Socket.IO 4, WebRTC DataChannel, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-09-transfer-reliability-design.md`

## Global Constraints

- Preserve the existing ZenSend visual language and avatar emoji behavior.
- Do not add `!important` or reduced-motion rules.
- Do not silently accept, overwrite, or queue multiple inbound offers.
- Do not trade file integrity for lower latency.
- Keep blocks local-persistent and server-enforced for the current server lifetime.

---

### Task 1: Transfer and abuse policy

**Files:**
- Modify: `signaling-policy.ts`
- Create: `signaling-policy.test.ts`
- Create: `abuse-policy.ts`
- Create: `abuse-policy.test.ts`

**Interfaces:**
- Produces ticket expiry, busy-ticket, participant-cancel, block-key, and sliding-window limiter helpers used by `server.ts`.

- [x] Write failing policy tests for expired accept, sender/recipient cancel authorization, one inbound ticket, blocked pairs, and reconnect-resistant sliding windows.
- [x] Run the focused tests and confirm the new cases fail for missing behavior.
- [x] Implement the pure helpers with a 30-second offer lifetime and bounded map cleanup.
- [x] Run the focused tests and confirm all cases pass.

### Task 2: Authoritative server protocol

**Files:**
- Modify: `server.ts`
- Modify: `signaling-policy.ts`
- Test: `signaling-policy.test.ts`

**Interfaces:**
- Consumes the policy helpers from Task 1.
- Produces `file-preparing`, `file-cancel`, `block-peer`, and `unblock-peer` events plus terminal `file-reject`/`file-error` responses.

- [x] Add failing packet-validation tests for every new event and invalid participant combinations.
- [x] Extend middleware authorization so the first accept/reject/cancel terminal action wins for a matching `fileId`.
- [x] Reject expired, busy, rate-limited, and blocked offers before forwarding them.
- [x] Delete tickets and relay state on cancel, completion, timeout, mode change, and disconnect; notify the remaining participant.
- [x] Run policy tests and server TypeScript compilation.

### Task 3: Client lifecycle and responsive progress

**Files:**
- Modify: `src/hooks/usePeerConnection.ts`
- Modify: `src/components/TransferProgress.tsx`
- Create: `src/lib/transferLifecycle.ts`
- Create: `src/lib/transferLifecycle.test.ts`

**Interfaces:**
- Produces matching-file cleanup, terminal-reason mapping, and progress-report decisions.

- [x] Write failing tests for stale events, first-chunk progress, timed progress updates, and cancel cleanup.
- [x] Track the active `fileId` and emit `file-cancel` for pending, P2P, and relay transfers.
- [x] Handle `file-preparing`, `file-cancel`, `file-error`, and `rate-limit-exceeded` without waiting for the 30-second client timeout.
- [x] Reject a new incoming offer with `busy` while an offer or transfer is active instead of replacing the modal.
- [x] Render pending/preparing/connecting as indeterminate; show numeric progress only after transfer begins.
- [x] Use reliable ordered DataChannel delivery and report the first chunk, then throttle later updates by time/bytes.
- [x] Run lifecycle tests, hook TypeScript checks, and lint.

### Task 4: Block confirmation and unblock management

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/PeerCard.tsx`
- Modify: `src/hooks/useBlockedPeers.ts`
- Create: `src/components/modals/BlockedPeersModal.tsx`
- Test: `src/__tests__/production-ui-contracts.test.ts`

**Interfaces:**
- Consumes block/unblock signaling from Task 3.
- Produces a confirmed manual block flow and persistent blocked-device management screen.

- [x] Add failing UI contract tests for confirmation, no direct block call, a blocked-device menu entry, and unblock action.
- [x] Route card and incoming-offer block actions through `ConfirmModal`.
- [x] Add a blocked-device modal with name, device, blocked time, and unblock control.
- [x] Synchronize the persisted blocked IDs after connection and on block/unblock.
- [x] Remove the non-avatar block emoji and verify keyboard/dialog behavior.

### Task 5: End-to-end verification

**Files:**
- Modify: `docs/ux-ui-verification.md`

**Interfaces:**
- Records the final protocol guarantees and practical limitations.

- [x] Run all focused tests, ESLint, client and server TypeScript checks, and production build.
- [x] Exercise two live Socket.IO sessions for reject, accept-then-cancel, busy offer, block, unblock, and post-race recovery.
- [x] Verify pending/connecting states never display a numeric 0% and actual byte progress appears on the first chunk.
- [x] Record results and remaining physical-device checks.
