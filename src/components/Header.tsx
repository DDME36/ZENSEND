'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useSound } from '@/hooks/useSound';

interface HeaderProps {
  muted: boolean;
  isDark: boolean;
  hasPeers: boolean;
  isInstallable?: boolean;
  isEcoMode?: boolean;
  onToggleEcoMode?: () => void;
  onInstall?: () => void;
  onToggleMute: () => void;
  onToggleTheme: () => void;
  onShowHistory: () => void;
  onShowQR: () => void;
  blockedCount?: number;
  onShowBlockedPeers?: () => void;
}

export function Header({ muted, isDark, hasPeers, isInstallable, isEcoMode, onToggleEcoMode, onInstall, onToggleMute, onToggleTheme, onShowHistory, onShowQR, blockedCount = 0, onShowBlockedPeers }: HeaderProps) {
  const [showMore, setShowMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { play } = useSound();

  // Close dropdown on click outside or escape key
  useEffect(() => {
    if (!showMore) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMore(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMore]);

  return (
    <header className="header">
      <div className="logo">
        <div
          className="logo-wrapper"
          onClick={() => {
            if ('vibrate' in navigator) navigator.vibrate(10);
          }}
          role="banner"
        >
          <div className="brand-horse-wrapper">
            <div className="brand-horse-aura" aria-hidden="true" />
            <Image className="brand-horse" src="/zensend-z-horse.png" alt="ZenSend" width={48} height={48} priority />
          </div>
          <div className="logo-brand-col">
            <div className="logo-text-row">
              <span className="logo-zen">Zen</span>
              <span className="logo-send">
                Send
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="header-actions" ref={menuRef}>
        {/* Install Button (Desktop top bar) */}
        {isInstallable && onInstall && (
          <button
            className="btn-icon-header install-btn btn-desktop-only"
            onClick={onInstall}
            data-tooltip="ติดตั้งแอปพลิเคชัน"
            aria-label="ติดตั้งแอปพลิเคชัน ZenSend"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span className="install-text">ติดตั้ง</span>
          </button>
        )}

        {/* History Button (always prominent) */}
        <button
          className="btn-icon-header"
          onClick={() => {
            play('openModal');
            onShowHistory();
          }}
          data-tooltip="ประวัติการส่งไฟล์"
          aria-label="ดูประวัติการส่งไฟล์"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>

        {/* Desktop-Only Buttons (hidden on mobile, moved into [⋮]) */}
        {hasPeers && (
          <button
            className="btn-icon-header btn-desktop-only"
            onClick={() => {
              play('openModal');
              onShowQR();
            }}
            data-tooltip="แชร์ห้องผ่าน QR Code"
            aria-label="แสดง QR Code สำหรับแชร์ห้อง"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
              <rect x="14" y="14" width="3" height="3"></rect>
              <rect x="18" y="14" width="3" height="3"></rect>
              <rect x="14" y="18" width="3" height="3"></rect>
              <rect x="18" y="18" width="3" height="3"></rect>
            </svg>
          </button>
        )}
        <button
          className="btn-icon-header btn-desktop-only"
          onClick={() => {
            play(isDark ? 'toggleOff' : 'toggleOn');
            onToggleTheme();
          }}
          data-tooltip={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
          aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
        <button
          className={`btn-icon-header btn-desktop-only ${muted ? 'muted' : ''}`}
          onClick={() => {
            if (muted) {
              setTimeout(() => play('toggleOn'), 20);
            } else {
              play('toggleOff');
            }
            onToggleMute();
          }}
          data-tooltip={muted ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}
          aria-label={muted ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}
          aria-pressed={!muted}
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          )}
        </button>

        {onShowBlockedPeers && blockedCount > 0 && (
          <button
            type="button"
            className="btn-icon-header btn-desktop-only"
            onClick={() => {
              play('openModal');
              onShowBlockedPeers();
            }}
            data-tooltip={`อุปกรณ์ที่บล็อก (${blockedCount})`}
            aria-label="ดูอุปกรณ์ที่บล็อก"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
            <span className="blocked-count-badge">{blockedCount}</span>
          </button>
        )}

        {onToggleEcoMode && (
          <button
            className={`btn-icon-header btn-desktop-only ${isEcoMode ? 'eco-btn-active' : 'eco-btn-inactive'}`}
            onClick={() => {
              play(isEcoMode ? 'toggleOff' : 'toggleOn');
              onToggleEcoMode();
            }}
            data-tooltip={isEcoMode ? 'โหมดประหยัดแบตเตอรี่: เปิดอยู่' : 'โหมดประหยัดแบตเตอรี่: ปิดอยู่'}
            aria-label={isEcoMode ? 'ปิดโหมดประหยัดพลังงาน' : 'เปิดโหมดประหยัดพลังงาน'}
            aria-pressed={isEcoMode}
            suppressHydrationWarning
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6"/>
            </svg>
          </button>
        )}

        {/* Mobile More Button [ ⋮ ] and Dropdown */}
        <div className="header-more-container">
          <button
            type="button"
            className={`btn-icon-header btn-mobile-more ${showMore ? 'active' : ''}`}
            onClick={() => {
              if (!showMore) play('openModal');
              else play('closeModal');
              if ('vibrate' in navigator) navigator.vibrate(15);
              setShowMore(prev => !prev);
            }}
            data-tooltip={showMore ? undefined : 'เมนูเพิ่มเติม'}
            data-tooltip-pos="bottom-right"
            aria-label="เมนูเพิ่มเติม"
            aria-expanded={showMore}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>

          {showMore && (
            <div className="header-more-dropdown" role="group" aria-label="เมนูเพิ่มเติม">
              {isInstallable && onInstall && (
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={() => {
                    play('tap');
                    setShowMore(false);
                    onInstall();
                  }}
                >
                  <span className="dropdown-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </span>
                  <span className="dropdown-item-label">ติดตั้งแอป (Install PWA)</span>
                </button>
              )}

              {hasPeers && (
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={() => {
                    play('openModal');
                    setShowMore(false);
                    onShowQR();
                  }}
                >
                  <span className="dropdown-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                      <rect x="14" y="14" width="3" height="3"></rect>
                      <rect x="18" y="14" width="3" height="3"></rect>
                      <rect x="14" y="18" width="3" height="3"></rect>
                      <rect x="18" y="18" width="3" height="3"></rect>
                    </svg>
                  </span>
                  <span className="dropdown-item-label">คิวอาร์โค้ด (QR Code)</span>
                </button>
              )}

              <button
                type="button"
                className="header-dropdown-item"
                onClick={() => {
                  play(isDark ? 'toggleOff' : 'toggleOn');
                  setShowMore(false);
                  onToggleTheme();
                }}
              >
                <span className="dropdown-item-icon">
                  {isDark ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  )}
                </span>
                <span className="dropdown-item-label">{isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}</span>
              </button>

              <button
                type="button"
                className="header-dropdown-item"
                onClick={() => {
                  if (muted) {
                    setTimeout(() => play('toggleOn'), 20);
                  } else {
                    play('toggleOff');
                  }
                  setShowMore(false);
                  onToggleMute();
                }}
              >
                <span className="dropdown-item-icon">
                  {muted ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  )}
                </span>
                <span className="dropdown-item-label">{muted ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}</span>
              </button>

              {onShowBlockedPeers && (
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={() => {
                    play('openModal');
                    setShowMore(false);
                    onShowBlockedPeers();
                  }}
                >
                  <span className="dropdown-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m8.5 8.5 7 7" />
                    </svg>
                  </span>
                  <span className="dropdown-item-label">อุปกรณ์ที่บล็อก</span>
                  {blockedCount > 0 && <span className="blocked-count-badge">{blockedCount}</span>}
                </button>
              )}

              {onToggleEcoMode && (
                <button
                  type="button"
                  className={`header-dropdown-item eco-dropdown-item ${isEcoMode ? 'eco-item-active' : 'eco-item-inactive'}`}
                  onClick={() => {
                    play(isEcoMode ? 'toggleOff' : 'toggleOn');
                    setShowMore(false);
                    if ('vibrate' in navigator) navigator.vibrate(15);
                    onToggleEcoMode();
                  }}
                  role="menuitem"
                  suppressHydrationWarning
                >
                  <span className={`dropdown-item-icon eco-icon ${isEcoMode ? 'eco-icon-active' : 'eco-icon-inactive'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                      <path d="M2 21c0-3 1.85-5.36 5.08-6"/>
                    </svg>
                  </span>
                  <span className="dropdown-item-label">
                    โหมดประหยัดแบตเตอรี่
                  </span>
                  <span className={`eco-status-indicator ${isEcoMode ? 'status-amber' : 'status-green'}`}>
                    <span className="eco-status-dot" />
                    <span className="eco-status-label">{isEcoMode ? 'เปิด' : 'ปิด'}</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
