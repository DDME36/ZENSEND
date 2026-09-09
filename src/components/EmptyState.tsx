'use client';

import { ZenBeacon } from './ZenBeacon';
import { useSound } from '@/hooks/useSound';

// Lucide Icons
const EarthIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/>
    <path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"/>
    <path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const WifiIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01"/>
    <path d="M2 8.82a15 15 0 0 1 20 0"/>
    <path d="M5 12.859a10 10 0 0 1 14 0"/>
    <path d="M8.5 16.429a5 5 0 0 1 7 0"/>
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const QrCodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/>
    <rect width="5" height="5" x="16" y="3" rx="1"/>
    <rect width="5" height="5" x="3" y="16" rx="1"/>
    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
    <path d="M21 21v.01"/>
    <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
    <path d="M3 12h.01"/>
    <path d="M12 3h.01"/>
    <path d="M12 16v.01"/>
    <path d="M16 12h1"/>
    <path d="M21 12v.01"/>
    <path d="M12 21v-1"/>
  </svg>
);

const ServerAntennaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="server-connecting-icon">
    <path d="M2 20h.01"/>
    <path d="M7 20v-4"/>
    <path d="M12 20v-8"/>
    <path d="M17 20V4"/>
  </svg>
);

interface EmptyStateProps {
  mode: 'public' | 'wifi' | 'private';
  connected: boolean;
  emoji?: string;
  isInitialScanning?: boolean;
  onShowQR: () => void;
  onShowHelp?: () => void;
}

export function EmptyState({ mode, connected, isInitialScanning = false, onShowQR, onShowHelp }: EmptyStateProps) {
  const { play } = useSound();
  const hints = {
    public: 'เลือกโหมดสาธารณะบนทั้งสองเครื่อง เพื่อค้นหากันผ่านอินเทอร์เน็ต',
    wifi: 'เชื่อมต่อ Wi-Fi เดียวกัน แล้วเลือกโหมด WiFi บนทั้งสองเครื่อง',
    private: 'เข้าห้องด้วยรหัสเดียวกันบนทั้งสองเครื่อง เพื่อค้นหากันในห้องส่วนตัว',
  };

  return (
    <div className={`empty-state zen-stage-reveal ${isInitialScanning ? 'empty-state-scanning' : 'empty-state-ready'}`}>
      <div className="empty-hero-group">
        <div className="empty-radar-stage zen-reveal-radar" aria-hidden="true">
          <div className={`empty-radar-glow mode-${mode}`} />
          <div className={`radar-target-ring ring-inner mode-${mode}`} />
          <div className={`radar-target-ring ring-outer mode-${mode}`} />
          <svg className={`radar-sonar-sweep mode-${mode}`} viewBox="0 0 100 100">
            <circle className="radar-sonar-arc" cx="50" cy="50" r="42" />
          </svg>
          <div className={`empty-radar-pulse pulse-1 mode-${mode}`} />
          <div className={`empty-radar-pulse pulse-2 mode-${mode}`} />
          <div className={`empty-avatar-node empty-radar-core mode-${mode}`}>
            <span className={`radar-core-icon ${connected ? 'beacon-active' : 'beacon-offline'}`}>
              <ZenBeacon state={connected ? 'scanning' : 'connecting'} decorative />
            </span>
          </div>
        </div>

        <div className="empty-message-col zen-reveal-message">
          <h1 className="workspace-title">ส่งไฟล์ข้ามเครื่อง ได้ทันที</h1>
          <p className="workspace-description">เปิด ZenSend บนอีกเครื่อง แล้วเลือกอุปกรณ์เพื่อส่งไฟล์หรือข้อความ</p>
          <div className="discovery-status" role="status">
            {!connected && (
              <span className="server-connecting-badge" title="กำลังเชื่อมต่อเซิร์ฟเวอร์">
                <ServerAntennaIcon />
              </span>
            )}
            <span className="discovery-status-text">
              {connected ? (
                <span className="discovery-status-scanning">
                  <span className="discovery-text-label">กำลังค้นหาอุปกรณ์</span>
                  <span className={`discovery-dots mode-${mode}`} aria-hidden="true">
                    <span className="discovery-dot d-dot-1" />
                    <span className="discovery-dot d-dot-2" />
                    <span className="discovery-dot d-dot-3" />
                  </span>
                </span>
              ) : (
                <span className="discovery-status-connecting">กำลังเชื่อมต่อเซิร์ฟเวอร์...</span>
              )}
            </span>
          </div>

          <div className="empty-mode-indicators">
            <span className={`mode-pill mode-pill-${mode}`}>{mode === 'public' ? <EarthIcon /> : mode === 'wifi' ? <WifiIcon /> : <LockIcon />}{hints[mode]}</span>
          </div>
        </div>
      </div>

      {!isInitialScanning && (
        <div className="empty-details-fade-in zen-reveal-details">
          {/* Minimalist Micro-Steps */}
          <div className="empty-quick-steps" aria-label="ขั้นตอนง่ายๆ">
            <span className="step-pill"><span className="step-idx">1</span> เปิดอีกเครื่อง</span>
            <span className="step-arrow">→</span>
            <span className="step-pill"><span className="step-idx">2</span> แตะอุปกรณ์</span>
            <span className="step-arrow">→</span>
            <span className="step-pill"><span className="step-idx">3</span> ส่งไฟล์หรือข้อความ</span>
          </div>

          <div className="empty-actions">
            <button
              className="btn btn-zen-primary empty-qr-btn"
              onClick={() => {
                play('openModal');
                onShowQR();
              }}
            >
              <span className="btn-icon"><QrCodeIcon /></span> เปิดอีกเครื่องด้วย QR
            </button>
            {onShowHelp && (
              <button
                className="workspace-secondary-action"
                onClick={() => {
                  play('openModal');
                  onShowHelp();
                }}
              >
                ไม่พบอุปกรณ์? ดูวิธีเชื่อมต่อ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
