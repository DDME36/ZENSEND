'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useState, useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

// Modern Lucide-style Edit Icon
const PencilIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

interface RenameModalProps {
  show: boolean;
  currentName: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export function RenameModal({ show, currentName, onSubmit, onClose }: RenameModalProps) {
  const focusRef = useDialogFocus(show);
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { play } = useSound();

  useEffect(() => {
    const timer = setTimeout(() => {
      setName(currentName);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentName, show]);

  // Scroll input into view when keyboard opens (iOS Safari fix)
  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [show]);

  // Escape key handler
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const handleSubmit = () => {
    if (name.trim()) {
      play('success');
      onSubmit(name.trim().slice(0, 20));
    }
    onClose();
  };

  const handleCancel = () => {
    play('closeModal');
    onClose();
  };

  const handleFocus = () => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="modal show modal-keyboard-aware" onClick={() => { play('closeModal'); onClose(); }}>
      <div 
        className="modal-content modal-small modal-input-modal" 
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-icon text-cyan-400">
          <PencilIcon />
        </div>
        <div id="rename-modal-title" className="modal-title">ตั้งชื่อโหนดใหม่ (Rename Node)</div>
        <p className="modal-subtitle text-xs text-slate-400 mt-1 mb-4">
          กำหนดชื่อสำหรับระบุตัวตนบนระบบเครือข่าย ZenSend
        </p>
        <input
          ref={inputRef}
          type="text"
          className="name-input"
          placeholder="ระบุชื่อโหนดของคุณ..."
          aria-label="ชื่อโหนดของคุณ"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          onFocus={handleFocus}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="modal-actions">
          <button className="btn btn-reject" onClick={handleCancel} aria-label="ยกเลิกการตั้งชื่อ">ยกเลิก</button>
          <button className="btn btn-accept" onClick={handleSubmit} aria-label="บันทึกชื่อโหนด">บันทึก</button>
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export const NameModal = RenameModal;
