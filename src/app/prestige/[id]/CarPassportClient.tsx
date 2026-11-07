'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PrestigeCar,
  ServiceRecord,
  ModificationRecord,
  TrackSetupProfile,
  ReminderItem
} from '@/lib/prestige/car-data';

interface CarPassportClientProps {
  car: PrestigeCar;
}

type TabType = 'overview' | 'services' | 'modifications' | 'track' | 'reminders';

export function CarPassportClient({ car: initialCar }: CarPassportClientProps) {
  const [car, setCar] = useState<PrestigeCar>(initialCar);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Modals / Quick Logging Forms
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [logType, setLogType] = useState<'service' | 'mod' | 'track'>('service');

  // Service form state
  const [srvType, setSrvType] = useState<ServiceRecord['type']>('Annual Service');
  const [srvProvider, setSrvProvider] = useState('');
  const [srvMileage, setSrvMileage] = useState(car.currentMileage);
  const [srvCost, setSrvCost] = useState('');
  const [srvNotes, setSrvNotes] = useState('');
  const [srvParts, setSrvParts] = useState('');

  // Mod form state
  const [modCategory, setModCategory] = useState<ModificationRecord['category']>('Exhaust & Powertrain');
  const [modName, setModName] = useState('');
  const [modBrand, setModBrand] = useState('');
  const [modCost, setModCost] = useState('');
  const [modNotes, setModNotes] = useState('');
  const [modReversible, setModReversible] = useState(true);

  // Track form state
  const [trackCircuit, setTrackCircuit] = useState('');
  const [trackLapTime, setTrackLapTime] = useState('');
  const [trackTyreFrontPsi, setTrackTyreFrontPsi] = useState(22);
  const [trackTyreRearPsi, setTrackTyreRearPsi] = useState(23);
  const [trackWingDeg, setTrackWingDeg] = useState(8);
  const [trackNotes, setTrackNotes] = useState('');

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvProvider.trim()) return;

    const newRecord: ServiceRecord = {
      id: `srv-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mileage: Number(srvMileage) || car.currentMileage,
      provider: srvProvider,
      type: srvType,
      costGbp: Number(srvCost) || 0,
      technicianNotes: srvNotes || 'Logged via Digital Passport inspection.',
      partsReplaced: srvParts ? srvParts.split(',').map(s => s.trim()).filter(Boolean) : ['Standard Inspection'],
      verifiedOfficial: true,
      documents: ['Verified_Service_Certificate.pdf']
    };

    setCar(prev => ({
      ...prev,
      services: [newRecord, ...prev.services],
      currentMileage: Math.max(prev.currentMileage, Number(srvMileage) || prev.currentMileage)
    }));

    setSrvProvider('');
    setSrvCost('');
    setSrvNotes('');
    setSrvParts('');
    setShowAddLogModal(false);
  };

  const handleSaveMod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim()) return;

    const newMod: ModificationRecord = {
      id: `mod-${Date.now()}`,
      category: modCategory,
      name: modName,
      brand: modBrand || 'Bespoke',
      dateInstalled: new Date().toISOString().split('T')[0],
      installedBy: 'Specialist Performance Vault',
      costGbp: Number(modCost) || 0,
      reversible: modReversible,
      originalPartsRetained: true,
      notes: modNotes || 'Verified installation with original factory components bagged & tagged in dry storage.'
    };

    setCar(prev => ({
      ...prev,
      modifications: [newMod, ...prev.modifications]
    }));

    setModName('');
    setModBrand('');
    setModCost('');
    setModNotes('');
    setShowAddLogModal(false);
  };

  const handleSaveTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCircuit.trim()) return;

    const newTrack: TrackSetupProfile = {
      id: `trk-${Date.now()}`,
      circuitName: trackCircuit,
      country: 'UK / Europe',
      weatherCondition: 'Dry (Warm)',
      bestLapTime: trackLapTime || '--:--.--',
      tyreCompound: 'Track Semi-Slick Compound',
      coldPressureFrontPsi: Number(trackTyreFrontPsi),
      coldPressureRearPsi: Number(trackTyreRearPsi),
      hotTargetPressureFrontPsi: Number(trackTyreFrontPsi) + 7,
      hotTargetPressureRearPsi: Number(trackTyreRearPsi) + 7,
      frontCamberDeg: -2.5,
      rearCamberDeg: -2.0,
      damperFrontBump: 'Track Level 2',
      damperFrontRebound: 'Track Level 2',
      damperRearBump: 'Track Level 2',
      damperRearRebound: 'Track Level 2',
      rearWingAngleDeg: Number(trackWingDeg),
      brakeBiasFrontPercent: 54,
      fuelLoadLiters: 45,
      notes: trackNotes || 'Session settings saved for telemetry replay and tyre temp analysis.'
    };

    setCar(prev => ({
      ...prev,
      trackSetups: [newTrack, ...prev.trackSetups]
    }));

    setTrackCircuit('');
    setTrackLapTime('');
    setTrackNotes('');
    setShowAddLogModal(false);
  };

  return (
    <div>
      {/* Back button and quick actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <Link
          href="/prestige"
          style={{
            fontSize: '12px',
            color: '#9CA3AF',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <span>&larr;</span> Back to Private Stable
        </Link>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setLogType('service');
              setShowAddLogModal(true);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#D4AF37',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.04em'
            }}
          >
            <span>+</span> Log Passport Entry
          </button>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#0E1015',
        marginBottom: '32px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{
          position: 'relative',
          height: '380px',
          width: '100%',
          overflow: 'hidden'
        }}>
          <img
            src={car.heroImage}
            alt={car.model}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.92)'
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(14, 16, 21, 0.1) 0%, rgba(14, 16, 21, 0.7) 60%, rgba(14, 16, 21, 0.98) 100%)'
          }} />

          {/* Top Overlays */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#D4AF37',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              backdropFilter: 'blur(10px)'
            }}>
              {car.make}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: '#FDE047',
              color: '#000',
              fontFamily: 'monospace'
            }}>
              {car.licensePlate}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: '#9CA3AF',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: 'monospace'
            }}>
              VIN: {car.vin}
            </span>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            right: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: '#D4AF37',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>
                {car.year} &bull; {car.subModel || 'Series Production'}
              </div>
              <h1 style={{
                margin: '4px 0 6px',
                fontSize: '36px',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#FFFFFF'
              }}>
                {car.make} {car.model}
              </h1>
              <div style={{ fontSize: '13px', color: '#9CA3AF', maxWidth: '600px' }}>
                {car.tagline}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '14px',
              background: 'rgba(0,0,0,0.6)',
              padding: '12px 18px',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div>
                <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Valuation</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>
                  £{car.estimatedValueGbp.toLocaleString()}
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              <div>
                <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vault Location</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginTop: '2px' }}>
                  {car.garageLocation}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Key-Matrix Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          padding: '18px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engine</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F3F4F6', marginTop: '2px' }}>{car.engine.split('(')[0]}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Output</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', marginTop: '2px' }}>{car.powerBhp} BHP / {car.torqueNm} Nm</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>0-60 MPH</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F3F4F6', marginTop: '2px' }}>{car.keyStats.zeroToSixtyMph}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Speed</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F3F4F6', marginTop: '2px' }}>{car.keyStats.topSpeedMph} MPH</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Odometer</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F3F4F6', marginTop: '2px', fontFamily: 'monospace' }}>{car.currentMileage.toLocaleString()} mi</div>
          </div>
        </div>
      </div>

      {/* Tabs Selector Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        gap: '4px',
        marginBottom: '28px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { key: 'overview', label: 'Specification & Dossier', icon: '✦' },
          { key: 'services', label: `Service Passport (${car.services.length})`, icon: '🛠' },
          { key: 'modifications', label: `Modifications (${car.modifications.length})`, icon: '⚙' },
          { key: 'track', label: `Track Setups (${car.trackSetups.length})`, icon: '🏁' },
          { key: 'reminders', label: `Care & Reminders (${car.reminders.length})`, icon: '⏱' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#D4AF37' : '#9CA3AF',
                borderBottom: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                backgroundColor: isActive ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                borderRadius: '8px 8px 0 0'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview / Dossier */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {/* Factory Build Spec */}
            <div style={{
              backgroundColor: 'rgba(17, 20, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#D4AF37',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px'
              }}>
                Factory Specification Dossier
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9CA3AF' }}>Exterior Finish:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600, textAlign: 'right' }}>{car.exteriorColor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9CA3AF' }}>Interior Trim:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600, textAlign: 'right' }}>{car.interiorColor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9CA3AF' }}>Drivetrain & Layout:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{car.keyStats.drivetrain}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9CA3AF' }}>Transmission:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600, textAlign: 'right' }}>{car.transmission}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9CA3AF' }}>Curb Weight:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{car.curbWeightKg} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9CA3AF' }}>Acquisition Date:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{car.purchaseDate} (£{car.purchasePriceGbp.toLocaleString()})</span>
                </div>
              </div>
            </div>

            {/* Provenance & Stored Documents */}
            <div style={{
              backgroundColor: 'rgba(17, 20, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#D4AF37',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px'
              }}>
                Digital Title & Proof of Provenance
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>📜</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F3F4F6' }}>V5C Logbook & Title Deed</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>1 Private Owner from New &bull; HPI Clear</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 700 }}>VERIFIED</span>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🛡</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F3F4F6' }}>Manufacturer Factory Warranty</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Active Coverage until March 2027</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>ACTIVE</span>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🔬</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F3F4F6' }}>ECU Over-Rev / DME Diagnostic</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Range 1 to 6 Clean (0 Flags Recorded)</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 700 }}>STAGE 0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Snapshot Matrix */}
          <div style={{
            padding: '20px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 24, 30, 0.6) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Quick Passport Action
              </div>
              <div style={{ fontSize: '14px', color: '#F3F4F6', marginTop: '2px' }}>
                Need to add a service invoice, track day telemetry sheet, or dyno modification?
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setLogType('service'); setShowAddLogModal(true); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(212, 175, 55, 0.2)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#D4AF37',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                + Add Service Record
              </button>
              <button
                onClick={() => { setLogType('track'); setShowAddLogModal(true); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F3F4F6',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                + Save Track Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Service Passport */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6', margin: 0, textTransform: 'none' }}>
                Official Service & Inspection History
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Permanent chronological record with verified technician notes, parts receipts, and dealer validation.
              </p>
            </div>
            <button
              onClick={() => { setLogType('service'); setShowAddLogModal(true); }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              + Log Service Stamp
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {car.services.map((srv) => (
              <div
                key={srv.id}
                style={{
                  backgroundColor: 'rgba(17, 20, 24, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(212, 175, 55, 0.12)',
                        color: '#D4AF37',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {srv.type}
                      </span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                        {srv.date} &bull; {srv.mileage.toLocaleString()} miles
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#F3F4F6', marginTop: '6px' }}>
                      {srv.provider}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>
                      £{srv.costGbp.toLocaleString()}
                    </div>
                    {srv.verifiedOfficial && (
                      <span style={{
                        fontSize: '10px',
                        color: '#22C55E',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ✓ Official Main Dealer Stamp
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  fontSize: '13px',
                  color: '#D1D5DB',
                  lineHeight: 1.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Master Technician Dossier
                  </div>
                  {srv.technicianNotes}
                </div>

                {srv.partsReplaced && srv.partsReplaced.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Itemised Replacement Parts
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {srv.partsReplaced.map((part, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: '#9CA3AF',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          &bull; {part}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Modifications & Bespoke Equipment */}
      {activeTab === 'modifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6', margin: 0, textTransform: 'none' }}>
                Bespoke Modifications & Upgrades
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Log high-end performance upgrades, reversible exhausts, suspension adjustments, and retain provenance for resale value.
              </p>
            </div>
            <button
              onClick={() => { setLogType('mod'); setShowAddLogModal(true); }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              + Register Modification
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {car.modifications.map((mod) => (
              <div
                key={mod.id}
                style={{
                  backgroundColor: 'rgba(17, 20, 24, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        color: '#38BDF8',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {mod.category}
                      </span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        Installed: {mod.dateInstalled} by {mod.installedBy}
                      </span>
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#F3F4F6', marginTop: '6px' }}>
                      {mod.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 600 }}>
                      Brand: {mod.brand}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#F3F4F6', fontFamily: 'monospace' }}>
                      £{mod.costGbp.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {mod.reversible && (
                        <span style={{ fontSize: '10px', color: '#22C55E', fontWeight: 600 }}>
                          ✓ 100% Reversible
                        </span>
                      )}
                      {mod.originalPartsRetained && (
                        <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                          &bull; OEM Parts Boxed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5 }}>
                  {mod.notes}
                </div>

                {(mod.dynoGainHp || mod.weightDeltaKg) && (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '12px'
                  }}>
                    {mod.dynoGainHp && (
                      <span style={{ color: '#22C55E', fontWeight: 600 }}>
                        Dyno Gain: +{mod.dynoGainHp} BHP
                      </span>
                    )}
                    {mod.weightDeltaKg && (
                      <span style={{ color: '#38BDF8', fontWeight: 600 }}>
                        Weight Delta: {mod.weightDeltaKg > 0 ? `+${mod.weightDeltaKg}` : mod.weightDeltaKg} kg
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Track Telemetry & Setup Profiles */}
      {activeTab === 'track' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6', margin: 0, textTransform: 'none' }}>
                Circuit Setup & Telemetry Profiles
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Cold/Hot tyre pressures, damper clicks, wing angles, and lap times dialed for each circuit.
              </p>
            </div>
            <button
              onClick={() => { setLogType('track'); setShowAddLogModal(true); }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              + Add Track Profile
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {car.trackSetups.map((setup) => (
              <div
                key={setup.id}
                style={{
                  backgroundColor: 'rgba(17, 20, 24, 0.85)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>🏁</span>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {setup.circuitName}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>({setup.country})</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 600, marginTop: '4px' }}>
                      Compound: {setup.tyreCompound} &bull; Condition: {setup.weatherCondition}
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(0,0,0,0.5) 100%)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontSize: '9px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Lap</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace' }}>
                      {setup.bestLapTime}
                    </div>
                  </div>
                </div>

                {/* Telemetry Matrix Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Cold Pressures (F / R)</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>
                      {setup.coldPressureFrontPsi} PSI / {setup.coldPressureRearPsi} PSI
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Hot Target Pressures</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8' }}>
                      {setup.hotTargetPressureFrontPsi} PSI / {setup.hotTargetPressureRearPsi} PSI
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Camber Angle</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>
                      F: {setup.frontCamberDeg}° / R: {setup.rearCamberDeg}°
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Active Aero Wing</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#D4AF37' }}>
                      {setup.rearWingAngleDeg}° Angle of Attack
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Brake Bias Front</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>
                      {setup.brakeBiasFrontPercent}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Fuel Load</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>
                      {setup.fuelLoadLiters} Litres
                    </div>
                  </div>
                </div>

                {/* Damper clicks details */}
                <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600, color: '#F3F4F6', marginBottom: '4px' }}>Damper Configuration:</div>
                  <div>Front: {setup.damperFrontBump} | {setup.damperFrontRebound}</div>
                  <div>Rear: {setup.damperRearBump} | {setup.damperRearRebound}</div>
                </div>

                <div style={{
                  fontSize: '13px',
                  color: '#D1D5DB',
                  fontStyle: 'italic',
                  borderLeft: '2px solid #D4AF37',
                  paddingLeft: '12px'
                }}>
                  "{setup.notes}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Care & Reminders */}
      {activeTab === 'reminders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6', margin: 0, textTransform: 'none' }}>
                Maintenance Reminders & Component Life
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Track high-stress intervals: brake fluid degradation, carbon ceramic wear, tyre cycles, and scheduled inspections.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {car.reminders.map((rem) => (
              <div
                key={rem.id}
                style={{
                  backgroundColor: 'rgba(17, 20, 24, 0.85)',
                  border: rem.urgent ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: rem.urgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.15)',
                    color: rem.urgent ? '#F87171' : '#D4AF37',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}>
                    {rem.urgent ? '!' : '⏱'}
                  </span>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: '#9CA3AF',
                        textTransform: 'uppercase'
                      }}>
                        {rem.category}
                      </span>
                      {rem.urgent && (
                        <span style={{ fontSize: '10px', color: '#F87171', fontWeight: 700 }}>
                          HIGH ATTENTION
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginTop: '2px' }}>
                      {rem.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Due Date: <span style={{ color: '#F3F4F6' }}>{rem.dueDate}</span>
                      {rem.dueMileage && ` or ${rem.dueMileage.toLocaleString()} mi`}
                      {rem.assignedCenter && ` &bull; ${rem.assignedCenter}`}
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: rem.status === 'Booked' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: rem.status === 'Booked' ? '#38BDF8' : '#D1D5DB'
                  }}>
                    {rem.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK LOG MODAL */}
      {showAddLogModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0E1015',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Log New Passport Entry
                </h3>
                <div style={{ fontSize: '12px', color: '#D4AF37' }}>
                  {car.make} {car.model} &bull; {car.licensePlate}
                </div>
              </div>
              <button
                onClick={() => setShowAddLogModal(false)}
                style={{ fontSize: '18px', color: '#9CA3AF' }}
              >
                ✕
              </button>
            </div>

            {/* Entry type selection */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['service', 'mod', 'track'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLogType(t)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: logType === t ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: logType === t ? '#D4AF37' : '#9CA3AF',
                    border: logType === t ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {t === 'service' ? 'Service / Maintenance' : t === 'mod' ? 'Modification' : 'Track Setup'}
                </button>
              ))}
            </div>

            {/* Form for Service */}
            {logType === 'service' && (
              <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Service Type</label>
                  <select
                    value={srvType}
                    onChange={(e) => setSrvType(e.target.value as ServiceRecord['type'])}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  >
                    <option value="Annual Service">Annual Service</option>
                    <option value="Inspection & Fluids">Inspection & Fluids</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Pre-Track Prep">Pre-Track Prep</option>
                    <option value="Warranty Campaign">Warranty Campaign</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Service Center / Specialist</label>
                  <input
                    type="text"
                    placeholder="e.g. Porsche Centre Silverstone"
                    value={srvProvider}
                    onChange={(e) => setSrvProvider(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Odometer (Miles)</label>
                    <input
                      type="number"
                      value={srvMileage}
                      onChange={(e) => setSrvMileage(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Cost (£ GBP)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1450"
                      value={srvCost}
                      onChange={(e) => setSrvCost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Parts (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Motul 300V Oil, Pagid RS29 pads"
                    value={srvParts}
                    onChange={(e) => setSrvParts(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Technician Notes & Diagnostic</label>
                  <textarea
                    rows={3}
                    placeholder="Describe inspection results, fluid state, brake measurements..."
                    value={srvNotes}
                    onChange={(e) => setSrvNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
                    color: '#07080A',
                    fontWeight: 800,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginTop: '8px'
                  }}
                >
                  Confirm & Stamp Service Passport
                </button>
              </form>
            )}

            {/* Form for Modification */}
            {logType === 'mod' && (
              <form onSubmit={handleSaveMod} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Upgrade Category</label>
                  <select
                    value={modCategory}
                    onChange={(e) => setModCategory(e.target.value as ModificationRecord['category'])}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  >
                    <option value="Exhaust & Powertrain">Exhaust & Powertrain</option>
                    <option value="Aero & Exterior">Aero & Exterior</option>
                    <option value="Suspension & Chassis">Suspension & Chassis</option>
                    <option value="Braking & Wheels">Braking & Wheels</option>
                    <option value="ECU & Telemetry">ECU & Telemetry</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Component Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kline Inconel Valved Exhaust"
                    value={modName}
                    onChange={(e) => setModName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Manufacturer / Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Kline Innovation"
                      value={modBrand}
                      onChange={(e) => setModBrand(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Total Cost (£ GBP)</label>
                    <input
                      type="number"
                      placeholder="e.g. 7800"
                      value={modCost}
                      onChange={(e) => setModCost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Engineering Notes & Reversibility</label>
                  <textarea
                    rows={2}
                    placeholder="Details about reversibility, dyno delta, OEM storage..."
                    value={modNotes}
                    onChange={(e) => setModNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
                    color: '#07080A',
                    fontWeight: 800,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginTop: '8px'
                  }}
                >
                  Save Modification To Passport
                </button>
              </form>
            )}

            {/* Form for Track */}
            {logType === 'track' && (
              <form onSubmit={handleSaveTrack} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Circuit Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Silverstone GP / Nürburgring Nordschleife"
                    value={trackCircuit}
                    onChange={(e) => setTrackCircuit(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Best Recorded Lap</label>
                    <input
                      type="text"
                      placeholder="e.g. 2:08.75"
                      value={trackLapTime}
                      onChange={(e) => setTrackLapTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Rear Wing AoA (Deg)</label>
                    <input
                      type="number"
                      value={trackWingDeg}
                      onChange={(e) => setTrackWingDeg(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Cold Tyre Front (PSI)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={trackTyreFrontPsi}
                      onChange={(e) => setTrackTyreFrontPsi(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Cold Tyre Rear (PSI)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={trackTyreRearPsi}
                      onChange={(e) => setTrackTyreRearPsi(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Telemetry Observations & Handling Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Handling balance, tyre graining, curb compliance..."
                    value={trackNotes}
                    onChange={(e) => setTrackNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F3F4F6',
                      marginTop: '4px'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
                    color: '#07080A',
                    fontWeight: 800,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginTop: '8px'
                  }}
                >
                  Save Track Setup Profile
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

