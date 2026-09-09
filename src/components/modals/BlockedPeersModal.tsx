'use client';

import { useEffect } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import type { BlockedPeer } from '@/hooks/useBlockedPeers';

interface BlockedPeersModalProps {
  show: boolean;
  peers: BlockedPeer[];
  onUnblock: (peerId: string) => void;
  onClose: () => void;
}

export function BlockedPeersModal({ show, peers, onUnblock, onClose }: BlockedPeersModalProps) {
  const focusRef = useDialogFocus(show);

  useEffect(() => {
    if (!show) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const blockedDate = (timestamp: number) => new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <section
        className="confirm-dialog blocked-peers-dialog"
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-peers-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="blocked-peers-heading">
          <div>
            <div id="blocked-peers-title" className="confirm-title">อุปกรณ์ที่บล็อก</div>
            <p className="blocked-peers-description">อุปกรณ์เหล่านี้ส่งคำขอหาเครื่องนี้ไม่ได้</p>
          </div>
          <button className="blocked-peers-close" type="button" onClick={onClose} aria-label="ปิด">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {peers.length === 0 ? (
          <p className="blocked-peers-empty">ยังไม่มีอุปกรณ์ที่บล็อก</p>
        ) : (
          <div className="blocked-peers-list">
            {peers.map(peer => (
              <div className="blocked-peer-row" key={peer.id}>
                <div className="blocked-peer-copy">
                  <strong>{peer.name}</strong>
                  <span>{peer.device || 'อุปกรณ์'} · บล็อกเมื่อ {blockedDate(peer.blockedAt)}</span>
                </div>
                <button type="button" className="blocked-peer-unblock" onClick={() => onUnblock(peer.id)}>
                  เลิกบล็อก
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
