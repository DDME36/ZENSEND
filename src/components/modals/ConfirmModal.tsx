'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';

import { useEffect } from 'react';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  show, 
  title, 
  message, 
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  const focusRef = useDialogFocus(show);
  // Escape key handler
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onCancel]);

  if (!show) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div 
        className="confirm-dialog" 
        ref={focusRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={e => e.stopPropagation()}
      >
        <div className="confirm-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div id="confirm-title" className="confirm-title">{title}</div>
        <div id="confirm-message" className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel} aria-label={cancelText}>
            {cancelText}
          </button>
          <button className="confirm-btn confirm-btn-ok" onClick={onConfirm} aria-label={confirmText}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
