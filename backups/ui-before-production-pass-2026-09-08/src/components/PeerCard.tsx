'use client';

import { Peer } from '@/lib/devices';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSound } from '@/hooks/useSound';

// Icons
const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.06 1.71-.93 2.73 1 .08 2-.48 2.62-1.23"/>
  </svg>
);

const WindowsIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 5.48L10.3 4.5v6.7H3V5.48zm0 7.52h7.3v6.7L3 18.72V13zm8.3-8.62L21 3v8.2h-9.7V4.38zm0 8.82H21V21l-9.7-1.38V13.2z"/>
  </svg>
);

const AndroidIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.96 2 12 2c-.96 0-1.86.23-2.66.63L7.85.95c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 4.07 6 5.86 6 7.86h12c0-2-0.97-3.79-2.47-4.7zM9.5 5.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm5 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z"/>
  </svg>
);

const LinuxIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a4 4 0 0 0-4 4v1c-1.5 1-2.5 3-2.5 5 0 2 .5 3.5 1.5 4.5-.5 1-1 2-1 3.5 0 1.5 2 2 3 2h6c1 0 3-.5 3-2 0-1.5-.5-2.5-1-3.5 1-1 1.5-2.5 1.5-4.5 0-2-1-4-2.5-5V6a4 4 0 0 0-4-4zm-1.5 4a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1zm3 0a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1z"/>
  </svg>
);

function getDeviceIcon(os?: string) {
  switch (os) {
    case 'ios':
    case 'macos':
    case 'ipados':
      return <AppleIcon />;
    case 'windows':
      return <WindowsIcon />;
    case 'android':
      return <AndroidIcon />;
    case 'linux':
      return <LinuxIcon />;
    default:
      return null;
  }
}

interface PeerCardProps {
  peer: Peer & { temporarilyOffline?: boolean };
  isNew?: boolean;
  onSelect: (peer: Peer) => void;
  onDrop: (peer: Peer, files: FileWithContext[]) => void;
  onBlock?: (peer: Peer) => void;
  style?: React.CSSProperties;
}

// Max files allowed in single drop
const MAX_FILES = 500;
const MAX_TOTAL_SIZE = Number.MAX_SAFE_INTEGER; // No size limit

export interface FileWithContext {
  file: File;
  path: string; // e.g. "photos/beach.jpg" or just "beach.jpg"
}

// Recursively get all files from a directory entry (with limits)
async function getFilesFromEntry(
  entry: FileSystemEntry,
  path: string,
  files: FileWithContext[],
  totalSize: { value: number }
): Promise<void> {
  if (files.length >= MAX_FILES || totalSize.value >= MAX_TOTAL_SIZE) return;

  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => {
        if (files.length < MAX_FILES && totalSize.value + file.size <= MAX_TOTAL_SIZE) {
          files.push({ file, path: path + file.name });
          totalSize.value += file.size;
        }
        resolve();
      }, () => resolve());
    });
  } else if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const currentPath = path + entry.name + '/';

    const readBatch = (): Promise<void> => {
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries) => {
          if (entries.length === 0 || files.length >= MAX_FILES) {
            resolve();
            return;
          }
          for (const e of entries) {
            if (files.length >= MAX_FILES || totalSize.value >= MAX_TOTAL_SIZE) break;
            await getFilesFromEntry(e, currentPath, files, totalSize);
          }
          if (files.length < MAX_FILES) await readBatch();
          resolve();
        }, () => resolve());
      });
    };
    await readBatch();
  }
}

// Get all files from DataTransfer (supports folders, with limits)
async function getFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<{ files: FileWithContext[]; limited: boolean }> {
  const files: FileWithContext[] = [];
  const totalSize = { value: 0 };
  const items = dataTransfer.items;

  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  if (entries.length > 0) {
    for (const entry of entries) {
      if (files.length >= MAX_FILES || totalSize.value >= MAX_TOTAL_SIZE) break;
      await getFilesFromEntry(entry, '', files, totalSize);
    }
    const limited = files.length >= MAX_FILES || totalSize.value >= MAX_TOTAL_SIZE;
    return { files, limited };
  }

  const regularFiles = Array.from(dataTransfer.files).slice(0, MAX_FILES).map(f => ({
    file: f,
    path: f.name
  }));
  return { files: regularFiles, limited: dataTransfer.files.length > MAX_FILES };
}

export function PeerCard({ peer, isNew = false, onSelect, onDrop, onBlock, style }: PeerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const { play } = useSound();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!cardRef.current?.classList.contains('drag-over')) {
      cardRef.current?.classList.add('drag-over');
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cardRef.current?.classList.remove('drag-over');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cardRef.current?.classList.remove('drag-over');

    const { files, limited } = await getFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      if (limited) {
        console.warn(`ZenSend จำกัดส่งโฟลเดอร์รอบละไม่เกิน ${MAX_FILES} ไฟล์ ระบบได้เลือกไฟล์ส่วนแรกให้เรียบร้อยแล้ว`);
      }
      onDrop(peer, files);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.peer-card-actions-top')) {
      return;
    }
    play('selectPeer');
    if ('vibrate' in navigator) navigator.vibrate(12);
    onSelect(peer);
  };

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    play('openModal');
    if ('vibrate' in navigator) navigator.vibrate(15);
    setShowMenu(true);
  };

  return (
    <div
      ref={cardRef}
      className={`peer-card ${isNew ? 'entering' : ''} ${showMenu ? 'menu-open' : ''} ${peer.temporarilyOffline ? 'temporarily-offline' : ''}`}
      style={{ 
        '--critter-color': peer.avatar?.color || peer.critter?.color || '#0ea5e9', 
        '--node-color': peer.avatar?.color || peer.critter?.color || '#0ea5e9',
        ...style
      } as React.CSSProperties}
      onClick={peer.temporarilyOffline ? undefined : handleCardClick}
      onKeyDown={peer.temporarilyOffline ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(peer);
        }
      }}
      onContextMenu={peer.temporarilyOffline ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(true);
      }}
      onDragOver={peer.temporarilyOffline ? undefined : handleDragOver}
      onDragLeave={peer.temporarilyOffline ? undefined : handleDragLeave}
      onDrop={peer.temporarilyOffline ? undefined : handleDrop}
      role="button"
      tabIndex={0}
      aria-label={`แตะเพื่อส่งไฟล์ให้ ${peer.name}`}
    >
      <div className="drop-overlay">
        <span className="drop-icon"><FolderIcon /></span>
        <span className="drop-text">ปล่อยเพื่อส่งไฟล์ได้เลย</span>
      </div>

      {!peer.temporarilyOffline && (
        <div className="peer-card-actions-top">
          <button
            type="button"
            className="peer-card-more-btn"
            onClick={handleOpenMenu}
            aria-label={`ตัวเลือกสำหรับ ${peer.name}`}
            title="ตัวเลือกเพิ่มเติม"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      )}

      <div className="peer-card-content">
        <div className="peer-avatar-wrap">
          <div className="peer-avatar-glow" />
          <div className="peer-avatar-circle">
            {peer.avatar?.photoUrl || peer.critter?.photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={peer.avatar?.photoUrl || peer.critter?.photoUrl || ''} alt={peer.name} className="peer-avatar-photo" />
            ) : (
              <span className={`peer-critter peer-avatar emoji-avatar ${peer.temporarilyOffline ? 'emoji-offline' : 'emoji-idle'}`}>{peer.avatar?.emoji || peer.critter?.emoji || '⚡'}</span>
            )}
          </div>
          <span className="peer-online-dot" title="พร้อมเชื่อมต่อ" />
        </div>
        <div className="peer-info-col">
          <div className="peer-name">{peer.name}</div>
          <div className="peer-device-badge">
            <span className="device-os-icon">{getDeviceIcon(peer.avatar?.os || peer.critter?.os)}</span>
            <span>{peer.device}</span>
          </div>
          {!peer.temporarilyOffline && (
            <div className="peer-card-quick-actions">
              <button
                type="button"
                className="peer-quick-action-pill msg"
                onClick={(e) => {
                  e.stopPropagation();
                  play('openModal');
                  if ('vibrate' in navigator) navigator.vibrate(12);
                  (window as Window & { triggerTextShare?: (t: string, p?: Peer) => void }).triggerTextShare?.('', peer);
                }}
                aria-label={`ส่งข้อความให้ ${peer.name}`}
                title="ส่งข้อความหรือลิงก์"
              >
                <MessageIcon />
                <span>ข้อความ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showMenu && typeof document !== 'undefined' && createPortal(
        <div className="peer-menu-portal" onClick={() => { play('closeModal'); setShowMenu(false); }}>
          <div className="peer-menu-backdrop" />
          <div className="peer-actions-menu animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="peer-menu-grabber" />
            <div className="peer-actions-menu-header">
              {peer.avatar?.photoUrl || peer.critter?.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={peer.avatar?.photoUrl || peer.critter?.photoUrl || ''} alt={peer.name} className="peer-menu-avatar-photo" />
              ) : (
                <span className="peer-menu-avatar">{peer.avatar?.emoji || peer.critter?.emoji || '⚡'}</span>
              )}
              <div className="peer-menu-target-info">
                <div className="peer-menu-title">{peer.name}</div>
                <div className="peer-menu-subtitle">{peer.device}</div>
              </div>
              <button
                type="button"
                className="peer-actions-close-btn"
                onClick={() => { play('closeModal'); setShowMenu(false); }}
                aria-label="ปิดเมนู"
              >
                ✕
              </button>
            </div>

            <div className="peer-actions-btn-group">
              <button type="button" className="peer-action-btn file" onClick={() => { play('selectPeer'); onSelect(peer); setShowMenu(false); }}>
                <span className="peer-action-icon"><FileIcon /></span>
                <div className="peer-action-text">
                  <span className="peer-action-label">ส่งไฟล์</span>
                  <span className="peer-action-desc">รูปภาพ, วิดีโอ, เอกสาร</span>
                </div>
              </button>
              <button type="button" className="peer-action-btn text" onClick={() => { play('openModal'); (window as Window & { triggerTextShare?: (t: string, p?: Peer) => void }).triggerTextShare?.('', peer); setShowMenu(false); }}>
                <span className="peer-action-icon"><MessageIcon /></span>
                <div className="peer-action-text">
                  <span className="peer-action-label">ส่งข้อความ</span>
                  <span className="peer-action-desc">พิมพ์ข้อความหรือลิงก์ด่วน</span>
                </div>
              </button>
              <button type="button" className="peer-action-btn folder" onClick={() => { play('selectPeer'); (window as Window & { triggerFolderSelect?: (p: Peer) => void }).triggerFolderSelect?.(peer); setShowMenu(false); }}>
                <span className="peer-action-icon"><FolderIcon /></span>
                <div className="peer-action-text">
                  <span className="peer-action-label">ส่งโฟลเดอร์</span>
                  <span className="peer-action-desc">ส่งทั้งโฟลเดอร์พร้อมโครงสร้าง</span>
                </div>
              </button>
            </div>

            <button type="button" className="peer-action-btn-cancel" onClick={() => { play('closeModal'); setShowMenu(false); }}>
              ยกเลิก
            </button>

            {onBlock && (
              <button
                type="button"
                className="peer-action-btn-block"
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1.5px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                }}
                onClick={() => { play('block'); onBlock(peer); setShowMenu(false); }}
              >
                🚫 บล็อกอุปกรณ์นี้
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
