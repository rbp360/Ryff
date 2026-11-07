import type { Metadata } from 'next';
import { PrestigeNav } from '@/components/prestige/PrestigeNav';
import Link from 'next/link';
import { PRESTIGE_CARS } from '@/lib/prestige/car-data';

export const metadata: Metadata = {
  title: 'AURA | Prestige Automotive Sanctuary & Digital Vehicle Passport',
  description:
    '360° telemetry walkarounds, DME over-rev provenance, carbon-ceramic rotor wear logs, and circuit engineering dossiers for high-value collector vehicles.',
};

export default function PrestigeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const totalValuation = PRESTIGE_CARS.reduce(
    (sum, car) => sum + car.estimatedValueGbp,
    0
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#050608',
        color: '#F3F4F6',
        fontFamily:
          "var(--font-montserrat), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundImage:
          'radial-gradient(ellipse 85% 45% at 50% -15%, rgba(212, 175, 55, 0.09), transparent 70%), radial-gradient(ellipse 55% 40% at 95% 50%, rgba(30, 41, 59, 0.22), transparent 70%)',
        paddingBottom: '96px',
      }}
    >
      {/* Top Vault Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(5, 6, 8, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '1240px',
            margin: '0 auto',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/prestige"
              style={{ display: 'flex', alignItems: 'center', gap: '11px' }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background:
                    'linear-gradient(135deg, #F5E6B8 0%, #D4AF37 50%, #9A7418 100%)',
                  color: '#050608',
                  fontWeight: 900,
                  fontSize: '15px',
                  letterSpacing: '0.05em',
                  boxShadow: '0 0 18px rgba(212, 175, 55, 0.35)',
                }}
              >
                A
              </span>
              <div>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.05,
                  }}
                >
                  AURA
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#8A92A0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    fontWeight: 600,
                  }}
                >
                  Concours Provenance Vault
                </div>
              </div>
            </Link>

            <span
              style={{
                fontSize: '10px',
                padding: '3px 9px',
                borderRadius: '20px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ADE80',
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontFamily: 'monospace',
              }}
            >
              ● VAULT CLIMATE: 18.5°C / 46% RH
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  color: '#8A92A0',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                }}
              >
                Verified Stable Value
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: '#D4AF37',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                }}
              >
                £{totalValuation.toLocaleString()}
              </div>
            </div>

            <Link
              href="/"
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <span>←</span> Guitar Mode
            </Link>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '28px 20px 60px',
        }}
      >
        {children}
      </main>

      <PrestigeNav />
    </div>
  );
}
