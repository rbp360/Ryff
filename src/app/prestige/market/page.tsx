import { PRESTIGE_CARS } from '@/lib/prestige/car-data';

export default function PrestigeMarketPage() {
  const totalOriginal = PRESTIGE_CARS.reduce((sum, c) => sum + c.purchasePriceGbp, 0);
  const totalCurrent = PRESTIGE_CARS.reduce((sum, c) => sum + c.estimatedValueGbp, 0);
  const delta = totalCurrent - totalOriginal;
  const deltaPercent = ((delta / totalOriginal) * 100).toFixed(1);

  return (
    <div>
      <div style={{
        marginBottom: '28px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '20px'
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#D4AF37',
          fontWeight: 700
        }}>
          Automotive Investment & Provenance Index
        </div>
        <h1 style={{
          fontSize: '30px',
          fontWeight: 800,
          margin: '6px 0 0',
          background: 'linear-gradient(180deg, #FFFFFF 20%, #B8BCC6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textTransform: 'none'
        }}>
          Stable Valuation & Secondary Market Health
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#9CA3AF' }}>
          Real-time collector market appraisal benchmarking auction results (RM Sotheby’s, Collecting Cars, Bonhams) with zero newsfeed noise or Reverb guitar scraper overhead.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: 'rgba(17, 20, 24, 0.85)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Current Fleet Valuation
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#D4AF37', fontFamily: 'monospace', marginTop: '4px' }}>
            £{totalCurrent.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#22C55E', fontWeight: 600, marginTop: '4px' }}>
            +{delta >= 0 ? `£${delta.toLocaleString()}` : `-£${Math.abs(delta).toLocaleString()}`} ({deltaPercent}% overall appreciation)
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(17, 20, 24, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total Capital Inflow (Acquisition)
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#F3F4F6', fontFamily: 'monospace', marginTop: '4px' }}>
            £{totalOriginal.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Excluding registered bespoke performance modifications
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(17, 20, 24, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Provenance Quality Rating
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#22C55E', fontFamily: 'monospace', marginTop: '4px' }}>
            99.2%
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Full main-dealer service logs + zero DME over-rev events
          </div>
        </div>
      </div>

      {/* Asset Valuation Table */}
      <div style={{
        backgroundColor: 'rgba(17, 20, 24, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '14px',
          fontWeight: 700,
          color: '#D4AF37',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          Portfolio Breakdown by Asset
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PRESTIGE_CARS.map(car => {
            const appreciation = car.estimatedValueGbp - car.purchasePriceGbp;
            return (
              <div
                key={car.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 24px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                    {car.year} {car.make} {car.model}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                    VIN: {car.vin} &bull; Plate: {car.licensePlate}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>
                    £{car.estimatedValueGbp.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: appreciation >= 0 ? '#22C55E' : '#EF4444',
                    fontWeight: 600
                  }}>
                    {appreciation >= 0 ? `+£${appreciation.toLocaleString()}` : `-£${Math.abs(appreciation).toLocaleString()}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

