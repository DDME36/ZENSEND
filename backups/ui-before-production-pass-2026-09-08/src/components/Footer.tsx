'use client';



export function Footer({ hasPeers }: { hasPeers: boolean }) {
  return (
    <footer className={`app-footer ${hasPeers ? 'has-peers' : 'no-peers'}`} role="contentinfo">
      <div className="footer-credit">
        <span className="footer-brand">ZenSend</span>
        <span className="footer-dot" aria-hidden="true">•</span>
        <span className="footer-by">Powered by Zentyr</span>
      </div>
    </footer>
  );
}
