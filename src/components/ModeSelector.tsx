'use client';

import { useState, useEffect } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useSound } from '@/hooks/useSound';

export type DiscoveryMode = 'public' | 'wifi' | 'private';

interface ModeSelectorProps {
  mode: DiscoveryMode;
  roomCode: string | null;
  roomPassword: string | null;
  networkName: string | null;
  roomError: string | null;
  onChangeMode: (mode: DiscoveryMode, roomCode?: string, password?: string) => void;
}

// Lucide Icons as components
const EarthIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/>
    <path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"/>
    <path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const WifiIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h.01"/>
    <path d="M2 8.82a15 15 0 0 1 20 0"/>
    <path d="M5 12.859a10 10 0 0 1 14 0"/>
    <path d="M8.5 16.429a5 5 0 0 1 7 0"/>
  </svg>
);

const LockIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const DoorOpenIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 4h3a2 2 0 0 1 2 2v14"/>
    <path d="M2 20h3"/>
    <path d="M13 20h9"/>
    <path d="M10 12v.01"/>
    <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>
  </svg>
);

const CopyIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const CheckSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);


const modeIcons = {
  public: EarthIcon,
  wifi: WifiIcon,
  private: LockIcon,
};

const modeConfig = {
  public: { label: 'สาธารณะ', desc: 'เห็นทุกคน' },
  wifi: { label: 'WiFi', desc: 'เฉพาะเครือข่ายเดียวกัน' },
  private: { label: 'ส่วนตัว', desc: 'เฉพาะรหัสห้อง' },
};

export function ModeSelector({ mode, roomCode, networkName, roomError, onChangeMode }: ModeSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const focusRef = useDialogFocus(showJoinModal);
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingMode, setSwitchingMode] = useState<DiscoveryMode | null>(null);
  const { play } = useSound();

  useEffect(() => {
    if (!roomError) return;
    const timer = setTimeout(() => {
      setJoinError(roomError);
      setPendingJoinCode(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [roomError]);

  useEffect(() => {
    if (!pendingJoinCode) return;
    const timer = setTimeout(() => {
      setPendingJoinCode(null);
      setJoinError('ยังเข้าห้องไม่ได้ ตรวจสอบการเชื่อมต่อและรหัส แล้วลองอีกครั้ง');
    }, 12000);
    return () => clearTimeout(timer);
  }, [pendingJoinCode]);

  useEffect(() => {
    if (mode === 'private' && roomCode && pendingJoinCode && roomCode === pendingJoinCode) {
      setTimeout(() => {
        setShowJoinModal(false);
        setInputCode('');
        setPendingJoinCode(null);
      }, 0);
    }
  }, [mode, roomCode, pendingJoinCode]);

  const CurrentIcon = modeIcons[mode];
  const currentConfig = modeConfig[mode];

  const handleSelectMode = (newMode: DiscoveryMode) => {
    if (newMode !== mode) {
      setSwitchingMode(newMode);
      setIsSwitching(true);
      setTimeout(() => {
        setIsSwitching(false);
        setSwitchingMode(null);
      }, 950);
      if (newMode === 'public') play('modePublic');
      else if (newMode === 'wifi') play('modeWifi');
      else if (newMode === 'private') play('modePrivate');
      else play('modeSwitch');

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([15, 30, 20]);
      }
    }
    if (newMode === 'private') {
      onChangeMode('private');
    } else {
      onChangeMode(newMode);
    }
    setShowMenu(false);
  };

  const activeModeTheme = switchingMode || mode;

  const handleJoinRoom = () => {
    if (inputCode.length === 5 && !pendingJoinCode) {
      play('success');
      setJoinError(null);
      setPendingJoinCode(inputCode);
      onChangeMode('private', inputCode);
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    play('copy');
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = roomCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mode-selector">
      <button 
        className={`mode-current mode-${activeModeTheme} ${isSwitching ? 'mode-switching' : ''}`}
        data-mode={activeModeTheme}
        onClick={() => {
          if (!showMenu) play('openModal');
          else play('closeModal');
          setShowMenu(!showMenu);
        }}
        title={currentConfig.desc}
        aria-expanded={showMenu}
        aria-controls="discovery-mode-options"
        onKeyDown={(event) => { if (event.key === 'Escape') setShowMenu(false); }}
      >
        <span key={`icon-${mode}`} className="mode-icon mode-icon-animated">
          <CurrentIcon className="mode-svg-icon" />
        </span>
        <span key={`lbl-${mode}`} className="mode-label">{currentConfig.label}</span>
        {mode === 'wifi' && networkName && (
          <span className="mode-network-name animate-fade-in">{networkName}</span>
        )}
        {mode === 'private' && roomCode && (
          <span className="mode-room-code animate-fade-in">
            #{roomCode}
          </span>
        )}
        <span className="mode-arrow">{showMenu ? '▲' : '▼'}</span>
      </button>

      {showMenu && (
        <div className="mode-menu" id="discovery-mode-options" role="group" aria-label="เลือกโหมดค้นหาอุปกรณ์" onKeyDown={(event) => { if (event.key === 'Escape') setShowMenu(false); }}>
          {mode === 'private' && roomCode && (
            <div className="mode-menu-room-card">
              <div className="mode-menu-room-header">
                <span className="mode-menu-room-label">
                  <LockIcon className="mode-svg-icon-xs" />
                  รหัสห้องส่วนตัว
                </span>
                <span className="mode-menu-room-num">{roomCode}</span>
              </div>
              <button
                type="button"
                className="mode-menu-room-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode();
                }}
                title="คัดลอกรหัสห้อง"
                aria-label="คัดลอกรหัสห้องส่วนตัว"
              >
                {copied ? (
                  <><CheckIcon className="mode-svg-icon-xs" /> คัดลอกแล้ว</>
                ) : (
                  <><CopyIcon className="mode-svg-icon-xs" /> คัดลอก</>
                )}
              </button>
            </div>
          )}

          {(Object.keys(modeConfig) as DiscoveryMode[]).map((m) => {
            const Icon = modeIcons[m];
            return (
              <button
                key={m}
                className={`mode-option mode-option-${m} ${mode === m ? 'active' : ''}`}
                onClick={() => handleSelectMode(m)}
                
                aria-pressed={mode === m}
                aria-label={`สลับเป็นโหมด ${modeConfig[m].label}`}
              >
                <span className="mode-option-icon">
                  <Icon className="mode-svg-icon" />
                </span>
                <div className="mode-option-text">
                  <span className="mode-option-label">{modeConfig[m].label}</span>
                  <span className="mode-option-desc">{modeConfig[m].desc}</span>
                </div>
                {mode === m && <span className="mode-check"><CheckSmallIcon /></span>}
              </button>
            );
          })}

          <button 
            className="mode-join-room"
            onClick={() => {
              setShowMenu(false);
              setInputCode('');
              setJoinError(null);
              setPendingJoinCode(null);
              setShowJoinModal(true);
            }}
            
            aria-label="เข้าห้องด้วยรหัสส่วนตัว"
          >
            <DoorOpenIcon className="mode-svg-icon" />
            <span>เข้าห้องด้วยรหัส</span>
          </button>
        </div>
      )}

      {showMenu && (
        <div className="mode-backdrop" onClick={() => setShowMenu(false)} />
      )}

      {showJoinModal && (
        <div className="mode-join-overlay" onClick={() => setShowJoinModal(false)}>
          <div onKeyDown={(event) => { if (event.key === 'Escape') { setShowJoinModal(false); setPendingJoinCode(null); } }} className="mode-join-modal" ref={focusRef} role="dialog" aria-modal="true" aria-label="เข้าห้องส่วนตัวด้วยรหัส" onClick={(e) => e.stopPropagation()}>
            <div className="mode-join-header">
              <DoorOpenIcon className="mode-svg-icon" />
              <span>เข้าห้อง</span>
            </div>
            
            {joinError && (
              <div id="room-code-error" className="mode-join-error" role="alert">{joinError}</div>
            )}
            
            <label className="room-code-label" htmlFor="room-code-input">รหัสห้อง 5 หลัก</label>
            <input
              id="room-code-input"
              className="room-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              placeholder="00000"
              value={inputCode}
              disabled={!!pendingJoinCode}
              aria-invalid={!!joinError}
              aria-describedby={joinError ? 'room-code-hint room-code-error' : 'room-code-hint'}
              onChange={(event) => {
                setInputCode(event.target.value.replace(/\D/g, '').slice(0, 5));
                setJoinError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { event.preventDefault(); handleJoinRoom(); }
              }}
            />
            <p id="room-code-hint" className="room-code-hint">ขอรหัสจากอีกเครื่องที่เลือกโหมดส่วนตัว คุณสามารถพิมพ์หรือวางรหัสได้</p>

            <div className="mode-join-actions">
              <button 
                className="mode-join-btn"
                onClick={handleJoinRoom}
                disabled={inputCode.length !== 5 || !!pendingJoinCode}
                aria-busy={!!pendingJoinCode}
              >
                {pendingJoinCode ? 'กำลังเข้าห้อง…' : 'เข้าห้อง'}
              </button>
              <button 
                className="mode-cancel-btn"
                onClick={() => {
                  setShowJoinModal(false);
                  setInputCode('');
                  setPendingJoinCode(null);
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
