'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('ZenSend Application Error:', error);
  }, [error]);

  return (
    <div className="zen-error-page">
      <div className="zen-error-container">
        {/* Pegasus Brand Icon with Ambient Aura */}
        <div className="zen-error-icon-wrap">
          <div className="zen-error-glow" aria-hidden="true" />
          <Image
            src="/zensend-z-horse.png"
            alt="ZenSend"
            width={68}
            height={68}
            className="zen-error-horse"
            priority
          />
        </div>

        <h1 className="zen-error-title">ขออภัย เกิดข้อผิดพลาดชั่วคราว</h1>
        <p className="zen-error-message">
          ระบบ ZenSend พบปัญหาในการเชื่อมต่อหรือประมวลผล กรุณาลองใหม่อีกครั้งเพื่อกลับสู่ความเสถียร
        </p>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <details className="zen-error-details">
            <summary>รายละเอียดข้อผิดพลาดทางเทคนิค (Dev Mode)</summary>
            <pre>{error.message}</pre>
          </details>
        )}

        <div className="zen-error-actions">
          <button
            onClick={reset}
            className="zen-error-btn zen-btn-primary"
            type="button"
          >
            ลองใหม่อีกครั้ง
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="zen-error-btn zen-btn-secondary"
            type="button"
          >
            กลับหน้าหลัก
          </button>
        </div>

        <p className="zen-error-hint">
          💡 หากปัญหายังไม่หาย ลองรีเฟรชหน้าเว็บ หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
        </p>
      </div>

      <style jsx>{`
        .zen-error-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(
            180deg,
            var(--bg-cream, #f8fafc) 0%,
            var(--bg-gradient-end, #f1f5f9) 100%
          );
          font-family: var(--font-body), "IBM Plex Sans Thai", sans-serif;
          box-sizing: border-box;
        }

        :global([data-theme="dark"]) .zen-error-page {
          background: linear-gradient(180deg, #090d16 0%, #030712 100%);
        }

        .zen-error-container {
          max-width: 480px;
          width: 100%;
          text-align: center;
          background: var(--bg-card, rgba(255, 255, 255, 0.85));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.6));
          border-radius: 28px;
          padding: 44px 32px 36px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
          animation: zenErrorFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        :global([data-theme="dark"]) .zen-error-container {
          background: rgba(15, 23, 42, 0.75);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
        }

        @keyframes zenErrorFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .zen-error-icon-wrap {
          position: relative;
          width: 84px;
          height: 84px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zen-error-glow {
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(245, 158, 11, 0.2) 55%, transparent 70%);
          filter: blur(14px);
          animation: zenGlowPulse 2.8s ease-in-out infinite alternate;
        }

        @keyframes zenGlowPulse {
          0% { transform: scale(0.95); opacity: 0.55; }
          100% { transform: scale(1.15); opacity: 0.9; }
        }

        .zen-error-horse {
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 6px 18px rgba(14, 165, 233, 0.35));
          animation: zenHorseRest 3s ease-in-out infinite alternate;
        }

        @keyframes zenHorseRest {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-5px) scale(1.02); }
        }

        .zen-error-title {
          font-family: var(--font-display), "Mitr", sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
          line-height: 1.35;
        }

        :global([data-theme="dark"]) .zen-error-title {
          color: #f8fafc;
        }

        .zen-error-message {
          font-size: 14.5px;
          color: var(--text-secondary, #475569);
          margin: 0 0 24px;
          line-height: 1.6;
        }

        :global([data-theme="dark"]) .zen-error-message {
          color: #94a3b8;
        }

        .zen-error-details {
          text-align: left;
          margin: 0 0 24px;
          padding: 14px 16px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 14px;
        }

        .zen-error-details summary {
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #ef4444;
          user-select: none;
        }

        .zen-error-details pre {
          margin: 10px 0 0;
          padding: 10px;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 8px;
          overflow-x: auto;
          font-size: 11.5px;
          font-family: monospace;
          color: var(--text-primary, #1e293b);
        }

        :global([data-theme="dark"]) .zen-error-details pre {
          background: rgba(0, 0, 0, 0.35);
          color: #fca5a5;
        }

        .zen-error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .zen-error-btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 16px;
          font-family: var(--font-body), "IBM Plex Sans Thai", sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
        }

        .zen-btn-primary {
          background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);
        }

        .zen-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(14, 165, 233, 0.45);
        }

        .zen-btn-primary:active {
          transform: scale(0.98);
        }

        .zen-btn-secondary {
          background: var(--bg-hover, rgba(0, 0, 0, 0.05));
          color: var(--text-primary, #1e293b);
          border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
        }

        :global([data-theme="dark"]) .zen-btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          color: #e2e8f0;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .zen-btn-secondary:hover {
          background: rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        :global([data-theme="dark"]) .zen-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .zen-error-hint {
          font-size: 12.5px;
          color: var(--text-muted, #94a3b8);
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 480px) {
          .zen-error-container {
            padding: 32px 20px 28px;
            border-radius: 24px;
          }

          .zen-error-actions {
            flex-direction: column;
          }

          .zen-error-title {
            font-size: 21px;
          }
        }
      `}</style>
    </div>
  );
}
