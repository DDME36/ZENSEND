# Transfer Reliability and Abuse Protection Design

## Goal

Make file offers and transfers deterministic when actions race, prevent repeated offers from blocking the interface, expose safe block management, and make connection startup feel responsive without weakening file integrity.

## Protocol

The server owns each offer by `fileId`. A ticket starts as `offered`, may become `accepted`, and is removed when rejected, cancelled, expired, completed, or disconnected. Accept, reject, cancel, relay, and preparation events must match both ticket participants. The server processes simultaneous actions sequentially, so the first terminal action wins and the other client receives a terminal response instead of waiting.

Offers expire after 30 seconds. A recipient may have only one live inbound ticket. New offers receive `busy` while that ticket or transfer is active. A sender may cancel before or during transfer; the server notifies the other participant and removes relay state. Clients ignore stale events and clean only the matching transfer.

## Abuse protection

The current per-socket limit remains, but its key survives reconnects for the same peer and IP during the rate window. A second sliding-window limit applies to source IP plus recipient, limiting identity rotation. Local blocks are synchronized to the server. Blocked file and text offers are rejected before reaching the recipient UI.

The third rapid offer from one peer within 60 seconds is automatically blocked. An already visible offer is never replaced by a new one. Manual blocking requires confirmation. A blocked-device screen lists entries and supports unblocking.

## Startup and transfer feedback

Pending, preparing, and connecting states use indeterminate status instead of a numeric 0% bar. Numeric progress begins after bytes move and updates on the first chunk, then by elapsed time or meaningful byte progress. WebRTC remains the first route for modern iOS and local networks, with reliable ordered delivery and relay fallback. Relay readiness has a bounded wait and all waits can be cancelled.

## Constraints

- Preserve the existing ZenSend visual language and avatar emoji behavior.
- Do not add `!important` or reduced-motion rules.
- Do not silently accept, overwrite, or queue multiple inbound offers.
- Do not trade file integrity for lower latency.
- Keep blocks local-persistent and server-enforced for the current server lifetime.

