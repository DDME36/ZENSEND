'use client';

import { useState, useEffect } from 'react';
import { Peer } from '@/lib/devices';
import { ConnectionStatus } from '@/hooks/usePeerConnection';
import { useSound } from '@/hooks/useSound';

interface MyNodeProps {
  peer: Peer | null;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  mode?: 'public' | 'wifi' | 'private';
  onEditName: () => void;
  onEditEmoji: () => void;
}

const statusText: Record<ConnectionStatus, string> = {
  connecting: 'กำลังเชื่อมต่อ...',
  connected: 'ออนไลน์',
  reconnecting: 'กำลังเชื่อมต่อใหม่...',
  disconnected: 'ออฟไลน์',
};

type TimeTheme = 'morning' | 'sunset' | 'night';

function getTimeTheme(): TimeTheme {
  const hour = new Date().getHours();
  // Morning / Day: 06:00 - 16:59
  if (hour >= 6 && hour < 17) return 'morning';
  // Sunset / Twilight: 17:00 - 19:59
  if (hour >= 17 && hour < 20) return 'sunset';
  // Night / Cosmic: 20:00 - 05:59
  return 'night';
}

export function MyNode({ peer, connected, connectionStatus, mode = 'public', onEditName, onEditEmoji }: MyNodeProps) {
  const [timeTheme, setTimeTheme] = useState<TimeTheme>(getTimeTheme);
  const { play } = useSound();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTheme(getTimeTheme());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  const avatarEmoji = peer?.avatar?.emoji || peer?.critter?.emoji || '🖥️';
  const photoUrl = peer?.avatar?.photoUrl || peer?.critter?.photoUrl;

  return (
    <div className="my-info-container my-node-container">
      <div className={`my-critter-bar my-node-bar ${!connected ? 'offline' : ''}`}>
        <div
          className={`my-critter-avatar my-node-avatar mode-${mode} time-${timeTheme}`}
          onClick={() => {
            play('openModal');
            onEditEmoji();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              play('openModal');
              onEditEmoji();
            }
          }}
          aria-label="เปลี่ยนรูปหรือตัวตน"
          suppressHydrationWarning
        >
          <div className="emoji-breathe-wrapper">
            <div className="emoji-hover-target">
              {photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoUrl} alt="Avatar" className="node-custom-photo" suppressHydrationWarning />
              ) : (
                <span className={`emoji-avatar ${connected ? 'emoji-idle' : 'emoji-offline'}`} suppressHydrationWarning>{avatarEmoji}</span>
              )}
            </div>
          </div>
        </div>
        <div className="my-critter-info my-node-info">
          <button
            type="button"
            className="my-critter-name-row my-node-name-row my-node-name-btn"
            onClick={() => {
              play('openModal');
              onEditName();
            }}
            aria-label="แตะเพื่อเปลี่ยนชื่อโหนด"
          >
            <span className="my-critter-name my-node-name" suppressHydrationWarning>
              {peer?.name || 'กำลังเตรียมพร้อม...'}
            </span>
            <span className="my-edit-hint" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </span>
          </button>
          <div className="my-critter-status my-node-status">
            <span className={`status-dot ${connectionStatus}`} />
            <span className="status-label">{statusText[connectionStatus]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export const MyInfo = MyNode;

