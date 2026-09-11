'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { AdaptiveChunker } from '@/lib/adaptiveChunker';
import { Peer, assignDeviceProfile, getDeviceName, generateZenName } from '@/lib/devices';
import { createStreamWriter, shouldUseStreaming, StreamWriter } from '@/lib/streamSaver';
import { detectImageMimeType, validateFile, downloadBlob, requestWakeLock, releaseWakeLock, ReceivingFile, CONNECTION_TIMEOUT, MAX_RETRIES, RETRY_DELAY, getSelectedConnectionRoute, type ConnectionRouteSnapshot, type ConnectionType, isMobileDevice, resolveMimeType, sanitizeFilename } from '@/lib/webrtc';
import { detectDevice, shouldUseRelay } from '@/lib/deviceDetection';
import { handleError, logError } from '@/lib/errorHandler';
import { matchesTransfer, shouldReportProgress } from '@/lib/transferLifecycle';

interface PendingFile {
  file: File;
  peer: Peer;
  _timeout?: NodeJS.Timeout;
}

interface PendingDownload {
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface FileOffer {
  from: Peer;
  file: { name: string; size: number; type: string };
  fileId: string;
  expiresAt?: number;
}

interface TextMessage {
  from: Peer;
  text: string;
  timestamp: number;
}

interface TransferProgress {
  peerId: string;
  peerName: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'preparing' | 'connecting' | 'sending' | 'confirming' | 'receiving' | 'saving' | 'complete' | 'error';
  connectionType?: ConnectionType;
  rtt?: number;
}

interface TransferResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  peerName: string;
  direction: 'sent' | 'received';
  type?: 'file' | 'text';
  textContent?: string;
  reason?: 'rejected' | 'blocked' | 'timeout' | 'error' | 'cancelled' | string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type DiscoveryMode = 'public' | 'wifi' | 'private';

export interface PeerWithMeta extends Peer {
  sameNetwork?: boolean;
  inRoom?: boolean;
  temporarilyOffline?: boolean;
}

export function usePeerConnection() {
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [myPeer, setMyPeer] = useState<Peer | null>(null);

  // Read saved identity from localStorage immediately after hydration
  useEffect(() => {
    try {
      const customEmoji = localStorage.getItem('zensend_custom_emoji') || localStorage.getItem('critters_custom_emoji');
      const customPhoto = localStorage.getItem('zensend_custom_photo');
      const customName = localStorage.getItem('zensend_custom_name') || localStorage.getItem('critters_custom_name');
      const sessionId = localStorage.getItem('zensend_session_id') || localStorage.getItem('critters_session_id') || uuidv4().slice(0, 8);
      const critter = assignDeviceProfile(navigator.userAgent);
      if (customEmoji) {
        critter.emoji = customEmoji;
      }
      if (customPhoto) {
        critter.photoUrl = customPhoto;
      }
      const device = getDeviceName(navigator.userAgent);
      setMyPeer(prev => prev ?? {
        id: sessionId,
        tabId: 'init',
        name: customName || generateZenName(),
        device,
        avatar: critter,
        critter,
      });

      // Restore saved discovery mode preference (defaults to public or user's chosen mode)
      const savedMode = localStorage.getItem('zensend_discovery_mode') as DiscoveryMode | null;
      if (savedMode && (savedMode === 'public' || savedMode === 'wifi' || savedMode === 'private')) {
        setDiscoveryMode(savedMode);
        discoveryModeRef.current = savedMode;
      }
    } catch {
      // ignore
    }
  }, []);
  const [peers, setPeers] = useState<PeerWithMeta[]>([]);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('public');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomPassword, setRoomPassword] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [fileOffer, setFileOffer] = useState<FileOffer | null>(null);
  const [textMessage, setTextMessage] = useState<TextMessage | null>(null);
  const [transfer, setTransfer] = useState<TransferProgress | null>(null);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [forceDisconnectReason, setForceDisconnectReason] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState<PendingDownload | null>(null);
  const [initialDiscoveryDone, setInitialDiscoveryDone] = useState(false);

  // Refs for tracking reconnection state across renders
  const discoveryModeRef = useRef<DiscoveryMode>('public');
  const roomCodeRef = useRef<string | null>(null);
  const roomPasswordRef = useRef<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingFilesRef = useRef<Map<string, PendingFile>>(new Map());
  const activeTransferringFilesRef = useRef<Set<string>>(new Set());
  const receivingFilesRef = useRef<Map<string, ReceivingFile>>(new Map());
  const receivingTextsRef = useRef<Map<string, {
    chunks: string[];
    totalChunks: number;
    totalLength: number;
    received: number;
  }>>(new Map());
  const myPeerRef = useRef<Peer | null>(null);
  const peersRef = useRef<PeerWithMeta[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  // Queue ICE candidates that arrive before remoteDescription is set
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const transferRef = useRef<TransferProgress | null>(null);
  const connectionRoutesRef = useRef<Map<string, ConnectionRouteSnapshot>>(new Map());
  const isOffererRef = useRef<Map<string, boolean>>(new Map());
  const restartAttemptsRef = useRef<Map<string, number>>(new Map());
  const disconnectTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const preparedWritersRef = useRef<Map<string, StreamWriter>>(new Map());
  const completionResolversRef = useRef<Map<string, { resolve: () => void; reject: (err: Error) => void }>>(new Map());
  const peerRemovalTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileOfferRef = useRef<FileOffer | null>(null);
  const activeTransferRef = useRef<{ fileId: string; peerId: string } | null>(null);
  const cancelledFileIdsRef = useRef<Set<string>>(new Set());
  const relayReadyRejectorsRef = useRef<Map<string, (error: Error) => void>>(new Map());
  const cancelTransferRef = useRef<() => void>(() => {});

  // Stable refs for callbacks — prevents useEffect from re-running when callbacks change
  const sendFileViaRelayRef = useRef<(peerId: string, file: File, fileId: string, targetPeer: Peer) => Promise<void>>(async () => {});
  const sendFileViaWebRTCRef = useRef<(peerId: string, file: File, fileId: string, targetPeer: Peer, retryCount?: number) => Promise<void>>(async () => {});

  // Wake Lock
  const requestWakeLockFn = useCallback(async () => {
    await requestWakeLock();
  }, []);

  const releaseWakeLockFn = useCallback(() => {
    releaseWakeLock();
  }, []);

  const prepareReceivedFile = useCallback(
    async (
      chunksOrBlob: ArrayBuffer[] | Blob,
      fileName: string,
      suppliedMimeType: string,
      expectedSize: number
    ) => {
      const mimeType = resolveMimeType(fileName, suppliedMimeType);

      const blob = chunksOrBlob instanceof Blob
        ? new Blob([chunksOrBlob], { type: mimeType })
        : new Blob(chunksOrBlob, { type: mimeType });

      if (blob.size !== expectedSize) {
        throw new Error(
          `ไฟล์ไม่สมบูรณ์: ได้รับ ${blob.size} จาก ${expectedSize} bytes`
        );
      }

      if (isMobileDevice()) {
        // รอให้ผู้ใช้กดปุ่มเอง เพื่อรักษา user activation
        setPendingDownload({
          blob,
          fileName: sanitizeFilename(fileName),
          fileSize: blob.size,
          mimeType,
        });

        return;
      }

      await downloadBlob(blob, fileName);
    },
    []
  );

  const savePendingDownload = useCallback(async () => {
    if (!pendingDownload) return;

    // ฟังก์ชันนี้ต้องถูกเรียกโดยตรงจาก onClick
    await downloadBlob(
      pendingDownload.blob,
      pendingDownload.fileName
    );
    setPendingDownload(null);
  }, [pendingDownload]);

  const dismissPendingDownload = useCallback(() => {
    setPendingDownload(null);
  }, []);

  // Keep refs in sync
  useEffect(() => { myPeerRef.current = myPeer; }, [myPeer]);
  useEffect(() => { peersRef.current = peers; }, [peers]);
  useEffect(() => { transferRef.current = transfer; }, [transfer]);
  useEffect(() => { fileOfferRef.current = fileOffer; }, [fileOffer]);

  // Setup data channel handlers
  const setupDataChannel = useCallback((channel: RTCDataChannel, peerId: string) => {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log(`✅ DataChannel OPEN with ${peerId}`);
      dataChannelsRef.current.set(peerId, channel);
    };

    channel.onclose = () => {
      console.log(`❌ DataChannel CLOSED with ${peerId}`);
      dataChannelsRef.current.delete(peerId);
    };

    channel.onerror = (e) => {
      // DataChannel errors are often empty objects - this is normal WebRTC behavior
      // The actual error details are usually in the RTCPeerConnection state
      const peer = peersRef.current.find(p => p.id === peerId);
      const pc = peerConnectionsRef.current.get(peerId);
      
      console.warn(`⚠️ DataChannel error with ${peer?.name || peerId}`);
      console.warn('📊 Error event:', e);
      console.warn('📊 DataChannel state:', channel.readyState);
      if (pc) {
        console.warn('📊 PeerConnection ICE state:', pc.iceConnectionState);
        console.warn('📊 PeerConnection connection state:', pc.connectionState);
      }
      
      // Don't show error to user unless it's during an active transfer
      const activeTransfer = transferRef.current;
      if (activeTransfer && activeTransfer.peerId === peerId && activeTransfer.status !== 'complete') {
        setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
        setTimeout(() => setTransfer(null), 3000);
      }
    };

    channel.onmessage = async (e) => {
      if (typeof e.data === 'string') {
        try {
          const msg = JSON.parse(e.data);
          // Heartbeat handling
          if (msg.type === 'ping') {
            console.log('💓 Ping received');
            channel.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          if (msg.type === 'pong') {
            console.log('💓 Pong received');
            // Check handled in useEffect
            return;
          }

          console.log('📨 DataChannel message:', msg.type);

          if (msg.type === 'file-complete-ack') {
            const resolver = completionResolversRef.current.get(msg.fileId);
            resolver?.resolve();
            completionResolversRef.current.delete(msg.fileId);
            return;
          }

          if (msg.type === 'file-start') {
            const senderPeer = peersRef.current.find(p => p.id === peerId);
            const route = connectionRoutesRef.current.get(peerId);

            const preparedWriter = preparedWritersRef.current.get(msg.fileId);
            preparedWritersRef.current.delete(msg.fileId);

            // Mobile หรือไฟล์เล็กอาจยังไม่มี writer
            const streamWriter = preparedWriter ??
              (
                shouldUseStreaming(msg.size)
                  ? await createStreamWriter(
                      msg.name,
                      resolveMimeType(msg.name, msg.mimeType),
                      msg.size
                    )
                  : undefined
              );

            receivingFilesRef.current.set(msg.fileId, {
              chunks: [],
              info: {
                name: msg.name,
                size: msg.size,
                type: resolveMimeType(msg.name, msg.mimeType),
              },
              streamWriter,
              useStreaming: Boolean(streamWriter),
              received: 0,
              senderId: peerId,
              _lastReportedBytes: 0,
              _lastReportedAt: Date.now(),
            });
            activeTransferRef.current = { fileId: msg.fileId, peerId };

            // Request wake lock when receiving
            if ('wakeLock' in navigator) {
              navigator.wakeLock.request('screen').then(lock => {
                wakeLockRef.current = lock;
              }).catch(() => { });
            }
            setTransfer({
              peerId,
              peerName: senderPeer?.name || 'ไม่ทราบชื่อ',
              fileName: msg.name,
              fileSize: msg.size,
              progress: 0,
              status: 'receiving',
              connectionType: route?.connectionType,
              rtt: route?.rtt,
            });
          } else if (msg.type === 'file-end') {
            const receiving = receivingFilesRef.current.get(msg.fileId);
            if (receiving) {
              setTransfer(prev =>
                prev
                  ? { ...prev, progress: 100, status: 'saving' }
                  : null
              );

              try {
                let completedBlob: Blob | undefined;

                if (receiving.streamWriter) {
                  const result = await receiving.streamWriter.close();

                  if (result instanceof Blob) {
                    completedBlob = result;
                  }
                } else {
                  completedBlob = new Blob(receiving.chunks, {
                    type: resolveMimeType(
                      receiving.info.name,
                      receiving.info.type
                    ),
                  });
                }

                // File System Access หรือ StreamSaver บน desktop บันทึกให้แล้ว
                if (completedBlob) {
                  await prepareReceivedFile(
                    completedBlob,
                    receiving.info.name,
                    receiving.info.type,
                    receiving.info.size
                  );
                }

                // Send completion ACK back to sender via DataChannel
                channel.send(JSON.stringify({
                  type: 'file-complete-ack',
                  fileId: msg.fileId,
                  receivedSize: receiving.info.size,
                }));
                socketRef.current?.emit('file-complete', { to: peerId, fileId: msg.fileId });

                setTransfer(prev =>
                  prev
                    ? { ...prev, progress: 100, status: 'complete' }
                    : null
                );

                const senderPeer = peersRef.current.find(
                  peer => peer.id === peerId
                );

                setTransferResult({
                  success: true,
                  fileName: receiving.info.name,
                  fileSize: receiving.info.size,
                  peerName: senderPeer?.name || 'เพื่อน',
                  direction: 'received',
                });
              } catch (error) {
                console.error('Cannot prepare received file:', error);

                setTransfer(prev =>
                  prev ? { ...prev, status: 'error' } : null
                );
              } finally {
                receivingFilesRef.current.delete(msg.fileId);
                if (matchesTransfer(activeTransferRef.current?.fileId ?? null, msg.fileId)) {
                  activeTransferRef.current = null;
                }
                releaseWakeLockFn();
                setTimeout(() => setTransfer(null), 1800);
              }
            }
          } else if (msg.type === 'text-message') {
            const senderPeer = peersRef.current.find(p => p.id === peerId);
            if (senderPeer) {
              setTextMessage({
                from: senderPeer,
                text: msg.payload,
                timestamp: Date.now()
              });
              
              // Show notification for received text
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`ข้อความจาก ${senderPeer.name}`, {
                  body: msg.payload.length > 100 ? msg.payload.substring(0, 100) + '...' : msg.payload,
                  icon: '/icon-192.png',
                  tag: 'text-message',
                });
              }
            }
          } else if (msg.type === 'text-start') {
            // Start receiving chunked text
            receivingTextsRef.current.set(msg.textId, {
              chunks: new Array(msg.totalChunks),
              totalChunks: msg.totalChunks,
              totalLength: msg.totalLength,
              received: 0
            });
            console.log(`📥 Receiving long text: ${msg.totalChunks} chunks`);
          } else if (msg.type === 'text-chunk') {
            const receivingText = receivingTextsRef.current.get(msg.textId);
            if (receivingText) {
              receivingText.chunks[msg.chunkIndex] = msg.chunk;
              receivingText.received++;
              
              // Check if all chunks received
              if (receivingText.received === receivingText.totalChunks) {
                const fullText = receivingText.chunks.join('');
                const senderPeer = peersRef.current.find(p => p.id === peerId);
                if (senderPeer) {
                  setTextMessage({
                    from: senderPeer,
                    text: fullText,
                    timestamp: Date.now()
                  });
                  
                  // Show notification for received long text
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`ข้อความจาก ${senderPeer.name}`, {
                      body: fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText,
                      icon: '/icon-192.png',
                      tag: 'text-message',
                    });
                  }
                }
                receivingTextsRef.current.delete(msg.textId);
                console.log('✅ Long text received completely');
              }
            }
          } else if (msg.type === 'text-end') {
            // Cleanup if needed
            receivingTextsRef.current.delete(msg.textId);
          }
        } catch (err) {
          console.error('❌ Parse error:', err);
          console.error('📊 Error details:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            data: typeof e.data === 'string' ? e.data.substring(0, 100) : 'binary',
            peerId,
          });
        }
      } else {
        // Binary chunk
        const fileId = Array.from(receivingFilesRef.current.entries())
          .find(([, receiving]) => receiving.senderId === peerId)?.[0];
        if (fileId) {
          const receiving = receivingFilesRef.current.get(fileId);
          if (receiving) {
            receiving.received += e.data.byteLength;

            if (receiving.streamWriter) {
              // Streaming mode - write directly to disk via StreamSaver
              // StreamSaver's write is async but we don't necessarily need to await it 
              // here unless we want to implement backpressure on the receiving end.
              receiving.streamWriter.write(e.data).catch(err => console.error('Stream write error:', err));
            } else {
              // Memory mode - collect chunks
              receiving.chunks.push(e.data);
            }

            const now = Date.now();
            if (shouldReportProgress(
              receiving.received,
              receiving.info.size,
              receiving._lastReportedBytes ?? 0,
              receiving._lastReportedAt ?? now,
              now
            )) {
              receiving._lastReportedBytes = receiving.received;
              receiving._lastReportedAt = now;
              const progress = Math.round((receiving.received / receiving.info.size) * 100);
              setTransfer(prev => prev ? { ...prev, progress } : null);
            }
          }
        }
      }
    };

    return channel;
  }, [prepareReceivedFile, releaseWakeLockFn]);

  // Heartbeat Loop
  useEffect(() => {
    const interval = setInterval(() => {
      dataChannelsRef.current.forEach((channel) => {
        if (channel.readyState === 'open') {
          // Send Ping
          try {
            channel.send(JSON.stringify({ type: 'ping' }));
          } catch (e) {
            console.error('Error sending heartbeat:', e);
          }
        }
      });
    }, 5000); // Ping every 5s

    return () => clearInterval(interval);
  }, []);

  // Monitor Connection State & Auto-Reconnect
  // Track how long each connection has been in unhealthy state
  const unhealthyTimersRef = useRef<Map<string, number>>(new Map());
  
  useEffect(() => {
    const unhealthyTimers = unhealthyTimersRef.current;
    const checkConnection = () => {
      peerConnectionsRef.current.forEach((pc, peerId) => {
        const state = pc.iceConnectionState;
        
        if (state === 'disconnected' || state === 'failed') {
          const firstSeen = unhealthyTimers.get(peerId) || Date.now();
          if (!unhealthyTimers.has(peerId)) {
            unhealthyTimers.set(peerId, firstSeen);
            console.log(`⚠️ Connection unhealthy with ${peerId} (${state}), monitoring...`);
          }
          
          const elapsed = Date.now() - firstSeen;
          
          // Only clean up if connection has been dead for >15 seconds
          // This gives ICE restart time to work
          if (elapsed > 15000) {
            console.log(`💀 Connection with ${peerId} dead for ${Math.round(elapsed/1000)}s, cleaning up`);
            try { pc.close(); } catch { /* ignore */ }
            peerConnectionsRef.current.delete(peerId);
            dataChannelsRef.current.delete(peerId);
            pendingIceCandidatesRef.current.delete(peerId);
            connectionRoutesRef.current.delete(peerId);
            unhealthyTimers.delete(peerId);
          }
        } else {
          // Connection is healthy, clear timer
          unhealthyTimers.delete(peerId);
        }
      });
    };

    const interval = setInterval(checkConnection, 5000);
    return () => {
      clearInterval(interval);
      unhealthyTimers.clear();
    };
  }, []);

  // Helper: flush queued ICE candidates after remoteDescription is set
  const flushIceCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingIceCandidatesRef.current.get(peerId);
    if (queue && queue.length > 0) {
      console.log(`🧊 Flushing ${queue.length} queued ICE candidates for ${peerId}`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('⚠️ Error adding queued ICE candidate:', err);
        }
      }
      pendingIceCandidatesRef.current.delete(peerId);
    }
  }, []);

  // Helper: trigger ICE restart with attempt limits
  const triggerIceRestart = useCallback((peerId: string, pc: RTCPeerConnection) => {
    const attempts = (restartAttemptsRef.current.get(peerId) || 0) + 1;
    restartAttemptsRef.current.set(peerId, attempts);

    if (attempts > 3) { // ICE_RESTART_MAX_ATTEMPTS = 3
      console.error(`❌ ICE restart limit exceeded (${attempts} attempts) — falling back to relay`);
      
      setTransfer(prev => prev && prev.peerId === peerId
        ? { ...prev, status: 'error', error: 'P2P ล้มเหลวซ้ำ กำลังลองผ่าน relay แทน' }
        : prev
      );

      // Close connection to reject active promise and trigger automatic relay fallback
      try { pc.close(); } catch { /* ignore */ }
      return;
    }

    const isOfferer = isOffererRef.current.get(peerId);
    if (!isOfferer) {
      console.log('⏳ Non-initiator waiting for initiator to restart ICE...');
      return;
    }

    console.log(`🔄 ICE restart attempt ${attempts}/3`);
    setTransfer(prev => prev && prev.peerId === peerId ? { ...prev, status: 'connecting' } : prev);

    try {
      pc.restartIce();
      pc.createOffer({ iceRestart: true }).then(async (offer) => {
        await pc.setLocalDescription(offer);
        if (socketRef.current) {
          console.log('📤 Sending rtc-offer for ICE restart');
          socketRef.current.emit('rtc-offer', { to: peerId, offer, isIceRestart: true });
        }
      }).catch(err => {
        console.error('❌ ICE restart offer creation failed:', err);
      });
    } catch (err) {
      console.error('❌ ICE restart failed:', err);
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log(`🔗 Creating PeerConnection for ${peerId}`);

    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) {
      try { existing.close(); } catch { /* ignore */ }
    }

    // Clear any pending ICE candidates from previous connections
    pendingIceCandidatesRef.current.delete(peerId);

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current.length > 0 ? iceServersRef.current : [
        // Fallback STUN servers if API fails
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        console.log('🧊 Sending ICE candidate:', e.candidate.type);
        socketRef.current.emit('rtc-ice', { to: peerId, candidate: e.candidate });
      } else if (!e.candidate) {
        console.log('🧊 ICE gathering complete');
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`🧊 ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`🧊 ICE connection state: ${state}`);

      if (state === 'connected' || state === 'completed') {
        restartAttemptsRef.current.delete(peerId);
        const timer = disconnectTimersRef.current.get(peerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimersRef.current.delete(peerId);
        }

        pc.getStats().then(stats => {
          const route = getSelectedConnectionRoute(stats);
          if (!route) return;

          connectionRoutesRef.current.set(peerId, route);

          const localType = route.localCandidateType || 'unknown';
          const remoteType = route.remoteCandidateType || 'unknown';

          if (route.connectionType === 'relay') {
            console.log('🔄 Connection via TURN relay (fallback)');
          } else if (route.connectionType === 'stun') {
            console.log('✅ Connection via STUN (P2P internet)');
          } else {
            console.log('⚡ Direct P2P connection (host / LAN)');
          }

          console.log(`📡 Local: ${localType}, Remote: ${remoteType}, RTT: ${route.rtt ?? 'n/a'}ms`);

          setTransfer(prev => {
            if (!prev || prev.peerId !== peerId) return prev;
            
            // If the transfer status was 'connecting' (reconnecting during ICE restart), restore it
            const newStatus = prev.status === 'connecting'
              ? (isOffererRef.current.get(peerId) ? 'sending' : 'receiving')
              : prev.status;

            return {
              ...prev,
              connectionType: route.connectionType,
              rtt: route.rtt,
              status: newStatus
            };
          });
        });
      }
      
      if (state === 'disconnected') {
        // Debounce: wait 3 seconds before triggering restart
        const existingTimer = disconnectTimersRef.current.get(peerId);
        if (!existingTimer) {
          const timer = setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log('⚠️ Peer disconnected for 3s, triggering ICE restart...');
              triggerIceRestart(peerId, pc);
            }
            disconnectTimersRef.current.delete(peerId);
          }, 3000);
          disconnectTimersRef.current.set(peerId, timer);
        }
      }

      if (state === 'failed') {
        // Cancel any pending disconnect timer and trigger restart immediately
        const timer = disconnectTimersRef.current.get(peerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimersRef.current.delete(peerId);
        }
        triggerIceRestart(peerId, pc);
      }
    };

    pc.ondatachannel = (e) => {
      console.log(`📥 Received DataChannel from ${peerId}`);
      setupDataChannel(e.channel, peerId);
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [setupDataChannel, triggerIceRestart]);

  // Fallback: Send file via Socket.IO Relay
  const sendFileViaRelay = useCallback(async (peerId: string, file: File, fileId: string, targetPeer: Peer) => {
    console.log(`📤 Starting Server Relay transfer to ${peerId} (Fallback)`);
    console.log(`📊 File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
    console.log(`🔌 Socket connected: ${socketRef.current?.connected}`);

    const emitRelayChunk = (
      socket: Socket,
      payload: {
        to: string;
        fileId: string;
        chunk: ArrayBuffer;
      }
    ) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error('ผู้รับไม่ตอบสนองระหว่างรับไฟล์'));
        }, 15_000);

        socket.emit(
          'relay-chunk',
          payload,
          (success: boolean) => {
            clearTimeout(timeout);

            if (success === false) {
              reject(new Error('ผู้รับรับข้อมูลไม่สำเร็จ'));
              return;
            }

            resolve();
          }
        );
      });
    };

    setTransfer({
      peerId,
      peerName: targetPeer.name,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'connecting', // เริ่มต้นด้วย connecting
      connectionType: 'relay',
    });

    try {
      if (!socketRef.current) {
        console.error('❌ Socket not connected!');
        throw new Error('Socket not connected');
      }
      
      if (!socketRef.current.connected) {
        console.error('❌ Socket disconnected!');
        throw new Error('Socket disconnected');
      }

      // 1. Send start marker
      console.log(`📤 Emitting relay-start to ${peerId}...`);
      socketRef.current.emit('relay-start', {
        to: peerId,
        fileId,
        name: file.name,
        size: file.size,
        mimeType: detectImageMimeType(file),
      });
      console.log('✅ relay-start emitted');

      // 1.5 Wait for relay-ready ACK from receiver
      console.log('⏳ Waiting for relay-ready ACK from receiver...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socketRef.current?.off('relay-ready', onReady);
          relayReadyRejectorsRef.current.delete(fileId);
          reject(new Error('Relay ACK timeout — ผู้รับไม่ตอบสนอง'));
        }, 10000);

        const onReady = (data: { from: string, fileId: string }) => {
          if (data.fileId === fileId) {
            clearTimeout(timeout);
            socketRef.current?.off('relay-ready', onReady);
            relayReadyRejectorsRef.current.delete(fileId);
            console.log('✅ relay-ready ACK received, starting chunks...');
            
            // เปลี่ยนสถานะเป็น sending เมื่อเริ่มส่งจริงๆ
            setTransfer(prev => prev ? { ...prev, status: 'sending' } : null);
            
            resolve();
          }
        };

        relayReadyRejectorsRef.current.set(fileId, (error) => {
          clearTimeout(timeout);
          socketRef.current?.off('relay-ready', onReady);
          relayReadyRejectorsRef.current.delete(fileId);
          reject(error);
        });
        socketRef.current?.on('relay-ready', onReady);
      });

      // 2. Send chunks
      const CHUNK_SIZE = 128 * 1024; // 128KB is safe for socket.io
      const fileSize = file.size;
      let offset = 0;
      let chunkCount = 0;
      const ACK_EVERY = 8;
      let lastReportedBytes = 0;
      let lastReportedAt = Date.now();

      for (let index = 0; offset < fileSize; index++) {
        if (cancelledFileIdsRef.current.has(fileId)) throw new Error('Transfer cancelled');
        const sliceEnd = Math.min(offset + CHUNK_SIZE, fileSize);
        const chunk = await file.slice(offset, sliceEnd).arrayBuffer();
        
        const requireAck = index % ACK_EVERY === ACK_EVERY - 1 || sliceEnd === fileSize;

        if (requireAck) {
          await emitRelayChunk(socketRef.current, {
            to: peerId,
            fileId,
            chunk,
          });
        } else {
          socketRef.current.emit('relay-chunk', {
            to: peerId,
            fileId,
            chunk,
          });
        }
        
        chunkCount++;
        offset = sliceEnd;

        // Update progress and yield to UI
        const now = Date.now();
        if (shouldReportProgress(offset, fileSize, lastReportedBytes, lastReportedAt, now)) {
          lastReportedBytes = offset;
          lastReportedAt = now;
          const progress = Math.round((offset / fileSize) * 100);
          console.log(`📊 Progress: ${progress}% (${chunkCount} chunks)`);
          
          // Check if transfer was aborted (e.g., due to relay-error)
          if (!socketRef.current || !socketRef.current.connected) {
            throw new Error('Socket disconnected during transfer');
          }
          
          setTransfer(prev => prev ? { ...prev, progress } : null);
          await new Promise(r => setTimeout(r, 0));
        }

        // Add a tiny delay to prevent overwhelming the socket queue
        // which could cause ping timeouts
        await new Promise(r => setTimeout(r, 5));
      }

      // Wait for receiver completion ACK (Relay)
      const completion = new Promise<void>((resolve, reject) => {
        completionResolversRef.current.set(fileId, { resolve, reject });

        window.setTimeout(() => {
          if (completionResolversRef.current.has(fileId)) {
            completionResolversRef.current.delete(fileId);
            reject(new Error('ไม่ได้รับการยืนยันจากผู้รับ'));
          }
        }, 15000);
      });

      // 3. Send end marker
      console.log(`📤 Sending relay-end (${chunkCount} chunks total)`);
      socketRef.current.emit('relay-end', { to: peerId, fileId });
      console.log('✅ relay-end emitted');

      setTransfer(prev =>
        prev
          ? { ...prev, progress: 100, status: 'confirming' }
          : null
      );

      await completion;
      if (cancelledFileIdsRef.current.has(fileId)) throw new Error('Transfer cancelled');

      setTransfer(prev =>
        prev
          ? { ...prev, status: 'complete' }
          : null
      );

      setTransferResult({
        success: true,
        fileName: file.name,
        fileSize: file.size,
        peerName: targetPeer.name,
        direction: 'sent',
      });
      cancelledFileIdsRef.current.delete(fileId);
      completionResolversRef.current.delete(fileId);
      if (matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId)) activeTransferRef.current = null;

      // Release wake lock after transfer complete
      releaseWakeLockFn();

      setTimeout(() => setTransfer(null), 1800);
    } catch (err) {
      console.error('❌ Relay transfer error:', err);
      setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
      setTransferResult({
        success: false,
        fileName: file.name,
        fileSize: file.size,
        peerName: targetPeer.name,
        direction: 'sent',
      });
      setTimeout(() => setTransfer(null), 5000);
    } finally {
      relayReadyRejectorsRef.current.delete(fileId);
      completionResolversRef.current.delete(fileId);
      cancelledFileIdsRef.current.delete(fileId);
      if (matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId)) activeTransferRef.current = null;
      releaseWakeLockFn();
    }
  }, [releaseWakeLockFn]);

  // Send file via WebRTC with retry logic
  const sendFileViaWebRTC = useCallback(async (peerId: string, file: File, fileId: string, targetPeer: Peer, retryCount = 0) => {
    console.log(`📤 Starting WebRTC transfer to ${peerId} (attempt ${retryCount + 1})`);
    console.log(`📊 File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

    // ตรวจสอบ device และ network
    const device = detectDevice();
    console.log('📱 Device info:', {
      isIOS: device.isIOS,
      isMobile: device.isMobile,
      supportsWebRTC: device.supportsWebRTC,
      connectionType: device.connectionType,
      isOnline: device.isOnline,
    });

    // ตรวจสอบว่าออนไลน์หรือไม่
    if (!device.isOnline) {
      throw new Error('network: No internet connection');
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(`file: ${validation.error}`);
    }

    // Request wake lock to prevent screen sleep
    await requestWakeLockFn();

    setTransfer({
      peerId,
      peerName: targetPeer.name,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'connecting', // เริ่มต้นด้วย connecting
    });

    try {
      // Create connection and data channel
      const pc = createPeerConnection(peerId);
      isOffererRef.current.set(peerId, true);
      const dc = pc.createDataChannel('file-transfer', { ordered: true });
      setupDataChannel(dc, peerId);

      console.log('📡 DataChannel created, state:', dc.readyState);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (!socketRef.current) {
        throw new Error('Socket not connected');
      }

      console.log('📤 Sending RTC offer immediately (trickle ICE enabled)...');
      socketRef.current.emit('rtc-offer', { to: peerId, offer: pc.localDescription || offer });
      console.log('📤 RTC offer sent, waiting for DataChannel to open...');

      // Wait for data channel to open with timeout + ICE state monitoring
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clean();
          const iceState = pc.iceConnectionState;
          const gatherState = pc.iceGatheringState;
          const dcState = dc.readyState;
          console.error(`❌ Connection timeout - ICE: ${iceState}, Gathering: ${gatherState}, DC: ${dcState}`);
          reject(new Error(`Connection timeout (ICE: ${iceState}, DC: ${dcState})`));
        }, CONNECTION_TIMEOUT);

        const handleOpen = () => {
          clearTimeout(timeout);
          console.log('✅ DataChannel OPEN - ready to send file!');
          clean();
          resolve();
        };

        const handleError = (e: Event) => {
          clearTimeout(timeout);
          console.error('❌ DataChannel error event:', e);
          clean();
          reject(new Error('DataChannel error'));
        };
        
        const handleClose = () => {
          clearTimeout(timeout);
          console.error('❌ DataChannel closed before open, state was:', dc.readyState);
          clean();
          reject(new Error('DataChannel closed before open'));
        };

        // Monitor ICE state
        const handleIceFailure = () => {
          const state = pc.iceConnectionState;
          console.log(`🧊 ICE state: ${state}`);
          
          if (state === 'connected' || state === 'completed') {
            console.log('✅ ICE connected!');
          }
          
          if (state === 'failed') {
            console.warn('⚠️ WebRTC ICE failed, immediately falling back to Server Relay...');
            clearTimeout(timeout);
            clean();
            reject(new Error('ICE connection failed'));
          }
        };

        const clean = () => {
          dc.removeEventListener('open', handleOpen);
          dc.removeEventListener('error', handleError);
          dc.removeEventListener('close', handleClose);
          pc.removeEventListener('iceconnectionstatechange', handleIceFailure);
        };

        dc.addEventListener('open', handleOpen);
        dc.addEventListener('error', handleError);
        dc.addEventListener('close', handleClose);
        pc.addEventListener('iceconnectionstatechange', handleIceFailure);

        // Check if already open
        if (dc.readyState === 'open') {
          console.log('✅ DataChannel already open!');
          clearTimeout(timeout);
          clean();
          resolve();
        } else {
          console.log('⏳ DataChannel state:', dc.readyState, '- waiting for open...');
        }
      });

      // Send file info
      console.log('📤 Sending file-start');
      console.log(`📊 File details: ${file.name}, size: ${file.size}, type: ${file.type || 'unknown'}`);
      
      // เปลี่ยนสถานะเป็น sending เมื่อเริ่มส่งจริงๆ
      setTransfer(prev => prev ? { ...prev, status: 'sending' } : null);
      
      dc.send(JSON.stringify({
        type: 'file-start',
        fileId,
        name: file.name,
        size: file.size,
        mimeType: detectImageMimeType(file),
      }));

      // Send file chunks with adaptive sizing — streaming from disk to avoid RAM overload
      const chunker = new AdaptiveChunker();
      const fileSize = file.size;
      let sent = 0;
      let offset = 0;

      // Set backpressure threshold - browser fires 'bufferedamountlow' when buffer drops below this
      dc.bufferedAmountLowThreshold = 512 * 1024;

      // Use a larger read-ahead buffer to reduce slice calls
      const READ_AHEAD = 2 * 1024 * 1024; // 2MB read-ahead
      let readBuf: ArrayBuffer | null = null;
      let readBufOffset = 0; // offset inside readBuf
      let lastReportedBytes = 0;
      let lastReportedAt = Date.now();

      while (offset < fileSize) {
        if (cancelledFileIdsRef.current.has(fileId)) throw new Error('Transfer cancelled');
        // Read ahead from file in larger blocks to reduce overhead
        if (!readBuf || readBufOffset >= readBuf.byteLength) {
          const end = Math.min(offset + READ_AHEAD, fileSize);
          try {
            readBuf = await file.slice(offset, end).arrayBuffer();
            readBufOffset = 0;
          } catch (sliceErr) {
            console.error('❌ Error reading file chunk:', sliceErr);
            throw new Error(`Failed to read file at offset ${offset}: ${sliceErr}`);
          }
        }

        // Get adaptive chunk size based on current buffer state
        const CHUNK_SIZE = chunker.adjustChunkSize(dc.bufferedAmount, dc.bufferedAmountLowThreshold);
        const sliceEnd = Math.min(readBufOffset + CHUNK_SIZE, readBuf.byteLength);
        const chunk = readBuf.slice(readBufOffset, sliceEnd);
        const chunkLen = chunk.byteLength;

        // Intelligent Backpressure: Wait ONLY if buffer is full
        if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
          await new Promise<void>((resolve, reject) => {
            let done = false;

            const cleanup = () => {
              if (done) return;
              done = true;
              dc.removeEventListener('bufferedamountlow', onLow);
              dc.removeEventListener('error', onError);
              dc.removeEventListener('close', onClose);
            };

            const onLow = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              reject(new Error('DataChannel error during transfer'));
            };

            const onClose = () => {
              cleanup();
              reject(new Error('DataChannel closed during transfer'));
            };

            dc.addEventListener('bufferedamountlow', onLow);
            dc.addEventListener('error', onError);
            dc.addEventListener('close', onClose);

            // Failsafe: if state changed while setting up
            if (dc.readyState !== 'open') {
              onClose();
            } else if (dc.bufferedAmount <= dc.bufferedAmountLowThreshold) {
               // Fast path: if buffer already drained while setting up listeners
               onLow();
            }
          });
        }

        dc.send(chunk);
        sent += chunkLen;
        offset += chunkLen;
        readBufOffset += chunkLen;

        // Update progress — throttle to every ~500KB or on last chunk
        // AND yield to main thread so React can paint the UI
        const now = Date.now();
        if (shouldReportProgress(sent, fileSize, lastReportedBytes, lastReportedAt, now)) {
          lastReportedBytes = sent;
          lastReportedAt = now;
          const progress = Math.round((sent / fileSize) * 100);
          setTransfer(prev => prev ? { ...prev, progress } : null);

          // Yield to the main thread so progress bar can actually repaint
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // Free read buffer
      readBuf = null;

      // Wait for receiver completion ACK (WebRTC)
      const completion = new Promise<void>((resolve, reject) => {
        completionResolversRef.current.set(fileId, { resolve, reject });

        window.setTimeout(() => {
          if (completionResolversRef.current.has(fileId)) {
            completionResolversRef.current.delete(fileId);
            reject(new Error('ไม่ได้รับการยืนยันจากผู้รับ'));
          }
        }, 15000);
      });

      // Send end marker
      console.log('📤 Sending file-end');
      dc.send(JSON.stringify({ type: 'file-end', fileId }));

      setTransfer(prev =>
        prev
          ? { ...prev, progress: 100, status: 'confirming' }
          : null
      );

      await completion;
      if (cancelledFileIdsRef.current.has(fileId)) throw new Error('Transfer cancelled');

      socketRef.current?.emit('file-complete', { to: peerId, fileId });
      completionResolversRef.current.delete(fileId);
      cancelledFileIdsRef.current.delete(fileId);
      if (matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId)) activeTransferRef.current = null;

      setTransfer(prev =>
        prev
          ? { ...prev, status: 'complete' }
          : null
      );

      setTransferResult({
        success: true,
        fileName: file.name,
        fileSize: file.size,
        peerName: targetPeer.name,
        direction: 'sent',
      });

      // Release wake lock after transfer complete
      releaseWakeLockFn();

      // Let TransferProgress component handle the display timing
      setTimeout(() => setTransfer(null), 1800);

    } catch (err) {
      if (cancelledFileIdsRef.current.has(fileId)) {
        cancelledFileIdsRef.current.delete(fileId);
        completionResolversRef.current.delete(fileId);
        if (matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId)) activeTransferRef.current = null;
        releaseWakeLockFn();
        return;
      }
      // Enhanced error handling
      const appError = handleError(err, 'sendFileViaWebRTC');
      logError(appError, `File: ${file.name}, Attempt: ${retryCount + 1}`);

      // Release wake lock on error
      releaseWakeLockFn();

      // Check if this was an ICE failure or connection timeout (network/NAT/mDNS blocker)
      const isIceOrTimeoutFailure = err instanceof Error && (
        err.message.includes('ICE') || 
        err.message.includes('timeout') || 
        err.message.includes('Connection timeout')
      );

      // Retry logic with exponential backoff (only for non-ICE errors like transient datachannel glitches)
      if (!isIceOrTimeoutFailure && retryCount < MAX_RETRIES && appError.canRetry) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`🔄 Retrying transfer (${retryCount + 1}/${MAX_RETRIES}) in ${delay}ms...`);
        console.log(`💡 Reason: ${appError.userMessage}`);
        
        setTransfer(prev => prev ? { 
          ...prev, 
          status: 'sending', 
          progress: 0 
        } : null);

        // Clean up failed connection
        try { peerConnectionsRef.current.get(peerId)?.close(); } catch { /* ignore */ }
        peerConnectionsRef.current.delete(peerId);
        dataChannelsRef.current.delete(peerId);
        pendingIceCandidatesRef.current.delete(peerId);
        connectionRoutesRef.current.delete(peerId);

        // Wait before retry
        await new Promise(r => setTimeout(r, delay));

        // Retry
        return sendFileViaWebRTC(peerId, file, fileId, targetPeer, retryCount + 1);
      }

      // Fast fallback to relay without hanging at 0%
      console.warn('⚠️ WebRTC P2P unavailable on current network, falling back to Server Relay immediately...');
      console.log(`💡 ${appError.suggestedAction || 'Using server relay'}`);
      
      // Notify user about fallback
      setTransfer(prev => prev ? { 
        ...prev, 
        status: 'sending', 
        progress: 0,
        connectionType: 'relay' 
      } : null);
      
      return sendFileViaRelay(peerId, file, fileId, targetPeer);
    }
  }, [createPeerConnection, setupDataChannel, requestWakeLockFn, releaseWakeLockFn, sendFileViaRelay]);

  // Keep callback refs in sync (stable references for useEffect)
  useEffect(() => { sendFileViaRelayRef.current = sendFileViaRelay; }, [sendFileViaRelay]);
  useEffect(() => { sendFileViaWebRTCRef.current = sendFileViaWebRTC; }, [sendFileViaWebRTC]);

  const sendText = useCallback(async (peerId: string, text: string, targetPeer: Peer) => {
    console.log(`📤 Sending Text message to ${peerId} via Socket.IO`);
    console.log(`📊 Text length: ${text.length} chars`);
    console.log(`🔌 Socket status: ${socketRef.current?.connected ? 'connected' : 'disconnected'}`);
    
    // Check text size limit (1MB max for safety)
    const textSize = new Blob([text]).size;
    console.log(`📊 Text size: ${textSize} bytes`);
    
    if (textSize > 1024 * 1024) {
      console.error('❌ Text too large:', textSize);
      setTransferResult({
        success: false,
        fileName: 'ข้อความใหญ่เกินไป (สูงสุด 1MB)',
        fileSize: textSize,
        peerName: targetPeer.name,
        direction: 'sent',
      });
      setTimeout(() => setTransferResult(null), 5000);
      return;
    }

    try {
      if (!socketRef.current) {
        console.error('❌ Socket ref is null');
        throw new Error('Socket not connected');
      }
      
      if (!socketRef.current.connected) {
        console.error('❌ Socket is not connected');
        throw new Error('Socket disconnected');
      }
      
      console.log('📤 Emitting text-offer via Socket.IO...');
      socketRef.current.emit('text-offer', { to: peerId, text });
      console.log('✅ text-offer emitted successfully via Socket.IO');
      
      // Notify user of success immediately since it's a small socket emission
      setTransferResult({
        success: true,
        fileName: 'ข้อความ/ลิงก์',
        fileSize: textSize,
        peerName: targetPeer.name,
        direction: 'sent',
        type: 'text',
        textContent: text,
      });
      setTimeout(() => setTransferResult(null), 3000);
    } catch (err) {
      console.error('❌ Text sending error:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        socketConnected: socketRef.current?.connected,
        socketId: socketRef.current?.id,
      });
      
      setTransferResult({
        success: false,
        fileName: 'ส่งข้อความไม่สำเร็จ',
        fileSize: textSize,
        peerName: targetPeer.name,
        direction: 'sent',
      });
      setTimeout(() => setTransferResult(null), 5000);
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const pcs = peerConnectionsRef.current;
    const dcs = dataChannelsRef.current;
    const pendingIceCandidates = pendingIceCandidatesRef.current;
    const connectionRoutes = connectionRoutesRef.current;

    // Don't connect if in In-App Browser
    if (typeof window !== 'undefined' && (sessionStorage.getItem('zensend_inapp') === 'true' || sessionStorage.getItem('purrdrop_inapp') === 'true')) {
      console.log('🚫 In-App Browser detected, not connecting');
      setConnectionStatus('disconnected');
      return;
    }

    // Fetch ICE servers from API
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/zensend';
    fetch(`${basePath}/api/ice-servers`)
      .then(res => res.json())
      .then(data => {
        if (data?.iceServers && data.iceServers.length > 0) {
          iceServersRef.current = data.iceServers;
          console.log('✅ ICE servers loaded from API');
        }
      })
      .catch(err => {
        console.warn('⚠️ Could not load ICE servers from API, using defaults:', err);
        // Fallback STUN servers already set in createPeerConnection
      });

    let sessionId = localStorage.getItem('zensend_session_id') || localStorage.getItem('critters_session_id');
    if (!sessionId) {
      sessionId = uuidv4().slice(0, 8);
      localStorage.setItem('zensend_session_id', sessionId);
    }

    let tabId = sessionStorage.getItem('zensend_tab_id') || sessionStorage.getItem('purrdrop_tab_id');
    if (!tabId) {
      tabId = uuidv4().slice(0, 8);
      sessionStorage.setItem('zensend_tab_id', tabId);
    }

    // Priority: LocalStorage > Generated
    let customName = localStorage.getItem('zensend_custom_name') || localStorage.getItem('critters_custom_name');
    if (!customName) {
      customName = generateZenName();
      localStorage.setItem('zensend_custom_name', customName);
    }

    const customEmoji = localStorage.getItem('zensend_custom_emoji') || localStorage.getItem('critters_custom_emoji');
    const customPhoto = localStorage.getItem('zensend_custom_photo');
    const critter = assignDeviceProfile(navigator.userAgent);
    const device = getDeviceName(navigator.userAgent);

    // Use emoji from localStorage if available, otherwise use default for OS
    if (customEmoji) {
      critter.emoji = customEmoji;
    } else {
      // First time: Save the default OS emoji
      localStorage.setItem('zensend_custom_emoji', critter.emoji);
    }
    if (customPhoto) {
      critter.photoUrl = customPhoto;
    }

    const peer: Peer = {
      id: sessionId,
      tabId,
      name: customName,
      device,
      avatar: { ...critter },
      critter: { ...critter },
    };
    setMyPeer(peer);

    const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || undefined;
    const socketPath = process.env.NEXT_PUBLIC_SOCKET_PATH ?? '/zensend/socket.io';
    const socket = io(signalingUrl, {
      path: socketPath,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
      setConnectionStatus('connected');
      socket.emit('join', {
        peer,
        mode: discoveryModeRef.current,
        roomCode: roomCodeRef.current ?? undefined,
        password: roomPasswordRef.current ?? undefined,
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
      setConnectionStatus('disconnected');
      if (activeTransferRef.current || fileOfferRef.current) cancelTransferRef.current();
      
      // Clean up any active receiving transfers
      receivingFilesRef.current.forEach((receiving) => {
        console.log(`🧹 Aborting receive for ${receiving.info.name} due to disconnect`);
        if (receiving.streamWriter) {
          receiving.streamWriter.abort();
        }
      });
      if (receivingFilesRef.current.size > 0) {
        receivingFilesRef.current.clear();
        setTransfer(prev => {
          if (prev && (prev.status === 'receiving' || prev.status === 'sending')) {
            return { ...prev, status: 'error' };
          }
          return prev;
        });
        setTransferResult({
          success: false,
          fileName: 'Transfer interrupted',
          fileSize: 0,
          peerName: '',
          direction: 'received',
        });
        releaseWakeLockFn();
        setTimeout(() => setTransfer(null), 5000);
      }
    });

    socket.io.on('reconnect_attempt', () => {
      console.log('🔄 Socket reconnecting_attempt...');
      setConnectionStatus('reconnecting');
    });

    socket.io.on('reconnect', () => {
      console.log('✅ Socket reconnected via Manager');
    });

    // Handle server keep-alive (prevent Render Free Tier sleep)
    socket.on('server-keep-alive', () => {
      console.log('💓 Keep-alive received from server');
      // Respond with pong to confirm client is alive
      socket.emit('client-pong', { timestamp: Date.now() });
    });

    // Fallback: If no 'peers' event received after 1200ms, mark discovery done so empty state reveals
    const discoveryTimeout = setTimeout(() => {
      setInitialDiscoveryDone(true);
    }, 1200);

    socket.on('connect_error', () => {
      console.log('⚠️ Socket connect error');
      setInitialDiscoveryDone(true);
    });

    socket.on('reconnect_failed', () => {
      console.log('❌ Socket reconnection failed');
      setConnectionStatus('disconnected');
      setInitialDiscoveryDone(true);
    });

    socket.on('peers', (peerList: PeerWithMeta[]) => {
      clearTimeout(discoveryTimeout);
      const filtered = peerList.filter(p => p.id !== sessionId);
      
      setPeers(prev => {
        const offlinePeers = prev.filter(p => p.temporarilyOffline && !filtered.some(f => f.id === p.id));
        const merged = [
          ...filtered.map(f => ({ ...f, temporarilyOffline: false })),
          ...offlinePeers
        ];
        peersRef.current = merged;
        return merged;
      });
      setInitialDiscoveryDone(true);
    });

    socket.on('room-info', ({ roomCode: code }: { roomCode: string }) => {
      console.log('🏠 Room code:', code);
      setRoomCode(code);
    });

    socket.on('mode-info', ({ mode, roomCode: code, roomPassword: pwd, networkName: netName }: { mode: DiscoveryMode; roomCode: string | null; roomPassword: string | null; networkName?: string }) => {
      console.log('🔄 Mode:', mode, 'Room:', code, 'Network:', netName);
      setDiscoveryMode(mode);
      setRoomCode(code);
      setRoomPassword(pwd);
      
      // Update refs for reconnection
      discoveryModeRef.current = mode;
      roomCodeRef.current = code;
      roomPasswordRef.current = pwd;

      if (netName) setNetworkName(netName);
    });

    socket.on('force-disconnect', ({ reason }: { reason: string }) => {
      console.log(`⚠️ Force disconnect: ${reason}`);
      setConnectionStatus('disconnected');
      socket.disconnect();
      setForceDisconnectReason(reason);
    });

    socket.on('room-error', ({ error, message }: { error: string; message: string }) => {
      console.log('❌ Room error:', error, message);
      setRoomError(message);
      // Clear error after 5 seconds
      setTimeout(() => setRoomError(null), 5000);
    });

    socket.on('peer-joined', (newPeer: PeerWithMeta) => {
      const timer = peerRemovalTimersRef.current.get(newPeer.id);
      if (timer) {
        clearTimeout(timer);
        peerRemovalTimersRef.current.delete(newPeer.id);
        console.log(`♻️ Client grace period: Cancelled removal for peer ${newPeer.name}`);
      }

      setPeers(prev => {
        const exists = prev.some(p => p.id === newPeer.id);
        if (exists) {
          return prev.map(p =>
            p.id === newPeer.id
              ? { ...p, ...newPeer, temporarilyOffline: false }
              : p
          );
        }
        return [...prev, newPeer];
      });

      // Update peersRef as well
      const exists = peersRef.current.some(p => p.id === newPeer.id);
      if (exists) {
        peersRef.current = peersRef.current.map(p =>
          p.id === newPeer.id
            ? { ...p, ...newPeer, temporarilyOffline: false }
            : p
        );
      } else {
        peersRef.current = [...peersRef.current, newPeer];
      }
    });

    socket.on('peer-left', (peerId: string) => {
      // Check if there's an active transfer with this peer
      const currentTransfer = receivingFilesRef.current;
      for (const [fileId, receiving] of currentTransfer.entries()) {
        if (receiving.senderId === peerId) {
          console.log(`❌ Sender ${peerId} left during transfer of ${receiving.info.name}`);
          if (receiving.streamWriter) {
            receiving.streamWriter.abort();
          }
          currentTransfer.delete(fileId);
          setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
          setTransferResult({
            success: false,
            fileName: receiving.info.name,
            fileSize: receiving.info.size,
            peerName: peersRef.current.find(p => p.id === peerId)?.name || 'ไม่ทราบชื่อ',
            direction: 'received',
          });
          releaseWakeLockFn();
          setTimeout(() => setTransfer(null), 5000);
        }
      }
      
      setPeers(previous =>
        previous.map(p =>
          p.id === peerId
            ? { ...p, temporarilyOffline: true }
            : p
        )
      );

      const timer = setTimeout(() => {
        setPeers(previous => previous.filter(p => p.id !== peerId));
        
        peerConnectionsRef.current.get(peerId)?.close();
        peerConnectionsRef.current.delete(peerId);
        dataChannelsRef.current.delete(peerId);
        connectionRoutesRef.current.delete(peerId);
        
        peerRemovalTimersRef.current.delete(peerId);
      }, 2000);

      peerRemovalTimersRef.current.set(peerId, timer);
    });

    socket.on('peer-updated', (updatedPeer: PeerWithMeta) => {
      setPeers(prev => prev.map(p => p.id === updatedPeer.id ? updatedPeer : p));
    });

    // Text signaling
    socket.on('text-offer', ({ from, text, timestamp }: { from: Peer; text: string; timestamp: number }) => {
      console.log('💬 Text offer received from:', from.name);
      setTextMessage({
        from,
        text,
        timestamp: timestamp || Date.now()
      });
      
      // Show notification for received text
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`ข้อความจาก ${from.name}`, {
          body: text.length > 100 ? text.substring(0, 100) + '...' : text,
          icon: '/icon-192.png',
          tag: 'text-message',
        });
      }
    });

    // File signaling
    socket.on('file-offer', (data: FileOffer) => {
      console.log('📦 File offer received:', data.file?.name);
      const currentOffer = fileOfferRef.current;
      if (currentOffer || activeTransferRef.current) {
        socket.emit('file-reject', {
          to: data.from.id,
          fileId: data.fileId,
          reason: 'busy',
        });
        return;
      }
      if (data.expiresAt && data.expiresAt <= Date.now()) {
        socket.emit('file-reject', { to: data.from.id, fileId: data.fileId, reason: 'expired' });
        return;
      }
      fileOfferRef.current = data;
      setFileOffer(data);
    });

    const finishTransferFromServer = (data: { fileId?: string; reason?: string; error?: string; message?: string }) => {
      if (!data.fileId) return;
      const { fileId } = data;
      const pending = pendingFilesRef.current.get(fileId);
      const receiving = receivingFilesRef.current.get(fileId);
      const offered = fileOfferRef.current?.fileId === fileId ? fileOfferRef.current : null;
      const active = matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId);
      if (!pending && !receiving && !offered && !active) return;
      const detail = data.error || data.message || '';
      const reason = data.reason
        || (detail.includes('กำลังพิจารณา') || detail.includes('กำลังทำงาน') ? 'busy' : undefined)
        || (detail.includes('หมดอายุ') ? 'expired' : undefined)
        || (data.error ? 'error' : 'cancelled');

      if (pending?._timeout) clearTimeout(pending._timeout);
      pendingFilesRef.current.delete(fileId);
      activeTransferringFilesRef.current.delete(fileId);
      completionResolversRef.current.get(fileId)?.reject(new Error(data.error || data.message || data.reason || 'Transfer cancelled'));
      completionResolversRef.current.delete(fileId);
      relayReadyRejectorsRef.current.get(fileId)?.(new Error(data.error || data.message || data.reason || 'Transfer cancelled'));
      relayReadyRejectorsRef.current.delete(fileId);

      if (receiving?.streamWriter) receiving.streamWriter.abort();
      receivingFilesRef.current.delete(fileId);
      preparedWritersRef.current.get(fileId)?.abort();
      preparedWritersRef.current.delete(fileId);

      const peerId = activeTransferRef.current?.peerId || pending?.peer.id || receiving?.senderId || offered?.from.id;
      if (peerId) {
        try { peerConnectionsRef.current.get(peerId)?.close(); } catch { /* ignore */ }
        peerConnectionsRef.current.delete(peerId);
        dataChannelsRef.current.delete(peerId);
        pendingIceCandidatesRef.current.delete(peerId);
        connectionRoutesRef.current.delete(peerId);
      }

      if (offered) {
        fileOfferRef.current = null;
        setFileOffer(null);
      }
      if (active) activeTransferRef.current = null;
      cancelledFileIdsRef.current.add(fileId);
      setTransfer(prev => active || (peerId && prev?.peerId === peerId) ? null : prev);

      const source = pending
        ? { name: pending.file.name, size: pending.file.size, peerName: pending.peer.name, direction: 'sent' as const }
        : receiving
          ? { name: receiving.info.name, size: receiving.info.size, peerName: peersRef.current.find(p => p.id === receiving.senderId)?.name || 'ไม่ทราบชื่อ', direction: 'received' as const }
          : offered
            ? { name: offered.file.name, size: offered.file.size, peerName: offered.from.name, direction: 'received' as const }
            : null;
      if (source) {
        setTransferResult({
          success: false,
          fileName: source.name,
          fileSize: source.size,
          peerName: source.peerName,
          direction: source.direction,
          reason,
        });
      }
      releaseWakeLockFn();
    };

    socket.on('file-preparing', ({ fileId }: { fileId: string }) => {
      if (!pendingFilesRef.current.has(fileId)) return;
      setTransfer(prev => matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId) && prev
        ? { ...prev, status: 'preparing' }
        : prev);
    });

    socket.on('file-cancel', finishTransferFromServer);
    socket.on('file-error', finishTransferFromServer);
    socket.on('rate-limit-exceeded', (data: { event?: string; fileId?: string; retryAfterMs?: number; message?: string }) => {
      if (data.event === 'file-offer' && data.fileId) finishTransferFromServer({ ...data, reason: 'rate-limited' });
    });

    socket.on('file-accept', async ({ from, fileId }: { from: string; fileId: string }) => {
      console.log('✅ File accepted by:', from);

      // Deduplicate rapid or duplicate file-accept signals
      if (activeTransferringFilesRef.current.has(fileId)) {
        console.log('ℹ️ Duplicate file-accept ignored (already in progress):', fileId);
        return;
      }

      const pending = pendingFilesRef.current.get(fileId);
      if (pending) {
        if (!matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId)) {
          socket.emit('file-cancel', { to: from, fileId, reason: 'stale-accept' });
          return;
        }
        activeTransferringFilesRef.current.add(fileId);
        console.log(`📤 Starting file transfer: ${pending.file.name} (${pending.file.size} bytes)`);
        
        // Clear timeout
        if (pending._timeout) {
          clearTimeout(pending._timeout);
        }
        
        // ลบออกจาก pending ก่อนส่ง
        pendingFilesRef.current.delete(fileId);
        
        // เช็คว่าควรใช้ relay หรือไม่ (ส่ง discoveryMode และ fileSize)
        const useRelay = shouldUseRelay(discoveryModeRef.current, pending.file.size);
        console.log(`🔀 Transfer mode: ${useRelay ? 'Relay' : 'WebRTC'}`);
        console.log(`📱 Device info:`, detectDevice());
        console.log(`📊 Discovery mode: ${discoveryModeRef.current}, File size: ${(pending.file.size / 1024 / 1024).toFixed(2)}MB`);
        
        // ส่งไฟล์ — ใช้ ref เพื่อไม่ให้ useEffect re-run
        try {
          if (useRelay) {
            console.log('📤 Calling sendFileViaRelay...');
            await sendFileViaRelayRef.current!(from, pending.file, fileId, pending.peer);
          } else {
            console.log('📤 Calling sendFileViaWebRTC...');
            await sendFileViaWebRTCRef.current!(from, pending.file, fileId, pending.peer);
          }
        } catch (err) {
          console.error('❌ Failed to start file transfer:', err);
          setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
          setTransferResult({
            success: false,
            fileName: pending.file.name,
            fileSize: pending.file.size,
            peerName: pending.peer.name,
            direction: 'sent',
            reason: 'error',
          });
        } finally {
          // Keep in active set briefly to suppress trailing duplicates, then clear
          setTimeout(() => {
            activeTransferringFilesRef.current.delete(fileId);
          }, 10000);
        }
      } else {
        // Use console.warn instead of console.error to avoid triggering Next.js error overlay
        console.warn('⚠️ No pending file found for fileId (possibly already completed or expired):', fileId);
      }
    });

    socket.on('file-reject', ({ fileId, reason, message }: { fileId?: string; reason?: string; message?: string }) => {
      console.log('❌ File rejected, reason:', reason || 'rejected');
      finishTransferFromServer({ fileId, reason: reason || 'rejected', message });
    });


    socket.on('relay-start', async (data: { from: string, fileId: string, name: string, size: number, mimeType: string }) => {
      console.log('📥 Relay start received:', data.name);
      console.log('📊 Relay file info:', {
        fileId: data.fileId,
        from: data.from,
        size: `${(data.size / 1024 / 1024).toFixed(2)}MB`,
        mimeType: data.mimeType
      });
      
      const senderPeer = peersRef.current.find(p => p.id === data.from);
      
      const preparedWriter = preparedWritersRef.current.get(data.fileId);
      preparedWritersRef.current.delete(data.fileId);
      
      let streamWriter = preparedWriter;
      if (!streamWriter && shouldUseStreaming(data.size)) {
        console.log(`📁 Large file (${(data.size / 1024 / 1024).toFixed(1)}MB) - using streaming (Relay)`);
        try {
          streamWriter = await createStreamWriter(data.name, data.mimeType, data.size);
        } catch (err) {
          console.log('Streaming not available, using memory buffer:', err);
        }
      }

      receivingFilesRef.current.set(data.fileId, {
        chunks: [],
        info: {
          name: data.name,
          size: data.size,
          type: resolveMimeType(data.name, data.mimeType),
        },
        streamWriter,
        useStreaming: Boolean(streamWriter),
        received: 0,
        senderId: data.from,
        _lastReportedBytes: 0,
        _lastReportedAt: Date.now(),
      });
      activeTransferRef.current = { fileId: data.fileId, peerId: data.from };

      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => {
          wakeLockRef.current = lock;
        }).catch(() => { });
      }

      setTransfer({
        peerId: data.from,
        peerName: senderPeer?.name || 'ไม่ทราบชื่อ',
        fileName: data.name,
        fileSize: data.size,
        progress: 0,
        status: 'receiving',
        connectionType: 'relay',
      });

      // ACK กลับไปหา Sender ว่าเรา setup เสร็จและพร้อมรับ chunks แล้ว
      console.log('📤 Sending relay-ready ACK to sender');
      socket.emit('relay-ready', { to: data.from, fileId: data.fileId });
    });

    socket.on('relay-chunk', async (data: { fileId: string, chunk: ArrayBuffer }, ack?: (success: boolean) => void) => {
      const receiving = receivingFilesRef.current.get(data.fileId);
      if (!receiving) {
        ack?.(false);
        return;
      }

      // Serialize writes: a batch ACK covers all earlier chunks, not just its own write.
      receiving._writeQueue = (receiving._writeQueue ?? Promise.resolve()).then(async () => {
        if (receiving._writeFailed) return;
        try {
          if (receiving.received + data.chunk.byteLength > receiving.info.size) throw new Error('File exceeds offered size');
          if (receiving.streamWriter) {
            await receiving.streamWriter.write(new Uint8Array(data.chunk) as unknown as ArrayBuffer);
          } else {
            receiving.chunks.push(data.chunk);
          }
          receiving.received += data.chunk.byteLength;
          receiving._lastChunkTime = Date.now();
        } catch (err) {
          receiving._writeFailed = true;
          console.error('Error writing stream chunk (Relay):', err);
        }
      });
      await receiving._writeQueue;
      const success = !receiving._writeFailed;

      // Update progress UI moderately to not overload React
      const now = Date.now();
      if (shouldReportProgress(
        receiving.received,
        receiving.info.size,
        receiving._lastReportedBytes ?? 0,
        receiving._lastReportedAt ?? now,
        now
      )) {
        receiving._lastReportedBytes = receiving.received;
        receiving._lastReportedAt = now;
        const progress = Math.round((receiving.received / receiving.info.size) * 100);
        setTransfer(prev => prev ? { ...prev, progress } : null);
      }

      ack?.(success);
    });

    socket.on('relay-end', async (data: { fileId: string }) => {
      console.log('✅ Relay end received for fileId:', data.fileId);
      console.log('📋 Current receiving files:', Array.from(receivingFilesRef.current.keys()));
      
      const receiving = receivingFilesRef.current.get(data.fileId);
      if (!receiving) {
        console.error('❌ No receiving file found for:', data.fileId);
        console.error('💡 This usually means relay-start was rejected by server or never arrived');
        return;
      }

      console.log(`📊 Relay complete - Chunks: ${receiving.chunks.length}, Total received: ${receiving.received} bytes, Expected: ${receiving.info.size} bytes`);
      
      // Check if we received all data
      await receiving._writeQueue;
      if (receiving._writeFailed || receiving.received !== receiving.info.size) {
        const missing = receiving.info.size - receiving.received;
        const percentMissing = ((missing / receiving.info.size) * 100).toFixed(1);
        console.error(`❌ INCOMPLETE TRANSFER: Missing ${missing} bytes (${percentMissing}%)`);
        console.error(`💡 This causes "Unexpected end of archive" errors`);
        
        // Show error to user
        setTransfer(prev => prev ? { ...prev, status: 'error' } : null);
        setTransferResult({
          success: false,
          fileName: receiving.info.name,
          fileSize: receiving.info.size,
          peerName: peersRef.current.find(p => p.id === receiving.senderId)?.name || 'ไม่ทราบชื่อ',
          direction: 'received',
        });
        
        receivingFilesRef.current.delete(data.fileId);
        releaseWakeLockFn();
        setTimeout(() => setTransfer(null), 5000);
        return;
      }

      try {
        setTransfer(prev =>
          prev
            ? { ...prev, progress: 100, status: 'saving' }
            : null
        );

        let completedBlob: Blob | undefined;

        if (receiving.streamWriter) {
          const result = await receiving.streamWriter.close();

          if (result instanceof Blob) {
            completedBlob = result;
          }
        } else {
          completedBlob = new Blob(receiving.chunks, {
            type: resolveMimeType(
              receiving.info.name,
              receiving.info.type
            ),
          });
        }

        if (completedBlob) {
          await prepareReceivedFile(
            completedBlob,
            receiving.info.name,
            receiving.info.type,
            receiving.info.size
          );
        }

        // Send completion ACK back to sender via Socket.io
        socket.emit('relay-complete-ack', {
          to: receiving.senderId,
          fileId: data.fileId,
        });

        setTransfer(prev =>
          prev
            ? { ...prev, progress: 100, status: 'complete' }
            : null
        );

        const senderPeer = peersRef.current.find(p => p.id === receiving.senderId);
        setTransferResult({
          success: true,
          fileName: receiving.info.name,
          fileSize: receiving.info.size,
          peerName: senderPeer?.name || 'ไม่ทราบชื่อ',
          direction: 'received',
        });

        // Vibrate on complete
        if (navigator.vibrate) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {
            // ignore
          }
        }
      } catch (error) {
        console.error('Relay save failed:', error);

        setTransfer(prev =>
          prev ? { ...prev, status: 'error' } : null
        );
      } finally {
        receivingFilesRef.current.delete(data.fileId);
        if (matchesTransfer(activeTransferRef.current?.fileId ?? null, data.fileId)) activeTransferRef.current = null;
        releaseWakeLockFn();
        setTimeout(() => setTransfer(null), 1800);
      }
    });

    socket.on('relay-complete-ack', (data: { fileId: string }) => {
      console.log('✅ Received relay-complete-ack for:', data.fileId);
      const resolver = completionResolversRef.current.get(data.fileId);
      resolver?.resolve();
      completionResolversRef.current.delete(data.fileId);
    });

    // Handle relay errors (e.g., file too large)
    socket.on('relay-error', (data: { fileId: string, error: string, suggestedAction?: string }) => {
      console.error('❌ Relay error:', data.error);
      
      // Clean up any pending transfer
      const pendingFile = pendingFilesRef.current.get(data.fileId);
      if (pendingFile) {
        pendingFilesRef.current.delete(data.fileId);
      }
      
      // Clean up any receiving file
      const receiving = receivingFilesRef.current.get(data.fileId);
      if (receiving) {
        if (receiving.streamWriter) {
          receiving.streamWriter.close().catch(() => {});
        }
        receivingFilesRef.current.delete(data.fileId);
      }
      
      // Update transfer status to error
      setTransfer(prev => {
        if (prev && prev.status === 'sending') {
          return { ...prev, status: 'error' };
        }
        return prev;
      });
      
      // Show error result
      setTransferResult({
        success: false,
        fileName: pendingFile?.file.name || 'Unknown file',
        fileSize: pendingFile?.file.size || 0,
        peerName: pendingFile?.peer.name || 'Unknown',
        direction: 'sent',
      });
      
      // Release wake lock
      releaseWakeLockFn();
      
      // Clear transfer UI after delay
      setTimeout(() => setTransfer(null), 5000);
    });
    // --------------------------------
    socket.on('rtc-offer', async ({ from, offer, isIceRestart }: { from: string; offer: RTCSessionDescriptionInit; isIceRestart?: boolean }) => {
      console.log('📥 RTC offer from:', from, 'isIceRestart:', isIceRestart);
      try {
        let pc = peerConnectionsRef.current.get(from);
        
        // If it's an ICE restart, reuse the existing connection to keep the active data channel
        if (isIceRestart && pc && pc.signalingState !== 'closed') {
          console.log('♻️ Reusing existing PeerConnection for ICE restart');
        } else {
          pc = createPeerConnection(from);
          isOffererRef.current.set(from, false);
        }
        
        console.log('📥 Setting remote description (offer)');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Flush any ICE candidates that arrived before remoteDescription was set
        await flushIceCandidates(from, pc);
        
        console.log('📤 Creating answer');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('📤 Sending answer, ICE gathering state:', pc.iceGatheringState);
        
        console.log('📤 Sending answer immediately (trickle ICE enabled)...');
        socket.emit('rtc-answer', { to: from, answer: pc.localDescription || answer });
        console.log('📤 RTC answer sent');
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('rtc-answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('📥 RTC answer from:', from);
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          // Flush any ICE candidates that arrived before remoteDescription was set
          await flushIceCandidates(from, pc);
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    socket.on('rtc-ice', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && candidate) {
          // Queue candidates if remoteDescription not yet set (race condition fix)
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            console.log('🧊 Queuing ICE candidate (waiting for remoteDescription)');
            const queue = pendingIceCandidatesRef.current.get(from) || [];
            queue.push(candidate);
            pendingIceCandidatesRef.current.set(from, queue);
          }
        } else if (!pc && candidate) {
          // PeerConnection not yet created — queue for later
          console.log('🧊 Queuing ICE candidate (no PeerConnection yet)');
          const queue = pendingIceCandidatesRef.current.get(from) || [];
          queue.push(candidate);
          pendingIceCandidatesRef.current.set(from, queue);
        }
      } catch (err) {
        console.error('Error adding ICE:', err);
      }
    });

    return () => {
      clearTimeout(discoveryTimeout);
      socket.close();
      pcs.forEach(pc => pc.close());
      pcs.clear();
      dcs.clear();
      pendingIceCandidates.clear();
      connectionRoutes.clear();
    };
  }, [createPeerConnection, flushIceCandidates, releaseWakeLockFn, prepareReceivedFile]);

  const sendFile = useCallback((peer: Peer, file: File) => {
    try {
      if (activeTransferRef.current || pendingFilesRef.current.size > 0 || fileOfferRef.current) {
        throw new Error('busy: มีรายการส่งไฟล์อื่นกำลังทำงานอยู่');
      }
      // Check socket connection
      if (!socketRef.current) {
        throw new Error('network: Socket not connected');
      }

      // Check online status
      if (!navigator.onLine) {
        throw new Error('network: No internet connection');
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(`file: ${validation.error}`);
      }

      // Detect MIME type
      const mimeType = detectImageMimeType(file);
      console.log(`📷 File type: ${mimeType} for ${file.name}`);

      const fileId = uuidv4();
      pendingFilesRef.current.set(fileId, { file, peer });
      activeTransferRef.current = { fileId, peerId: peer.id };

      // Show pending state
      setTransfer({
        peerId: peer.id,
        peerName: peer.name,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: 'pending',
      });

      // Set timeout for pending state (30 seconds)
      const pendingTimeout = setTimeout(() => {
        if (pendingFilesRef.current.has(fileId)) {
          console.log('⏱️ File offer timeout - no response from peer');
          pendingFilesRef.current.delete(fileId);
          socketRef.current?.emit('file-cancel', { to: peer.id, fileId, reason: 'timeout' });
          if (matchesTransfer(activeTransferRef.current?.fileId ?? null, fileId)) activeTransferRef.current = null;
          setTransfer(prev => {
            if (prev && prev.status === 'pending') {
              return { ...prev, status: 'error' };
            }
            return prev;
          });
          setTransferResult({
            success: false,
            fileName: file.name,
            fileSize: file.size,
            peerName: peer.name,
            direction: 'sent',
            reason: 'timeout',
          });
          setTimeout(() => setTransfer(null), 3000);
        }
      }, 30000);

      // Store timeout ID for cleanup
      const pending = pendingFilesRef.current.get(fileId);
      if (pending) {
        pending._timeout = pendingTimeout;
      }

      console.log(`📤 Sending file offer: ${file.name} (${mimeType}) to ${peer.name}`);
      console.log(`📊 File details: size=${file.size}, type=${file.type}, mimeType=${mimeType}`);
      console.log(`🔌 Socket connected: ${socketRef.current.connected}, id: ${socketRef.current.id}`);
      
      socketRef.current.emit('file-offer', {
        to: peer.id,
        from: myPeerRef.current,
        file: { name: file.name, size: file.size, type: mimeType },
        fileId,
      });
      
      console.log('✅ file-offer emitted successfully');
    } catch (err) {
      const appError = handleError(err, 'sendFile');
      logError(appError, `File: ${file?.name || 'unknown'}`);
      
      const isBusy = err instanceof Error && err.message.startsWith('busy:');
      setTransferResult({
        success: false,
        fileName: file?.name || 'Unknown',
        fileSize: file?.size || 0,
        peerName: peer.name,
        direction: 'sent',
        reason: isBusy ? 'busy' : undefined,
      });
      
      setTransfer(null);
    }
  }, []);

  const acceptFile = useCallback(async () => {
    if (!socketRef.current || !fileOffer) return;

    const { fileId, file } = fileOffer;
    activeTransferRef.current = { fileId, peerId: fileOffer.from.id };

    try {
      // เปิด Save dialog ตอนผู้ใช้กดรับไฟล์โดยตรง
      if (!isMobileDevice() && shouldUseStreaming(file.size)) {
        setTransfer({
          peerId: fileOffer.from.id,
          peerName: fileOffer.from.name,
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: 'preparing',
        });
        socketRef.current.emit('file-preparing', { to: fileOffer.from.id, fileId });

        const writer = await createStreamWriter(
          file.name,
          resolveMimeType(file.name, file.type),
          file.size
        );

        if (cancelledFileIdsRef.current.has(fileId)) {
          writer.abort();
          return;
        }

        preparedWritersRef.current.set(fileId, writer);
      }

      socketRef.current.emit('file-accept', {
        to: fileOffer.from.id,
        fileId,
      });

      fileOfferRef.current = null;
      setFileOffer(null);
    } catch (error) {
      console.error('Cannot prepare destination:', error);

      setTransfer({
        peerId: fileOffer.from.id,
        peerName: fileOffer.from.name,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: 'error',
      });
      socketRef.current.emit('file-reject', { to: fileOffer.from.id, fileId, reason: 'preparation-failed' });
      activeTransferRef.current = null;
    }
  }, [fileOffer]);

  const rejectFile = useCallback((reason?: string) => {
    if (!socketRef.current || !fileOffer) return;
    socketRef.current.emit('file-reject', { 
      to: fileOffer.from.id, 
      fileId: fileOffer.fileId,
      reason: reason || 'rejected'
    });
    fileOfferRef.current = null;
    setFileOffer(null);
  }, [fileOffer]);

  const updateName = useCallback((name: string) => {
    if (!socketRef.current || !myPeer) return;
    localStorage.setItem('zensend_custom_name', name);
    setMyPeer(prev => prev ? { ...prev, name } : null);
    socketRef.current.emit('update-name', { name });
  }, [myPeer]);

  const updateEmoji = useCallback((emoji: string, clearPhoto: boolean = true) => {
    if (!socketRef.current || !myPeer) return;
    localStorage.setItem('zensend_custom_emoji', emoji);
    if (clearPhoto) {
      localStorage.removeItem('zensend_custom_photo');
    }
    setMyPeer(prev => prev ? { 
      ...prev, 
      avatar: { ...(prev.avatar || prev.critter), emoji, ...(clearPhoto ? { photoUrl: null } : {}) }, 
      critter: { ...prev.critter, emoji, ...(clearPhoto ? { photoUrl: null } : {}) } 
    } : null);
    socketRef.current.emit('update-emoji', { emoji, photoUrl: clearPhoto ? null : undefined });
  }, [myPeer]);

  const updatePhoto = useCallback((photoUrl: string | null) => {
    if (!myPeer) return;
    if (photoUrl) {
      localStorage.setItem('zensend_custom_photo', photoUrl);
    } else {
      localStorage.removeItem('zensend_custom_photo');
    }
    setMyPeer(prev => prev ? {
      ...prev,
      avatar: { ...(prev.avatar || prev.critter), photoUrl },
      critter: { ...prev.critter, photoUrl }
    } : null);
    if (socketRef.current) {
      socketRef.current.emit('update-emoji', {
        emoji: myPeer.avatar?.emoji || myPeer.critter?.emoji || '🖥️',
        photoUrl
      });
    }
  }, [myPeer]);

  const clearTransferResult = useCallback(() => {
    setTransferResult(null);
  }, []);

  const clearTextMessage = useCallback(() => {
    setTextMessage(null);
  }, []);

  const cancelTransfer = useCallback(() => {
    const active = activeTransferRef.current;
    const offer = fileOfferRef.current;
    const fileId = active?.fileId || offer?.fileId;
    const peerId = active?.peerId || offer?.from.id;
    if (!fileId || !peerId) {
      setTransfer(null);
      setFileOffer(null);
      return;
    }

    const pending = pendingFilesRef.current.get(fileId);
    const receiving = receivingFilesRef.current.get(fileId);
    if (pending?._timeout) clearTimeout(pending._timeout);
    pendingFilesRef.current.delete(fileId);
    activeTransferringFilesRef.current.delete(fileId);
    cancelledFileIdsRef.current.add(fileId);
    socketRef.current?.emit('file-cancel', { to: peerId, fileId, reason: 'cancelled' });
    completionResolversRef.current.get(fileId)?.reject(new Error('Transfer cancelled'));
    completionResolversRef.current.delete(fileId);
    relayReadyRejectorsRef.current.get(fileId)?.(new Error('Transfer cancelled'));
    relayReadyRejectorsRef.current.delete(fileId);
    receiving?.streamWriter?.abort();
    receivingFilesRef.current.delete(fileId);
    preparedWritersRef.current.get(fileId)?.abort();
    preparedWritersRef.current.delete(fileId);

    try { peerConnectionsRef.current.get(peerId)?.close(); } catch { /* ignore */ }
    peerConnectionsRef.current.delete(peerId);
    dataChannelsRef.current.delete(peerId);
    pendingIceCandidatesRef.current.delete(peerId);
    connectionRoutesRef.current.delete(peerId);
    activeTransferRef.current = null;
    fileOfferRef.current = null;

    const source = pending
      ? { name: pending.file.name, size: pending.file.size, peerName: pending.peer.name, direction: 'sent' as const }
      : receiving
        ? { name: receiving.info.name, size: receiving.info.size, peerName: peersRef.current.find(p => p.id === peerId)?.name || 'ไม่ทราบชื่อ', direction: 'received' as const }
        : offer
          ? { name: offer.file.name, size: offer.file.size, peerName: offer.from.name, direction: 'received' as const }
          : null;
    if (source) setTransferResult({
      success: false,
      fileName: source.name,
      fileSize: source.size,
      peerName: source.peerName,
      direction: source.direction,
      reason: 'cancelled',
    });

    releaseWakeLockFn();
    setTransfer(null);
    setFileOffer(null);
  }, [releaseWakeLockFn]);
  useEffect(() => { cancelTransferRef.current = cancelTransfer; }, [cancelTransfer]);

  const blockRemotePeer = useCallback((peerId: string) => {
    socketRef.current?.emit('block-peer', { to: peerId });
  }, []);

  const unblockRemotePeer = useCallback((peerId: string) => {
    socketRef.current?.emit('unblock-peer', { to: peerId });
  }, []);

  const syncBlockedPeers = useCallback((peerIds: string[]) => {
    if (!socketRef.current?.connected) return;
    for (const peerId of peerIds) socketRef.current.emit('block-peer', { to: peerId });
  }, []);

  const joinRoom = useCallback((code: string) => {
    if (!socketRef.current) return;
    console.log('🚪 Joining room:', code);
    socketRef.current.emit('set-mode', { mode: 'private', roomCode: code });
  }, []);

  const createRoom = useCallback(() => {
    if (!socketRef.current) return;
    console.log('✨ Creating new room');
    socketRef.current.emit('set-mode', { mode: 'private' });
  }, []);

  const setMode = useCallback((mode: DiscoveryMode, code?: string, password?: string) => {
    // 1. Instant optimistic update: UI, animations, ripples, and sounds trigger with 0ms lag
    setDiscoveryMode(mode);
    discoveryModeRef.current = mode;
    if (code !== undefined) {
      setRoomCode(code);
      roomCodeRef.current = code;
    }
    if (password !== undefined) {
      setRoomPassword(password);
      roomPasswordRef.current = password;
    }
    try {
      localStorage.setItem('zensend_discovery_mode', mode);
    } catch {}

    // 2. Transmit to server if socket is connected
    if (socketRef.current) {
      console.log('🔄 Setting mode:', mode, code, password ? '(with password)' : '');
      socketRef.current.emit('set-mode', { mode, roomCode: code, password });
    }
  }, []);

  return {
    connected,
    connectionStatus,
    myPeer,
    peers,
    discoveryMode,
    roomCode,
    roomPassword,
    networkName,
    roomError,
    fileOffer,
    textMessage,
    transfer,
    transferResult,
    forceDisconnectReason,
    sendFile,
    sendText,
    acceptFile,
    rejectFile,
    updateName,
    updateEmoji,
    updatePhoto,
    clearTransferResult,
    clearTextMessage,
    cancelTransfer,
    blockRemotePeer,
    unblockRemotePeer,
    syncBlockedPeers,
    joinRoom,
    createRoom,
    setMode,
    pendingDownload,
    savePendingDownload,
    dismissPendingDownload,
    initialDiscoveryDone,
  };
}

