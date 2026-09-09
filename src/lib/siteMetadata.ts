import type { Metadata } from 'next';

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zensend.zentyr.com';
export const siteDescription = 'ส่งไฟล์และข้อความข้ามอุปกรณ์ได้ทันทีผ่านการเชื่อมต่อแบบ P2P ไม่ต้องติดตั้งแอปหรือสมัครสมาชิก';

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ZenSend — ส่งไฟล์ข้ามอุปกรณ์ได้ทันที',
  description: siteDescription,
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon-32.png?v=zen-mark-1', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png?v=zen-mark-1', type: 'image/png', sizes: '16x16' },
      { url: '/favicon.ico?v=zen-mark-1' },
    ],
    apple: '/apple-icon.png?v=zen-mark-1',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ZenSend' },
  openGraph: {
    type: 'website', locale: 'th_TH', alternateLocale: 'en_US', url: siteUrl,
    siteName: 'ZenSend by Zentyr', title: 'ZenSend — ส่งไฟล์ข้ามอุปกรณ์ได้ทันที',
    description: siteDescription,
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'ZenSend — ส่งไฟล์และข้อความโดยตรงระหว่างอุปกรณ์', type: 'image/png' }],
  },
  twitter: { card: 'summary_large_image', title: 'ZenSend — ส่งไฟล์ข้ามอุปกรณ์ได้ทันที', description: siteDescription, images: [`${siteUrl}/og-image.png`] },
  keywords: ['ZenSend', 'Zentyr', 'file transfer', 'P2P', 'WebRTC', 'ส่งไฟล์', 'แชร์ไฟล์', 'direct transfer'],
  authors: [{ name: 'Zentyr' }], creator: 'Zentyr', publisher: 'Zentyr',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};
