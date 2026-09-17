# ZenSend Full-Stack System & Production Health Audit Report

**Audit Date**: September 18, 2026  
**Target Environment**: Production (`https://zentyr.online/zensend` / Oracle Cloud Infrastructure VM `161.118.239.92`)  
**Audit Lead**: Lead Audit Worker (Full-Stack & Systems Specialist)  
**Deliverable**: Comprehensive Technical Findings, Architecture Verification, Risk Matrix, and Actionable Remediation Roadmap  
**Standards Compliance**: RFC 5245 (ICE), RFC 5766 (TURN), RFC 8831 (WebRTC Data Channels), Next.js 16 App Router Specifications  

---

## 1. Executive Summary & Project Status

### 1.1 Overview & System Architecture
ZenSend is a high-performance, browser-based peer-to-peer (P2P) file transfer application built upon Next.js 16 (App Router with Turbopack compilation) and a custom integrated Node.js signaling runtime powered by Socket.IO v4. The application facilitates zero-install, friction-free file transfers across local area networks (LAN) and wide area networks (WAN) by negotiating direct WebRTC DataChannels using Session Description Protocol (SDP) offer/answer exchanges and Interactive Connectivity Establishment (ICE) candidate gathering.

To guarantee high availability when direct P2P connectivity is blocked by strict network topologies (such as symmetric NAT or enterprise firewalls), ZenSend incorporates an automated fallback mechanism: when WebRTC negotiation times out or encounters fatal ICE failures, the application seamlessly switches to an in-memory chunked server relay (`relay-chunk`) brokered over the Socket.IO signaling connection.

### 1.2 Overall Health Verdict
The ZenSend production platform is assessed as **HEALTHY, ACTIVE, AND OPERATIONALLY STABLE**, with critical engineering attention required in WebRTC NAT traversal and signaling decoupling.

```
+----------------------------------------------------------------------------------------------------+
|                                    AUDIT SCORECARD & SUMMARY                                       |
+------------------------------------+-----------------------+---------------+-----------------------+
| Domain                             | Requirement           | Status        | Key Finding           |
+------------------------------------+-----------------------+---------------+-----------------------+
| 1. Test Suite & Build Pipeline     | R1 & Acceptance #1,#2 | PASS (100%)   | 25/25 tests pass;     |
|                                    |                       |               | 0 build/type errors   |
| 2. Live Production Runtime         | R2 & Acceptance #3,#4 | PASS (100%)   | 5/5 endpoints HTTP 200|
|                                    |                       |               | 31h+ systemd uptime   |
| 3. Infrastructure Coexistence      | R2 & Acceptance #5    | PASS (100%)   | 70.3% RAM headroom;   |
|                                    |                       |               | 0 port/proc conflicts |
| 4. WebRTC Traversal & Network Rel. | R3                    | ATTENTION REQ | Coturn not deployed;  |
|                                    |                       |               | P2P/signaling coupled |
| 5. Remediation Roadmap             | R4 & Acceptance #6    | COMPLETE      | 11 prioritized items  |
+------------------------------------+-----------------------+---------------+-----------------------+
```

### 1.3 Key Strengths
1. **Deterministic Test Suite**: The test suite runs via the native Node.js test runner (`tsx --test`) in 610ms with 100% pass rate across all 25 unit and contract tests, enforcing strict UI contracts, rate limiting, and signaling state machines.
2. **Clean Build Separation**: Next.js client bundles compile cleanly under Turbopack in 4.1s, while the server TypeScript compiler emits lightweight CommonJS modules (`server.js`, `signaling-policy.js`, `abuse-policy.js`) with zero type errors.
3. **Robust Host Coexistence**: On the Oracle Cloud Ubuntu host, `zensend.service` operates with a modest 93.6 MB RSS footprint, coexisting peacefully alongside `zentyr.service` (Discord Bot) and `zenload-backend.service` (Media Downloader) with 4.15 GB (70.3%) of free host RAM.
4. **Resilient Streaming Engine**: The client integrates `StreamSaver.js` with dynamic backpressure thresholds (512 KB) and an adaptive chunker (16 KB - 128 KB), minimizing browser RAM exhaustion during multi-gigabyte transfers.

### 1.4 Critical Deficiencies & Architecture Risks
1. **Coturn STUN/TURN Service Absence**: While `deploy/coturn-setup.sh` exists in the repository, the Coturn service is not installed on the Oracle host. As a result, `/api/ice-servers` returns only Google STUN servers. Cross-carrier mobile connections and symmetric NAT environments cannot establish direct P2P connections and are forced onto the server relay.
2. **Fatal Signaling/DataChannel Coupling**: When the Socket.IO signaling connection encounters a momentary network hiccup or interface shift (common in mobile roaming), the client proactively aborts active, healthy WebRTC P2P file transfers.
3. **Aggressive 5-Second Connection Timeout**: The hardcoded 5-second connection timeout prematurely aborts valid ICE negotiations on high-latency mobile (4G/5G) connections before STUN/TURN bindings complete.
4. **Transient Reconnection Join Lockout**: If a mobile client reconnects on a new socket before the server's 60-second `pingTimeout` clears the old session, the signaling server rejects the join event with `"Device already connected"`.

---

## 2. Full-Stack Diagnostic & Test Suite Integrity (R1)

### 2.1 Test Framework Architecture
ZenSend utilizes the native Node.js test runner (`node:test` and `node:assert/strict`) invoked via `tsx --test`. 

- **Absence of Jest**: The repository contains no `jest.config.*` files and no Jest runtime dependencies. This architectural decision eliminates heavy Babel/Jest transform overhead, allowing direct, ultra-fast execution of TypeScript (`.ts`) and React TSX (`.tsx`) test files without intermediate compilation artifacts.
- **Test Invocation Configuration**: Defined in `package.json`:
  ```json
  "test": "tsx --test src/__tests__/*.test.ts src/__tests__/*.test.tsx",
  "test:ui-contracts": "tsx --test src/__tests__/production-ui-contracts.test.ts"
  ```

### 2.2 Sizing & Historical Suite Evolution (19 Core vs. 25 Total Tests)
The project documentation and requirements cite "19 unit and contract tests". Investigation of the repository's git history reveals the exact lineage:
- **Historical Baseline (Commit `be0c925`)**: Originally, 19 core unit and contract tests were established across 4 primary test files:
  - `production-ui-contracts.test.ts` (11 contract tests)
  - `signaling-policy.test.ts` (4 unit tests)
  - `abuse-policy.test.ts` (2 unit tests)
  - `server-protocol-contract.test.ts` (2 contract tests)
  - *Subtotal: 11 + 4 + 2 + 2 = 19 tests.*
- **Suite Consolidation (Commit `9815a33`)**: In a subsequent architectural consolidation, 3 ancillary test suites originally distributed in component and library directories were centralized into `src/__tests__/`:
  - `ZenBeacon.test.tsx` (2 UI contract tests)
  - `audio-engine.test.ts` (2 audio engine unit tests)
  - `transferLifecycle.test.ts` (2 transfer lifecycle unit tests)
  - *Consolidated Total: 19 core + 6 consolidated = 25 total tests across 7 test files.*

### 2.3 Comprehensive Test Suite Breakdown (7 Files, 25 Tests)

#### Suite 1: `src/__tests__/production-ui-contracts.test.ts` (11 Tests)
*Validates static architecture contracts, accessibility standards, CSS containment, audio integration, and UI state handling across the Next.js frontend.*
1. **`loads one final production polish layer without animation suppressors`**: Verifies `src/app/layout.tsx` imports `production-polish.css` prior to `ErrorBoundary`; verifies absence of `!important` and `prefers-reduced-motion` suppression.
2. **`ships stable history hooks, one automatic sound identity, horse artwork and centralized metadata`**: Verifies DOM hooks in `HistoryModal.tsx`, unified `zenPulseCues` in `palettes.ts`, elimination of legacy user volume controls, centralized site metadata, and horse logo asset binding.
3. **`plays Zen Pulse cues across the real transfer lifecycle`**: Verifies `src/app/page.tsx` executes semantic audio cues (`whoosh`, `sending`, `progress25`, `progress50`, `progress75`, `complete`).
4. **`keeps the mode wave lightweight and restores the normal palette quickly`**: Verifies `ZenRadar.tsx` avoids heavyweight `ripple-3` animations, restores normal palette within 1100ms, and matches header branding.
5. **`keeps the home radar contained and uses a curved sonar sweep`**: Verifies `EmptyState.tsx` adopts `radar-sonar-sweep` and `radar-sonar-arc` without clipping envelopes.
6. **`ships deterministic transfer cancellation, busy handling and indeterminate startup states`**: Verifies `usePeerConnection.ts` registers `file-cancel`, `file-error`, handles `reason: 'busy'`, enforces `{ ordered: true }` on DataChannels, and manages progress rendering.
7. **`requires confirmation before blocking and provides persistent unblock management`**: Verifies explicit confirmation dialogs before blocking peers, unblock wiring, timestamped block records, and suppression of crude emoji badges.
8. **`keeps radar and notification effects clipped to their rounded geometry`**: Verifies `.compact-workspace .empty-radar-stage` enforces `contain: layout;` to avoid premature wave clipping, and verifies toast overflow clipping.
9. **`uses structured history metadata and a restrained message reader`**: Verifies `HistoryModal.tsx` renders `history-row__meta` and `history-status-pill` with disciplined CSS shadow rules.
10. **`keeps long history rows readable and discard confirmation above the save sheet`**: Verifies `DownloadReadyModal` confirmation overlays (`z-index: 10010`) and CSS text truncation.
11. **`ships opaque self-dismissing toasts and allows rapid file sending`**: Verifies `Toast.tsx` auto-dismiss timers, opaque backgrounds (`#221115` / `#ffffff`), and elimination of sender rejection penalization.

#### Suite 2: `src/__tests__/signaling-policy.test.ts` (4 Tests)
*Validates signaling protocol schema validation, offer time-to-live, and ticket ownership.*
12. **`validates cancellation, preparation, completion and block packets`**: Confirms `validPacket` approves schema-compliant payloads and rejects malformed packets (e.g. missing `fileId`).
13. **`expires unanswered offers but keeps accepted tickets live`**: Confirms unanswered transfer offers expire after `OFFER_TTL_MS` (30,000ms), while accepted, in-flight transfers remain active indefinitely.
14. **`allows either participant to cancel only their bound ticket`**: Confirms that only the sender or receiver bound to a specific transfer ticket can cancel it; unauthorized third-party sockets are rejected.
15. **`detects a live inbound offer and ignores expired or excluded tickets`**: Confirms `hasLiveInboundTicket` identifies pending offers and filters out expired or explicitly excluded tickets.

#### Suite 3: `src/__tests__/abuse-policy.test.ts` (2 Tests)
*Validates rate-limiting algorithms and peer blocking rules.*
16. **`blocks the same peer pair after the configured burst and reports retry time`**: Confirms `SlidingWindowLimiter(3, 60_000)` permits 3 rapid offers, blocks the 4th with exact `retryAfterMs: 57000`, and resets after window expiry.
17. **`uses directional block relationships`**: Confirms block relationships are strictly directional (`isBlocked(A, B) !== isBlocked(B, A)`).

#### Suite 4: `src/__tests__/server-protocol-contract.test.ts` (2 Tests)
*Validates signaling server implementation against architectural invariants.*
18. **`wires terminal transfer lifecycle events on the signaling server`**: Confirms `server.ts` registers handlers for `file-preparing`, `file-cancel`, `file-complete`, `block-peer`, `unblock-peer`, and references `OFFER_TTL_MS`.
19. **`rejects blocked, busy and rate-limited offers with terminal responses`**: Confirms `server.ts` emits explicit rejection reasons (`blocked`, `busy`) and integrates the targeted offer rate limiter.

#### Suite 5: `src/__tests__/ZenBeacon.test.tsx` (2 Tests)
*Validates SSR rendering and accessibility of the scanning radar SVG.*
20. **`renders the scanning beacon as an accessible transparent SVG`**: Confirms SVG output contains `role="img"`, Thai accessibility label (`กำลังค้นหาอุปกรณ์`), and lacks opaque background fills.
21. **`reuses the beacon geometry for connecting and success states`**: Confirms state transitions (`zen-beacon--connecting`, `zen-beacon--success`) and `aria-hidden` decorative states.

#### Suite 6: `src/__tests__/audio-engine.test.ts` (2 Tests)
*Validates Web Audio synthesizer cooldowns and cue composition.*
22. **`prevents the same cue from stacking inside its cooldown`**: Confirms `createCooldownGate()` blocks rapid re-triggers of identical cues while allowing independent cues through.
23. **`Zen Pulse covers every semantic cue with distinct layered moments`**: Confirms coverage of all semantic cues and multi-step frequency layering for `connect` (>= 3 steps) and `complete` (>= 4 steps).

#### Suite 7: `src/__tests__/transferLifecycle.test.ts` (2 Tests)
*Validates data chunk progress throttling and transfer isolation.*
24. **`terminal events only affect their matching transfer`**: Confirms `matchesTransfer` isolates events strictly to identical `fileId` tokens.
25. **`progress reports the first chunk immediately, then throttles updates`**: Confirms immediate dispatch of chunk 1, subsequent throttling of sub-256KB updates within 100ms, and dispatch at >= 256KB or 100% completion.

### 2.4 Test Execution Verification (Verbatim Execution Log)
Verification was executed via PowerShell `npm.cmd test`:

```text
> zensend@1.0.0 test
> tsx --test src/__tests__/*.test.ts src/__tests__/*.test.tsx

✔ renders the scanning beacon as an accessible transparent SVG (11.1912ms)
✔ reuses the beacon geometry for connecting and success states (2.0942ms)
✔ blocks the same peer pair after the configured burst and reports retry time (2.1283ms)
✔ uses directional block relationships (0.3472ms)
✔ prevents the same cue from stacking inside its cooldown (1.386ms)
✔ Zen Pulse covers every semantic cue with distinct layered moments (1.2021ms)
✔ loads one final production polish layer without animation suppressors (2.3916ms)
✔ ships stable history hooks, one automatic sound identity, horse artwork and centralized metadata (1.8343ms)
✔ plays Zen Pulse cues across the real transfer lifecycle (0.9198ms)
✔ keeps the mode wave lightweight and restores the normal palette quickly (0.8531ms)
✔ keeps the home radar contained and uses a curved sonar sweep (1.0581ms)
✔ ships deterministic transfer cancellation, busy handling and indeterminate startup states (2.7317ms)
✔ requires confirmation before blocking and provides persistent unblock management (2.0048ms)
✔ keeps radar and notification effects clipped to their rounded geometry (0.7825ms)
✔ uses structured history metadata and a restrained message reader (0.7891ms)
✔ keeps long history rows readable and discard confirmation above the save sheet (3.2724ms)
✔ ships opaque self-dismissing toasts and allows rapid file sending (2.9781ms)
✔ wires terminal transfer lifecycle events on the signaling server (1.4579ms)
✔ rejects blocked, busy and rate-limited offers with terminal responses (0.479ms)
✔ validates cancellation, preparation, completion and block packets (1.7543ms)
✔ expires unanswered offers but keeps accepted tickets live (0.3957ms)
✔ allows either participant to cancel only their bound ticket (0.2545ms)
✔ detects a live inbound offer and ignores expired or excluded tickets (0.2775ms)
✔ terminal events only affect their matching transfer (1.2482ms)
✔ progress reports the first chunk immediately, then throttles updates (0.5511ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 610.0488
```
*Status: Exit Code 0, 25 Passed, 0 Failed, Duration 610.05ms.*

### 2.5 Build Pipeline Analysis
The ZenSend build pipeline executes two sequential build phases:
1. **Next.js Client & API Route Optimization (`next build`)**: Powered by Next.js 16.1.1 with Turbopack. Generates optimized client-side React bundles, pre-renders static pages, and compiles serverless route handlers.
2. **Server TypeScript Compilation (`tsc -p tsconfig.server.json`)**: Compiles the custom hybrid server files into CommonJS modules executable by standard Node.js runtimes.

#### Build Verification Output
```text
> zensend@1.0.0 build
> next build && tsc -p tsconfig.server.json

▲ Next.js 16.1.1 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 4.1s
  Running TypeScript ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (7/7) in 852.1ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/ice-servers
├ ƒ /health
├ ○ /robots.txt
└ ○ /sitemap.xml

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
*Status: Exit Code 0, Zero Errors.*

#### Build Artifact Verification Table
```
+---------------------+-------------+-----------------------+------------------------------------------+
| Generated File      | File Size   | Compilation Engine    | Target Role                              |
+---------------------+-------------+-----------------------+------------------------------------------+
| server.js           | 48,879 B    | tsc (ES2022/CommonJS) | Main HTTP, Next.js handler & Socket.IO   |
| signaling-policy.js |  4,595 B    | tsc (ES2022/CommonJS) | Packet schema validation & offer TTL     |
| abuse-policy.js     |  1,596 B    | tsc (ES2022/CommonJS) | Sliding window rate limiter & peer block |
+---------------------+-------------+-----------------------+------------------------------------------+
```

---

## 3. Live Production Runtime & Infrastructure Verification (R2)

### 3.1 Host Hardware & Operating System Profile
The production instance hosting ZenSend is provisioned on Oracle Cloud Infrastructure (OCI):
- **Virtualization / CPU**: Ampere Altra ARM64 processor (Neoverse-N1, 1 OCPU / 1 vCPU)
- **Operating System**: Ubuntu 24.04 LTS (Linux Kernel `6.8.0-1011-oracle`)
- **Public Origin IP**: `161.118.239.92`
- **Reverse Proxy / CDN**: Cloudflare Edge (Bangkok `BKK` POP) terminating HTTPS for `https://zentyr.online/zensend`
- **SSL / TLS**: Let's Encrypt ECDSA certificate (Valid through December 10, 2026; 83 days remaining)

### 3.2 Host Infrastructure Resource Metrics
Host metrics captured via authenticated SSH connection:
- **System Memory**:
  - Total RAM: 5,903 MB (~6.0 GB)
  - Used Memory: 1,751 MB (29.7%)
  - **Available Memory: 4,151 MB (70.3% free headroom)**
  - Swap: 0 MB (No active paging or memory pressure)
- **Storage Utilization (`/dev/sda1`)**:
  - Total Disk: 45 GB
  - Used: 7.5 GB (17%)
  - **Free Disk: 37 GB (83% free headroom)**
- **System Load Average**: `0.04, 0.09, 0.08` (negligible CPU contention on ARM64 core)

### 3.3 Live Production Endpoint Probing Matrix
All 5 required production endpoints were verified from both public WAN (via Cloudflare) and internal localhost (`127.0.0.1:3002`):

```
+---+-------------------------------------------+---------+-----------+-----------+-------------------+--------------------------------------------+
| # | Production URL                            | Status  | WAN Lat.  | LAN Lat.  | Content-Type      | Headers / Payload Summary                  |
+---+-------------------------------------------+---------+-----------+-----------+-------------------+--------------------------------------------+
| 1 | https://zentyr.online/zensend             | 200 OK  | 314 ms    | 3.5 ms    | text/html         | x-nextjs-cache: HIT; s-maxage=31536000     |
| 2 | https://zentyr.online/zensend/health      | 200 OK  | 124 ms    | 0.68 ms   | application/json  | {"status":"ok","uptime":112156,"peers":0}  |
| 3 | https://zentyr.online/zensend/socket.io/  | 200 OK  | 122 ms    | 0.75 ms   | text/plain        | 0{"sid":"...","upgrades":["websocket"]}    |
| 4 | https://zentyr.online/zensend/api/ice-... | 200 OK  | 121 ms    | 4.0 ms    | application/json  | {"iceServers":[{"urls":"stun:..."}]}       |
| 5 | https://zentyr.online/zensend/...horse.png| 200 OK  | 342 ms    | 5.5 ms    | image/png         | Length: 571,590 B; Cache: max-age=14400    |
+---+-------------------------------------------+---------+-----------+-----------+-------------------+--------------------------------------------+
```

### 3.4 Live WebSocket Signaling Verification
A synthetic WebSocket client probe was connected directly to `wss://zentyr.online/zensend/socket.io`:
1. **WSS Handshake**: Successfully upgraded from HTTP to WebSocket via Nginx proxy in 214ms.
2. **Session ID Assigned**: `o5DuAZN3OXLdjrtrAAAd`.
3. **`join` Dispatch**: Dispatched client peer profile (Windows PC probe, public mode).
4. **Server Response**:
   - Received `mode-info`: Confirmed public mode with network-masked client subnet identifier (`2403:6200:8852:x`).
   - Received `peers`: Confirmed active peer discovery broadcast mechanism.
5. **Host Telemetry (`journalctl -u zensend.service`)**:
   ```text
   Sep 17 17:28:24 instance-20260904-1832 node[260870]: 📡 Registered events: join, set-mode, rtc-*, file-*, relay-*, text-offer, disconnect
   Sep 17 17:28:24 instance-20260904-1832 node[260870]: 👤 Peer joined: Explorer-M2-Probe (Windows PC) - Mode: public - IP: 2403:6200:8852:18a8:c47b:b4f0:8272:f996 - Total peers: 1
   Sep 17 17:28:27 instance-20260904-1832 node[260870]: 👋 Peer left after grace period: Explorer-M2-Probe (probe-1789666104338)
   ```

### 3.5 Systemd Service Status & Multi-Tenant Coexistence Audit
The Oracle Ubuntu host hosts several distinct production services. A comprehensive inspection of systemd units confirmed complete isolation and zero resource contention:

```
+----------------------------+--------+--------+------------+-----------+---------------------------------------+
| Service Unit               | Status | PID    | Local Port | Memory    | Role & Coexistence Status             |
+----------------------------+--------+--------+------------+-----------+---------------------------------------+
| zensend.service            | ACTIVE | 260870 | TCP 3002   |  93.6 MB  | Main ZenSend Node.js Server (31h+ up) |
| zentyr.service             | ACTIVE | 263731 | TCP 3004   | 309.0 MB  | Discord Bot Runtime (Zero conflict)   |
| zenload-backend.service    | ACTIVE | 258629 | TCP 3001   |  72.9 MB  | Media Downloader Backend (Bun runtime)|
| zentyr-main (standalone)   | ACTIVE | 151075 | TCP 3000   | 663.0 MB  | Zentyr Hub Main Next.js Portal        |
| zenload-frontend           | ACTIVE | 255431 | TCP 3003   |  48.2 MB  | ZenLoad UI Frontend                   |
| nginx.service              | ACTIVE | 227899 | TCP 80,443 |  12.4 MB  | Reverse Proxy & TLS Termination       |
+----------------------------+--------+--------+------------+-----------+---------------------------------------+
```

#### Coexistence Findings
- **Port Segmentation**: ZenSend is strictly bound to port `3002`. Neighboring ports `3000`, `3001`, `3003`, and `3004` are properly separated with no port collisions.
- **Resource Protection**: With 4.15 GB of RAM available, ZenSend’s 93.6 MB footprint is negligible. Neither `zentyr.service` audio transcoding spikes nor `zenload-backend.service` download jobs impact ZenSend's CPU or memory headroom.

### 3.6 Nginx Reverse Proxy Architecture
Nginx configuration at `/etc/nginx/sites-available/zentyr.online`:
```nginx
location /zensend {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
*Observation*: The reverse proxy correctly forwards WebSocket upgrade headers and client IP headers. However, it currently relies on the default `proxy_read_timeout 60s`, which poses a risk for extended large-file relay transfers over Socket.IO.

---

## 4. WebRTC Traversal & Network Reliability Analysis (R3)

### 4.1 ICE Configuration & STUN/TURN Topology
ZenSend's ICE configuration is delivered dynamically via `/api/ice-servers`:
- **Default STUN Configuration**: Returns 5 Google STUN servers (`stun:stun.l.google.com:19302` through `stun4`). STUN enables NAT binding discovery for host and server-reflexive (`srflx`) candidates.
- **Metered.ca Relay Logic**: `src/app/api/ice-servers/route.ts` includes logic to provide Metered.ca TURN relays when credentials exist. However, the route explicitly executes:
  ```ts
  if (turnUsername && turnCredential && !customTurnUrl) { ... }
  ```
  If `customTurnUrl` is populated (e.g. pointing to Oracle), the Metered.ca TURN fallback is entirely excluded.
- **Critical Infrastructure Gap**: Querying systemd on the Oracle host (`systemctl status coturn`) confirms:
  ```text
  Unit coturn.service could not be found.
  ```
  Ports `3478` and `5349` are not open. The automated installation script `deploy/coturn-setup.sh` has never been executed on the host, and no TURN credentials exist in `/etc/systemd/system/zensend.service`.
- **Consequence**: `/api/ice-servers` returns STUN-only candidates. Any network environment requiring relay candidates (`relay`) cannot establish a WebRTC P2P DataChannel.

### 4.2 WebRTC Signaling & DataChannel Backpressure
ZenSend implements an adaptive chunking and flow control pipeline:
- **DataChannel Parameters**: Created with `{ ordered: true }` on channel label `'file-transfer'`.
- **Flow Control Loop**:
  - Sets `bufferedAmountLowThreshold = 512 * 1024` (512 KB).
  - Uses `src/lib/adaptiveChunker.ts` to dynamically scale chunk sizes:
    - Minimum Chunk: 16 KB
    - Initial Chunk: 64 KB (65,536 bytes)
    - Maximum Chunk: 128 KB (131,072 bytes)
  - When `bufferedAmount > bufferedAmountLowThreshold`, the sender pauses and awaits the `bufferedamountlow` event before continuing.
- **Disk Streaming via StreamSaver**: Receivers stream incoming byte chunks directly into the browser's download manager via `StreamSaver.js` and a hidden service worker, eliminating in-memory blob accumulation for large files.

### 4.3 Network Traversal Edge Cases & Failure Analysis

#### Edge Case A: Symmetric NAT (Cellular 4G/5G Networks)
- **Mechanism**: Cellular carriers deploy Carrier-Grade NAT (CGNAT) with symmetric mapping: outbound packets to different IP:port destinations receive distinct external port mappings.
- **Impact on ZenSend**: STUN hole punching fails 100% of the time between two symmetric NAT endpoints because the port predicted by STUN cannot receive packets from the peer. Because Coturn is not deployed, the WebRTC P2P connection fails completely. The transfer only succeeds if it falls back to the Socket.IO server relay.

#### Edge Case B: Enterprise & Educational Firewalls (Port 443 & TURNS TLS)
- **Mechanism**: Corporate firewalls routinely block all outbound UDP traffic and block TCP ports other than 80 and 443. Deep Packet Inspection (DPI) drops non-TLS traffic on port 443.
- **Impact on ZenSend**: The repository's `deploy/coturn-setup.sh` script configures Coturn on ports 3478 and 5349 without port 443 binding and without TLS certificates. In enterprise environments, ZenSend will fail to establish WebRTC connections.

#### Edge Case C: Signaling Disconnect Coupling (Fatal P2P Termination)
- **Mechanism**: In `src/hooks/usePeerConnection.ts`:
  ```ts
  socket.on('disconnect', () => {
    if (activeTransferRef.current || fileOfferRef.current) cancelTransferRef.current();
    ...
  });
  ```
  And in `server.ts`:
  ```ts
  function cancelTicketsForSocket(socketId: string, reason: string): void {
    io.to(otherSide).emit('file-cancel', { fileId, reason });
  }
  ```
- **Impact on ZenSend**: WebRTC DataChannels are direct P2P connections that do not route through the signaling server once connected. However, if a user's mobile device switches from Wi-Fi to cellular, or if the signaling WebSocket drops momentarily, ZenSend forcibly aborts the healthy P2P transfer.

#### Edge Case D: Reconnection Lockout ("Device Already Connected")
- **Mechanism**: In `server.ts` line 293:
  ```ts
  if (Array.from(peers.values()).some(p => p.id === data.peer.id)) {
    return reject('อุปกรณ์นี้เชื่อมต่ออยู่แล้ว กรุณาปิดแท็บเดิมก่อน');
  }
  ```
- **Impact on ZenSend**: When a client loses connection and reconnects, Socket.IO creates a new socket. If the previous socket has not yet timed out (server `pingTimeout` is 60,000ms), the new connection's `join` event is rejected. The user is locked out until the 60s timer expires.

#### Edge Case E: Flawed Server mDNS Candidate Unmasking
- **Mechanism**: In `server.ts` lines 509-526:
  When an iOS Safari client emits an mDNS `.local` candidate, the server extracts `senderPeer.ip` and replaces `.local` with that IP.
- **Impact on ZenSend**: `senderPeer.ip` is the client's **public WAN IP** (e.g. `161.118.x.x`), NOT their private LAN IP. The server synthesizes an invalid candidate combining a public IP with an internal private port, causing failing STUN checks that consume valuable negotiation time.

---

## 5. Exhaustive Risk Matrix & Categorization

The following matrix categorizes all identified vulnerabilities, design flaws, and infrastructure gaps according to severity:

```
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| Risk ID | Severity | Description & Architectural Impact                          | Primary Location                      |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-01    | HIGH     | Signaling socket disconnect aborts active WebRTC transfers  | src/hooks/usePeerConnection.ts:1530   |
|         |          | Root Cause: Client & server bind P2P lifecycle to Socket.IO | server.ts:200-208, 892                |
|         |          | Impact: Transient network blips cancel healthy P2P transfers|                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-02    | HIGH     | Hardcoded 5-second connection timeout aborts mobile WebRTC  | src/lib/webrtc/types.ts:63            |
|         |          | Root Cause: CONNECTION_TIMEOUT = 5000ms is too aggressive   | src/hooks/usePeerConnection.ts:1056   |
|         |          | Impact: Mobile CGNAT / cross-region ICE fails prematurely   |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-03    | HIGH     | Absence of deployed Coturn TURN server on production host   | Production Oracle VM Host             |
|         |          | Root Cause: coturn.service not installed; no env credentials| deploy/coturn-setup.sh                |
|         |          | Impact: 100% P2P failure across symmetric NAT / mobile 4G/5G|                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-04    | HIGH     | Coturn script lacks Port 443 and TLS (TURNS) configuration  | deploy/coturn-setup.sh:39-69          |
|         |          | Root Cause: Only ports 3478/5349 configured; no SSL bindings| src/app/api/ice-servers/route.ts:21   |
|         |          | Impact: Complete WebRTC failure on enterprise firewalls     |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-05    | MEDIUM   | Asynchronous ICE fetch race condition causes STUN-only mode | src/hooks/usePeerConnection.ts:1441   |
|         |          | Root Cause: fetch('/api/ice-servers') un-awaited on startup | src/hooks/usePeerConnection.ts:662    |
|         |          | Impact: Rapid transfers initialize without TURN servers     |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-06    | MEDIUM   | Reconnection rejected as duplicate during 60s ping timeout  | server.ts:293                         |
|         |          | Root Cause: Strict peer.id uniqueness check rejects new sock| server.ts:95-98                       |
|         |          | Impact: Returning mobile users locked out for up to 60s     |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-07    | MEDIUM   | Server mDNS candidate unmasking injects public WAN IP       | server.ts:509-526                     |
|         |          | Root Cause: Replaces .local with socket WAN IP not LAN IP   | server.ts:351                         |
|         |          | Impact: Unroutable candidates waste ICE connectivity checks |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-08    | MEDIUM   | Missing visibilitychange handler in WebRTC hook             | src/hooks/usePeerConnection.ts        |
|         |          | Root Cause: No reconnection recheck on tab foregrounding    | src/app/page.tsx:673-687              |
|         |          | Impact: Backgrounded mobile tabs silently lose peer liveness|                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-09    | LOW      | Unchecked SCTP maxMessageSize & Head-of-Line blocking       | src/lib/adaptiveChunker.ts:8-12       |
|         |          | Root Cause: Hardcoded chunk sizes > 64KB with ordered: true | src/hooks/usePeerConnection.ts:1037   |
|         |          | Impact: Potential TypeError on strict 64KB SCTP stacks      |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-10    | LOW      | Static long-term TURN credentials exposed via public API    | src/app/api/ice-servers/route.ts:68   |
|         |          | Root Cause: Absence of RFC 5766 timestamped HMAC-SHA1 tokens| deploy/coturn-setup.sh:52             |
|         |          | Impact: Risk of unauthorized third-party TURN bandwidth use |                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
| R-11    | LOW      | Nginx default 60s proxy_read_timeout on signaling subpath   | /etc/nginx/sites-available/...        |
|         |          | Root Cause: Missing proxy_read_timeout directive in location|                                       |
|         |          | Impact: Risk of connection drop during large relay transfers|                                       |
+---------+----------+-------------------------------------------------------------+---------------------------------------+
```

---

## 6. Prioritized, Actionable Remediation Roadmap

### 6.1 High Priority (Immediate Stability & Firewall Traversal)

#### Item 1: Decouple Active WebRTC Transfers from Signaling Socket (Fixes R-01)
- **Action**: In `src/hooks/usePeerConnection.ts`, update `socket.on('disconnect')`:
  ```ts
  socket.on('disconnect', () => {
    setConnected(false);
    setConnectionStatus('disconnected');
    
    // Only cancel transfer if it is currently using the Socket.IO server relay
    const isRelayActive = activeTransferRef.current?.mode === 'relay';
    const isP2POpen = activePeerId && dataChannelsRef.current.get(activePeerId)?.readyState === 'open';
    
    if (isRelayActive || (!isP2POpen && (activeTransferRef.current || fileOfferRef.current))) {
      cancelTransferRef.current();
    }
  });
  ```
- **Action**: In `server.ts`, modify `cancelTicketsForSocket` to avoid immediately broadcasting `file-cancel` for established P2P transfers, granting a 15-second grace window for signaling socket reconnection.

#### Item 2: Extend WebRTC Connection Timeout to 15 Seconds (Fixes R-02)
- **Action**: In `src/lib/webrtc/types.ts`:
  ```ts
  // Increase from 5000 to 15000 to accommodate mobile CGNAT and cross-region TURN allocation
  export const CONNECTION_TIMEOUT = 15000;
  ```

#### Item 3: Deploy Coturn & Configure Ingress on Oracle Cloud VM (Fixes R-03)
- **Action**: Execute `deploy/coturn-setup.sh` on the Oracle Ubuntu host.
- **Action**: In Oracle Cloud Infrastructure (OCI) Console, add Ingress Rules to the VCN Security List for the instance:
  - UDP/TCP Port `3478` (STUN/TURN)
  - UDP/TCP Port `5349` (TURNS)
  - UDP Port Range `49152-65535` (Relay Endpoints)
- **Action**: Add TURN credentials to `/etc/systemd/system/zensend.service`:
  ```ini
  Environment=TURN_SERVER_URL=turn:161.118.239.92:3478
  Environment=TURN_USERNAME=zensend
  Environment=TURN_CREDENTIAL=<SECURE_GENERATED_PASSWORD>
  ```
  And reload via `sudo systemctl daemon-reload && sudo systemctl restart zensend.service`.

#### Item 4: Enable TURNS over TLS Port 443 (Fixes R-04)
- **Action**: Update Coturn configuration (`/etc/turnserver.conf`) to bind `tls-listening-port=443` and reference Let's Encrypt certificates (`/etc/letsencrypt/live/zentyr.online/fullchain.pem`).
- **Action**: Update `src/app/api/ice-servers/route.ts` to unshift `turns:zentyr.online:443?transport=tcp`.

---

### 6.2 Medium Priority (Reliability & Robustness)

#### Item 5: Eliminate ICE Fetch Race Condition (Fixes R-05)
- **Action**: In `usePeerConnection.ts`, export a pre-initialized promise for `fetch('/api/ice-servers')`. Ensure `createPeerConnection` awaits this promise or executes `pc.setConfiguration({ iceServers })` dynamically when the fetch completes.

#### Item 6: Implement Socket Supersession on Reconnection (Fixes R-06)
- **Action**: In `server.ts` line 293, replace the strict rejection with socket eviction:
  ```ts
  const existingSocketId = Array.from(peers.entries()).find(([_, p]) => p.id === data.peer.id)?.[0];
  if (existingSocketId && existingSocketId !== socket.id) {
    console.log(`♻️ Evicting stale socket ${existingSocketId} for reconnecting peer ${data.peer.id}`);
    io.sockets.sockets.get(existingSocketId)?.disconnect(true);
    peers.delete(existingSocketId);
  }
  ```

#### Item 7: Strip Public WAN IP from mDNS Candidates (Fixes R-07)
- **Action**: In `server.ts`, remove lines 509-526. Allow mDNS candidates to pass unmodified or rely on standard STUN `srflx` candidates rather than fabricating unroutable WAN host candidates.

#### Item 8: Implement Tab Foregrounding Revalidation (Fixes R-08)
- **Action**: In `usePeerConnection.ts`, add a `document.addEventListener('visibilitychange')` listener. When `document.visibilityState === 'visible'`, verify `socket.connected`, re-ping active DataChannels, and refresh peer discovery.

#### Item 9: Configure Nginx Proxy Timeout (Fixes R-11)
- **Action**: In `/etc/nginx/sites-available/zentyr.online`, add `proxy_read_timeout 3600s;` and `proxy_send_timeout 3600s;` to the `location /zensend` block.

---

### 6.3 Low Priority (Hardening & Protocol Hygiene)

#### Item 10: Dynamic SCTP Message Sizing (Fixes R-09)
- **Action**: In `src/lib/adaptiveChunker.ts`, query `pc.sctp?.maxMessageSize` and clamp `MAX_CHUNK` to `Math.min(128 * 1024, pc.sctp?.maxMessageSize || 65535)`.

#### Item 11: Ephemeral TURN Authentication via RFC 5766 (Fixes R-10)
- **Action**: Update `/api/ice-servers/route.ts` and Coturn to use HMAC-SHA1 timestamped tokens (`username: timestamp:userId`, `credential: base64(hmac(secret, username))`), preventing third-party quota abuse.

---

## 7. Acceptance Criteria Verification Matrix

The following matrix provides a 1-to-1 cross-reference proving complete satisfaction of all Acceptance Criteria stipulated in the authoritative user request (`ORIGINAL_REQUEST.md`):

```
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| Acceptance Criterion (from ORIGINAL_REQUEST.md)                  | Status      | Evidence / Verification Details                             |
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| 1. All 19 unit & contract tests pass cleanly via `npm test`      | VERIFIED    | 25 total tests (19 core + 6 consolidated) pass with 0       |
|                                                                  |             | failures in 610.05ms via `tsx --test`. Exit code: 0.         |
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| 2. Next.js client & server TypeScript build completes with zero  | VERIFIED    | Next.js 16.1.1 Turbopack build compiled in 4.1s; 7 routes   |
|    errors (`npm run build`)                                      |             | pre-rendered; `tsc -p tsconfig.server.json` emitted         |
|                                                                  |             | server.js, signaling-policy.js, abuse-policy.js. Exit code: 0|
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| 3. `zensend.service` on Oracle is active, running, and listening | VERIFIED    | Active (running) for 31h+ (since Sep 16 10:16 UTC). PID:    |
|    on port 3002                                                  |             | 260870. Port TCP 0.0.0.0:3002 verified via `ss -tulpn`.     |
|                                                                  |             | Memory RSS: 93.6 MB.                                        |
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| 4. Live endpoints (`/zensend`, `/zensend/health`,                | VERIFIED    | All 5 probed endpoints returned HTTP 200 OK externally and  |
|    `/zensend/socket.io`, `/zensend/api/ice-servers`,             |             | internally. Health returns uptime 112156s, socket.io       |
|    `/zensend/zensend-z-horse.png`) return HTTP 200               |             | returns EIO=4 handshake with WebSocket upgrade capability.  |
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| 5. Neighboring services (`zentyr.service`,                       | VERIFIED    | `zentyr.service` (PID 263731, port 3004, 309 MB RSS) and    |
|    `zenload-backend.service`) remain active and unaffected       |             | `zenload-backend.service` (PID 258629, port 3001, 72.9 MB)   |
|                                                                  |             | verified active, running, zero conflicts, 70.3% free RAM.   |
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
| 6. Detailed system audit report delivered with explicit risk     | VERIFIED    | Comprehensive report delivered with 11-point Risk Matrix    |
|    ratings (Low/Medium/High) and prioritized next steps          |             | (Low/Med/High) and prioritized 3-tier remediation roadmap.  |
+------------------------------------------------------------------+-------------+-------------------------------------------------------------+
```

---

## 8. Audit Conclusion & Attestation

The ZenSend full-stack architecture exhibits high technical caliber in its UI contracts, streaming transfer flow control, and multi-tenant resource discipline. The codebase builds cleanly and passes all 25 automated tests with zero failures. 

The primary vulnerability of the system is its susceptibility to network isolation across symmetric NAT and cellular topologies due to the absence of an operational Coturn TURN server and the premature termination of P2P transfers upon signaling socket disconnects. Implementation of the High-Priority remediation items (Items 1 through 4) will elevate ZenSend to true carrier-grade reliability across all real-world consumer and enterprise network environments.

**Audit Status**: COMPLETE & VERIFIED  
**Report Artifact Location**: `c:\Users\MIGHTYBIT\Desktop\ZenSend\SYSTEM_HEALTH_AUDIT_REPORT.md`
