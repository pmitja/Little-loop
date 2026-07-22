import type { ReactNode } from 'react';

const CSS = `
  .legal-main {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fafafa;
    color: #1a1a1a;
    min-height: 100vh;
    padding: 48px 20px 80px;
  }
  .legal-container { max-width: 680px; margin: 0 auto; }
  .legal-h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px; }
  .legal-updated { font-size: 13px; color: #6b6b6b; margin: 0 0 32px; }
  .legal-section { margin-top: 28px; }
  .legal-h2 { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
  .legal-body { font-size: 15px; line-height: 1.6; color: #333; }
  .legal-body p { margin: 0 0 12px; }
  .legal-body ul { margin: 0 0 12px; padding-left: 20px; }
  .legal-body li { margin-bottom: 6px; }
  .legal-body a { color: #2a5db0; }
  .legal-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 8px 0 12px; }
  .legal-table th, .legal-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e2e2; }
  .legal-table th { color: #6b6b6b; font-weight: 600; font-size: 12px; text-transform: uppercase; }
  .legal-footer { margin-top: 48px; font-size: 13px; color: #6b6b6b; }
  @media (prefers-color-scheme: dark) {
    .legal-main { background: #121212; color: #ececec; }
    .legal-updated, .legal-footer { color: #9a9a9a; }
    .legal-body { color: #cfcfcf; }
    .legal-body a { color: #7fb0ff; }
    .legal-table th, .legal-table td { border-bottom-color: #2a2a2a; }
    .legal-table th { color: #9a9a9a; }
  }
`;

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-main">
      <style>{CSS}</style>
      <div className="legal-container">
        <h1 className="legal-h1">{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        {children}
        <p className="legal-footer">LittleLoop &middot; support@littleloopapp.com</p>
      </div>
    </main>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="legal-section">
      <h2 className="legal-h2">{heading}</h2>
      <div className="legal-body">{children}</div>
    </section>
  );
}
