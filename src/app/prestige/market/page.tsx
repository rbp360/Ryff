import { PRESTIGE_CARS } from '@/lib/prestige/car-data';
import Link from 'next/link';

export default function PrestigeMarketPage() {
  const totalOriginal = PRESTIGE_CARS.reduce(
    (sum, c) => sum + c.purchasePriceGbp,
    0
  );
  const totalCurrent = PRESTIGE_CARS.reduce(
    (sum, c) => sum + c.estimatedValueGbp,
    0
  );
  const totalModsValue = PRESTIGE_CARS.reduce(
    (sum, c) => sum + c.modifications.reduce((mSum, m) => mSum + m.costGbp, 0),
    0
  );
  const delta = totalCurrent - totalOriginal;
  const deltaPercent = ((delta / totalOriginal) * 100).toFixed(1);

  return (
    <div>
      <div
        style={{
          marginBottom: '26px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: '#D4AF37',
            fontWeight: 800,
          }}
        >
          Automotive Investment &amp; Provenance Ledger
        </div>
        <h1
          style={{
            fontSize: '30px',
            fontWeight: 900,
            margin: '6px 0 0',
            background: 'linear-gradient(180deg, #FFFFFF 20%, #B8BCC6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'none',
          }}
        >
          Stable Valuation &amp; Concours Provenance Index
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
          Collector market appraisal benchmarking RM Sotheby’s, Collecting Cars, and
          dk Engineering private treaty results, backed by verified Stage 0 DME
          scans and crated OEM parts custody.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(14, 16, 21, 0.9)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Current Stable Valuation
          </div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: '#D4AF37',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}
          >
            £{totalCurrent.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#4ADE80',
              fontWeight: 700,
              marginTop: '4px',
            }}
          >
            +{delta >= 0 ? `£${delta.toLocaleString()}` : `-£${Math.abs(delta).toLocaleString()}`}{' '}
            ({deltaPercent}% net appreciation)
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(14, 16, 21, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Acquisition Capital Basis
          </div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: '#F3F4F6',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}
          >
            £{totalOriginal.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
            Plus £{totalModsValue.toLocaleString()} in documented OEM+ hardware
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(14, 16, 21, 0.9)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Concours Provenance Score
          </div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: '#4ADE80',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}
          >
            99.8%
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
            Matching-numbers, Stage 0 DME &amp; 100% factory paint microns
          </div>
        </div>
      </div>

      {/* Asset Breakdown Table */}
      <div
        style={{
          backgroundColor: 'rgba(14, 16, 21, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '12px',
            fontWeight: 800,
            color: '#D4AF37',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Individual Chassis Provenance &amp; Market Appraisal
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PRESTIGE_CARS.map((car) => {
            const appreciation = car.estimatedValueGbp - car.purchasePriceGbp;
            return (
              <div
                key={car.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Link
                      href={`/prestige/${car.id}`}
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                      }}
                    >
                      {car.year} {car.make} {car.model} ({car.subModel})
                    </Link>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#9CA3AF',
                      fontFamily: 'monospace',
                      marginTop: '3px',
                    }}
                  >
                    VIN: {car.vin} &bull; Engine: {car.engineNumber} &bull;{' '}
                    {car.consumables.dmeOverRev.status}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '17px',
                      fontWeight: 900,
                      color: '#D4AF37',
                      fontFamily: 'monospace',
                    }}
                  >
                    £{car.estimatedValueGbp.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: appreciation >= 0 ? '#4ADE80' : '#F87171',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    {appreciation >= 0
                      ? `+£${appreciation.toLocaleString()} vs Acquisition`
                      : `-£${Math.abs(appreciation).toLocaleString()} vs Acquisition`}
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
