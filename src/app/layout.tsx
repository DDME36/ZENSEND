import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai, Mitr } from 'next/font/google';
import './globals.css';
import './brand.css';
import './workspace.css';
import './usability.css';
import './production-polish.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { siteMetadata, siteUrl } from '@/lib/siteMetadata';

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

export const metadata: Metadata = siteMetadata;

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
    description: 'Send files across devices instantly. No app install, no login. Secure P2P Direct Stream by Zentyr',
    author: {
      '@type': 'Organization',
      name: 'Zentyr',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${ibmPlexSansThai.variable} ${mitr.variable}`}>
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
