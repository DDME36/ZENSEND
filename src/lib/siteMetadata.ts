import type { Metadata } from 'next';

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zentyr.online/zensend';
export const siteDescription = 'Send files and messages across devices instantly via P2P — no app install, no sign-up required.';

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ZenSend — Instant Cross-Device File Transfer',
  description: siteDescription,
  manifest: '/zensend/manifest.json',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/zensend/favicon-32.png?v=zen-mark-1', type: 'image/png', sizes: '32x32' },
      { url: '/zensend/favicon-16.png?v=zen-mark-1', type: 'image/png', sizes: '16x16' },
      { url: '/zensend/favicon.ico?v=zen-mark-1' },
    ],
    apple: '/zensend/apple-icon.png?v=zen-mark-1',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ZenSend' },
  openGraph: {
    type: 'website', locale: 'en_US', url: siteUrl,
    siteName: 'ZenSend by Zentyr', title: 'ZenSend — Instant Cross-Device File Transfer',
    description: siteDescription,
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'ZenSend — Send files and messages directly between devices', type: 'image/png' }],
  },
  twitter: { card: 'summary_large_image', title: 'ZenSend — Instant Cross-Device File Transfer', description: siteDescription, images: [`${siteUrl}/og-image.png`] },
  keywords: ['ZenSend', 'Zentyr', 'file transfer', 'P2P', 'WebRTC', 'share files', 'direct transfer', 'no upload', 'peer to peer'],
  authors: [{ name: 'Zentyr' }], creator: 'Zentyr', publisher: 'Zentyr',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};
