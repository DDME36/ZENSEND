import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai, Mitr } from 'next/font/google';
import './globals.css';
import './brand.css';
import './workspace.css';
import './usability.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-body',
  display: 'swap',
});

const mitr = Mitr({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-display',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zensend.zentyr.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ZenSend — Send Files Directly',
  description: 'ส่งไฟล์ข้ามอุปกรณ์ทันที ไม่ต้องลงแอป ไม่ต้องล็อกอิน ปลอดภัยด้วย P2P Direct Stream • Zend files directly between devices with zero storage & zero friction.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png?v=z-riders-1', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png?v=z-riders-1', type: 'image/png', sizes: '16x16' },
      { url: '/favicon.ico?v=z-riders-1' },
    ],
    apple: '/apple-icon.png?v=z-riders-1',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZenSend',
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    alternateLocale: 'en_US',
    url: siteUrl,
    siteName: 'ZenSend by Zentyr',
    title: 'ZenSend — ส่งไฟล์เร็ว ปลอดภัย ไร้ตัวกลาง (Zend by Zentyr)',
    description: 'แชร์ไฟล์ วิดีโอ รูปภาพ ข้ามอุปกรณ์แบบเรียลไทม์ผ่าน P2P • ไม่ต้องลงแอป ไม่ผ่านเซิร์ฟเวอร์ ปลอดภัย 100%',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'ZenSend — Direct P2P File Transfer',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZenSend — ส่งไฟล์เร็ว ปลอดภัย ไร้ตัวกลาง (Zend by Zentyr)',
    description: 'แชร์ไฟล์ วิดีโอ รูปภาพ ข้ามอุปกรณ์แบบเรียลไทม์ผ่าน P2P • ไม่ต้องลงแอป ไม่ผ่านเซิร์ฟเวอร์ ปลอดภัย 100%',
    images: [`${siteUrl}/og-image.png`],
  },
  keywords: [
    'ZenSend',
    'Zend',
    'Zentyr',
    'file transfer',
    'P2P',
    'WebRTC',
    'ส่งไฟล์',
    'แชร์ไฟล์',
    'AirDrop alternative',
    'Snapdrop alternative',
    'direct transfer',
    'secure transfer',
  ],
  authors: [{ name: 'Zentyr' }],
  creator: 'Zentyr',
  publisher: 'Zentyr',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inline script to prevent FOUC (Flash of Unstyled Content)
  // This runs before React hydration, so theme and performance modes are applied immediately
  const initScript = `
    (function() {
      try {
        var theme = localStorage.getItem('zensend_theme') || localStorage.getItem('purrdrop_theme');
        var resolved = theme;
        if (!theme || theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', resolved);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', resolved === 'dark' ? '#090d16' : '#ffffff');

        // Early Eco Mode detection to save mobile battery & prevent overheating
        var eco = localStorage.getItem('zensend_eco_mode');
        var isEco = false;
        if (eco === 'on') {
          isEco = true;
        } else if (eco === 'off') {
          isEco = false;
          var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          isEco = !!reducedMotion;
        }
        document.documentElement.setAttribute('data-eco-mode', isEco ? 'true' : 'false');
      } catch (e) {}
    })();
  `;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ZenSend',
    url: siteUrl,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires WebRTC support (Chrome, Safari, Firefox, Edge, Brave)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'ส่งไฟล์ข้ามอุปกรณ์ทันที ไม่ต้องลงแอป ไม่ต้องล็อกอิน ปลอดภัยด้วย P2P Direct Stream by Zentyr',
    author: {
      '@type': 'Organization',
      name: 'Zentyr',
    },
  };

  return (
    <html lang="th" suppressHydrationWarning className={`${ibmPlexSansThai.variable} ${mitr.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=z-horse-1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body><ErrorBoundary>{children}</ErrorBoundary></body>
    </html>
  );
}
