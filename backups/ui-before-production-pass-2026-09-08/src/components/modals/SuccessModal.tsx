'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';

import { useEffect } from 'react';

interface SuccessModalProps {
  show: boolean;
  myEmoji: string;
  myName: string;
  peerEmoji: string;
  peerName: string;
  onClose: () => void;
}

export function SuccessModal({ show, myEmoji, myName, peerEmoji, peerName, onClose }: SuccessModalProps) {
  const focusRef = useDialogFocus(show);
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="modal show" onClick={onClose}>
      <div ref={focusRef} role="dialog" aria-modal="true" aria-label="ส่งสำเร็จ" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }} className="modal-content modal-success" onClick={e => e.stopPropagation()}>
        <div className="success-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <div className="success-text">ส่งสำเร็จ</div>
        
        <div className="success-users">
          <div className="success-user">
            <span className="user-avatar emoji-avatar emoji-success">{myEmoji}</span>
            <span className="user-label">{myName}</span>
          </div>
          <span className="success-divider">→</span>
          <div className="success-user">
            <span className="user-avatar emoji-avatar emoji-success">{peerEmoji}</span>
            <span className="user-label">{peerName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
