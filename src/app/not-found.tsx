'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="zen-not-found-page">
      <div className="zen-not-found-card">
        {/* Pegasus Icon with Ambient Glow */}
        <div className="zen-not-found-icon-wrap">
          <div className="zen-not-found-glow" aria-hidden="true" />
          <Image
            src="/zensend-z-horse.png"
            alt="ZenSend Pegasus"
            width={72}
            height={72}
            className="zen-not-found-horse"
            priority
          />
        </div>

        <div className="zen-not-found-code">404</div>
        <h1 className="zen-not-found-title">ไม่พบหน้าที่คุณต้องการ</h1>
        <p className="zen-not-found-desc">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบ หรือที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="zen-not-found-actions">
          <Link href="/" className="zen-btn-primary">
            กลับหน้าหลัก ZenSend
          </Link>
        </div>
      </div>

      <style jsx>{`
        .zen-not-found-page {
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

        :global([data-theme="dark"]) .zen-not-found-page {
          background: radial-gradient(circle at 50% 20%, rgba(14, 165, 233, 0.12) 0%, transparent 60%),
                      linear-gradient(180deg, #090d16 0%, #030712 100%);
        }

        .zen-not-found-card {
          max-width: 440px;
          width: 100%;
          text-align: center;
          background: var(--bg-card, rgba(255, 255, 255, 0.85));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.6));
          border-radius: 28px;
          padding: 44px 32px 36px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
          animation: cardAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        :global([data-theme="dark"]) .zen-not-found-card {
          background: rgba(15, 23, 42, 0.85);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        }

        @keyframes cardAppear {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .zen-not-found-icon-wrap {
          position: relative;
          width: 88px;
          height: 88px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zen-not-found-glow {
          position: absolute;
          inset: -14px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, rgba(129, 140, 248, 0.2) 50%, transparent 70%);
          filter: blur(14px);
          animation: glowPulse 2.6s ease-in-out infinite alternate;
        }

        @keyframes glowPulse {
          0% { transform: scale(0.92); opacity: 0.5; }
          100% { transform: scale(1.15); opacity: 0.95; }
        }

        .zen-not-found-horse {
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 8px 20px rgba(14, 165, 233, 0.4));
          animation: horseHover 3s ease-in-out infinite alternate;
        }

        @keyframes horseHover {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }

        .zen-not-found-code {
          font-family: var(--font-display), "Mitr", sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #0ea5e9;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .zen-not-found-title {
          font-family: var(--font-display), "Mitr", sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
          line-height: 1.35;
        }

        :global([data-theme="dark"]) .zen-not-found-title {
          color: #f8fafc;
        }

        .zen-not-found-desc {
          font-size: 14px;
          color: var(--text-secondary, #475569);
          margin: 0 0 28px;
          line-height: 1.6;
        }

        :global([data-theme="dark"]) .zen-not-found-desc {
          color: #94a3b8;
        }

        .zen-not-found-actions {
          display: flex;
          justify-content: center;
        }

        :global(.zen-btn-primary) {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 13px 28px !important;
          border-radius: 16px !important;
          font-family: var(--font-body), "IBM Plex Sans Thai", sans-serif !important;
          font-size: 14.5px !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          text-decoration: none !important;
          background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%) !important;
          box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        :global(.zen-btn-primary:hover) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 22px rgba(14, 165, 233, 0.5) !important;
        }

        :global(.zen-btn-primary:active) {
          transform: scale(0.98) !important;
        }
      `}</style>
    </div>
  );
}
