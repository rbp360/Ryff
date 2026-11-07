import Link from 'next/link';
import { PRESTIGE_CARS } from '@/lib/prestige/car-data';

export default function PrestigeGaragePage() {
  const totalValuation = PRESTIGE_CARS.reduce((acc, car) => acc + car.estimatedValueGbp, 0);
  const totalBhp = PRESTIGE_CARS.reduce((acc, car) => acc + car.powerBhp, 0);
  const urgentRemindersCount = PRESTIGE_CARS.reduce(
    (acc, car) => acc + car.reminders.filter(r => r.urgent).length,
    0
  );

  return (
    <div>
      {/* Editorial Hero Header */}
      <div style={{
        marginBottom: '36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#D4AF37',
          fontWeight: 700
        }}>
          White-Label Vertical Demo &bull; Provenance & Fleet Intelligence
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '34px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: 0,
              background: 'linear-gradient(180deg, #FFFFFF 20%, #B8BCC6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'none'
            }}>
              Private Supercar Stable
            </h1>
            <p style={{
              margin: '6px 0 0',
              fontSize: '14px',
              color: '#9CA3AF',
              maxWidth: '650px',
              lineHeight: 1.5
            }}>
              Individual vehicle passports tracking OEM service provenance, verified aftermarket modifications, telemetry track setups, tyre wear states, and scheduled maintenance reminders.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(18, 20, 24, 0.8) 0%, rgba(10, 12, 15, 0.9) 100%)',
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Total Fleet Value
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>
                £{totalValuation.toLocaleString()}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(145deg, rgba(18, 20, 24, 0.8) 0%, rgba(10, 12, 15, 0.9) 100%)',
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Combined Output
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#F3F4F6' }}>
                {totalBhp.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF' }}>BHP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Alert Pill (if any urgent) */}
      {urgentRemindersCount > 0 && (
        <div style={{
          marginBottom: '28px',
          padding: '14px 20px',
          borderRadius: '10px',
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(20, 10, 10, 0.4) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              fontWeight: 800,
              fontSize: '14px'
            }}>!</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FCA5A5' }}>
                {urgentRemindersCount} Maintenance Attention Action Required
              </div>
              <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                Porsche 992 GT3 RS high-temp brake fluid flush due & McLaren 765LT Trofeo R tyre inspection pending.
              </div>
            </div>
          </div>
          <Link
            href="/prestige/reminders"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#FCA5A5',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              whiteSpace: 'nowrap'
            }}
          >
            Review Reminders &rarr;
          </Link>
        </div>
      )}

      {/* Grid of Prestige Cars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '24px'
      }}>
        {PRESTIGE_CARS.map((car) => {
          return (
            <div
              key={car.id}
              style={{
                borderRadius: '14px',
                backgroundColor: 'rgba(15, 17, 21, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
              {/* Top Image Container */}
              <div style={{
                position: 'relative',
                height: '210px',
                width: '100%',
                overflow: 'hidden',
                backgroundColor: '#111317'
              }}>
                <img
                  src={car.heroImage}
                  alt={`${car.make} ${car.model}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.05) brightness(0.95)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15, 17, 21, 0.95) 100%)'
                }} />

                {/* Make & License Plate Tag */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: '#D4AF37',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    {car.make}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FDE047',
                    color: '#000',
                    fontFamily: 'monospace'
                  }}>
                    {car.licensePlate}
                  </span>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '16px',
                  right: '16px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: '#D4AF37',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase'
                  }}>
                    {car.year} &bull; {car.subModel || 'Series Production'}
                  </div>
                  <h3 style={{
                    margin: '2px 0 0',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1.2
                  }}>
                    {car.model}
                  </h3>
                </div>
              </div>

              {/* Card Body & Specs */}
              <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Power</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>{car.powerBhp} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>BHP</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>0-60 MPH</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>{car.keyStats.zeroToSixtyMph}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mileage</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6', fontFamily: 'monospace' }}>{car.currentMileage.toLocaleString()} mi</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>
                  {car.tagline}
                </div>

                {/* Passport Highlights preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}>
                    <span>Service Passport:</span>
                    <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{car.services.length} Verified Entries</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}>
                    <span>Modifications Logged:</span>
                    <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{car.modifications.length} Registered</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}>
                    <span>Track Setups:</span>
                    <span style={{ color: '#D4AF37', fontWeight: 600 }}>{car.trackSetups.length} Circuits Profiled</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Link
                    href={`/prestige/${car.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.16) 0%, rgba(212, 175, 55, 0.08) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      color: '#F5E6B8',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Open Vehicle Passport &rarr;
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

