import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://littleloopapp.com'),
  title: {
    default: 'LittleLoop — You choose what they watch',
    template: '%s — LittleLoop',
  },
  description:
    'A parent-controlled video player where children can watch only the videos you choose, for exactly as long as you allow.',
  openGraph: {
    title: 'LittleLoop — You choose what they watch',
    description:
      'Share a video to LittleLoop, choose a child, and build a calm, parent-approved loop.',
    type: 'website',
    url: '/',
    siteName: 'LittleLoop',
    images: [
      {
        url: '/marketing/little-loop-opengraph.png',
        width: 1536,
        height: 1024,
        alt: 'LittleLoop — parent-approved videos, screen-time limits, PIN protection, and caregiver sharing.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LittleLoop — You choose what they watch',
    description:
      'Share a video to LittleLoop, choose a child, and build a calm, parent-approved loop.',
    images: ['/marketing/little-loop-opengraph.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
