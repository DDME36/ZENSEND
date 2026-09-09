'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ZenRadar } from '@/components/ZenRadar';
import { ZenIntroSplash } from '@/components/ZenIntroSplash';
import { Header } from '@/components/Header';
import { MyNode } from '@/components/MyNode';
import { ModeSelector } from '@/components/ModeSelector';
import { EmptyState } from '@/components/EmptyState';
import { PeersGrid } from '@/components/PeersGrid';
import { TransferProgress } from '@/components/TransferProgress';
import { Confetti, ConfettiRef } from '@/components/Confetti';
import { Toast, ToastRef } from '@/components/Toast';
import { Footer } from '@/components/Footer';
import { BrowserWarning } from '@/components/BrowserWarning';
import dynamic from 'next/dynamic';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ConnectionQualityIndicator } from '@/components/ConnectionQualityIndicator';
import { FileOfferModal } from '@/components/modals/FileOfferModal';

const RenameModal = dynamic(() => import('@/components/modals/RenameModal').then(m => m.RenameModal), { ssr: false });
const AvatarModal = dynamic(() => import('@/components/modals/AvatarModal').then(m => m.AvatarModal), { ssr: false });
const QRModal = dynamic(() => import('@/components/modals/QRModal').then(m => m.QRModal), { ssr: false });
const HelpModal = dynamic(() => import('@/components/modals/HelpModal').then(m => m.HelpModal), { ssr: false });
const HistoryModal = dynamic(() => import('@/components/modals/HistoryModal').then(m => m.HistoryModal), { ssr: false });
const TextViewModal = dynamic(() => import('@/components/modals/TextViewModal').then(m => m.TextViewModal), { ssr: false });
const TextShareModal = dynamic(() => import('@/components/modals/TextShareModal').then(m => m.TextShareModal), { ssr: false });
const ScannerModal = dynamic(() => import('@/components/modals/ScannerModal').then(m => m.ScannerModal), { ssr: false });
const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal').then(m => m.ErrorModal), { ssr: false });
const IOSInstallModal = dynamic(() => import('@/components/modals/IOSInstallModal').then(m => m.IOSInstallModal), { ssr: false });
const DownloadReadyModal = dynamic(() => import('@/components/modals/DownloadReadyModal').then(m => m.DownloadReadyModal), { ssr: false });
const ConfirmModal = dynamic(() => import('@/components/modals/ConfirmModal').then(m => m.ConfirmModal), { ssr: false });
const BlockedPeersModal = dynamic(() => import('@/components/modals/BlockedPeersModal').then(m => m.BlockedPeersModal), { ssr: false });
import { useSound } from '@/hooks/useSound';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import { useTheme } from '@/hooks/useTheme';
import { useNotification } from '@/hooks/useNotification';
import { useBlockedPeers } from '@/hooks/useBlockedPeers';
import { Peer } from '@/lib/devices';
import { detectImageMimeType } from '@/lib/webrtc';
import { createZipFile, FileWithContext } from '@/lib/compression';
import { getHistory, addToHistory, TransferRecord, updateHistoryRecordStatus } from '@/lib/transferHistory';
import { detectNetworkQuality, NetworkQuality } from '@/lib/networkQuality';
import { usePWA } from '@/hooks/usePWA';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';

declare global {
  interface Window {
    triggerScanner?: () => void;
    triggerTextShare?: (text: string) => void;
    triggerFolderSelect?: (peer: Peer) => void;
  }
}

export default function Home() {
  const {
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
    setMode,
    pendingDownload,
    savePendingDownload,
    dismissPendingDownload,
  } = usePeerConnection();

  const { muted, toggle: toggleMute, play, vibrate } = useSound();
  const { isDark, toggleTheme } = useTheme();
  const { requestPermission, notifyFileOffer, notifyTransferComplete, notifyPeerJoined } = useNotification();
  const { isInstallable, promptInstall, showIOSModal, closeIOSModal } = usePWA();
  const { isEcoMode, toggleEcoMode } = usePerformanceMode(!!transfer);
  const { blockedPeers, isBlocked, blockPeer, unblockPeer } = useBlockedPeers();

  const [showNameModal, setShowNameModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTextShareModal, setShowTextShareModal] = useState(false);
  const [viewingMessage, setViewingMessage] = useState<{ text: string; from: string; timestamp: string } | null>(null);
  const [prefilledText, setPrefilledText] = useState('');
  const [textShareTargetPeer, setTextShareTargetPeer] = useState<Peer | null>(null);
  const [newPeerIds, setNewPeerIds] = useState<Set<string>>(new Set());
  const [baseUrl, setBaseUrl] = useState('');
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [initialModeSet, setInitialModeSet] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('good');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showBlockedPeers, setShowBlockedPeers] = useState(false);
  const [pendingBlock, setPendingBlock] = useState<{ peer: Peer; rejectOffer: boolean } | null>(null);
  const [previewOffer, setPreviewOffer] = useState<{
    from: Peer;
    file: { name: string; size: number; type: string };
  } | null>(null);

  useEffect(() => {
    if (connected && blockedPeers.length > 0) {
      syncBlockedPeers(blockedPeers.map(peer => peer.id));
    }
  }, [connected, blockedPeers, syncBlockedPeers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('previewOffer')) {
        const type = params.get('previewOffer');
        let offer: typeof previewOffer;
        if (type === 'video') {
          offer = {
            from: { id: 'preview-peer', name: 'iPhone 15 Pro ของ Anna', device: 'phone', avatar: { os: 'ios' } } as unknown as Peer,
            file: { name: 'Vacation_Phuket_4K.mov', size: 384500000, type: 'video/quicktime' },
          };
        } else if (type === 'doc') {
          offer = {
            from: { id: 'preview-peer', name: 'iPad Pro (M2)', device: 'tablet', avatar: { os: 'ios' } } as unknown as Peer,
            file: { name: 'Project_Design_System_2026.pdf', size: 12400000, type: 'application/pdf' },
          };
        } else {
          offer = {
            from: { id: 'preview-peer', name: 'MacBook Pro ของ Somchai', device: 'mac', avatar: { os: 'mac' } } as unknown as Peer,
            file: { name: 'Screenshot_ZenSend_Dashboard.png', size: 4890000, type: 'image/png' },
          };
        }
        const timer = window.setTimeout(() => setPreviewOffer(offer), 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, []);

  // Cinematic Brand Intro Splash
  const [showSplash, setShowSplash] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashStartExit = useCallback(() => {
    setSplashDone(true);
  }, []);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
    setShowSplash(false);
  }, []);

  useEffect(() => {
    const handleReplay = () => {
      setSplashDone(false);
      setShowSplash(true);
    };
    window.addEventListener('zensend:replay-intro', handleReplay);
    return () => window.removeEventListener('zensend:replay-intro', handleReplay);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const selectedPeerRef = useRef<Peer | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const toastRef = useRef<ToastRef>(null);
  const prevPeerIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const transferSoundRef = useRef({ key: '', status: '', milestone: 0, started: false });

  // Load history on mount
  useEffect(() => {
    setTimeout(() => {
      setHistory(getHistory());
    }, 0);
  }, []);

  // Monitor network quality
  useEffect(() => {
    // Initial check
    detectNetworkQuality().then(setNetworkQuality);
    
    // Check every 30 seconds
    const interval = setInterval(() => {
      detectNetworkQuality().then(setNetworkQuality);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle URL params for mode/room on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set base URL (without params)
    const url = new URL(window.location.href);
    url.search = '';
    setTimeout(() => {
      setBaseUrl(url.toString());
    }, 0);

    // Check for shared files or mode params
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const roomParam = params.get('room');
    const sharedParam = params.get('shared');

    if (sharedParam === 'true') {
      toastRef.current?.show('เลือกอุปกรณ์ปลายทางเพื่อ Zend ไฟล์ได้เลย!', 'success');
      // Clean URL params
      window.history.replaceState({}, '', url.toString());
    } else if (modeParam && !initialModeSet && connected) {
      setTimeout(() => {
        if (modeParam === 'wifi') {
          setMode('wifi');
          toastRef.current?.show('เข้าโหมด WiFi แล้ว', 'info');
        } else if (modeParam === 'private' && roomParam) {
          setMode('private', roomParam);
          toastRef.current?.show(`เข้าห้อง ${roomParam} แล้ว`, 'info');
        }
        setInitialModeSet(true);
      }, 0);

      // Clean URL params
      window.history.replaceState({}, '', url.toString());
    }
  }, [connected, initialModeSet, setMode]);

  // Request notification permission on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      requestPermission();
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, [requestPermission]);

  // Track new peers for animation
  useEffect(() => {
    const currentIds = new Set(peers.map(p => p.id));
    const newIds = new Set<string>();

    // ถ้าเป็นครั้งแรก ให้ข้าม animation .entering ไปเลย
    // เพื่อป้องกัน double flash (cardAppear + cardEnter ตีกัน)
    if (isFirstLoadRef.current) {
      if (currentIds.size > 0) {
        prevPeerIdsRef.current = currentIds;
        isFirstLoadRef.current = false;
      }
      return;
    }

    currentIds.forEach(id => {
      if (!prevPeerIdsRef.current.has(id)) {
        newIds.add(id);
        const newPeer = peers.find(p => p.id === id);
        if (newPeer) {
          notifyPeerJoined(newPeer.name);
        }
      }
    });

    if (newIds.size > 0) {
      setTimeout(() => {
        setNewPeerIds(newIds);
      }, 0);
      play('connect');
      setTimeout(() => setNewPeerIds(new Set()), 1000);
    }

    prevPeerIdsRef.current = currentIds;
  }, [peers, play, notifyPeerJoined]);

  // Register service worker for PWA
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Small delay to prevent blocking main thread on load
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
      }, 1000);
    }
  }, []);

  // Handle file offer notification
  useEffect(() => {
    if (fileOffer) {
      // Silently drop offers from blocked peers
      if (isBlocked(fileOffer.from.id)) {
        rejectFile('blocked');
        blockRemotePeer(fileOffer.from.id);
        return;
      }
      notifyFileOffer(fileOffer.from.name, fileOffer.file.name);
      play('notification');
      vibrate([100, 50, 100]);
    }
  }, [fileOffer, notifyFileOffer, play, vibrate, isBlocked, blockRemotePeer, rejectFile]);


  // Handle transfer complete
  useEffect(() => {
    if (transfer?.status === 'complete') {
      play('complete');
      confettiRef.current?.burst();
      notifyTransferComplete(transfer.fileName, 'received');
    }
  }, [transfer?.status, transfer?.fileName, play, notifyTransferComplete]);

  // Give a transfer a clear audio journey without adding settings to the UI.
  useEffect(() => {
    if (!transfer) {
      transferSoundRef.current = { key: '', status: '', milestone: 0, started: false };
      return;
    }

    const key = `${transfer.peerId}:${transfer.fileName}:${transfer.fileSize}`;
    if (transferSoundRef.current.key !== key) {
      transferSoundRef.current = { key, status: '', milestone: 0, started: false };
    }

    const soundState = transferSoundRef.current;
    if (!soundState.started) {
      play('whoosh');
      soundState.started = true;
    }

    if (soundState.status !== transfer.status) {
      if (transfer.status === 'sending' || transfer.status === 'receiving') play('sending');
      if (transfer.status === 'confirming' || transfer.status === 'saving') play('drop');
      if (transfer.status === 'error') play('reject');
      soundState.status = transfer.status;
    }

    if (transfer.status === 'sending' || transfer.status === 'receiving') {
      const milestone = transfer.progress >= 75 ? 75 : transfer.progress >= 50 ? 50 : transfer.progress >= 25 ? 25 : 0;
      if (milestone > soundState.milestone) {
        soundState.milestone = milestone;
        if (milestone === 25) play('progress25');
        if (milestone === 50) play('progress50');
        if (milestone === 75) play('progress75');
      }
    }
  }, [transfer, play]);

  // Handle incoming text message
  useEffect(() => {
    if (textMessage) {
      play('success');
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ข้อความใหม่จาก ' + textMessage.from.name, {
          body: textMessage.text.slice(0, 100) + (textMessage.text.length > 100 ? '...' : ''),
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }
      
      toastRef.current?.show(`ได้รับข้อความจาก ${textMessage.from.name}`, 'success', {
        label: 'อ่านข้อความ',
        onClick: () => setViewingMessage({
          text: textMessage.text,
          from: textMessage.from.name,
          timestamp: new Date(textMessage.timestamp).toLocaleString('th-TH'),
        }),
      });
      
      // Add to history with text content
      addToHistory({
        fileName: 'ข้อความ/ลิงก์',
        fileSize: new Blob([textMessage.text]).size,
        peerName: textMessage.from.name,
        direction: 'received',
        success: true,
        type: 'text',
        textContent: textMessage.text,
      });
      setTimeout(() => {
        setHistory(getHistory());
      }, 0);
      
      clearTextMessage();
    }
  }, [textMessage, play, clearTextMessage]);

  // Handle transfer result (both send and receive)
  useEffect(() => {
    if (transferResult) {
      if (transferResult.success) {
        // Add to history with correct direction and type
        addToHistory({
          fileName: transferResult.fileName,
          fileSize: transferResult.fileSize,
          peerName: transferResult.peerName,
          direction: transferResult.direction,
          success: true,
          type: transferResult.type,
          textContent: transferResult.textContent,
          statusText: transferResult.direction === 'sent' ? 'ส่งสำเร็จ' : 'รับไฟล์สำเร็จ',
        });
        setTimeout(() => {
          setHistory(getHistory());
        }, 0);
      } else {
        // Transfer failed, rejected, blocked, or timed out
        let statusText = 'ล้มเหลว';
        let toastMessage = `การส่งไฟล์ "${transferResult.fileName}" ล้มเหลว`;
        let toastType: 'error' | 'warning' = 'error';

        if (transferResult.reason === 'rejected') {
          statusText = 'ผู้รับปฏิเสธ';
          toastMessage = `${transferResult.peerName} ปฏิเสธการรับไฟล์ "${transferResult.fileName}"`;
          toastType = 'warning';
          play('reject');
        } else if (transferResult.reason === 'blocked') {
          statusText = 'ถูกบล็อก';
          toastMessage = `${transferResult.peerName} ปฏิเสธและบล็อกการรับไฟล์จากอุปกรณ์นี้`;
          toastType = 'error';
          play('block');
        } else if (transferResult.reason === 'timeout') {
          statusText = 'หมดเวลา';
          toastMessage = `ไม่มีการตอบรับคำขอส่งไฟล์จาก ${transferResult.peerName} (หมดเวลา 30 วิ)`;
          toastType = 'warning';
          play('reject');
        } else if (transferResult.reason === 'cancelled') {
          statusText = 'ยกเลิกแล้ว';
          toastMessage = `ยกเลิกการส่งไฟล์ "${transferResult.fileName}" แล้ว`;
          toastType = 'warning';
        } else if (transferResult.reason === 'busy') {
          statusText = transferResult.direction === 'sent' ? 'กำลังส่งรายการอื่น' : 'ผู้รับไม่ว่าง';
          toastMessage = transferResult.direction === 'sent'
            ? 'มีรายการส่งไฟล์อื่นกำลังทำงานอยู่ กรุณารอสักครู่'
            : `${transferResult.peerName} กำลังรับหรือพิจารณาไฟล์อื่น กรุณาลองใหม่อีกครั้ง`;
          toastType = 'warning';
        } else if (transferResult.reason === 'rate-limited') {
          statusText = 'ส่งคำขอถี่เกินไป';
          toastMessage = 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
          toastType = 'warning';
        } else if (transferResult.reason === 'expired') {
          statusText = 'คำขอหมดอายุ';
          toastMessage = `คำขอรับไฟล์ "${transferResult.fileName}" หมดอายุแล้ว`;
          toastType = 'warning';
        }

        toastRef.current?.show(toastMessage, toastType);

        addToHistory({
          fileName: transferResult.fileName,
          fileSize: transferResult.fileSize,
          peerName: transferResult.peerName,
          direction: transferResult.direction,
          success: false,
          type: transferResult.type,
          statusText,
        });
        setTimeout(() => {
          setHistory(getHistory());
        }, 0);
      }
      clearTransferResult();
    }
  }, [transferResult, clearTransferResult, play]);

  // Handle multi-file selection
  const handleMultiFiles = useCallback(async (filesWithContext: FileWithContext[], peer: Peer) => {
    if (filesWithContext.length === 0) return;

    console.log(`🔄 handleMultiFiles called with ${filesWithContext.length} file(s)`);

    // Single file - send directly (only if no complex path or just filename)
    if (filesWithContext.length === 1 && filesWithContext[0].path === filesWithContext[0].file.name) {
      console.log(`📤 Sending single file: ${filesWithContext[0].file.name}`);
      sendFile(peer, filesWithContext[0].file);
      return;
    }

    // Multiple files - create ZIP (Smart Folder: use preserved paths for folder structure)
    toastRef.current?.show('กำลังมัดรวมไฟล์...', 'info');

    try {
      const zipFile = await createZipFile(filesWithContext);

      if (zipFile) {
        // ZIP successful - send ZIP file
        console.log(`📦 Sending ZIP file: ${zipFile.name}`);
        sendFile(peer, zipFile);
      } else {
        // ZIP failed (e.g., > 100MB) -> send files one by one (Queue)
        toastRef.current?.show(`ไฟล์ใหญ่เกิน 100MB จะทยอยส่งทีละไฟล์ (${filesWithContext.length} ไฟล์)`, 'warning');

        // Simple queue to prevent freezing
        for (const item of filesWithContext) {
          console.log(`📤 Sending file ${item.file.name} from queue`);
          await sendFile(peer, item.file);
          // Small delay
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (err) {
      console.error('ZIP error:', err);
      toastRef.current?.show('มัดรวมไฟล์ล้มเหลว', 'error');
    }
  }, [sendFile]);

  const handleSelectPeer = useCallback((peer: Peer) => {
    console.log('🎯 handleSelectPeer called:', peer.name, peer.id);
    console.log('📊 Current state:', {
      connected,
      myPeer: myPeer?.name,
      peersCount: peers.length
    });
    vibrate(15);
    selectedPeerRef.current = peer;
    console.log('📂 Opening file input...');
    fileInputRef.current?.click();
  }, [vibrate, connected, myPeer, peers.length]);

  const handleDropFiles = useCallback((peer: Peer, files: { file: File, path: string }[]) => {
    vibrate([20, 50, 20]);
    // files already contains path context from PeerCard
    handleMultiFiles(files, peer);
  }, [handleMultiFiles, vibrate]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedPeerRef.current) {
      const filesArr = Array.from(e.target.files);
      
      console.log(`📁 Files selected:`, filesArr.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      })));
      
      // Validate files
      const validFiles = filesArr.filter(f => {
        if (!f || f.size === 0) {
          console.warn(`⚠️ Skipping invalid file: ${f?.name || 'unknown'} (size: ${f?.size})`);
          toastRef.current?.show(`ไฟล์ ${f?.name || 'unknown'} ไม่ถูกต้อง`, 'error');
          return false;
        }
        console.log(`✅ Valid file: ${f.name} (${f.size} bytes, ${f.type || 'no type'})`);
        return true;
      });

      if (validFiles.length === 0) {
        console.error('❌ No valid files selected');
        toastRef.current?.show('ไม่มีไฟล์ที่ถูกต้อง', 'error');
        return;
      }

      // For input selection, we don't have detailed path info, so use filename as path
      // Clean up iOS temp filenames and generic names (image.jpg, trim.MOV)
      const filesWithContext = validFiles.map((f, index) => {
        let cleanName = f.name;
        const timestamp = new Date().getTime().toString().slice(-6);
        
        // 1. Detect iOS temp pattern: temp_image_UUID.ext
        if (/^temp_image_[A-F0-9-]{36}\.(webp|jpg|jpeg|png)$/i.test(f.name)) {
          const ext = f.name.split('.').pop();
          cleanName = `Image_${timestamp}_${index + 1}.${ext}`;
        } 
        // 2. Detect generic iOS Photos names (image.jpg, image.png, image.heic)
        else if (/^image\.(jpg|jpeg|png|heic)$/i.test(f.name)) {
          const ext = f.name.split('.').pop();
          cleanName = `Photo_${timestamp}_${index + 1}.${ext}`;
        }
        // 3. Detect generic iOS Video names (video.mov, trim.UUID.MOV)
        else if (/^(video|trim)\..*\.(mov|mp4)$/i.test(f.name) || /^trim\.(mov|mp4)$/i.test(f.name)) {
          const ext = f.name.split('.').pop();
          cleanName = `Video_${timestamp}_${index + 1}.${ext}`;
        }
        
        if (cleanName !== f.name) {
          console.log(`🔄 Renamed generic/iOS file: ${f.name} → ${cleanName}`);
        }
        
        // Ensure we preserve the type, fallback to our detector if empty
        const detectedType = f.type || detectImageMimeType(new File([], cleanName));
        
        return { 
          file: new File([f], cleanName, { type: detectedType }), 
          path: cleanName 
        };
      });

      console.log(`📤 Preparing to send ${validFiles.length} file(s) to ${selectedPeerRef.current.name}`);
      handleMultiFiles(filesWithContext, selectedPeerRef.current);
    } else {
      console.log('❌ File select failed:', {
        hasFiles: !!e.target.files,
        fileCount: e.target.files?.length || 0,
        hasPeer: !!selectedPeerRef.current
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleMultiFiles]);

  const handleAcceptFile = useCallback(() => {
    // Don't add to history here - wait for transfer to complete
    acceptFile();
    toastRef.current?.show('กำลังรับไฟล์...', 'info');
  }, [acceptFile]);

  const handleRejectFile = useCallback(() => {
    rejectFile('rejected');
    play('reject');
    toastRef.current?.show('ปฏิเสธการรับไฟล์แล้ว', 'warning');
  }, [rejectFile, play]);

  const handleRejectAndBlock = useCallback((peer: Peer) => {
    setPendingBlock({ peer, rejectOffer: true });
  }, []);

  const handleBlockPeerFromCard = useCallback((peer: Peer) => {
    setPendingBlock({ peer, rejectOffer: false });
  }, []);

  const confirmBlockPeer = useCallback(() => {
    if (!pendingBlock) return;
    if (pendingBlock.rejectOffer) rejectFile('blocked');
    blockPeer(pendingBlock.peer);
    blockRemotePeer(pendingBlock.peer.id);
    play('block');
    toastRef.current?.show(`บล็อก ${pendingBlock.peer.name} แล้ว สามารถเลิกบล็อกได้จากเมนูเพิ่มเติม`, 'error');
    setPendingBlock(null);
  }, [pendingBlock, rejectFile, blockPeer, blockRemotePeer, play]);

  const handleUnblockPeer = useCallback((peerId: string) => {
    const peer = blockedPeers.find(item => item.id === peerId);
    unblockPeer(peerId);
    unblockRemotePeer(peerId);
    play('toggleOn');
    toastRef.current?.show(`เลิกบล็อก ${peer?.name || 'อุปกรณ์'} แล้ว`, 'success');
  }, [blockedPeers, unblockPeer, unblockRemotePeer, play]);


  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleRemoveHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleQRScan = useCallback((code: string) => {
    setMode('private', code);
    setShowScannerModal(false);
    toastRef.current?.show(`กำลังเข้าร่วมห้อง ${code}...`, 'info');
  }, [setMode]);

  // Performance Optimization: Pause animations when tab is not visible
  useEffect(() => {
    // Ensure active state on mount
    document.body.classList.remove('animations-paused');

    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add('animations-paused');
      } else {
        document.body.classList.remove('animations-paused');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    window.triggerScanner = () => setShowScannerModal(true);
    window.triggerTextShare = (text: string, targetPeer?: Peer) => {
      setPrefilledText(text);
      setTextShareTargetPeer(targetPeer || null);
      setShowTextShareModal(true);
    };
    window.triggerFolderSelect = (peer: Peer) => {
      vibrate(15);
      selectedPeerRef.current = peer;
      folderInputRef.current?.click();
    };
    return () => { 
      delete window.triggerScanner; 
      delete window.triggerTextShare;
      delete window.triggerFolderSelect;
    };
  }, [vibrate]);

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedPeerRef.current) {
      const filesArr = Array.from(e.target.files);
      const filesWithContext = filesArr.map(f => ({
        file: f,
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
      }));
      handleMultiFiles(filesWithContext, selectedPeerRef.current);
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  }, [handleMultiFiles]);

  return (
    <>
      <BrowserWarning />
      <OfflineBanner />
      <ZenRadar mode={discoveryMode} />
      <Confetti ref={confettiRef} />
      {/* Toast notifications dock */}
      <Toast ref={toastRef} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,video/*,audio/*,application/*,text/*,*/*"
        style={{ display: 'none' }}
      />

      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        multiple
        style={{ display: 'none' }}
        {...{
          webkitdirectory: "",
          directory: ""
        }}
      />


      {showSplash && (
        <ZenIntroSplash onStartExit={handleSplashStartExit} onComplete={handleSplashComplete} />
      )}

      <a className="skip-link" href="#transfer-workspace">ข้ามไปพื้นที่ส่งไฟล์</a>
      <div inert={showSplash} className={`app compact-workspace${splashDone ? ' workspace-revealed' : ' workspace-hidden'}`}>
        <div className="reveal-item reveal-delay-1">
          <Header
            muted={muted}
            isDark={isDark}
            hasPeers={peers.length > 0}
            isInstallable={isInstallable}
            isEcoMode={isEcoMode}
            onToggleEcoMode={toggleEcoMode}
            onInstall={promptInstall}
            onToggleMute={toggleMute}
            onToggleTheme={toggleTheme}
            onShowHistory={() => setShowHistoryModal(true)}
            onShowQR={() => setShowQRModal(true)}
            blockedCount={blockedPeers.length}
            onShowBlockedPeers={() => setShowBlockedPeers(true)}
          />
        </div>

        {/* Network Quality Indicator */}
        {transfer?.connectionType && (
          <div className="connection-quality-dock reveal-item reveal-delay-1">
            <ConnectionQualityIndicator
              connectionType={transfer.connectionType}
              quality={networkQuality}
              rtt={transfer.rtt}
            />
          </div>
        )}

        <div className="device-toolbar reveal-item reveal-delay-2">
          <MyNode
            peer={myPeer}
            connected={connected}
            connectionStatus={connectionStatus}
            mode={discoveryMode}
            onEditName={() => setShowNameModal(true)}
            onEditEmoji={() => setShowEmojiModal(true)}
          />

          <ModeSelector
            mode={discoveryMode}
            roomCode={roomCode}
            roomPassword={roomPassword}
            networkName={networkName}
            roomError={roomError}
            onChangeMode={setMode}
          />
        </div>

        <main id="transfer-workspace" tabIndex={-1} className="main-stage-container reveal-item reveal-delay-3" aria-label="พื้นที่ส่งไฟล์">
          {peers.length === 0 ? (
            <EmptyState
              mode={discoveryMode}
              connected={connected}
              emoji={myPeer?.avatar?.emoji || myPeer?.critter?.emoji || '🖥️'}
              isInitialScanning={false}
              onShowQR={() => setShowQRModal(true)}
              onShowHelp={() => setShowHelpModal(true)}
            />
          ) : (
            <PeersGrid
              peers={peers.filter(p => !isBlocked(p.id))}
              newPeerIds={newPeerIds}
              onSelectPeer={handleSelectPeer}
              onDropFiles={handleDropFiles}
              onBlockPeer={handleBlockPeerFromCard}
            />
          )}
        </main>

        {/* Show fixed footer only when peers exist, or always on desktop */}
        <div className="reveal-item reveal-delay-4">
          <Footer hasPeers={peers.length > 0} />
        </div>
      </div>

      {/* Transfer Progress Overlay / Minimized Floating Bar */}
      {transfer && (
        <TransferProgress
          fileName={transfer.fileName}
          fileSize={transfer.fileSize}
          progress={transfer.progress}
          status={transfer.status}
          emoji={myPeer?.avatar?.emoji || myPeer?.critter?.emoji || '🖥️'}
          peerName={transfer.peerName}
          connectionType={transfer.connectionType}
          rtt={transfer.rtt}
          onCancel={cancelTransfer}
        />
      )}

      {/* Modals */}
      {(fileOffer || previewOffer) && (
        <FileOfferModal
          show={true}
          from={fileOffer?.from || previewOffer!.from}
          file={fileOffer?.file || previewOffer!.file}
          onAccept={() => {
            if (previewOffer && !fileOffer) setPreviewOffer(null);
            else handleAcceptFile();
          }}
          onReject={() => {
            if (previewOffer && !fileOffer) setPreviewOffer(null);
            else handleRejectFile();
          }}
          onRejectAndBlock={(peer) => {
            if (previewOffer && !fileOffer) setPreviewOffer(null);
            else handleRejectAndBlock(peer);
          }}
        />
      )}

      <RenameModal
        show={showNameModal}
        currentName={myPeer?.name || ''}
        onSubmit={(name) => {
          updateName(name);
          requestPermission();
          setShowNameModal(false);
        }}
        onClose={() => setShowNameModal(false)}
      />

      <AvatarModal
        show={showEmojiModal}
        currentEmoji={myPeer?.avatar?.emoji || myPeer?.critter?.emoji || '🖥️'}
        currentPhotoUrl={myPeer?.avatar?.photoUrl || myPeer?.critter?.photoUrl}
        onSelect={updateEmoji}
        onSelectPhoto={updatePhoto}
        onClose={() => setShowEmojiModal(false)}
      />

      <QRModal
        show={showQRModal}
        baseUrl={baseUrl}
        currentMode={discoveryMode}
        roomCode={roomCode}
        onClose={() => setShowQRModal(false)}
      />

      <HelpModal
        show={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <HistoryModal
        show={showHistoryModal}
        history={history}
        onClose={() => setShowHistoryModal(false)}
        onClear={handleClearHistory}
        onRemoveItem={handleRemoveHistoryItem}
      />

      <BlockedPeersModal
        show={showBlockedPeers}
        peers={blockedPeers}
        onUnblock={handleUnblockPeer}
        onClose={() => setShowBlockedPeers(false)}
      />

      <ConfirmModal
        show={!!pendingBlock}
        title={pendingBlock ? `บล็อก ${pendingBlock.peer.name}?` : 'บล็อกอุปกรณ์?'}
        message="อุปกรณ์นี้จะส่งไฟล์หรือข้อความหาเครื่องคุณไม่ได้ คุณสามารถเลิกบล็อกภายหลังได้จากเมนูเพิ่มเติม"
        confirmText="บล็อกอุปกรณ์"
        cancelText="ยังไม่บล็อก"
        onConfirm={confirmBlockPeer}
        onCancel={() => setPendingBlock(null)}
      />

      {viewingMessage && (
        <TextViewModal show={true} {...viewingMessage} onClose={() => setViewingMessage(null)} />
      )}

      <TextShareModal
        show={showTextShareModal}
        peers={peers}
        targetPeer={textShareTargetPeer}
        initialText={prefilledText}
        onSend={(peer, text) => {
          sendText(peer.id, text, peer);
          // History will be added automatically when transfer completes
          toastRef.current?.show(`กำลังส่งข้อความให้ ${peer.name}...`, 'info');
        }}
        onClose={() => {
          setShowTextShareModal(false);
          setPrefilledText('');
          setTextShareTargetPeer(null);
        }}
      />

      <ErrorModal
        show={!!forceDisconnectReason}
        error={forceDisconnectReason ? {
          type: 'connection',
          message: forceDisconnectReason,
          userMessage: 'การเชื่อมต่อถูกตัด',
          suggestedAction: forceDisconnectReason,
          originalError: null,
          canRetry: true
        } : null}
        onClose={() => window.location.reload()}
        onRetry={() => window.location.reload()}
      />

      <IOSInstallModal
        show={showIOSModal}
        onClose={closeIOSModal}
      />

      <ScannerModal
        show={showScannerModal}
        onScan={handleQRScan}
        onClose={() => setShowScannerModal(false)}
      />

      {pendingDownload && (
        <>
          <DownloadReadyModal
            show={!showDiscardConfirm}
            fileName={pendingDownload.fileName}
            fileSize={pendingDownload.fileSize}
            mimeType={pendingDownload.mimeType}
            onSave={async () => {
              const name = pendingDownload.fileName;
              const size = pendingDownload.fileSize;
              await savePendingDownload();
              updateHistoryRecordStatus(
                name,
                size,
                'พร้อมบันทึกในอุปกรณ์'
              );
              setTimeout(() => {
                setHistory(getHistory());
              }, 0);
            }}
            onDiscard={() => setShowDiscardConfirm(true)}
          />
          <ConfirmModal
            show={showDiscardConfirm}
            title="ลบไฟล์ที่รับมา?"
            message="หากปิดตอนนี้ ไฟล์ที่รับมาจะถูกลบและต้องรับใหม่อีกครั้ง"
            confirmText="ลบไฟล์"
            cancelText="ยกเลิก"
            onConfirm={() => {
              setShowDiscardConfirm(false);
              dismissPendingDownload();
            }}
            onCancel={() => setShowDiscardConfirm(false)}
          />
        </>
      )}
    </>
  );
}
