import { PRESTIGE_CARS } from '@/lib/prestige/car-data';
import Link from 'next/link';

export default function PrestigeRemindersPage() {
  const allReminders = PRESTIGE_CARS.flatMap((car) =>
    car.reminders.map((rem) => ({
      ...rem,
      carName: `${car.make} ${car.model}`,
      carPlate: car.licensePlate,
      carId: car.id,
      carImage: car.heroImage,
    }))
  ).sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1));

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
          Consumable Telemetry &amp; Track Readiness
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
          Component Life &amp; Service Intervals
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
          Proactive monitoring for Castrol React SRF wet-boiling point intervals,
          carbon-ceramic rotor mass, semi-slick heat cycles, and factory warranty
          audits.
        </p>
      </div>

      {/* Live Fleet Consumables Summary Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {PRESTIGE_CARS.map((car) => (
          <div
            key={car.id}
            style={{
              backgroundColor: 'rgba(13, 15, 20, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: '#050608',
                    backgroundColor: '#FDE047',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontWeight: 800,
                    marginRight: '8px',
                  }}
                >
                  {car.licensePlate}
                </span>
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>
                  {car.make} {car.model}
                </strong>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: '#4ADE80',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {car.consumables.dmeOverRev.status}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '11px',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}
            >
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>
                  CERAMIC ROTORS
                </div>
                <div
                  style={{
                    color: '#F3F4F6',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                >
                  FL {car.consumables.carbonCeramicBrakes.frontLeftWearPct}% / RL{' '}
                  {car.consumables.carbonCeramicBrakes.rearLeftWearPct}%
                </div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>
                  TYRE HEAT CYCLES
                </div>
                <div
                  style={{
                    color: '#38BDF8',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                >
                  {car.consumables.tyreSet.heatCycles} /{' '}
                  {car.consumables.tyreSet.maxRecommendedCycles} Cycles
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scheduled Action Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {allReminders.map((rem) => (
          <div
            key={rem.id}
            style={{
              backgroundColor: 'rgba(14, 16, 21, 0.9)',
              border: rem.urgent
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src={rem.carImage}
                  alt={rem.carName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(212, 175, 55, 0.14)',
                      color: '#D4AF37',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    {rem.category}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#9CA3AF',
                      fontFamily: 'monospace',
                    }}
                  >
                    {rem.carPlate} &bull; {rem.carName}
                  </span>
                  {rem.urgent && (
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#F87171',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 800,
                      }}
                    >
                      PRE-TRACK PRIORITY
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    marginTop: '4px',
                  }}
                >
                  {rem.title}
                </div>

                {rem.technicalContext && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#D1D5DB',
                      marginTop: '2px',
                    }}
                  >
                    {rem.technicalContext}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '11px',
                    color: '#9CA3AF',
                    marginTop: '4px',
                    fontFamily: 'monospace',
                  }}
                >
                  Target: {rem.dueDate}
                  {rem.dueMileage && ` or ${rem.dueMileage.toLocaleString()} mi`}
                  {rem.assignedCenter && ` • Centre: ${rem.assignedCenter}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  backgroundColor:
                    rem.status === 'Booked'
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: rem.status === 'Booked' ? '#38BDF8' : '#D1D5DB',
                }}
              >
                {rem.status}
              </span>
              <Link
                href={`/prestige/${rem.carId}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: '#D4AF37',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                Passport &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
