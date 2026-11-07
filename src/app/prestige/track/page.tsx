import { PRESTIGE_CARS } from '@/lib/prestige/car-data';
import Link from 'next/link';

export default function PrestigeTrackPage() {
  const allTrackSetups = PRESTIGE_CARS.flatMap((car) =>
    car.trackSetups.map((setup) => ({
      ...setup,
      carName: `${car.make} ${car.model}`,
      carPlate: car.licensePlate,
      carId: car.id,
      carImage: car.heroImage,
    }))
  );

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
          Circuit Engineering &amp; VBOX Telemetry Ledgers
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
          Track Session Geometry &amp; Lap Benchmarks
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
          Cold-to-hot tyre pressure bleed windows, static camber &amp; kinematic toe,
          ride height rake, damper bump/rebound clicks, and active aero AoA.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {allTrackSetups.map((setup) => (
          <div
            key={setup.id}
            style={{
              backgroundColor: 'rgba(14, 16, 21, 0.9)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>🏁</span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#D4AF37',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    {setup.circuitName}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    marginTop: '4px',
                  }}
                >
                  {setup.carName}{' '}
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#9CA3AF',
                    }}
                  >
                    [{setup.carPlate}]
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                  {setup.tyreCompound} &bull; {setup.weatherCondition}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(212, 175, 55, 0.14)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textAlign: 'right',
                }}
              >
                <div
                  style={{
                    fontSize: '8px',
                    color: '#D4AF37',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  VBOX Lap
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    fontFamily: 'monospace',
                  }}
                >
                  {setup.bestLapTime}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>COLD PSI</div>
                <div style={{ color: '#F3F4F6', fontWeight: 700 }}>
                  {setup.coldPressureFrontPsi} / {setup.coldPressureRearPsi}
                </div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>HOT TARGET</div>
                <div style={{ color: '#38BDF8', fontWeight: 700 }}>
                  {setup.hotTargetPressureFrontPsi} /{' '}
                  {setup.hotTargetPressureRearPsi}
                </div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>CAMBER F/R</div>
                <div style={{ color: '#F3F4F6', fontWeight: 700 }}>
                  {setup.frontCamberDeg}° / {setup.rearCamberDeg}°
                </div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>TOE F/R</div>
                <div style={{ color: '#F3F4F6', fontWeight: 700 }}>
                  {setup.frontToeMm?.split(' ')[0] || '+0.4mm'} /{' '}
                  {setup.rearToeMm?.split(' ')[0] || '+3.0mm'}
                </div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>RIDE HEIGHT</div>
                <div style={{ color: '#F3F4F6', fontWeight: 700 }}>
                  {setup.rideHeightFrontMm || 98} / {setup.rideHeightRearMm || 122}mm
                </div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '9px' }}>WING / BIAS</div>
                <div style={{ color: '#D4AF37', fontWeight: 700 }}>
                  {setup.rearWingAngleDeg}° / {setup.brakeBiasFrontPercent}%
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#D1D5DB',
                lineHeight: 1.45,
                borderLeft: '2px solid #D4AF37',
                paddingLeft: '10px',
              }}
            >
              &ldquo;{setup.notes}&rdquo;
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
              <Link
                href={`/prestige/${setup.carId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#D4AF37',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Open 360° Vehicle Passport &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
