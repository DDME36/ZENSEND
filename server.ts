import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';
import { randomInt } from 'crypto';
import { validPacket, isRecipient, mayStartRelay, TransferTicket, OFFER_TTL_MS, canCancelTicket, hasLiveInboundTicket, isOfferExpired } from './signaling-policy';
import { SlidingWindowLimiter, blockKey, isBlocked } from './abuse-policy';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🔧 Starting server in ${dev ? 'development' : 'production'} mode on port ${port}...`);

// Test mode runs the real signaling handlers without starting Next.js.
const app = process.env.NODE_ENV === 'test' ? null : next({ dev, hostname, port });
const handler = app?.getRequestHandler();

interface Peer {
  id: string;
  tabId?: string;
  name: string;
  device: string;
  avatar?: {
    type?: string;
    color?: string;
    emoji: string;
    name?: string;
    os?: string;
    photoUrl?: string | null;
  };
  critter: {
    emoji: string;
    name: string;
    color: string;
    photoUrl?: string | null;
  };
}

interface PeerWithMode extends Peer {
  mode: 'public' | 'wifi' | 'private';
  roomCode?: string;
  roomPassword?: string;
  ip?: string;
}

interface PublicPeer extends Peer {
  sameNetwork?: boolean;
  inRoom?: boolean;
}

(app?.prepare() ?? Promise.resolve()).then(() => {
  console.log('✅ Next.js prepared, creating HTTP server...');
  
  const httpServer = createServer((req, res) => {
    // Health check endpoint for Render
    if (req.url === '/health' || req.url === '/api/health') {
      const health = {
        status: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        peers: peers.size,
        rooms: rooms.size,
        timestamp: new Date().toISOString()
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
      return;
    }
    
    if (handler) handler(req, res);
    else { res.writeHead(404); res.end(); }
  });
  
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : '*';

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 2 * 1024 * 1024,
    perMessageDeflate: false,
    httpCompression: false
  });

  const peers = new Map<string, PeerWithMode>();
  const rooms = new Map<string, Set<string>>();
  const rejectedRelays = new Set<string>(); // Track rejected relay sessions
  const activeRelays = new Map<string, { startTime: number; lastActivity: number; bytes: number; ready: boolean; ended: boolean; from: string; to: string; size: number }>();
  const tickets = new Map<string, TransferTicket>();
  const blockedPairs = new Set<string>();
  const targetedOfferLimiter = new SlidingWindowLimiter(3, 60_000);
  const pendingDisconnects = new Map<string, NodeJS.Timeout>();
  const PEER_DISCONNECT_GRACE_MS = 3000;
  const MAX_PEERS = 50; // ลดลงเพื่อประหยัด memory
  const MAX_CONCURRENT_RELAYS = 3; // จำกัดจำนวน relay พร้อมกัน
  const RELAY_TIMEOUT = 5 * 60 * 1000; // ลดเหลือ 5 นาที
  const STALE_PEER_INTERVAL = 60 * 1000; // Check for stale peers every 60s

  // Rate limiting: Track events per socket (Memory-efficient for Free Tier)
  // Only track recent events, auto-cleanup old entries
  const rateLimitMap = new Map<string, { 
    join: number; // Last join timestamp
    fileOffer: number; // Last file offer timestamp
    rtcOffer: number; // Last RTC offer timestamp
    joinCount: number; // Count in current window
    fileOfferCount: number;
    rtcOfferCount: number;
  }>();
  
  const RATE_LIMITS = {
    join: { max: 3, window: 60000 }, // 3 joins per minute (reduced for free tier)
    fileOffer: { max: 5, window: 60000 }, // 5 file offers per minute (reduced)
    rtcOffer: { max: 10, window: 60000 }, // 10 RTC offers per minute (reduced)
  };

  // Rate limit checker (Memory-efficient version)
  function checkRateLimit(socketId: string, eventType: 'join' | 'fileOffer' | 'rtcOffer'): boolean {
    const now = Date.now();
    let limits = rateLimitMap.get(socketId);
    
    if (!limits) {
      limits = { 
        join: now, 
        fileOffer: now, 
        rtcOffer: now,
        joinCount: 0,
        fileOfferCount: 0,
        rtcOfferCount: 0
      };
      rateLimitMap.set(socketId, limits);
    }
    
    const config = RATE_LIMITS[eventType];
    const lastTime = limits[eventType];
    const countKey = `${eventType}Count` as keyof typeof limits;
    
    // Reset counter if window expired
    if (now - lastTime > config.window) {
      limits[eventType] = now;
      limits[countKey] = 1;
      return true;
    }
    
    // Check if limit exceeded
    if (limits[countKey] >= config.max) {
      console.warn(`⚠️ Rate limit exceeded for ${socketId}: ${eventType}`);
      return false;
    }
    
    // Increment counter
    limits[countKey]++;
    return true;
  }
  
  // Clean up rate limit map periodically (prevent memory leak)
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [socketId, limits] of rateLimitMap.entries()) {
      // Remove if all windows expired and socket not connected
      const allExpired = 
        (now - limits.join > RATE_LIMITS.join.window) &&
        (now - limits.fileOffer > RATE_LIMITS.fileOffer.window) &&
        (now - limits.rtcOffer > RATE_LIMITS.rtcOffer.window);
      
      if (allExpired) {
        rateLimitMap.delete(socketId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} rate limit entries`);
    }
    targetedOfferLimiter.prune(now);
  }, 5 * 60 * 1000); // Clean every 5 minutes

  function rateLimitIdentity(socket: Socket, peerId?: string): string {
    const forwarded = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return `${forwarded || socket.handshake.address}:${peerId || socket.id}`;
  }

  function cancelTicketsForSocket(socketId: string, reason: string): void {
    for (const [fileId, ticket] of tickets) {
      if (ticket.from !== socketId && ticket.to !== socketId) continue;
      const otherSide = ticket.from === socketId ? ticket.to : ticket.from;
      tickets.delete(fileId);
      if (activeRelays.delete(fileId)) rejectedRelays.add(fileId);
      io.to(otherSide).emit('file-cancel', { fileId, reason });
      setTimeout(() => rejectedRelays.delete(fileId), 60_000);
    }
  }

  // Helper: Find socket.id from peer.id
  function findSocketIdByPeerId(peerId: string): string | null {
    for (const [socketId, peer] of peers.entries()) {
      if (peer.id === peerId) {
        return socketId;
      }
    }
    return null;
  }

  function resolveSocketId(peerOrSocketId: string): string | null {
    if (!peerOrSocketId) return null;
    if (io.sockets.sockets.has(peerOrSocketId)) return peerOrSocketId;
    return findSocketIdByPeerId(peerOrSocketId);
  }

  function generateRoomCode(): string {
    let code = '';
    do {
      code = randomInt(10000, 100000).toString();
    } while (rooms.has(code));
    return code;
  }

  function maskNetworkName(ip?: string): string | undefined {
    if (!ip) return undefined;
    return ip.includes('.')
      ? ip.split('.').slice(0, 3).join('.') + '.x'
      : ip.split(':').slice(0, 3).join(':') + ':x';
  }

  function toPublicPeer(peer: PeerWithMode, viewer?: PeerWithMode): PublicPeer {
    const publicPeer: PublicPeer = {
      id: peer.id,
      name: peer.name,
      device: peer.device,
      avatar: peer.avatar,
      critter: peer.critter,
    };

    if (viewer) {
      publicPeer.sameNetwork = !!peer.ip && peer.ip === viewer.ip;
      publicPeer.inRoom = !!peer.roomCode && peer.roomCode === viewer.roomCode;
    }

    return publicPeer;
  }

  function sanitizeDisplayName(name: unknown): string | null {
    if (typeof name !== 'string') return null;
    const cleaned = name.replace(/<[^>]*>/g, '').replace(/[<>'"]/g, '').trim().slice(0, 50);
    return cleaned || null;
  }

  function sanitizeEmoji(emoji: unknown): string | null {
    if (typeof emoji !== 'string') return null;
    const cleaned = emoji.trim().slice(0, 16);
    return cleaned || null;
  }

  io.on('connection', (socket: Socket) => {
    if (peers.size >= MAX_PEERS) {
      socket.emit('server-full', { message: 'เซิร์ฟเวอร์เต็ม กรุณาลองใหม่อีกครั้ง' });
      socket.disconnect();
      return;
    }
    
    if (dev) console.log(`✅ Client connected: ${socket.id}`);
    console.log(`📡 Registered events: join, set-mode, rtc-*, file-*, relay-*, text-offer, disconnect`);

    socket.use(([event, data, ack], next) => {
      const reject = (message: string) => {
        if (typeof ack === 'function') ack(false);
        socket.emit(event.startsWith('relay-') ? 'relay-error' : event === 'set-mode' || event === 'join' ? 'room-error' : 'file-error', {
          fileId: typeof data?.fileId === 'string' ? data.fileId : undefined,
          error: message, message,
        });
      };
      if (!validPacket(event, data)) return reject('ข้อมูลคำขอไม่ถูกต้อง');
      if (event === 'join') {
        if (peers.has(socket.id)) return reject('เชื่อมต่อแล้ว กรุณาใช้การเปลี่ยนโหมด');
        if (peers.size >= MAX_PEERS) return reject('เซิร์ฟเวอร์เต็ม กรุณาลองอีกครั้ง');
        if (Array.from(peers.values()).some(p => p.id === data.peer.id)) return reject('อุปกรณ์นี้เชื่อมต่ออยู่แล้ว กรุณาปิดแท็บเดิมก่อน');
      } else if (!peers.has(socket.id)) return reject('กรุณาเชื่อมต่อก่อน');
      if ((event === 'join' || event === 'set-mode') && data.mode === 'private' && data.roomCode) {
        const member = Array.from(rooms.get(data.roomCode) ?? []).map(id => peers.get(id)).find(Boolean);
        if (member?.roomPassword && member.roomPassword !== data.password) return reject('รหัสผ่านไม่ถูกต้อง');
      }
      if (event === 'unblock-peer') return next();
      if (typeof data.to === 'string') {
        const target = resolveSocketId(data.to);
        const self = peers.get(socket.id);
        const other = target ? peers.get(target) : undefined;
        if (!target || !self || !other || target === socket.id) return reject('ผู้รับไม่ได้เชื่อมต่ออยู่');
        const ticket = tickets.get(data.fileId);
        const bound = ticket && ((ticket.from === socket.id && ticket.to === target) || isRecipient(ticket, socket.id, target));
        if (!bound && !getVisiblePeersFor(self).some(p => p.id === other.id) && !getVisiblePeersFor(other).some(p => p.id === self.id)) return reject('ผู้รับอยู่นอกกลุ่มที่อนุญาต');
        if (event === 'file-offer' && (ticket || tickets.size >= 500)) return reject('คำขอซ้ำหรือมีรายการรอมากเกินไป');
        if (event === 'file-offer' && hasLiveInboundTicket(tickets, target)) return reject('ผู้รับกำลังพิจารณาหรือรับไฟล์อื่นอยู่');
        if (['file-accept', 'file-reject', 'file-preparing'].includes(event)) {
          if (!isRecipient(ticket, socket.id, target)) return reject('ไม่พบคำขอรับไฟล์นี้');
          if (ticket && isOfferExpired(ticket)) {
            tickets.delete(data.fileId);
            return reject('คำขอส่งไฟล์หมดอายุแล้ว');
          }
        }
        if ((event === 'file-cancel' || event === 'file-complete') && !canCancelTicket(ticket, socket.id, target)) return reject('ไม่พบรายการส่งไฟล์นี้');
        if (event === 'relay-start' && (!mayStartRelay(ticket, socket.id, target, data) || activeRelays.has(data.fileId))) return reject('ผู้รับยังไม่ได้ยอมรับไฟล์นี้');
        if (['relay-ready', 'relay-chunk', 'relay-end', 'relay-complete-ack'].includes(event)) {
          const relay = activeRelays.get(data.fileId);
          const receiving = event === 'relay-ready' || event === 'relay-complete-ack';
          if (!relay || (receiving ? relay.to !== socket.id || relay.from !== target : relay.from !== socket.id || relay.to !== target)) return reject('ไม่มีสิทธิ์ในรายการส่งไฟล์นี้');
          if (event === 'relay-chunk' && (!relay.ready || relay.ended || relay.bytes + data.chunk.byteLength > relay.size)) return reject('ข้อมูลไฟล์เกินขนาดหรือรายการยังไม่พร้อม');
          if (event === 'relay-end' && (!relay.ready || relay.ended || relay.bytes !== relay.size)) return reject('ข้อมูลไฟล์ยังไม่ครบ');
          if (event === 'relay-ready' && (relay.ready || relay.ended)) return reject('รายการนี้เริ่มแล้ว');
          if (event === 'relay-complete-ack' && !relay.ended) return reject('รายการยังไม่เสร็จ');
        }
      }
      next();
    });

    socket.on('join', ({ peer: peerData, mode, roomCode, password }: { peer: Peer; mode: 'public' | 'wifi' | 'private'; roomCode?: string; password?: string }) => {
      // Rate limiting
      if (!checkRateLimit(rateLimitIdentity(socket, peerData?.id), 'join')) {
        socket.emit('rate-limit-exceeded', { 
          event: 'join', 
          message: 'คุณพยายามเชื่อมต่อบ่อยเกินไป กรุณารอสักครู่' 
        });
        return;
      }
      
      if (dev) console.log(`📥 Join event received:`, peerData, { mode, roomCode });
      
      const pendingTimer = pendingDisconnects.get(peerData.id);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingDisconnects.delete(peerData.id);
        console.log(`♻️ Peer ${peerData.id} reconnected within grace period`);
      }

      const clientIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || socket.handshake.address;
      
      const peer: PeerWithMode = {
        ...peerData,
        // Keep the original peerData.id (from client localStorage) as the unique ID
        // but the map key remains socket.id for communication
        mode: mode || 'public',
        roomCode: mode === 'private' ? (roomCode || generateRoomCode()) : undefined,
        roomPassword: mode === 'private' ? password : undefined,
        ip: clientIp
      };
      
      peers.set(socket.id, peer);
      console.log(`👤 Peer joined: ${peer.name} (${peer.device}) - Mode: ${peer.mode} - IP: ${clientIp} - Total peers: ${peers.size}`);
      
      if (peer.mode === 'private' && peer.roomCode) {
        socket.join(peer.roomCode);
        if (!rooms.has(peer.roomCode)) {
          rooms.set(peer.roomCode, new Set());
        }
        rooms.get(peer.roomCode)!.add(socket.id);
      }

      const maskedIp = maskNetworkName(clientIp);

      // Send current mode info
      socket.emit('mode-info', {
        mode: peer.mode,
        roomCode: peer.roomCode ?? null,
        roomPassword: peer.roomPassword ?? null,
        networkName: maskedIp
      });
      
      // Broadcast to all peers
      broadcastPeers();
      
      // Notify others
      for (const [viewerId, viewer] of peers) {
        if (viewerId !== socket.id && getVisiblePeersFor(viewer).some(p => p.id === peer.id)) io.to(viewerId).emit('peer-joined', toPublicPeer(peer, viewer));
      }

      // Also ensure everyone gets the updated lists
      broadcastPeersToAll();
    });

    socket.on('set-mode', ({ mode, roomCode, password }: { mode: 'public' | 'wifi' | 'private'; roomCode?: string; password?: string }) => {
      const peer = peers.get(socket.id);
      if (!peer) return;

      cancelTicketsForSocket(socket.id, 'mode-changed');

      // Leave previous room if any
      if (peer.roomCode) {
        socket.leave(peer.roomCode);
        rooms.get(peer.roomCode)?.delete(socket.id);
        if (rooms.get(peer.roomCode)?.size === 0) {
          rooms.delete(peer.roomCode);
        }
      }

      const nextRoomCode = mode === 'private' ? (roomCode || generateRoomCode()) : undefined;

      peer.mode = mode;
      peer.roomCode = nextRoomCode;
      peer.roomPassword = password;

      if (mode === 'private' && nextRoomCode) {
        socket.join(nextRoomCode);
        if (!rooms.has(nextRoomCode)) {
          rooms.set(nextRoomCode, new Set());
        }
        rooms.get(nextRoomCode)!.add(socket.id);
        
        socket.emit('room-info', { roomCode: nextRoomCode });
      }

      socket.emit('mode-info', {
        mode,
        roomCode: mode === 'private' ? nextRoomCode : null,
        roomPassword: mode === 'private' ? password : null,
        networkName: mode === 'wifi' ? maskNetworkName(peer.ip) : undefined
      });

      broadcastPeersToAll();
    });

    socket.on('update-name', ({ name }: { name: string }) => {
      const peer = peers.get(socket.id);
      if (!peer) return;
      const sanitized = sanitizeDisplayName(name);
      if (sanitized) {
        peer.name = sanitized;
        broadcastPeersToAll();
      }
    });

    socket.on('update-emoji', ({ emoji, photoUrl }: { emoji?: string; photoUrl?: string | null }) => {
      const peer = peers.get(socket.id);
      if (!peer) return;
      if (emoji) {
        const sanitized = sanitizeEmoji(emoji);
        if (sanitized) {
          if (peer.avatar) peer.avatar.emoji = sanitized;
          if (peer.critter) peer.critter.emoji = sanitized;
        }
      }
      if (photoUrl !== undefined) {
        const validPhoto = typeof photoUrl === 'string' && photoUrl.startsWith('data:image/') && photoUrl.length < 200000 ? photoUrl : null;
        if (peer.avatar) peer.avatar.photoUrl = validPhoto;
        if (peer.critter) peer.critter.photoUrl = validPhoto;
      }
      broadcastPeersToAll();
    });

    // WebRTC signaling
    socket.on('rtc-offer', ({ to, offer, isIceRestart }: { to: string; offer: RTCSessionDescriptionInit; isIceRestart?: boolean }) => {
      // Rate limiting
      const sender = peers.get(socket.id);
      if (!checkRateLimit(rateLimitIdentity(socket, sender?.id), 'rtcOffer')) {
        console.warn(`⚠️ Rate limit exceeded for rtc-offer from ${socket.id}`);
        return;
      }
      
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ rtc-offer: Target peer not found: ${to}`);
        return;
      }
      
      io.to(targetSocketId).emit('rtc-offer', {
        from: peers.get(socket.id)?.id || socket.id,
        offer,
        isIceRestart
      });
    });

    socket.on('rtc-answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ rtc-answer: Target peer not found: ${to}`);
        return;
      }
      
      io.to(targetSocketId).emit('rtc-answer', {
        from: peers.get(socket.id)?.id || socket.id,
        answer
      });
    });

    socket.on('rtc-ice', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ rtc-ice: Target peer not found: ${to}`);
        return;
      }
      
      const senderPeer = peers.get(socket.id);

      // Auto-unmask mDNS candidates for local network peers:
      // iOS Safari masks local LAN IPs with .local mDNS hostnames (e.g. 5b4c8a2b-xxx.local).
      // Windows often cannot resolve these mDNS hostnames without Bonjour, causing ICE failure.
      // If sender has a known LAN IP (e.g. 192.168.x.x, 10.x.x.x), also emit an unmasked candidate with the real LAN IP!
      if (candidate && candidate.candidate && candidate.candidate.includes('.local') && senderPeer?.ip) {
        const cleanIp = senderPeer.ip.replace(/^.*:/, '');
        if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanIp) && !cleanIp.startsWith('127.')) {
          const unmaskedCandidateStr = candidate.candidate.replace(/[a-zA-Z0-9-]+\.local/i, cleanIp);
          console.log(`🧊 Unmasking mDNS candidate for ${senderPeer.name} with LAN IP: ${cleanIp}`);
          io.to(targetSocketId).emit('rtc-ice', {
            from: senderPeer.id || socket.id,
            candidate: {
              ...candidate,
              candidate: unmaskedCandidateStr
            }
          });
        }
      }

      io.to(targetSocketId).emit('rtc-ice', {
        from: senderPeer?.id || socket.id,
        candidate
      });
    });

    // File transfer signaling
    socket.on('file-offer', ({ to, file, fileId }: { to: string; file: { name: string; size: number; type: string }; fileId: string }) => {
      // Payload validation
      if (!file || !file.name || typeof file.size !== 'number' || !fileId) {
        console.error('❌ Invalid file-offer payload');
        socket.emit('file-error', { fileId, error: 'ข้อมูลไฟล์ไม่ถูกต้อง' });
        return;
      }
      
      // No strict file size validation, relying on client limits
      if (file.size < 0) {
        socket.emit('file-error', { fileId, error: 'File size is invalid' });
        return;
      }
      
      const fromPeer = peers.get(socket.id);
      if (!fromPeer) return;
      
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ file-offer: Target peer not found: ${to}`);
        socket.emit('file-error', { fileId, error: 'ผู้รับไม่ได้เชื่อมต่ออยู่' });
        return;
      }
      
      const targetPeer = peers.get(targetSocketId);
      if (!targetPeer) return;

      const rejectOffer = (reason: 'blocked' | 'busy' | 'rate-limited', message: string, retryAfterMs?: number) => {
        socket.emit('file-reject', { fileId, reason, message, retryAfterMs });
      };

      if (isBlocked(blockedPairs, targetPeer.id, fromPeer.id)) {
        rejectOffer('blocked', 'ผู้รับบล็อกคำขอจากอุปกรณ์นี้');
        return;
      }
      if (hasLiveInboundTicket(tickets, targetSocketId) || Array.from(tickets.values()).some(ticket => ticket.from === socket.id && !isOfferExpired(ticket))) {
        rejectOffer('busy', 'มีคำขอหรือการส่งไฟล์อื่นกำลังทำงานอยู่');
        return;
      }

      const identity = rateLimitIdentity(socket, fromPeer.id);
      const targetedLimit = targetedOfferLimiter.attempt(`${identity}:${targetPeer.id}`);
      if (!checkRateLimit(identity, 'fileOffer') || !targetedLimit.allowed) {
        socket.emit('rate-limit-exceeded', {
          event: 'file-offer',
          fileId,
          retryAfterMs: targetedLimit.retryAfterMs,
          message: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่',
        });
        rejectOffer('rate-limited', 'ส่งคำขอถี่เกินไป กรุณารอสักครู่', targetedLimit.retryAfterMs);
        return;
      }

      console.log(`📤 Forwarding file-offer: ${file.name} from ${fromPeer.name} to ${targetSocketId}`);
      
      const now = Date.now();
      tickets.set(fileId, { from: socket.id, to: targetSocketId, ...file, accepted: false, createdAt: now, updatedAt: now });
      io.to(targetSocketId).emit('file-offer', {
        from: toPublicPeer(fromPeer, targetPeer),
        file,
        fileId,
        expiresAt: now + OFFER_TTL_MS,
      });

      setTimeout(() => {
        const pending = tickets.get(fileId);
        if (!pending || pending.accepted || !isOfferExpired(pending)) return;
        tickets.delete(fileId);
        io.to(pending.from).emit('file-reject', { fileId, reason: 'timeout' });
        io.to(pending.to).emit('file-cancel', { fileId, reason: 'expired' });
      }, OFFER_TTL_MS + 50);
    });

    socket.on('file-accept', ({ to, fileId }: { to: string; fileId: string }) => {
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ file-accept: Target peer not found: ${to}`);
        return;
      }
      
      console.log(`✅ Forwarding file-accept from ${socket.id} to ${targetSocketId}`);
      
      const ticket = tickets.get(fileId);
      if (ticket) {
        ticket.accepted = true;
        ticket.updatedAt = Date.now();
      }
      io.to(targetSocketId).emit('file-accept', {
        from: peers.get(socket.id)?.id || socket.id,
        fileId
      });
    });

    socket.on('file-preparing', ({ to, fileId }: { to: string; fileId: string }) => {
      const targetSocketId = resolveSocketId(to);
      const ticket = tickets.get(fileId);
      if (!targetSocketId || !ticket) return;
      ticket.updatedAt = Date.now();
      io.to(targetSocketId).emit('file-preparing', {
        from: peers.get(socket.id)?.id || socket.id,
        fileId,
      });
    });

    socket.on('file-reject', ({ to, fileId, reason }: { to: string; fileId: string; reason?: string }) => {
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ file-reject: Target peer not found: ${to}`);
        return;
      }
      
      console.log(`❌ Forwarding file-reject from ${socket.id} to ${targetSocketId} (reason: ${reason || 'rejected'})`);
      
      tickets.delete(fileId);
      activeRelays.delete(fileId);
      io.to(targetSocketId).emit('file-reject', {
        from: peers.get(socket.id)?.id || socket.id,
        fileId,
        reason: reason || 'rejected'
      });
    });

    socket.on('file-cancel', ({ to, fileId, reason }: { to: string; fileId: string; reason?: string }) => {
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) return;
      tickets.delete(fileId);
      if (activeRelays.delete(fileId)) rejectedRelays.add(fileId);
      io.to(targetSocketId).emit('file-cancel', {
        from: peers.get(socket.id)?.id || socket.id,
        fileId,
        reason: reason || 'cancelled',
      });
      setTimeout(() => rejectedRelays.delete(fileId), 60_000);
    });

    socket.on('file-complete', ({ to, fileId }: { to: string; fileId: string }) => {
      const targetSocketId = resolveSocketId(to);
      tickets.delete(fileId);
      activeRelays.delete(fileId);
      if (targetSocketId) io.to(targetSocketId).emit('file-complete', { fileId });
    });

    socket.on('block-peer', ({ to }: { to: string }) => {
      const owner = peers.get(socket.id);
      const targetSocketId = resolveSocketId(to);
      const target = targetSocketId ? peers.get(targetSocketId) : undefined;
      if (!owner || !target || !targetSocketId) return;

      blockedPairs.add(blockKey(owner.id, target.id));
      for (const [fileId, ticket] of tickets) {
        if (ticket.from === targetSocketId && ticket.to === socket.id) {
          tickets.delete(fileId);
          activeRelays.delete(fileId);
          io.to(targetSocketId).emit('file-reject', { fileId, reason: 'blocked' });
        }
      }
    });

    socket.on('unblock-peer', ({ to }: { to: string }) => {
      const owner = peers.get(socket.id);
      if (owner) blockedPairs.delete(blockKey(owner.id, to));
    });

    // Relay fallback - Streaming mode (ไม่เก็บใน memory)
    socket.on('relay-start', ({ to, fileId, name, size, mimeType }: { to: string; fileId: string; name: string; size: number; mimeType: string }) => {
      console.log(`📤 Relay-start received: ${name} (${(size / 1024 / 1024).toFixed(1)}MB) from ${socket.id} to ${to}`);
      
      // Check if receiver is still connected
      const targetSocketId = resolveSocketId(to);
      const receiverSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : undefined;
      if (!targetSocketId || !receiverSocket) {
        console.error(`❌ Relay rejected: Receiver ${to} not connected`);
        socket.emit('relay-error', { 
          fileId, 
          error: 'ผู้รับไม่ได้เชื่อมต่ออยู่',
          suggestedAction: 'รอให้ผู้รับเชื่อมต่อก่อน'
        });
        return;
      }

      // จำกัดจำนวน relay พร้อมกัน (ป้องกัน server ล่ม)
      if (activeRelays.size >= MAX_CONCURRENT_RELAYS) {
        console.error(`❌ Relay rejected: Too many concurrent relays (${activeRelays.size}/${MAX_CONCURRENT_RELAYS})`);
        socket.emit('relay-error', { 
          fileId, 
          error: 'เซิร์ฟเวอร์กำลังส่งไฟล์เต็มแล้ว กรุณารอสักครู่',
          suggestedAction: 'ลองใหม่อีกครั้งใน 1-2 นาที หรือใช้ WiFi เดียวกันเพื่อส่งตรง P2P'
        });
        return;
      }

      // แนะนำให้ใช้ P2P สำหรับไฟล์ใหญ่
      if (size > 50 * 1024 * 1024) { // > 50MB
        console.warn(`⚠️ Large file relay: ${(size / 1024 / 1024).toFixed(1)}MB - suggesting P2P`);
        socket.emit('relay-warning', {
          fileId,
          message: 'ไฟล์ใหญ่กว่า 50MB แนะนำให้ใช้ WiFi เดียวกันเพื่อส่งเร็วขึ้น',
          size
        });
      }
      
      // Track active relay session
      activeRelays.set(fileId, { startTime: Date.now(), lastActivity: Date.now(), bytes: 0, ready: false, ended: false, from: socket.id, to: targetSocketId, size });
      console.log(`📊 Active relays: ${activeRelays.size}`);
      
      // Forward ทันที ไม่เก็บใน memory (streaming mode)
      console.log(`✅ Forwarding relay-start to ${targetSocketId}`);
      io.to(targetSocketId).emit('relay-start', {
        from: peers.get(socket.id)?.id || socket.id,
        fileId,
        name,
        size,
        mimeType
      });
    });

    socket.on('relay-ready', ({ to, fileId }: { to: string; fileId: string }) => {
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ relay-ready: Target peer not found: ${to}`);
        return;
      }

      console.log(`✅ Forwarding relay-ready ACK from ${socket.id} to ${targetSocketId} for file ${fileId}`);
      activeRelays.get(fileId)!.ready = true;
      activeRelays.get(fileId)!.lastActivity = Date.now();
      io.to(targetSocketId).emit('relay-ready', {
        from: peers.get(socket.id)?.id || socket.id,
        fileId
      });
    });

    socket.on('relay-chunk', ({ to, fileId, chunk }: { to: string; fileId: string; chunk: ArrayBuffer }, ack?: (success: boolean) => void) => {
      // Don't forward chunks for rejected relays
      if (rejectedRelays.has(fileId)) {
        if (ack) ack(false);
        return;
      }
      
      // Render Free Tier: Limit chunk size to prevent memory overflow
      const MAX_CHUNK_SIZE = 128 * 1024; // 128KB max per chunk
      if (chunk.byteLength > MAX_CHUNK_SIZE) {
        console.error(`❌ Relay chunk too large: ${chunk.byteLength} bytes (max ${MAX_CHUNK_SIZE})`);
        socket.emit('relay-error', { 
          fileId, 
          error: 'Chunk size เกินขนาดที่กำหนด',
          suggestedAction: 'ลดขนาด chunk หรือใช้ P2P แทน'
        });
        if (ack) ack(false);
        return;
      }
      
      // Backpressure: Check if receiver socket is still connected and not overwhelmed
      const targetSocketId = resolveSocketId(to);
      const receiverSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : undefined;
      if (!receiverSocket || !receiverSocket.connected) {
        console.error(`❌ Relay chunk dropped: Receiver ${to} not connected`);
        if (ack) ack(false);
        return;
      }
      
      const relay = activeRelays.get(fileId)!;
      relay.bytes += chunk.byteLength;
      relay.lastActivity = Date.now();
      if (ack) {
        receiverSocket.timeout(10000).emit('relay-chunk', { fileId, chunk }, (error: Error | null, receiverAck: boolean) => {
          ack(!error && receiverAck === true);
        });
      } else {
        receiverSocket.emit('relay-chunk', { fileId, chunk });
      }
    });

    socket.on('relay-end', ({ fileId }: { fileId: string }) => {
      // Don't forward end for rejected relays
      if (rejectedRelays.has(fileId)) {
        console.log(`🚫 Ignoring relay-end for rejected fileId: ${fileId}`);
        rejectedRelays.delete(fileId); // Clean up
        return;
      }
      
      const relay = activeRelays.get(fileId)!;
      relay.ended = true;
      relay.lastActivity = Date.now();
      io.to(relay.to).emit('relay-end', { fileId });
    });

    socket.on('relay-complete-ack', ({ to, fileId }: { to: string; fileId: string }) => {
      const targetSocketId = resolveSocketId(to);
      if (targetSocketId) {
        activeRelays.delete(fileId);
        tickets.delete(fileId);
        io.to(targetSocketId).emit('relay-complete-ack', { fileId });
      }
    });

    // Text message
    socket.on('text-offer', ({ to, text }: { to: string; text: string }) => {
      // Payload validation
      if (typeof text !== 'string' || text.length > 1_000_000) {
        socket.emit('text-error', { error: 'ข้อความใหญ่เกินไป (สูงสุด 1MB)' });
        return;
      }
      
      if (!to || typeof to !== 'string') {
        socket.emit('text-error', { error: 'ข้อมูลผู้รับไม่ถูกต้อง' });
        return;
      }
      
      const fromPeer = peers.get(socket.id);
      if (!fromPeer) return;
      
      const targetSocketId = resolveSocketId(to);
      if (!targetSocketId) {
        console.error(`❌ text-offer: Target peer not found: ${to}`);
        socket.emit('text-error', { error: 'ผู้รับไม่ได้เชื่อมต่ออยู่' });
        return;
      }
      
      const targetPeer = peers.get(targetSocketId);
      if (targetPeer && isBlocked(blockedPairs, targetPeer.id, fromPeer.id)) {
        socket.emit('text-error', { error: 'ผู้รับบล็อกข้อความจากอุปกรณ์นี้' });
        return;
      }
      console.log(`💬 Forwarding text from ${fromPeer.name} to ${targetSocketId}`);
      
      io.to(targetSocketId).emit('text-offer', {
        from: toPublicPeer(fromPeer, targetPeer),
        text,
        timestamp: Date.now()
      });
    });

    socket.on('update-name', ({ name }: { name: string }) => {
      const peer = peers.get(socket.id);
      const cleanedName = sanitizeDisplayName(name);
      if (!peer || !cleanedName) return;

      peer.name = cleanedName;
      broadcastPeersToAll();
    });

    socket.on('update-emoji', ({ emoji }: { emoji: string }) => {
      const peer = peers.get(socket.id);
      const cleanedEmoji = sanitizeEmoji(emoji);
      if (!peer || !cleanedEmoji) return;

      peer.critter = { ...peer.critter, emoji: cleanedEmoji };
      broadcastPeersToAll();
    });

    socket.on('disconnect', (reason) => {
      const peer = peers.get(socket.id);
      if (dev) console.log(`❌ Client disconnected: ${socket.id} - Reason: ${reason} - Had peer data: ${!!peer}`);
      
      // Clean up rate limit tracking
      rateLimitMap.delete(socket.id);
      cancelTicketsForSocket(socket.id, 'disconnected');
      
      if (peer) {
        // เอา socket เก่าออกจาก internal state ก่อน
        peers.delete(socket.id);
        
        if (peer.roomCode) {
          socket.leave(peer.roomCode);
          rooms.get(peer.roomCode)?.delete(socket.id);
          if (rooms.get(peer.roomCode)?.size === 0) {
            rooms.delete(peer.roomCode);
          }
        }
        
        // Clean up any active relays involving this peer
        for (const [fileId, relay] of activeRelays.entries()) {
          if (relay.from === socket.id || relay.to === socket.id) {
            console.log(`🧹 Cleaning up abandoned relay: ${fileId}`);
            // Notify the other side that the transfer failed
            const otherSide = relay.from === socket.id ? relay.to : relay.from;
            io.to(otherSide).emit('relay-error', {
              fileId,
              error: 'ผู้ส่ง/ผู้รับตัดการเชื่อมต่อระหว่างการส่งไฟล์',
              suggestedAction: 'กรุณาลองส่งใหม่อีกครั้ง'
            });
            activeRelays.delete(fileId);
          }
        }

        const timer = setTimeout(() => {
          pendingDisconnects.delete(peer.id);
          
          // ตรวจว่า peer reconnect กลับมาแล้วหรือยัง
          const reconnected = Array.from(peers.values()).some(current => current.id === peer.id);
          if (reconnected) {
            console.log(`♻️ Grace period ignore disconnect: Peer ${peer.name} (${peer.id}) reconnected`);
            return;
          }
          
          console.log(`👋 Peer left after grace period: ${peer.name} (${peer.id})`);
          
          io.emit('peer-left', peer.id);
          broadcastPeersToAll();
        }, PEER_DISCONNECT_GRACE_MS);

        pendingDisconnects.set(peer.id, timer);
      }
    });

    // Per-socket broadcastPeers — sends filtered peer list to THIS socket only
    function broadcastPeers() {
      const peer = peers.get(socket.id);
      if (!peer) {
        // Not a bug — this can happen on disconnect, use broadcastPeersToAll instead
        return;
      }

      const visiblePeers = getVisiblePeersFor(peer);
      if (dev) console.log(`📤 Sending ${visiblePeers.length} visible peers to ${peer.name} (mode: ${peer.mode})`);
      socket.emit('peers', visiblePeers);
    }
  });

  // ─── Helper: Get visible peers for a given peer ───
  function getVisiblePeersFor(peer: PeerWithMode): PublicPeer[] {
    if (peer.mode === 'public') {
      return Array.from(peers.values())
        .filter(p => p.mode === 'public' && p.id !== peer.id)
        .map(p => toPublicPeer(p, peer));
    } else if (peer.mode === 'wifi') {
      return Array.from(peers.values())
        .filter(p => 
          (p.mode === 'wifi' || p.mode === 'public') && 
          p.ip === peer.ip && 
          p.id !== peer.id
        )
        .map(p => toPublicPeer(p, peer));
    } else if (peer.mode === 'private' && peer.roomCode) {
      const roomPeers = rooms.get(peer.roomCode);
      if (roomPeers) {
        return Array.from(roomPeers)
          .map(id => peers.get(id))
          .filter((p): p is PeerWithMode => p !== undefined && p.id !== peer.id)
          .map(p => toPublicPeer(p, peer));
      }
    }
    return [];
  }

  // ─── Broadcast updated peer lists to ALL connected peers ───
  function broadcastPeersToAll() {
    for (const [socketId, peer] of peers.entries()) {
      const visiblePeers = getVisiblePeersFor(peer);
      io.to(socketId).emit('peers', visiblePeers);
    }
    if (dev) console.log(`📤 Broadcast peer lists to ${peers.size} peers`);
  }

  // ─── Stale peer cleanup (every 60s) ───
  setInterval(() => {
    let cleaned = 0;
    for (const [socketId, peer] of peers.entries()) {
      const s = io.sockets.sockets.get(socketId);
      if (!s || !s.connected) {
        console.log(`🧹 Removing stale peer: ${peer.name} (${socketId})`);
        // Clean up room membership
        if (peer.roomCode) {
          rooms.get(peer.roomCode)?.delete(socketId);
          if (rooms.get(peer.roomCode)?.size === 0) {
            rooms.delete(peer.roomCode);
          }
        }
        peers.delete(socketId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} stale peers. Remaining: ${peers.size}`);
      broadcastPeersToAll();
    }

    // Clean up timed-out relay sessions
    const now = Date.now();
    for (const [id, ticket] of tickets) {
      if (isOfferExpired(ticket) || (!activeRelays.has(id) && ticket.accepted && now - ticket.updatedAt > 10 * 60 * 1000)) tickets.delete(id);
    }
    for (const [fileId, relay] of activeRelays.entries()) {
      if (now - relay.lastActivity > RELAY_TIMEOUT) {
        console.log(`⏱️ Relay timeout: ${fileId} (${((now - relay.startTime) / 1000 / 60).toFixed(1)} min)`);
        // Notify both sides
        io.to(relay.from).emit('relay-error', { fileId, error: 'การส่งไฟล์หมดเวลา (ไม่มีข้อมูลใหม่ 5 นาที)', suggestedAction: 'ลองส่งใหม่อีกครั้ง' });
        io.to(relay.to).emit('relay-error', { fileId, error: 'การรับไฟล์หมดเวลา (ไม่มีข้อมูลใหม่ 5 นาที)', suggestedAction: 'ลองส่งใหม่อีกครั้ง' });
        activeRelays.delete(fileId);
      }
    }
  }, STALE_PEER_INTERVAL);

  // ─── Optional Keep-Alive (Only for Render Free Tier if needed) ───
  if (process.env.ENABLE_RENDER_KEEPALIVE === 'true') {
    const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000;
    setInterval(() => {
      const clientCount = io.engine.clientsCount;
      if (clientCount > 0) {
        io.emit('server-keep-alive', { timestamp: Date.now() });
        console.log(`💓 Keep-alive sent to ${clientCount} clients (Render sleep prevention)`);
      }
    }, KEEP_ALIVE_INTERVAL);
  }

  httpServer.listen(port, hostname, () => {
    console.log(`🚀 Server running on http://${hostname}:${port}`);
    console.log(`✅ Ready to accept connections`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM received, shutting down gracefully...');
    io.emit('server-shutdown', { reason: 'Server is restarting' });
    
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing shutdown');
      process.exit(0);
    }, 10000);
  });

  process.on('SIGINT', () => {
    console.log('⚠️ SIGINT received, shutting down...');
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    console.error('Stack:', err.stack);
    
    // Attempt graceful shutdown
    io.emit('server-shutdown', { reason: 'Server error - restarting' });
    
    setTimeout(() => {
      console.log('⚠️ Forcing shutdown after uncaught exception');
      process.exit(1);
    }, 5000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit on unhandled rejection, just log it
  });
}).catch((err) => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});
