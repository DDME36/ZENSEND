'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical error
    console.error('Critical ZenSend Application Error:', error);
  }, [error]);

  return (
    <html lang="th">
      <head>
        <title>ZenSend - เกิดข้อผิดพลาดร้ายแรง</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <div className="zen-global-error-page">
          <div className="zen-global-error-card">
            {/* Ambient Pegasus Brand Aura */}
            <div className="zen-error-icon-wrap">
              <div className="zen-error-glow" aria-hidden="true" />
              <Image
                src="/zensend/zensend-z-horse.png"
                alt="ZenSend Pegasus"
                width={72}
                height={72}
                className="zen-error-horse"
                priority
                unoptimized
              />
            </div>

            <h1 className="zen-error-title">เกิดข้อผิดพลาดร้ายแรงของระบบ</h1>
            <p className="zen-error-desc">
              ระบบหลักของ ZenSend พบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง หรือโหลดหน้าเว็บใหม่เพื่อกู้คืนการทำงาน
            </p>

            {process.env.NODE_ENV === 'development' && error?.message && (
              <div className="zen-error-dev">
                <code>{error.message}</code>
              </div>
            )}

            <div className="zen-error-actions">
              <button
                onClick={reset}
                className="zen-btn-primary"
                type="button"
              >
                ลองใหม่อีกครั้ง
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="zen-btn-secondary"
                type="button"
              >
                โหลดหน้าหลักใหม่
              </button>
            </div>

            <p className="zen-error-tip">
              💡 ลองล้างแคชของเบราว์เซอร์ หรือเปิดในโหมดไม่ระบุตัวตน (Incognito)
            </p>
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Mitr:wght@400;500;600;700&display=swap');
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'IBM Plex Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #090d16;
            color: #f8fafc;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            -webkit-font-smoothing: antialiased;
          }
          .zen-global-error-page {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: radial-gradient(circle at 50% 20%, rgba(14, 165, 233, 0.12) 0%, transparent 60%),
                        linear-gradient(180deg, #090d16 0%, #030712 100%);
          }
          .zen-global-error-card {
            max-width: 480px;
            width: 100%;
            text-align: center;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 28px;
            padding: 44px 32px 36px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            animation: errorCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes errorCardIn {
            from { opacity: 0; transform: scale(0.96) translateY(12px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .zen-error-icon-wrap {
            position: relative;
            width: 88px;
            height: 88px;
            margin: 0 auto 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .zen-error-glow {
            position: absolute;
            inset: -14px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, transparent 70%);
            filter: blur(14px);
            animation: glowPulse 2.8s ease-in-out infinite alternate;
          }
          @keyframes glowPulse {
            0% { transform: scale(0.92); opacity: 0.5; }
            100% { transform: scale(1.15); opacity: 0.95; }
          }
          .zen-error-horse {
            position: relative;
            z-index: 2;
            filter: drop-shadow(0 8px 20px rgba(14, 165, 233, 0.4));
            animation: horseFloat 3s ease-in-out infinite alternate;
          }
          @keyframes horseFloat {
            0% { transform: translateY(0); }
            100% { transform: translateY(-6px); }
          }
          .zen-error-title {
            font-family: 'Mitr', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 12px;
            letter-spacing: -0.01em;
            line-height: 1.35;
          }
          .zen-error-desc {
            font-size: 14.5px;
            color: #94a3b8;
            margin-bottom: 24px;
            line-height: 1.6;
          }
          .zen-error-dev {
            margin-bottom: 20px;
            padding: 12px;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            text-align: left;
            overflow-x: auto;
          }
          .zen-error-dev code {
            font-size: 12px;
            color: #fca5a5;
            font-family: monospace;
          }
          .zen-error-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-bottom: 20px;
          }
          .zen-btn-primary, .zen-btn-secondary {
            flex: 1;
            padding: 13px 20px;
            border-radius: 16px;
            font-family: 'IBM Plex Sans Thai', sans-serif;
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
            box-shadow: 0 6px 22px rgba(14, 165, 233, 0.5);
          }
          .zen-btn-primary:active {
            transform: scale(0.98);
          }
          .zen-btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.12);
          }
          .zen-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.14);
            transform: translateY(-2px);
          }
          .zen-btn-secondary:active {
            transform: scale(0.98);
          }
          .zen-error-tip {
            font-size: 12.5px;
            color: #64748b;
            line-height: 1.5;
          }
          @media (max-width: 480px) {
            .zen-global-error-card {
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
      </body>
    </html>
  );
}
