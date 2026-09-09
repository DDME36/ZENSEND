'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';

import { useEffect } from 'react';
import { Peer } from '@/lib/devices';
import { formatFileSize } from '@/lib/utils';

interface FileOfferModalProps {
  show: boolean;
  from: Peer;
  file: { name: string; size: number; type: string };
  onAccept: () => void;
  onReject: () => void;
  onRejectAndBlock?: (peer: Peer) => void;
}

export function FileOfferModal({ show, from, file, onAccept, onReject, onRejectAndBlock }: FileOfferModalProps) {
  const focusRef = useDialogFocus(show);
  // Escape key handler to reject
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onReject]);

  if (!show) return null;

  const senderPhoto = from.avatar?.photoUrl || from.critter?.photoUrl;
  const senderEmoji = from.avatar?.emoji || from.critter?.emoji || '⚡';

  const isLargeFile = file.size > 50 * 1024 * 1024; // > 50MB
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(file.name);
  const isZip = file.type.includes('zip') || file.type.includes('tar') || /\.(zip|rar|7z|tar|gz)$/i.test(file.name);

  const getFileEmoji = () => {
    if (isVideo) return '🎬';
    if (isImage) return '🖼️';
    if (isZip) return '📦';
    return '📄';
  };

  return (
    <div className="modal show" onClick={onReject}>
      <div 
        className="modal-content airdrop-card" 
        ref={focusRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="file-offer-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-sender-badge">
          <div className="modal-sender-avatar emoji-avatar emoji-notice">
            {senderPhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={senderPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              senderEmoji
            )}
          </div>
          <div className="modal-sender-text">
            <span id="file-offer-title" className="modal-sender-title">คำขอส่งไฟล์ (Incoming Zend)</span>
            <span className="modal-sender-name">{from.name} • {from.device}</span>
          </div>
        </div>
        
        <div className="modal-file-card">
          <div className="file-type-glyph">{getFileEmoji()}</div>
          <div className="file-meta-col">
            <strong className="file-name-text">{file.name}</strong>
            <span className="file-size-badge">{formatFileSize(file.size)}</span>
          </div>
        </div>

        {isVideo && (
          <p className="modal-hint">
            💡 วิดีโอจะถูกดาวน์โหลดลงเครื่อง และสามารถบันทึกเข้าอัลบั้มรูปได้ทันที
          </p>
        )}
        
        {isLargeFile && (
          <div className="modal-warning">
            <div className="warning-icon">⚡</div>
            <div className="warning-text">
              <strong>ไฟล์ขนาดใหญ่ ({formatFileSize(file.size)})</strong>
              <br />
              ระบบจะทำการ Stream ตรงด้วย P2P กรุณาเปิดหน้านี้ค้างไว้จนกว่าจะเสร็จ
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="btn btn-reject" onClick={onReject}>ปฏิเสธ</button>
          <button className="btn btn-accept" onClick={onAccept}>รับไฟล์ (Accept)</button>
        </div>

        {onRejectAndBlock && (
          <div className="modal-subactions" style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn-link-block"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
              onClick={() => onRejectAndBlock(from)}
              title="ปฏิเสธและบล็อกอุปกรณ์นี้เพื่อป้องกันการส่งไฟล์มาก่อกวนอีก"
            >
              🚫 ปฏิเสธและบล็อกอุปกรณ์นี้ (Block Device)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
