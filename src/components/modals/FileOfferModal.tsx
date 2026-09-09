'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useState, useEffect } from 'react';
import { Peer } from '@/lib/devices';
import { formatFileSize } from '@/lib/utils';
import {
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
  FileText,
  FileCode,
  File,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  ShieldAlert,
  Download,
  X,
  Zap,
  Info,
} from 'lucide-react';

interface FileOfferModalProps {
  show: boolean;
  from: Peer;
  file: { name: string; size: number; type: string };
  onAccept: () => void;
  onReject: () => void;
  onRejectAndBlock?: (peer: Peer) => void;
}

function getDeviceIcon(deviceStr?: string, os?: string) {
  const str = (deviceStr || os || '').toLowerCase();
  if (str.includes('phone') || str.includes('ios') || str.includes('android') || str.includes('mobile')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (str.includes('ipad') || str.includes('tablet')) {
    return <Tablet className="w-5 h-5" />;
  }
  if (str.includes('mac') || str.includes('laptop')) {
    return <Laptop className="w-5 h-5" />;
  }
  return <Monitor className="w-5 h-5" />;
}

interface FileCategoryInfo {
  icon: React.ReactNode;
  categoryName: string;
  extension: string;
  badgeClass: string;
  accentColor: string;
}

function getFileCategoryInfo(name: string, type: string): FileCategoryInfo {
  const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
  const isVideo = type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(name);
  const isImage = type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|svg|avif)$/i.test(name);
  const isAudio = type.startsWith('audio/') || /\.(mp3|wav|m4a|flac|aac|ogg)$/i.test(name);
  const isZip = type.includes('zip') || type.includes('tar') || /\.(zip|rar|7z|tar|gz)$/i.test(name);
  const isDoc = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|csv)$/i.test(name) || type.includes('pdf');
  const isCode = /\.(js|ts|tsx|jsx|json|py|html|css|cpp|c|rs|go|sh)$/i.test(name);

  if (isImage) {
    return {
      icon: <ImageIcon className="w-7 h-7" />,
      categoryName: 'รูปภาพ (Image)',
      extension: ext,
      badgeClass: 'file-badge-image',
      accentColor: '#0ea5e9',
    };
  }
  if (isVideo) {
    return {
      icon: <Film className="w-7 h-7" />,
      categoryName: 'วิดีโอ (Video)',
      extension: ext,
      badgeClass: 'file-badge-video',
      accentColor: '#8b5cf6',
    };
  }
  if (isAudio) {
    return {
      icon: <Music className="w-7 h-7" />,
      categoryName: 'ไฟล์เสียง (Audio)',
      extension: ext,
      badgeClass: 'file-badge-audio',
      accentColor: '#f59e0b',
    };
  }
  if (isZip) {
    return {
      icon: <FileArchive className="w-7 h-7" />,
      categoryName: 'ไฟล์บีบอัด (Archive)',
      extension: ext,
      badgeClass: 'file-badge-zip',
      accentColor: '#6366f1',
    };
  }
  if (isDoc) {
    return {
      icon: <FileText className="w-7 h-7" />,
      categoryName: 'เอกสาร (Document)',
      extension: ext,
      badgeClass: 'file-badge-doc',
      accentColor: '#ef4444',
    };
  }
  if (isCode) {
    return {
      icon: <FileCode className="w-7 h-7" />,
      categoryName: 'ซอร์สโค้ด (Source Code)',
      extension: ext,
      badgeClass: 'file-badge-code',
      accentColor: '#10b981',
    };
  }
  return {
    icon: <File className="w-7 h-7" />,
    categoryName: 'ไฟล์ทั่วไป (File)',
    extension: ext,
    badgeClass: 'file-badge-generic',
    accentColor: '#64748b',
  };
}

export function FileOfferModal({ show, from, file, onAccept, onReject, onRejectAndBlock }: FileOfferModalProps) {
  const focusRef = useDialogFocus(show);
  const [isAccepting, setIsAccepting] = useState(false);

  // Escape key handler to reject
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onReject]);

  const handleAcceptClick = () => {
    if (isAccepting) return;
    setIsAccepting(true);
    onAccept();
  };

  if (!show) return null;

  const senderPhoto = from.avatar?.photoUrl || from.critter?.photoUrl;
  const isLargeFile = file.size > 50 * 1024 * 1024; // > 50MB
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
  const fileCategory = getFileCategoryInfo(file.name, file.type);

  return (
    <div className="modal show" onClick={onReject}>
      <div 
        className="modal-content airdrop-card zensend-file-offer-card" 
        ref={focusRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="file-offer-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Sender Info Badge */}
        <div className="modal-sender-badge zensend-sender-badge">
          <div className="modal-sender-avatar-wrap">
            {senderPhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={senderPhoto} alt="" className="modal-sender-avatar-img" />
            ) : (
              <div className="modal-sender-avatar-icon">
                {getDeviceIcon(from.device, from.avatar?.os)}
                <span className="modal-sender-status-dot" title="ออนไลน์" />
              </div>
            )}
          </div>
          <div className="modal-sender-text">
            <div className="modal-sender-eyebrow">
              <span className="modal-sender-pulse-dot" />
              <span id="file-offer-title" className="modal-sender-title">คำขอส่งไฟล์เข้าเครื่อง</span>
            </div>
            <div className="modal-sender-name-row">
              <strong className="modal-sender-name">{from.name}</strong>
              <span className="modal-sender-device-chip">
                {from.device}
              </span>
            </div>
          </div>
        </div>
        
        {/* File Details Card */}
        <div className="modal-file-card zensend-file-card" style={{ '--file-accent': fileCategory.accentColor } as React.CSSProperties}>
          <div className="modal-file-plaque">
            {fileCategory.icon}
            <span className="modal-file-ext-tag">{fileCategory.extension}</span>
          </div>
          <div className="file-meta-col">
            <strong className="file-name-text" title={file.name}>
              {file.name}
            </strong>
            <div className="file-submeta-row">
              <span className="file-size-badge">{formatFileSize(file.size)}</span>
              <span className="file-submeta-sep">•</span>
              <span className="file-category-badge">{fileCategory.categoryName}</span>
            </div>
          </div>
        </div>

        {/* Informative Hint (No emojis) */}
        {isVideo && (
          <div className="modal-notice-box notice-info">
            <Info className="modal-notice-icon" />
            <span className="modal-notice-text">
              วิดีโอจะถูกบันทึกความละเอียดต้นฉบับลงเครื่อง และสามารถเปิดชมหรือแชร์ได้ทันที
            </span>
          </div>
        )}
        
        {isLargeFile && (
          <div className="modal-notice-box notice-warning">
            <Zap className="modal-notice-icon" />
            <div className="modal-notice-text">
              <strong>ไฟล์ขนาดใหญ่ ({formatFileSize(file.size)})</strong>
              <div>ระบบกำลังเตรียมการสตรีมตรงผ่าน WebRTC P2P กรุณาเปิดหน้านี้ค้างไว้จนกว่าจะเสร็จสิ้น</div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="modal-actions zensend-modal-actions">
          <button type="button" className="btn-file-reject" onClick={onReject} disabled={isAccepting}>
            <X className="w-4 h-4" />
            <span>ปฏิเสธ</span>
          </button>
          <button 
            type="button" 
            className="btn-file-accept" 
            onClick={handleAcceptClick}
            disabled={isAccepting}
            style={{ opacity: isAccepting ? 0.75 : 1, cursor: isAccepting ? 'not-allowed' : 'pointer' }}
          >
            <Download className={`w-4 h-4 ${isAccepting ? 'animate-pulse' : ''}`} />
            <span>{isAccepting ? 'กำลังเริ่มรับ...' : 'รับไฟล์ (Accept)'}</span>
          </button>
        </div>

        {/* Subactions - Block Device (No emojis) */}
        {onRejectAndBlock && (
          <div className="modal-subactions zensend-modal-subactions">
            <button
              type="button"
              className="btn-file-block"
              onClick={() => onRejectAndBlock(from)}
              title="ปฏิเสธและบล็อกอุปกรณ์นี้เพื่อป้องกันการส่งไฟล์มาก่อกวนอีก"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ปฏิเสธและบล็อกอุปกรณ์นี้ (Block Device)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
