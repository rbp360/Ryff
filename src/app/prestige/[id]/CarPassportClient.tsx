'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PrestigeCar,
  ServiceRecord,
  ModificationRecord,
  TrackSetupProfile,
} from '@/lib/prestige/car-data';
import { Car360WalkaroundStudio } from '@/components/prestige/Car360WalkaroundStudio';

interface CarPassportClientProps {
  car: PrestigeCar;
}

type TabType = 'services' | 'modifications' | 'overview' | 'track' | 'walkaround';

// High-end enthusiast preset chips for 1-tap authentic logging
const ENTHUSIAST_SERVICE_PRESETS = [
  'Castrol React SRF Brake Fluid (2.0L)',
  'Mobil 1 ESP X4 0W-40 C40 GT (7.8L)',
  'PIWIS 4 DME Range 1–6 Over-Rev Scan',
  'Proceq Carboteq Ceramic Rotor Density Audit',
  'Centre-Lock Nut Optimol Paste TA & 600 Nm Torque',
  'Pagid RSC1 Carbon-Ceramic Track Pads',
  'Manthey 4-Wheel Optical Corner-Weight Alignment',
];

const ENTHUSIAST_MOD_PRESETS = [
  {
    name: 'Kline Innovation Inconel 625 Valved Exhaust & Manifolds',
    brand: 'Kline Innovation',
    partNumber: 'KLN-INC-625-VALVED',
    category: 'Exhaust & Powertrain' as const,
    cost: '8650',
  },
  {
    name: 'Surface Transforms Continuous-Carbon Ceramic Rotors + Pagid RSC1',
    brand: 'Surface Transforms',
    partNumber: 'ST-KIT-1042-CCM',
    category: 'Braking & Forged Wheels' as const,
    cost: '14500',
  },
  {
    name: 'Manthey Racing KW 4-Way Coilover & Carbon Aero Package',
    brand: 'Manthey Racing',
    partNumber: 'MR-992-KW4-AERO',
    category: 'Suspension & Geometry' as const,
    cost: '19800',
  },
  {
    name: 'Topaz Level 5 Full-Body Edge-Wrapped PPF & Modesta BC-04',
    brand: 'Topaz Detailing',
    partNumber: 'TPZ-LVL5-CONCOURS',
    category: 'PPF & Concours Protection' as const,
    cost: '7400',
  },
  {
    name: 'BBS FI-R Evo Forged Magnesium Centre-Lock Wheel Set',
    brand: 'BBS Motorsport',
    partNumber: 'BBS-FIR-EVO-MAG',
    category: 'Braking & Forged Wheels' as const,
    cost: '11200',
  },
];

export function CarPassportClient({ car: initialCar }: CarPassportClientProps) {
  const [car, setCar] = useState<PrestigeCar>(initialCar);
  const [activeTab, setActiveTab] = useState<TabType>('services');

  // Modals / Quick Logging Forms
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [logType, setLogType] = useState<'service' | 'mod' | 'track'>('service');

  // Detailed Service form state
  const [srvType, setSrvType] = useState<ServiceRecord['type']>(
    'Pre-Track Engineering'
  );
  const [srvProvider, setSrvProvider] = useState('');
  const [srvTech, setSrvTech] = useState('');
  const [srvInvoice, setSrvInvoice] = useState('');
  const [srvMileage, setSrvMileage] = useState(car.currentMileage);
  const [srvCost, setSrvCost] = useState('');
  const [srvDmeStatus, setSrvDmeStatus] = useState(
    'Ranges 1–6: 0 Ignitions (Stage 0 Clean)'
  );
  const [srvRotorWear, setSrvRotorWear] = useState(
    'FL 96% | FR 95% | RL 97% | RR 97%'
  );
  const [srvTorqueSpec, setSrvTorqueSpec] = useState(
    'Centre-Locks: 600 Nm / Caliper Studs: 115 Nm'
  );
  const [srvNotes, setSrvNotes] = useState('');
  const [srvPartsList, setSrvPartsList] = useState<string[]>([
    'Castrol React SRF Brake Fluid (2.0L)',
    'PIWIS 4 DME Range 1–6 Over-Rev Scan',
  ]);
  const [customPartInput, setCustomPartInput] = useState('');

  // Modification form state
  const [modCategory, setModCategory] = useState<
    ModificationRecord['category']
  >('Exhaust & Powertrain');
  const [modName, setModName] = useState('');
  const [modBrand, setModBrand] = useState('');
  const [modPartNumber, setModPartNumber] = useState('');
  const [modCost, setModCost] = useState('');
  const [modOemStorage, setModOemStorage] = useState(
    'Sanctuary Climate Crate #04 (Original OEM Tagged)'
  );
  const [modNotes, setModNotes] = useState('');
  const [modReversible, setModReversible] = useState(true);

  // Track form state
  const [trackCircuit, setTrackCircuit] = useState('');
  const [trackLapTime, setTrackLapTime] = useState('');
  const [trackTyreCompound, setTrackTyreCompound] = useState(
    car.consumables.tyreSet.compound.split('(')[0].trim()
  );
  const [trackTyreFrontPsi, setTrackTyreFrontPsi] = useState(21.0);
  const [trackTyreRearPsi, setTrackTyreRearPsi] = useState(22.0);
  const [trackCamberFront, setTrackCamberFront] = useState(-2.8);
  const [trackCamberRear, setTrackCamberRear] = useState(-2.4);
  const [trackWingDeg, setTrackWingDeg] = useState(8.5);
  const [trackNotes, setTrackNotes] = useState('');

  const togglePresetPart = (part: string) => {
    setSrvPartsList((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const addCustomPart = () => {
    if (!customPartInput.trim()) return;
    setSrvPartsList((prev) => [...prev, customPartInput.trim()]);
    setCustomPartInput('');
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvProvider.trim()) return;

    const newRecord: ServiceRecord = {
      id: `srv-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mileage: Number(srvMileage) || car.currentMileage,
      provider: srvProvider,
      masterTechnician: srvTech || 'Senior Factory Motorsport Technician',
      invoiceRef:
        srvInvoice || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: srvType,
      costGbp: Number(srvCost) || 0,
      dmeOverRevStatus: srvDmeStatus,
      technicianNotes:
        srvNotes ||
        'Full diagnostic and mechanical inspection logged to permanent vehicle passport.',
      partsReplaced:
        srvPartsList.length > 0 ? srvPartsList : ['Factory Scheduled Inspection'],
      detailedMeasurements: [
        {
          category: 'ECU & DME Telemetry',
          component: 'Diagnostic Over-Rev & Operating Hours Audit',
          measurement: srvDmeStatus,
          torqueOrSpec: 'Zero Fault Codes',
        },
        {
          category: 'Brakes & Rotors',
          component: 'Carbon-Ceramic Rotor Mass & Torque Verification',
          measurement: srvRotorWear,
          torqueOrSpec: srvTorqueSpec,
        },
      ],
      verifiedOfficial: true,
      documents: ['Verified_Service_Invoice.pdf', 'DME_Diagnostic_Scan.pdf'],
    };

    setCar((prev) => ({
      ...prev,
      services: [newRecord, ...prev.services],
      currentMileage: Math.max(
        prev.currentMileage,
        Number(srvMileage) || prev.currentMileage
      ),
    }));

    setSrvProvider('');
    setSrvTech('');
    setSrvInvoice('');
    setSrvCost('');
    setSrvNotes('');
    setActiveTab('services');
    setShowAddLogModal(false);
  };

  const handleSaveMod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim()) return;

    const newMod: ModificationRecord = {
      id: `mod-${Date.now()}`,
      category: modCategory,
      name: modName,
      brand: modBrand || 'Bespoke Motorsport',
      partNumber: modPartNumber || 'BESPOKE-OEM-PLUS',
      dateInstalled: new Date().toISOString().split('T')[0],
      installedBy: 'Official Motorsport Partner',
      costGbp: Number(modCost) || 0,
      reversible: modReversible,
      originalPartsRetained: true,
      oemStorageLocation: modOemStorage,
      notes:
        modNotes ||
        'Installed to factory torque specifications with original OEM components sealed in climate storage.',
    };

    setCar((prev) => ({
      ...prev,
      modifications: [newMod, ...prev.modifications],
    }));

    setModName('');
    setModBrand('');
    setModPartNumber('');
    setModCost('');
    setModNotes('');
    setActiveTab('modifications');
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
      bestLapTime: trackLapTime || '2:07.10',
      tyreCompound: trackTyreCompound,
      tyreHeatCycles: car.consumables.tyreSet.heatCycles + 1,
      coldPressureFrontPsi: Number(trackTyreFrontPsi),
      coldPressureRearPsi: Number(trackTyreRearPsi),
      hotTargetPressureFrontPsi: Number((Number(trackTyreFrontPsi) + 7.0).toFixed(1)),
      hotTargetPressureRearPsi: Number((Number(trackTyreRearPsi) + 7.0).toFixed(1)),
      frontCamberDeg: Number(trackCamberFront),
      rearCamberDeg: Number(trackCamberRear),
      frontToeMm: '+0.4mm Toe-In',
      rearToeMm: '+3.0mm Toe-In',
      rideHeightFrontMm: 98,
      rideHeightRearMm: 122,
      damperFrontBump: '+2 Clicks Track Stiff',
      damperFrontRebound: '+1 Click',
      damperRearBump: '+2 Clicks',
      damperRearRebound: '+2 Clicks',
      rearWingAngleDeg: Number(trackWingDeg),
      brakeBiasFrontPercent: 54,
      fuelLoadLiters: 45,
      notes:
        trackNotes ||
        'Target hot pressures achieved on lap 2. Zero brake fade with Castrol React SRF.',
    };

    setCar((prev) => ({
      ...prev,
      trackSetups: [newTrack, ...prev.trackSetups],
    }));

    setTrackCircuit('');
    setTrackLapTime('');
    setTrackNotes('');
    setActiveTab('track');
    setShowAddLogModal(false);
  };

  return (
    <div>
      {/* Top Action & Breadcrumb Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/prestige"
            style={{
              fontSize: '12px',
              color: '#9CA3AF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontWeight: 600,
            }}
          >
            <span>&larr;</span> Sanctuary Vault
          </Link>

          <div>
            <div
              style={{
                fontSize: '10px',
                color: '#D4AF37',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {car.year} {car.make} &bull; {car.subModel}
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.01em',
                textTransform: 'none',
              }}
            >
              {car.model}{' '}
              <span
                style={{
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}
              >
                [{car.licensePlate}]
              </span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'right',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Provenance Value
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#D4AF37',
                fontFamily: 'monospace',
              }}
            >
              £{car.estimatedValueGbp.toLocaleString()}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLogType('service');
              setShowAddLogModal(true);
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
              color: '#050608',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
            }}
          >
            <span>+</span> Log Passport Entry
          </button>
        </div>
      </div>

      {/* Sleek Vehicle Identity & Consumable Health Header */}
      <div
        style={{
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          backgroundColor: '#0B0D12',
          marginBottom: '24px',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}
        >
          {/* Vehicle Photograph */}
          <div
            style={{
              position: 'relative',
              minHeight: '220px',
              backgroundColor: '#08090C',
            }}
          >
            <img
              src={car.heroImage}
              alt={`${car.make} ${car.model}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'contrast(1.06) brightness(0.92)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(11,13,18,0.85) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '16px',
                right: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#E5E7EB',
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                VIN: {car.vin}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#4ADE80',
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                }}
              >
                ✓ {car.consumables.dmeOverRev.status}
              </span>
            </div>
          </div>

          {/* Right Key Service & Parts Health Summary */}
          <div
            style={{
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#D4AF37',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Engine #{car.engineNumber} &bull; {car.garageLocation}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#D1D5DB',
                  marginTop: '4px',
                  lineHeight: 1.45,
                }}
              >
                {car.engine} &mdash; {car.powerBhp} BHP / {car.torqueNm} Nm
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                  CERAMIC ROTOR MASS
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: '#4ADE80',
                    fontFamily: 'monospace',
                    marginTop: '2px',
                  }}
                >
                  FL {car.consumables.carbonCeramicBrakes.frontLeftWearPct}% / RL{' '}
                  {car.consumables.carbonCeramicBrakes.rearLeftWearPct}% (
                  {car.consumables.carbonCeramicBrakes.padLifeRemainingMm}mm Pad)
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                  TYRE HEAT CYCLES &amp; TREAD
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: '#38BDF8',
                    fontFamily: 'monospace',
                    marginTop: '2px',
                  }}
                >
                  Cycle {car.consumables.tyreSet.heatCycles}/
                  {car.consumables.tyreSet.maxRecommendedCycles} &bull;{' '}
                  {car.consumables.tyreSet.treadDepthRearMm}mm
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                  ECU / DME OVER-REV
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: '#FFFFFF',
                    fontFamily: 'monospace',
                    marginTop: '2px',
                  }}
                >
                  {car.consumables.dmeOverRev.operatingHours} hrs (0 Flags)
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                  PAINT DEPTH &amp; PPF
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: '#D4AF37',
                    fontFamily: 'monospace',
                    marginTop: '2px',
                  }}
                >
                  {car.consumables.paintAndProtection.averagePaintMicrons.split(' ')[0]}{' '}
                  µm (100% PPF)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Passport Navigation — Service & Parts Front and Centre */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '6px',
          marginBottom: '26px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          {
            key: 'services',
            label: `Service & Parts Ledger (${car.services.length})`,
            icon: '🛠',
          },
          {
            key: 'modifications',
            label: `OEM+ Hardware & Mods (${car.modifications.length})`,
            icon: '⚙',
          },
          {
            key: 'overview',
            label: 'Factory Build & Provenance',
            icon: '✦',
          },
          {
            key: 'track',
            label: `Circuit Setups (${car.trackSetups.length})`,
            icon: '🏁',
          },
          {
            key: 'walkaround',
            label: '360° Walkaround Studio',
            icon: '🔄',
          },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabType)}
              style={{
                padding: '11px 18px',
                fontSize: '12px',
                fontWeight: isActive ? 800 : 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: isActive ? '#D4AF37' : '#9CA3AF',
                borderBottom: isActive
                  ? '2px solid #D4AF37'
                  : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                backgroundColor: isActive
                  ? 'rgba(212, 175, 55, 0.06)'
                  : 'transparent',
                borderRadius: '8px 8px 0 0',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Provenance, Build Sheet & Live Consumable Telemetry */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 4-Card Enthusiast Consumable Health Matrix */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Card 1: DME / ECU Over-Rev Audit */}
            <div
              style={{
                backgroundColor: 'rgba(14, 16, 21, 0.9)',
                border: '1px solid rgba(34, 197, 94, 0.28)',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  ECU / DME Over-Rev Report
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#4ADE80',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {car.consumables.dmeOverRev.status}
                </span>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                }}
              >
                {car.consumables.dmeOverRev.ranges1To6}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                Operating Hours:{' '}
                <strong style={{ color: '#E5E7EB' }}>
                  {car.consumables.dmeOverRev.operatingHours} hrs
                </strong>{' '}
                &bull; Verified {car.consumables.dmeOverRev.lastReadoutDate}
              </div>
            </div>

            {/* Card 2: Carbon-Ceramic Rotor Mass */}
            <div
              style={{
                backgroundColor: 'rgba(14, 16, 21, 0.9)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  Carbon-Ceramic Rotor Mass
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#D4AF37',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {car.consumables.carbonCeramicBrakes.padLifeRemainingMm}mm PAD
                </span>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                }}
              >
                FL {car.consumables.carbonCeramicBrakes.frontLeftWearPct}% | FR{' '}
                {car.consumables.carbonCeramicBrakes.frontRightWearPct}% | RL{' '}
                {car.consumables.carbonCeramicBrakes.rearLeftWearPct}% | RR{' '}
                {car.consumables.carbonCeramicBrakes.rearRightWearPct}%
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                {car.consumables.carbonCeramicBrakes.discType}
              </div>
            </div>

            {/* Card 3: Semi-Slick Heat Cycles */}
            <div
              style={{
                backgroundColor: 'rgba(14, 16, 21, 0.9)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  Tyre Heat Cycles &amp; Tread
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#38BDF8',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {car.consumables.tyreSet.dateCodeDot}
                </span>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                }}
              >
                Cycle {car.consumables.tyreSet.heatCycles} of{' '}
                {car.consumables.tyreSet.maxRecommendedCycles} &bull; F:{' '}
                {car.consumables.tyreSet.treadDepthFrontMm}mm / R:{' '}
                {car.consumables.tyreSet.treadDepthRearMm}mm
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                {car.consumables.tyreSet.compound}
              </div>
            </div>

            {/* Card 4: Paint Microns & PPF Protection */}
            <div
              style={{
                backgroundColor: 'rgba(14, 16, 21, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  Paint Depth &amp; Concours PPF
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#4ADE80',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  100% WRAPPED
                </span>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                }}
              >
                {car.consumables.paintAndProtection.averagePaintMicrons}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                {car.consumables.paintAndProtection.ppfBrand}
              </div>
            </div>
          </div>

          {/* Two-Column Chassis Dossier & Factory Option Build Codes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Chassis & Matching Numbers Identity */}
            <div
              style={{
                backgroundColor: 'rgba(14, 16, 21, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '22px',
              }}
            >
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#D4AF37',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '16px',
                }}
              >
                Matching-Numbers Chassis &amp; Powertrain Dossier
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '11px',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '7px',
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>Chassis VIN:</span>
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    {car.vin}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '7px',
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>Serialised Engine Number:</span>
                  <span
                    style={{
                      color: '#D4AF37',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    {car.engineNumber}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '7px',
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>Factory Paint Code:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600 }}>
                    {car.paintCode}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '7px',
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>Powertrain Spec:</span>
                  <span
                    style={{
                      color: '#F3F4F6',
                      fontWeight: 600,
                      textAlign: 'right',
                    }}
                  >
                    {car.engine}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '7px',
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>Transmission:</span>
                  <span
                    style={{
                      color: '#F3F4F6',
                      fontWeight: 600,
                      textAlign: 'right',
                    }}
                  >
                    {car.transmission}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '7px',
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>Homologated Weight &amp; Aero:</span>
                  <span style={{ color: '#F3F4F6', fontWeight: 600 }}>
                    {car.curbWeightKg} kg &bull; {car.keyStats.downforceKg} kg Downforce
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9CA3AF' }}>Sanctuary Berth &amp; Conditioner:</span>
                  <span style={{ color: '#4ADE80', fontWeight: 700 }}>
                    {car.garageLocation} ({car.consumables.vaultClimate.ctekConditioner})
                  </span>
                </div>
              </div>
            </div>

            {/* Factory Build Option Codes */}
            <div
              style={{
                backgroundColor: 'rgba(14, 16, 21, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '22px',
              }}
            >
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#D4AF37',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '16px',
                }}
              >
                Factory Commission &amp; Option Codes (COA Verified)
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {car.factoryOptions.map((opt) => (
                  <div
                    key={opt.code}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#D4AF37',
                        backgroundColor: 'rgba(212, 175, 55, 0.14)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {opt.code}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#E5E7EB',
                        lineHeight: 1.4,
                      }}
                    >
                      {opt.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Detailed Service Passport & Engineering Measurements */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#F3F4F6',
                  margin: 0,
                  textTransform: 'none',
                }}
              >
                Official Service &amp; Motorsport Inspection Ledger
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Chronological provenance with master technician sign-off, DME over-rev
                audits, rotor mass percentages, and torque verifications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLogType('service');
                setShowAddLogModal(true);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              + Stamp New Service Record
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {car.services.map((srv) => (
              <div
                key={srv.id}
                style={{
                  backgroundColor: 'rgba(14, 16, 21, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
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
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(212, 175, 55, 0.14)',
                          color: '#D4AF37',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {srv.type}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#E5E7EB',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {srv.date} &bull; {srv.mileage.toLocaleString()} mi
                      </span>
                      {srv.invoiceRef && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#9CA3AF',
                            fontFamily: 'monospace',
                          }}
                        >
                          [Ref: {srv.invoiceRef}]
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        marginTop: '6px',
                      }}
                    >
                      {srv.provider}
                    </div>
                    {srv.masterTechnician && (
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        Lead Master Tech:{' '}
                        <strong style={{ color: '#D1D5DB' }}>
                          {srv.masterTechnician}
                        </strong>
                      </div>
                    )}
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
                      £{srv.costGbp.toLocaleString()}
                    </div>
                    {srv.verifiedOfficial && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#4ADE80',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                        }}
                      >
                        ✓ OFFICIAL DEALER STAMP
                      </span>
                    )}
                  </div>
                </div>

                {/* Detailed Engineering Sub-Items (Torque, DME, Rotor Wear) */}
                {srv.detailedMeasurements && srv.detailedMeasurements.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {srv.detailedMeasurements.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '9px',
                            color: '#D4AF37',
                            textTransform: 'uppercase',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                          }}
                        >
                          {m.category}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            marginTop: '2px',
                          }}
                        >
                          {m.component}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#4ADE80',
                            fontFamily: 'monospace',
                            marginTop: '4px',
                          }}
                        >
                          {m.measurement}
                        </div>
                        {m.torqueOrSpec && (
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#9CA3AF',
                              fontFamily: 'monospace',
                              marginTop: '2px',
                            }}
                          >
                            Spec: {m.torqueOrSpec}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '13px',
                    color: '#D1D5DB',
                    lineHeight: 1.55,
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {srv.technicianNotes}
                </div>

                {/* Itemised OEM Part Numbers & Fluids */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      marginRight: '4px',
                    }}
                  >
                    Parts &amp; Fluids:
                  </span>
                  {srv.partsReplaced.map((part, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '3px 9px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#E5E7EB',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Bespoke Modifications & OEM Parts Vault */}
      {activeTab === 'modifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#F3F4F6',
                  margin: 0,
                  textTransform: 'none',
                }}
              >
                OEM+ Motorsport Upgrades &amp; Original Parts Custody
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Verified reversible modifications with serialised part numbers and
                climate-controlled OEM factory part retention.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLogType('mod');
                setShowAddLogModal(true);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              + Register Upgrade
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {car.modifications.map((mod) => (
              <div
                key={mod.id}
                style={{
                  backgroundColor: 'rgba(14, 16, 21, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
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
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: '#38BDF8',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        {mod.category}
                      </span>
                      {mod.partNumber && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#D4AF37',
                            backgroundColor: 'rgba(212,175,55,0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          PN: {mod.partNumber}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        Installed {mod.dateInstalled} by {mod.installedBy}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        marginTop: '6px',
                      }}
                    >
                      {mod.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#D4AF37',
                        fontWeight: 700,
                      }}
                    >
                      Manufacturer: {mod.brand}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                      }}
                    >
                      £{mod.costGbp.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: '#4ADE80', fontWeight: 700 }}>
                      {mod.reversible
                        ? '✓ 100% REVERSIBLE TO FACTORY'
                        : 'FACTORY MSO COMMISSION'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5 }}>
                  {mod.notes}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '11px',
                  }}
                >
                  {mod.oemStorageLocation && (
                    <span style={{ color: '#E5E7EB' }}>
                      <strong style={{ color: '#9CA3AF' }}>OEM Custody:</strong>{' '}
                      {mod.oemStorageLocation}
                    </span>
                  )}
                  {mod.dynoGainHp && (
                    <span style={{ color: '#4ADE80', fontWeight: 700 }}>
                      Dyno Delta: +{mod.dynoGainHp} BHP
                    </span>
                  )}
                  {mod.weightDeltaKg && (
                    <span style={{ color: '#38BDF8', fontWeight: 700 }}>
                      Mass Delta: {mod.weightDeltaKg} kg
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Circuit Telemetry & Geometry Setups */}
      {activeTab === 'track' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#F3F4F6',
                  margin: 0,
                  textTransform: 'none',
                }}
              >
                Circuit Geometry, Pressures &amp; Lap Telemetry
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                Cold/Hot target pressures, camber/toe alignment, ride heights, and
                damper clicks per circuit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLogType('track');
                setShowAddLogModal(true);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              + Log Circuit Setup
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {car.trackSetups.map((setup) => (
              <div
                key={setup.id}
                style={{
                  backgroundColor: 'rgba(14, 16, 21, 0.9)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🏁</span>
                      <h3
                        style={{
                          fontSize: '19px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          margin: 0,
                        }}
                      >
                        {setup.circuitName}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        ({setup.country})
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#D4AF37',
                        fontWeight: 600,
                        marginTop: '4px',
                      }}
                    >
                      {setup.tyreCompound} &bull; {setup.weatherCondition}
                      {setup.tyreHeatCycles
                        ? ` • Heat Cycle #${setup.tyreHeatCycles}`
                        : ''}
                    </div>
                  </div>

                  <div
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(0,0,0,0.5) 100%)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      textAlign: 'right',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#D4AF37',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      VBOX Verified Lap
                    </div>
                    <div
                      style={{
                        fontSize: '21px',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.bestLapTime}
                    </div>
                  </div>
                </div>

                {/* 6-Point Engineering Setup Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                    gap: '10px',
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Cold Bleed (F / R)
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.coldPressureFrontPsi} / {setup.coldPressureRearPsi} PSI
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Hot Target (78°C)
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#38BDF8',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.hotTargetPressureFrontPsi} /{' '}
                      {setup.hotTargetPressureRearPsi} PSI
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Static Camber (F / R)
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.frontCamberDeg}° / {setup.rearCamberDeg}°
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Kinematic Toe (F / R)
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.frontToeMm || '+0.4mm'} / {setup.rearToeMm || '+3.0mm'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Ride Height (F / R)
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.rideHeightFrontMm || 98}mm /{' '}
                      {setup.rideHeightRearMm || 122}mm
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Aero Wing &amp; Bias
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#D4AF37',
                        fontFamily: 'monospace',
                      }}
                    >
                      {setup.rearWingAngleDeg}° AoA &bull; {setup.brakeBiasFrontPercent}%
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#D1D5DB',
                    borderLeft: '2px solid #D4AF37',
                    paddingLeft: '12px',
                  }}
                >
                  <strong>Damper &amp; Handling Telemetry:</strong> Front (
                  {setup.damperFrontBump}) / Rear ({setup.damperRearBump}) — &ldquo;
                  {setup.notes}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Optional 360° Interactive Walkaround Studio */}
      {activeTab === 'walkaround' && <Car360WalkaroundStudio car={car} />}

      {/* HIGH-PRECISION ENTHUSIAST LOGGING MODAL */}
      {showAddLogModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.84)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              backgroundColor: '#0B0D12',
              border: '1px solid rgba(212, 175, 55, 0.38)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '26px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
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
                <div
                  style={{
                    fontSize: '10px',
                    color: '#D4AF37',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Digital Provenance Stamp &bull; {car.vin}
                </div>
                <h3
                  style={{
                    fontSize: '19px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    margin: '2px 0 0',
                  }}
                >
                  {car.make} {car.model} Passport Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                style={{ fontSize: '18px', color: '#9CA3AF', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Entry Type Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'service', label: 'Service & DME Audit' },
                  { id: 'mod', label: 'OEM+ Modification' },
                  { id: 'track', label: 'Circuit Telemetry' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLogType(t.id)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backgroundColor:
                      logType === t.id
                        ? 'rgba(212, 175, 55, 0.2)'
                        : 'rgba(255, 255, 255, 0.04)',
                    color: logType === t.id ? '#D4AF37' : '#9CA3AF',
                    border:
                      logType === t.id
                        ? '1px solid rgba(212, 175, 55, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* SERVICE FORM WITH ENTHUSIAST PRESETS */}
            {logType === 'service' && (
              <form
                onSubmit={handleSaveService}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Service Classification
                    </label>
                    <select
                      value={srvType}
                      onChange={(e) =>
                        setSrvType(e.target.value as ServiceRecord['type'])
                      }
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <option value="Pre-Track Engineering">
                        Pre-Track Engineering
                      </option>
                      <option value="Annual Service">Annual Service</option>
                      <option value="Brake & Rotor Service">
                        Brake &amp; Rotor Service
                      </option>
                      <option value="Inspection & Fluids">
                        Inspection &amp; Fluids
                      </option>
                      <option value="Warranty & Classiche">
                        Warranty &amp; Classiche
                      </option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Official Dealer / Motorsport Centre
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Porsche Centre Silverstone / Manthey"
                      value={srvProvider}
                      onChange={(e) => setSrvProvider(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Odometer (mi)
                    </label>
                    <input
                      type="number"
                      value={srvMileage}
                      onChange={(e) => setSrvMileage(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Invoice (£ GBP)
                    </label>
                    <input
                      type="number"
                      placeholder="1680"
                      value={srvCost}
                      onChange={(e) => setSrvCost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Master Technician
                    </label>
                    <input
                      type="text"
                      placeholder="M. Lindner"
                      value={srvTech}
                      onChange={(e) => setSrvTech(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                {/* Precision Engineering Measurements Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(212, 175, 55, 0.06)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '9px',
                        color: '#D4AF37',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      ECU / DME Over-Rev Readout
                    </label>
                    <input
                      type="text"
                      value={srvDmeStatus}
                      onChange={(e) => setSrvDmeStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#0E1015',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#4ADE80',
                        marginTop: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '9px',
                        color: '#D4AF37',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Ceramic Rotor Mass &amp; Torque Spec
                    </label>
                    <input
                      type="text"
                      value={srvRotorWear}
                      onChange={(e) => setSrvRotorWear(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#0E1015',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                {/* 1-Tap Enthusiast Part & Fluid Selector Chips */}
                <div>
                  <label
                    style={{
                      fontSize: '10px',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    1-Tap Authentic Motorsport Parts &amp; Fluids ({srvPartsList.length}{' '}
                    selected)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ENTHUSIAST_SERVICE_PRESETS.map((preset) => {
                      const active = srvPartsList.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => togglePresetPart(preset)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            backgroundColor: active
                              ? 'rgba(212, 175, 55, 0.22)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: active
                              ? '1px solid rgba(212, 175, 55, 0.6)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            color: active ? '#F5E6B8' : '#9CA3AF',
                          }}
                        >
                          {active ? '✓ ' : '+ '}
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add custom OEM part number or fluid..."
                      value={customPartInput}
                      onChange={(e) => setCustomPartInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        fontSize: '11px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={addCustomPart}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      Add Part
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: '10px',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                    }}
                  >
                    Master Technician Dossier Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Record corner weights, torque values, fluid boil test, or boroscope findings..."
                    value={srvNotes}
                    onChange={(e) => setSrvNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#14171F',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#F3F4F6',
                      marginTop: '4px',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
                    color: '#050608',
                    fontWeight: 900,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginTop: '4px',
                  }}
                >
                  Stamp Official Service &amp; DME Certificate
                </button>
              </form>
            )}

            {/* MODIFICATION FORM WITH ENTHUSIAST PRESETS */}
            {logType === 'mod' && (
              <form
                onSubmit={handleSaveMod}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '10px',
                      color: '#D4AF37',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    1-Tap Collector-Grade Component Templates
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ENTHUSIAST_MOD_PRESETS.map((item) => (
                      <button
                        key={item.partNumber}
                        type="button"
                        onClick={() => {
                          setModName(item.name);
                          setModBrand(item.brand);
                          setModPartNumber(item.partNumber);
                          setModCategory(item.category);
                          setModCost(item.cost);
                        }}
                        style={{
                          padding: '5px 9px',
                          borderRadius: '5px',
                          fontSize: '10px',
                          backgroundColor:
                            modPartNumber === item.partNumber
                              ? 'rgba(212, 175, 55, 0.22)'
                              : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          color: '#F3F4F6',
                        }}
                      >
                        + {item.brand}: {item.name.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Component Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kline Inconel 625 Exhaust"
                      value={modName}
                      onChange={(e) => setModName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Manufacturer &amp; Part Number
                    </label>
                    <input
                      type="text"
                      placeholder="Kline / KLN-992-INC"
                      value={modBrand}
                      onChange={(e) => setModBrand(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Original OEM Part Storage Location
                    </label>
                    <input
                      type="text"
                      value={modOemStorage}
                      onChange={(e) => setModOemStorage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#4ADE80',
                        marginTop: '4px',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Cost (£ GBP)
                    </label>
                    <input
                      type="number"
                      placeholder="8650"
                      value={modCost}
                      onChange={(e) => setModCost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: '10px',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                    }}
                  >
                    Engineering &amp; Provenance Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Document reversibility, dyno delta, or weight savings..."
                    value={modNotes}
                    onChange={(e) => setModNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#14171F',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#F3F4F6',
                      marginTop: '4px',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
                    color: '#050608',
                    fontWeight: 900,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginTop: '4px',
                  }}
                >
                  Register OEM+ Upgrade to Passport
                </button>
              </form>
            )}

            {/* CIRCUIT TELEMETRY FORM */}
            {logType === 'track' && (
              <form
                onSubmit={handleSaveTrack}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Circuit Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Silverstone GP / Spa-Francorchamps"
                      value={trackCircuit}
                      onChange={(e) => setTrackCircuit(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#F3F4F6',
                        marginTop: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      VBOX Best Lap
                    </label>
                    <input
                      type="text"
                      placeholder="2:06.42"
                      value={trackLapTime}
                      onChange={(e) => setTrackLapTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#D4AF37',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '9px', color: '#9CA3AF' }}>
                      COLD F (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={trackTyreFrontPsi}
                      onChange={(e) => setTrackTyreFrontPsi(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '7px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', color: '#9CA3AF' }}>
                      COLD R (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={trackTyreRearPsi}
                      onChange={(e) => setTrackTyreRearPsi(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '7px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', color: '#9CA3AF' }}>
                      CAMBER F (°)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={trackCamberFront}
                      onChange={(e) => setTrackCamberFront(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '7px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', color: '#9CA3AF' }}>
                      WING AoA (°)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={trackWingDeg}
                      onChange={(e) => setTrackWingDeg(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '7px',
                        borderRadius: '6px',
                        backgroundColor: '#14171F',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#F3F4F6',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: '10px',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                    }}
                  >
                    Handling &amp; Damper Click Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Record corner entry balance, DRS zones, and tyre carcass temps..."
                    value={trackNotes}
                    onChange={(e) => setTrackNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#14171F',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#F3F4F6',
                      marginTop: '4px',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)',
                    color: '#050608',
                    fontWeight: 900,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginTop: '4px',
                  }}
                >
                  Save Circuit Setup to Telemetry Ledger
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
