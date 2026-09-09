'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useState, useEffect } from 'react';
import {
  Tablet,
  Smartphone,
  Monitor,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface IOSInstallModalProps {
  show: boolean;
  onClose: () => void;
}

type PlatformTab = 'apple' | 'android' | 'desktop';

export function IOSInstallModal({ show, onClose }: IOSInstallModalProps) {
  const focusRef = useDialogFocus(show);
  const platform = (() => {
    if (typeof window === 'undefined') return { tab: 'apple' as PlatformTab, isIPad: false };
    const ua = navigator.userAgent;
    const isPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isPhone = /iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    return { isIPad: isPad, tab: (isAndroid ? 'android' : isPad || isPhone ? 'apple' : 'desktop') as PlatformTab };
  })();
  const [activeTab, setActiveTab] = useState<PlatformTab>(platform.tab);
  const isIPad = platform.isIPad;

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

  return (
    <div className="modal show pwa-modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content modal-pwa-install" 
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button Top-Right */}
        <button
          type="button"
          className="pwa-modal-close"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Hero Icon Plaque */}
        <div className="pwa-hero-plaque">
          <div className="pwa-hero-icon-wrap">
            {activeTab === 'apple' ? (
              isIPad ? (
                <Tablet className="w-7 h-7 text-indigo-500" />
              ) : (
                <Smartphone className="w-7 h-7 text-indigo-500" />
              )
            ) : activeTab === 'android' ? (
              <Smartphone className="w-7 h-7 text-emerald-500" />
            ) : (
              <Monitor className="w-7 h-7 text-sky-500" />
            )}
          </div>
        </div>

        {/* Modal Title */}
        <div id="pwa-install-title" className="pwa-modal-title">
          ติดตั้ง ZenSend ลงเครื่อง
        </div>
        <div className="pwa-modal-subtitle">
          {activeTab === 'apple'
            ? (isIPad ? 'คำแนะนำสำหรับ iPad (Safari)' : 'คำแนะนำสำหรับ iPhone / iOS (Safari)')
            : activeTab === 'android'
            ? 'คำแนะนำสำหรับ Android (Chrome / Samsung Internet)'
            : 'คำแนะนำสำหรับคอมพิวเตอร์ (Chrome / Edge)'}
        </div>

        {/* Segmented OS Tab Switcher */}
        <div className="pwa-tabs-segment" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'apple'}
            className={`pwa-tab-btn ${activeTab === 'apple' ? 'active' : ''}`}
            onClick={() => setActiveTab('apple')}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Apple (iOS/iPad)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'android'}
            className={`pwa-tab-btn ${activeTab === 'android' ? 'active' : ''}`}
            onClick={() => setActiveTab('android')}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'desktop'}
            className={`pwa-tab-btn ${activeTab === 'desktop' ? 'active' : ''}`}
            onClick={() => setActiveTab('desktop')}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Tab Instructions Content */}
        <div className="pwa-steps-list">
          {activeTab === 'apple' && (
            <>
              <div className="pwa-step-item">
                <div className="pwa-step-badge">1</div>
                <div className="pwa-step-content">
                  แตะปุ่ม <strong>&quot;แชร์&quot; (Share)</strong>
                  <span className="pwa-inline-icon">
                    <Share className="w-3.5 h-3.5" />
                  </span>
                  {isIPad ? (
                    <span> ที่<strong>แถบเครื่องมือด้านบน</strong> (ข้างช่อง URL)</span>
                  ) : (
                    <span> ที่<strong>แถบเครื่องมือนำทางด้านล่าง</strong> ของ Safari</span>
                  )}
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-badge">2</div>
                <div className="pwa-step-content">
                  เลื่อนรายการลงมา แล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</strong>
                  <span className="pwa-inline-icon">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-badge">3</div>
                <div className="pwa-step-content">
                  แตะ <strong>&quot;เพิ่ม&quot; (Add)</strong> ที่มุมขวาบนเพื่อยืนยัน
                </div>
              </div>
            </>
          )}

          {activeTab === 'android' && (
            <>
              <div className="pwa-step-item">
                <div className="pwa-step-badge">1</div>
                <div className="pwa-step-content">
                  แตะไอคอนเมนูจุดสามจุด <strong>(⋮ เมนู)</strong>
                  <span className="pwa-inline-icon">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </span>
                  ที่มุมขวาบนของเบราว์เซอร์ Chrome
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-badge">2</div>
                <div className="pwa-step-content">
                  เลือกเมนู <strong>&quot;ติดตั้งแอป&quot; (Install app)</strong> หรือ <strong>&quot;เพิ่มลงในหน้าจอหลัก&quot; (Add to Home screen)</strong>
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-badge">3</div>
                <div className="pwa-step-content">
                  แตะ <strong>&quot;ติดตั้ง&quot; (Install)</strong> ในหน้าต่างยืนยันเพื่อติดตั้งลงเครื่องทันที
                </div>
              </div>
            </>
          )}

          {activeTab === 'desktop' && (
            <>
              <div className="pwa-step-item">
                <div className="pwa-step-badge">1</div>
                <div className="pwa-step-content">
                  สังเกตไอคอน <strong>&quot;ติดตั้งแอป&quot;</strong>
                  <span className="pwa-inline-icon">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                  ที่ด้านขวาสุดของช่องกรอก URL (Address Bar) ใน Chrome หรือ Edge
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-badge">2</div>
                <div className="pwa-step-content">
                  คลิก <strong>&quot;ติดตั้ง&quot; (Install)</strong> เพื่อเปิดใช้งานแบบแอปพลิเคชันเต็มหน้าต่าง
                </div>
              </div>
            </>
          )}
        </div>

        {/* Benefits Card (No emoji) */}
        <div className="pwa-benefit-card">
          <div className="pwa-benefit-header">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="pwa-benefit-title">ข้อดีของการติดตั้งแอป</span>
          </div>
          <div className="pwa-benefit-desc">
            เปิดใช้งานได้ทันทีแบบเต็มจอ (Fullscreen) ไม่ต้องเปิดเบราว์เซอร์ และรับส่งไฟล์ในเครือข่ายได้อย่างรวดเร็ว
          </div>
        </div>

        {/* Action Button - Solid Modern Pill */}
        <div className="pwa-modal-actions">
          <button
            type="button"
            className="pwa-modal-understood-btn"
            onClick={onClose}
          >
            <Check className="w-4 h-4" />
            <span>เข้าใจแล้ว</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .pwa-modal-backdrop {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-pwa-install {
          position: relative;
          width: 100%;
          max-width: 440px;
          border-radius: 24px;
          padding: 24px 22px;
          background: var(--bg-card, #ffffff);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.12);
        }

        :global([data-theme="dark"]) .modal-pwa-install {
          background: var(--bg-card, #1e293b);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.25);
        }

        .pwa-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background: rgba(148, 163, 184, 0.12);
          border: none;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .pwa-modal-close:hover {
          background: rgba(148, 163, 184, 0.22);
          color: var(--text-primary);
        }

        .pwa-hero-plaque {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }

        .pwa-hero-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(14, 165, 233, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.1);
        }

        .pwa-modal-title {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-primary);
          text-align: center;
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }

        .pwa-modal-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 16px;
        }

        .pwa-tabs-segment {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 14px;
          background: rgba(148, 163, 184, 0.1);
          margin-bottom: 18px;
        }

        .pwa-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
        }

        .pwa-tab-btn.active {
          background: var(--bg-card, #ffffff);
          color: var(--text-primary, #1e293b);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        :global([data-theme="dark"]) .pwa-tab-btn.active {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .pwa-steps-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 18px;
          text-align: left;
        }

        .pwa-step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .pwa-step-badge {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
        }

        .pwa-step-content {
          flex: 1;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.55;
          padding-top: 2px;
        }

        .pwa-step-content strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .pwa-inline-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          margin: 0 4px;
          color: var(--brand-primary, #6366f1);
        }

        .pwa-benefit-card {
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(99, 102, 241, 0.07);
          border: 1px solid rgba(99, 102, 241, 0.18);
          margin-bottom: 20px;
          text-align: left;
        }

        :global([data-theme="dark"]) .pwa-benefit-card {
          background: rgba(99, 102, 241, 0.14);
          border-color: rgba(99, 102, 241, 0.28);
        }

        .pwa-benefit-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .pwa-benefit-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .pwa-benefit-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .pwa-modal-actions {
          width: 100%;
        }

        .pwa-modal-understood-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .pwa-modal-understood-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
        }

        .pwa-modal-understood-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}

export { IOSInstallModal as PWAInstallModal };
