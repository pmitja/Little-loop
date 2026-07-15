import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join a LittleLoop family',
  description: 'Open a caregiver invitation in the LittleLoop app.',
};

interface InvitePageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = rawToken?.trim() ?? '';
  const deepLink = token
    ? `littleloop://accept-invite?token=${encodeURIComponent(token)}`
    : null;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.art}>👨‍👩‍👧</div>
        <h1 style={styles.title}>Join this LittleLoop family</h1>
        <p style={styles.copy}>
          Sign in to LittleLoop, then accept the invitation to help manage profiles, time limits,
          and approved videos.
        </p>
        {deepLink ? (
          <a href={deepLink} style={styles.button}>Open LittleLoop</a>
        ) : (
          <p style={styles.error}>This invitation link is incomplete.</p>
        )}
        <p style={styles.note}>
          LittleLoop must already be installed. During local testing, keep the API and Expo
          development build running on the Mac.
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    margin: 0,
    padding: '32px 20px',
    display: 'grid',
    placeItems: 'center',
    background: '#F4F1EB',
    color: '#2A3B5C',
    fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    boxSizing: 'border-box',
    padding: '34px 28px',
    borderRadius: 28,
    background: '#FFFFFF',
    boxShadow: '0 16px 50px rgba(42,59,92,.12)',
    textAlign: 'center',
  },
  art: { fontSize: 58, lineHeight: 1, marginBottom: 18 },
  title: { margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 900 },
  copy: { margin: '14px 0 24px', color: '#6F6675', fontSize: 16, lineHeight: 1.55 },
  button: {
    display: 'block',
    padding: '16px 22px',
    borderRadius: 999,
    background: '#4EC3E0',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 800,
    textDecoration: 'none',
    boxShadow: '0 8px 20px rgba(78,195,224,.32)',
  },
  error: { color: '#C94735', fontWeight: 700 },
  note: { margin: '20px 0 0', color: '#6F6675', fontSize: 13, lineHeight: 1.5 },
};
