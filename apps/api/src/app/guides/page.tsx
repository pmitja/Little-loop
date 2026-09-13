import type { Metadata } from 'next';
import { GuideIndex } from '@/components/guides/GuideIndex';
import { SITE_URL } from '@/content/guides';

export const metadata: Metadata = {
  title: 'Parent guides for safer, calmer video time',
  description: 'Practical guides to YouTube Kids settings, screen-time controls, approved videos and alternatives to open recommendation feeds.',
  alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: {
    title: 'Parent guides for safer, calmer video time',
    description: 'Clear answers about autoplay, approved content, device controls and YouTube Kids alternatives.',
    url: `${SITE_URL}/guides`,
    type: 'website',
    siteName: 'LittleLoop',
  },
};

export default function GuidesPage() {
  return <GuideIndex />;
}
