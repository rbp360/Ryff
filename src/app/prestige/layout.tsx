import type { Metadata } from 'next';
import { PrestigeNav } from '@/components/prestige/PrestigeNav';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AURA | Prestige Automotive Passport & Collection Ledger',
  description: 'Ultra-luxury automotive provenance, track setup profiles, bespoke service passports and asset valuation ledger.',
};

export default function PrestigeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#07080A',
      color: '#F3F4F6',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 175, 55, 0.08), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 60%, rgba(30, 41, 59, 0.3), transparent 70%)',
      paddingBottom: '96px',
    }}>
      {/* Top Header / Switcher Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(7, 8, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/prestige" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
              color: '#07080A',
              fontWeight: 900,
              fontSize: '15px',
              letterSpacing: '0.05em',
              boxShadow: '0 0 16px rgba(212, 175, 55, 0.4)'
            }}>
              A
            </span>
            <div>
              <div style={{
                fontSize: '17px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
                lineHeight: 1.1
              }}>
                AURA
              </div>
              <div style={{
                fontSize: '9px',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 600
              }}>
                Prestige Stable Vault
              </div>
            </div>
          </Link>
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#D4AF37',
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
            PRIVATE VAULT MOCKUP
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            textAlign: 'right',
            display: 'none',
            fontSize: '12px'
          }}>
            <div style={{ color: '#9CA3AF', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Valuation</div>
            <div style={{ fontWeight: 700, color: '#F3F4F6', fontFamily: 'monospace' }}>£1,005,000</div>
          </div>
          <Link
            href="/"
            style={{
              fontSize: '11px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#9CA3AF',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>←</span> Switch to Guitar Mode
          </Link>
        </div>
      </header>

      <main style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '32px 20px 60px'
      }}>
        {children}
      </main>

      <PrestigeNav />
    </div>
  );
}

