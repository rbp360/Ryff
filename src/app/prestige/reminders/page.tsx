import { PRESTIGE_CARS } from '@/lib/prestige/car-data';
import Link from 'next/link';

export default function PrestigeRemindersPage() {
  const allReminders = PRESTIGE_CARS.flatMap(car =>
    car.reminders.map(rem => ({
      ...rem,
      carName: `${car.make} ${car.model}`,
      carPlate: car.licensePlate,
      carId: car.id,
      carImage: car.heroImage
    }))
  ).sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1));

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
          Fleet Life-Cycle & Component Health
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
          Scheduled Reminders & Track Readiness
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#9CA3AF' }}>
          Automated alerts for high-boiling point brake fluid decay, ceramic pad depth, tyre heat-cycle limits, and dealer warranty inspections.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {allReminders.map(rem => (
          <div
            key={rem.id}
            style={{
              backgroundColor: 'rgba(17, 20, 24, 0.85)',
              border: rem.urgent ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                position: 'relative',
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                <img
                  src={rem.carImage}
                  alt={rem.carName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    color: '#D4AF37',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {rem.category}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                    {rem.carPlate} &bull; {rem.carName}
                  </span>
                  {rem.urgent && (
                    <span style={{
                      fontSize: '10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#F87171',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      URGENT ACTION
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '16px', fontWeight: 700, color: '#F3F4F6', marginTop: '4px' }}>
                  {rem.title}
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                  Due Target: <span style={{ color: '#F3F4F6' }}>{rem.dueDate}</span>
                  {rem.dueMileage && ` or ${rem.dueMileage.toLocaleString()} miles`}
                  {rem.assignedCenter && ` &bull; Assigned: ${rem.assignedCenter}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: rem.status === 'Booked' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: rem.status === 'Booked' ? '#38BDF8' : '#D1D5DB'
              }}>
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
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Open Car Passport &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

