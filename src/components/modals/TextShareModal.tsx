'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';

import { useState, useEffect } from 'react';
import { Peer } from '@/lib/devices';

// Lucide Icons
const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    <path d="M10 9H8"/>
    <path d="M16 13H8"/>
    <path d="M16 17H8"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
);

interface TextShareModalProps {
  show: boolean;
  peers: Peer[];
  targetPeer?: Peer | null;
  onSend: (peer: Peer, text: string) => void;
  onClose: () => void;
  initialText?: string;
}

export function TextShareModal({ show, peers, targetPeer = null, onSend, onClose, initialText = '' }: TextShareModalProps) {
  const focusRef = useDialogFocus(show);
  const [text, setText] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(targetPeer);

  useEffect(() => {
    if (show) {
      setTimeout(() => {
        setText(initialText);
        setSelectedPeer(targetPeer || (peers.length === 1 ? peers[0] : null));
      }, 0);
    }
  }, [show, initialText, targetPeer, peers]);

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

  const handleSend = () => {
    if (!text.trim() || !selectedPeer) return;
    onSend(selectedPeer, text.trim());
    setText('');
    setSelectedPeer(null);
    onClose();
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) setText(clipText);
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <div className="modal show" onClick={onClose}>
      <div 
        className="modal-content modal-text-share" 
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-share-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="text-share-modal-title" className="modal-title"><FileTextIcon /> ส่งข้อความ</h3>
          <button className="modal-close" onClick={onClose} aria-label="ปิดหน้าต่างส่งข้อความ"><XIcon /></button>
        </div>

        <div className="text-share-content">
          <div className="text-input-wrap">
            <textarea
              className="text-input"
              placeholder="พิมพ์ข้อความหรือวาง URL... (กด Ctrl+Enter เพื่อส่ง)"
              aria-label="ข้อความหรือ URL ที่ต้องการส่ง"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={4}
              autoFocus
            />
            <button className="btn-paste" onClick={handlePaste} title="วางจาก Clipboard" aria-label="วางจากคลิปบอร์ด">
              <ClipboardIcon />
            </button>
          </div>

          <div className="peer-select">
            <p className="peer-select-label">ส่งให้:</p>
            <div className="peer-select-list">
              {peers.length === 0 ? (
                <p className="no-peers">ไม่มีเพื่อนออนไลน์</p>
              ) : (
                peers.map(peer => (
                  <button
                    key={peer.id}
                    className={`peer-select-item ${selectedPeer?.id === peer.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPeer(peer)}
                  >
                    {peer.avatar?.photoUrl || peer.critter?.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={peer.avatar?.photoUrl || peer.critter?.photoUrl || ''} alt={peer.name} className="peer-select-photo" />
                    ) : (
                      <span className="peer-emoji emoji-avatar emoji-idle">{peer.avatar?.emoji || peer.critter?.emoji || '⚡'}</span>
                    )}
                    <span className="peer-name">{peer.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-pastel" onClick={onClose}>ยกเลิก</button>
          <button 
            className="btn btn-accept" 
            onClick={handleSend}
            disabled={!text.trim() || !selectedPeer}
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  );
}
