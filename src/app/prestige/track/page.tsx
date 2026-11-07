import { PRESTIGE_CARS } from '@/lib/prestige/car-data';
import Link from 'next/link';

export default function PrestigeTrackPage() {
  const allTrackSetups = PRESTIGE_CARS.flatMap(car =>
    car.trackSetups.map(setup => ({
      ...setup,
      carName: `${car.make} ${car.model}`,
      carPlate: car.licensePlate,
      carId: car.id,
      carImage: car.heroImage
    }))
  );

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
          Circuit Engineering & Telemetry Ledgers
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
          Track Session Setups & Lap Benchmarks
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#9CA3AF' }}>
          Database of tyre pressure windows, aero balance, damper bump/rebound clicks, and telemetry laps across European circuits.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {allTrackSetups.map(setup => (
          <div
            key={setup.id}
            style={{
              backgroundColor: 'rgba(17, 20, 24, 0.85)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🏁</span>
                  <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase' }}>
                    {setup.circuitName}
                  </span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                  {setup.carName}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Tyres: {setup.tyreCompound} ({setup.weatherCondition})
                </div>
              </div>

              <div style={{
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '6px 12px',
                borderRadius: '8px',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '9px', color: '#D4AF37', textTransform: 'uppercase' }}>Lap Time</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace' }}>
                  {setup.bestLapTime}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              padding: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: '#9CA3AF' }}>Cold Pressures:</span>
                <div style={{ color: '#F3F4F6', fontWeight: 600 }}>F: {setup.coldPressureFrontPsi} / R: {setup.coldPressureRearPsi} PSI</div>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>Target Hot:</span>
                <div style={{ color: '#38BDF8', fontWeight: 600 }}>F: {setup.hotTargetPressureFrontPsi} / R: {setup.hotTargetPressureRearPsi} PSI</div>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>Aero Wing AoA:</span>
                <div style={{ color: '#D4AF37', fontWeight: 600 }}>{setup.rearWingAngleDeg}°</div>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>Brake Bias Front:</span>
                <div style={{ color: '#F3F4F6', fontWeight: 600 }}>{setup.brakeBiasFrontPercent}%</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', lineHeight: 1.4 }}>
              "{setup.notes}"
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <Link
                href={`/prestige/${setup.carId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#D4AF37',
                  fontWeight: 600
                }}
              >
                Inspect Vehicle Passport &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

