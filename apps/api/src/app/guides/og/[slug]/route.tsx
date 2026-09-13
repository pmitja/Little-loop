import { ImageResponse } from 'next/og';
import { GUIDES } from '@/content/guides';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((item) => item.slug === slug);
  if (!guide) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', background: '#faf7ef', color: '#213653', padding: '58px 68px', borderBottom: '18px solid #e96b50' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 27 }}>
        <span style={{ fontWeight: 700 }}>LittleLoop</span><span>Parent guides</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <span style={{ fontSize: 22, color: '#0c6681' }}>{guide.cluster}</span>
        <div style={{ fontSize: 64, lineHeight: 1.08, letterSpacing: '-2px', fontWeight: 700 }}>{guide.title}</div>
      </div>
      <span style={{ fontSize: 23 }}>Practical answers. Honest limits.</span>
    </div>,
    { width: 1200, height: 630 },
  );
}
