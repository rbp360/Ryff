import Link from 'next/link';
import { PRESTIGE_CARS } from '@/lib/prestige/car-data';

export default function PrestigeGaragePage() {
  const totalValuation = PRESTIGE_CARS.reduce(
    (acc, car) => acc + car.estimatedValueGbp,
    0
  );
  const totalServices = PRESTIGE_CARS.reduce(
    (acc, car) => acc + car.services.length,
    0
  );
  const totalMods = PRESTIGE_CARS.reduce(
    (acc, car) => acc + car.modifications.length,
    0
  );
  const urgentRemindersCount = PRESTIGE_CARS.reduce(
    (acc, car) => acc + car.reminders.filter((r) => r.urgent).length,
    0
  );

  return (
    <div>
      {/* Clean, Streamlined Sanctuary Header */}
      <div
        style={{
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: '#D4AF37',
              fontWeight: 800,
              marginBottom: '6px',
            }}
          >
            Digital Vehicle Passports &bull; Service &amp; Parts Provenance
          </div>
          <h1
            style={{
              fontSize: '34px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              margin: 0,
              background: 'linear-gradient(180deg, #FFFFFF 20%, #B8BCC6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'none',
            }}
          >
            Private Collector Vault
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '13px',
              color: '#9CA3AF',
              maxWidth: '580px',
            }}
          >
            Select a vehicle below to open its full maintenance passport, itemised
            parts ledger, and OEM+ hardware records.
          </p>
        </div>

        {/* Focused KPI Strip */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: 'rgba(14, 16, 21, 0.9)',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.25)',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Stable Valuation
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#D4AF37',
                fontFamily: 'monospace',
              }}
            >
              £{totalValuation.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(14, 16, 21, 0.9)',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Logged Service &amp; Parts
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6' }}>
              {totalServices} Stamps &bull; {totalMods} Mods
            </div>
          </div>
        </div>
      </div>

      {/* Compact Urgent Service Alert */}
      {urgentRemindersCount > 0 && (
        <div
          style={{
            marginBottom: '26px',
            padding: '12px 18px',
            borderRadius: '10px',
            background:
              'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(16, 10, 12, 0.6) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#F87171',
                fontWeight: 900,
                fontSize: '12px',
              }}
            >
              !
            </span>
            <div style={{ fontSize: '12px', color: '#E5E7EB' }}>
              <strong style={{ color: '#FCA5A5' }}>
                {urgentRemindersCount} Service Actions Due:
              </strong>{' '}
              992 GT3 RS Castrol React SRF brake fluid flush &amp; 765LT Pirelli
              Trofeo R MC2 tyre replacement.
            </div>
          </div>
          <Link
            href="/prestige/reminders"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#FCA5A5',
              padding: '5px 12px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            View Care Schedule &rarr;
          </Link>
        </div>
      )}

      {/* Sleek Collector Car Cards — Servicing & Parts Front and Centre */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
        }}
      >
        {PRESTIGE_CARS.map((car) => {
          const latestService = car.services[0];
          const avgDiscWear = Math.round(
            (car.consumables.carbonCeramicBrakes.frontLeftWearPct +
              car.consumables.carbonCeramicBrakes.rearLeftWearPct) /
              2
          );

          return (
            <Link
              key={car.id}
              href={`/prestige/${car.id}`}
              style={{
                borderRadius: '16px',
                backgroundColor: 'rgba(13, 15, 20, 0.94)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.6)',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              {/* Vehicle Photograph Header */}
              <div
                style={{
                  position: 'relative',
                  height: '215px',
                  width: '100%',
                  overflow: 'hidden',
                  backgroundColor: '#090B0E',
                }}
              >
                <img
                  src={car.heroImage}
                  alt={`${car.make} ${car.model}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.06) brightness(0.94)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(13, 15, 20, 0.98) 100%)',
                  }}
                />

                {/* Top Badges */}
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    right: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.78)',
                        color: '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                      }}
                    >
                      {car.make}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#FDE047',
                        color: '#050608',
                        fontFamily: 'monospace',
                      }}
                    >
                      {car.licensePlate}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(0, 0, 0, 0.78)',
                      color: '#4ADE80',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      fontFamily: 'monospace',
                    }}
                  >
                    ✓ {car.consumables.dmeOverRev.status}
                  </span>
                </div>

                {/* Car Title & Valuation Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '18px',
                    right: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#D4AF37',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {car.year} &bull; {car.subModel}
                    </div>
                    <h2
                      style={{
                        margin: '2px 0 0',
                        fontSize: '22px',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '-0.01em',
                        textTransform: 'none',
                      }}
                    >
                      {car.model}
                    </h2>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#D4AF37',
                        fontFamily: 'monospace',
                      }}
                    >
                      £{car.estimatedValueGbp.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        fontFamily: 'monospace',
                      }}
                    >
                      {car.currentMileage.toLocaleString()} mi
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body: Servicing & Parts Front and Centre */}
              <div
                style={{
                  padding: '16px 18px 18px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Latest Official Service Stamp Box */}
                {latestService && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(212, 175, 55, 0.05)',
                      border: '1px solid rgba(212, 175, 55, 0.22)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: '#D4AF37',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Latest Service Stamp &bull; {latestService.date}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          color: '#E5E7EB',
                          fontWeight: 700,
                        }}
                      >
                        {latestService.mileage.toLocaleString()} mi
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        marginBottom: '6px',
                      }}
                    >
                      {latestService.provider}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {latestService.partsReplaced.slice(0, 2).map((part, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0, 0, 0, 0.45)',
                            color: '#D1D5DB',
                            fontFamily: 'monospace',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                          }}
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Installed Enthusiast Parts & Hardware */}
                <div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    Installed OEM+ Hardware &amp; Protection ({car.modifications.length})
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    {car.modifications.map((mod) => (
                      <div
                        key={mod.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.025)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <span
                          style={{
                            color: '#F3F4F6',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '210px',
                          }}
                        >
                          {mod.brand}: {mod.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            color: '#4ADE80',
                            flexShrink: 0,
                          }}
                        >
                          {mod.originalPartsRetained ? 'OEM Crated' : 'Factory MSO'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Consumable Health Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  <div>
                    <div style={{ color: '#9CA3AF', fontSize: '8px' }}>
                      CERAMIC MASS
                    </div>
                    <div style={{ color: '#4ADE80', fontWeight: 700 }}>
                      {avgDiscWear}% Rem
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#9CA3AF', fontSize: '8px' }}>
                      TYRE CYCLES
                    </div>
                    <div style={{ color: '#38BDF8', fontWeight: 700 }}>
                      {car.consumables.tyreSet.heatCycles}/
                      {car.consumables.tyreSet.maxRecommendedCycles} HC
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#9CA3AF', fontSize: '8px' }}>
                      PAINT / PPF
                    </div>
                    <div style={{ color: '#F3F4F6', fontWeight: 700 }}>
                      {car.consumables.paintAndProtection.averagePaintMicrons.split(' ')[0]}{' '}
                      µm
                    </div>
                  </div>
                </div>

                {/* CTA Footer */}
                <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background:
                        'linear-gradient(180deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.08) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      color: '#F5E6B8',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Open Service &amp; Parts Passport &rarr;
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
