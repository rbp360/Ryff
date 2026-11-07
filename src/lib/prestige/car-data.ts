export interface ServiceSubItem {
  category: 'Powertrain & Fluids' | 'Brakes & Rotors' | 'ECU & DME Telemetry' | 'Chassis & Alignment' | 'Body, PPF & Concours';
  component: string;
  partNumber?: string;
  measurement?: string;
  torqueOrSpec?: string;
}

export interface ServiceRecord {
  id: string;
  date: string;
  mileage: number;
  provider: string;
  masterTechnician?: string;
  invoiceRef?: string;
  type: 'Annual Service' | 'Inspection & Fluids' | 'Brake & Rotor Service' | 'Major Overhaul' | 'Warranty & Classiche' | 'Pre-Track Engineering';
  costGbp: number;
  technicianNotes: string;
  dmeOverRevStatus?: string;
  partsReplaced: string[];
  detailedMeasurements?: ServiceSubItem[];
  verifiedOfficial: boolean;
  documents?: string[];
}

export interface ModificationRecord {
  id: string;
  category: 'Exhaust & Powertrain' | 'Aero & Carbon' | 'Suspension & Geometry' | 'Braking & Forged Wheels' | 'ECU & Telemetry' | 'PPF & Concours Protection';
  name: string;
  brand: string;
  partNumber?: string;
  dateInstalled: string;
  installedBy: string;
  costGbp: number;
  reversible: boolean;
  originalPartsRetained: boolean;
  oemStorageLocation?: string;
  dynoGainHp?: number;
  weightDeltaKg?: number;
  notes: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  category: 'Service' | 'Inspection' | 'Tires' | 'Brake Fluid' | 'Warranty & Classiche' | 'Track Check';
  dueDate: string;
  dueMileage?: number;
  urgent: boolean;
  status: 'Pending' | 'Completed' | 'Booked';
  assignedCenter?: string;
  technicalContext?: string;
}

export interface TrackSetupProfile {
  id: string;
  circuitName: string;
  country: string;
  weatherCondition: 'Dry (Warm)' | 'Dry (Cool)' | 'Damp' | 'Wet';
  bestLapTime: string;
  tyreCompound: string;
  tyreHeatCycles?: number;
  coldPressureFrontPsi: number;
  coldPressureRearPsi: number;
  hotTargetPressureFrontPsi: number;
  hotTargetPressureRearPsi: number;
  frontCamberDeg: number;
  rearCamberDeg: number;
  frontToeMm?: string;
  rearToeMm?: string;
  rideHeightFrontMm?: number;
  rideHeightRearMm?: number;
  damperFrontBump: string;
  damperFrontRebound: string;
  damperRearBump: string;
  damperRearRebound: string;
  rearWingAngleDeg: number;
  brakeBiasFrontPercent: number;
  fuelLoadLiters: number;
  notes: string;
}

export interface WalkaroundHotspot {
  id: string;
  label: string;
  category: 'Powertrain' | 'Brakes' | 'Aero' | 'Suspension' | 'Cockpit' | 'Body & PPF';
  angleDeg: number;
  xPercent: number;
  yPercent: number;
  headline: string;
  specDetail: string;
  healthMetric: string;
  lastVerified: string;
  status: 'OPTIMAL' | 'MONITOR' | 'BESPOKE';
}

export interface ConsumableTelemetry {
  dmeOverRev: {
    ranges1To6: string;
    lastReadoutDate: string;
    operatingHours: number;
    status: string;
  };
  carbonCeramicBrakes: {
    discType: string;
    frontLeftWearPct: number;
    frontRightWearPct: number;
    rearLeftWearPct: number;
    rearRightWearPct: number;
    padCompound: string;
    padLifeRemainingMm: number;
  };
  tyreSet: {
    compound: string;
    dateCodeDot: string;
    heatCycles: number;
    maxRecommendedCycles: number;
    treadDepthFrontMm: number;
    treadDepthRearMm: number;
  };
  paintAndProtection: {
    ppfBrand: string;
    coverage: string;
    ceramicCoating: string;
    averagePaintMicrons: string;
  };
  vaultClimate: {
    ctekConditioner: 'Connected (Float Stage 4)' | 'Connected (Absorption)' | 'Standby';
    relativeHumidityPct: number;
    ambientTempC: number;
  };
}

export interface PrestigeCar {
  id: string;
  slug: string;
  silhouetteType: 'gt3rs' | 'pista' | '765lt';
  accentHex: string;
  make: string;
  model: string;
  subModel?: string;
  year: number;
  vin: string;
  engineNumber: string;
  paintCode: string;
  licensePlate: string;
  heroImage: string;
  galleryImages: string[];
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  transmission: string;
  powerBhp: number;
  torqueNm: number;
  curbWeightKg: number;
  currentMileage: number;
  estimatedValueGbp: number;
  purchaseDate: string;
  purchasePriceGbp: number;
  garageLocation: string;
  tagline: string;
  keyStats: {
    zeroToSixtyMph: string;
    topSpeedMph: number;
    drivetrain: string;
    downforceKg?: number;
  };
  factoryOptions: { code: string; description: string }[];
  consumables: ConsumableTelemetry;
  walkaroundHotspots: WalkaroundHotspot[];
  services: ServiceRecord[];
  modifications: ModificationRecord[];
  reminders: ReminderItem[];
  trackSetups: TrackSetupProfile[];
}

export const PRESTIGE_CARS: PrestigeCar[] = [
  {
    id: 'car-992-gt3rs',
    slug: 'porsche-992-gt3-rs',
    silhouetteType: 'gt3rs',
    accentHex: '#D4AF37',
    make: 'Porsche',
    model: '911 GT3 RS',
    subModel: 'Weissach Package',
    year: 2024,
    vin: 'WP0AF2A97RS198421',
    engineNumber: 'MA2.75-6409821',
    paintCode: 'LM9A / M7S (Ice Grey Metallic / Pyro Red)',
    licensePlate: 'RS24 GT3',
    heroImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1600&q=85',
    galleryImages: [
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80'
    ],
    exteriorColor: 'Ice Grey Metallic with Exposed Twill Carbon & Pyro Red Forged Magnesium',
    interiorColor: 'Black Race-Tex & 918 Full Bucket Seats with Guards Red Contrast',
    engine: '4.0L Naturally Aspirated Flat-6 (Individual Throttle Bodies, 9,000 RPM)',
    transmission: '7-Speed Porsche Doppelkupplung (PDK) with Short Ratio Final Drive',
    powerBhp: 518,
    torqueNm: 465,
    curbWeightKg: 1450,
    currentMileage: 4210,
    estimatedValueGbp: 295000,
    purchaseDate: '2024-03-12',
    purchasePriceGbp: 268000,
    garageLocation: 'Cotswolds Sanctuary, Bay 04',
    tagline: '860 kg of active DRS downforce with carbon anti-roll bars and steering-wheel damper control.',
    keyStats: {
      zeroToSixtyMph: '3.0s',
      topSpeedMph: 184,
      drivetrain: 'Rear-Engine, RWD',
      downforceKg: 860
    },
    factoryOptions: [
      { code: 'P70', description: 'Weissach Package with Exposed Carbon Roll Cage & CFRP Shear Panel' },
      { code: '450', description: 'Porsche Ceramic Composite Brake (PCCB) with High-Gloss Black Calipers' },
      { code: '56R', description: '20"/21" GT3 RS Forged Lightweight Magnesium Centre-Lock Wheels (-8 kg)' },
      { code: '2UH', description: 'Front Axle Lift System (Electro-Hydraulic)' },
      { code: 'Q1K', description: 'Full Carbon Bucket Seats (3D-Printed Bodyform Cushioning)' },
      { code: '8JU', description: 'Tinted LED Matrix Main Headlights incl. PDLS Plus' }
    ],
    consumables: {
      dmeOverRev: {
        ranges1To6: '0 / 0 / 0 / 0 / 0 / 0 ignitions',
        lastReadoutDate: '2024-09-18 (PIWIS 4)',
        operatingHours: 112.4,
        status: 'STAGE 0 CLEAN'
      },
      carbonCeramicBrakes: {
        discType: 'Surface Transforms ST-KIT-1042 / OEM PCCB Stored',
        frontLeftWearPct: 96,
        frontRightWearPct: 95,
        rearLeftWearPct: 97,
        rearRightWearPct: 97,
        padCompound: 'Pagid RSC1 Endurance Carbon Ceramic',
        padLifeRemainingMm: 9.8
      },
      tyreSet: {
        compound: 'Michelin Pilot Sport Cup 2 R (275/35 ZR20 & 335/30 ZR21 N0)',
        dateCodeDot: 'DOT 1124',
        heatCycles: 6,
        maxRecommendedCycles: 12,
        treadDepthFrontMm: 4.1,
        treadDepthRearMm: 3.8
      },
      paintAndProtection: {
        ppfBrand: 'XPEL Ultimate Plus 10mil (Track Nose & Rear Arches Double-Layered)',
        coverage: '100% Full Body + Exposed Carbon Weave',
        ceramicCoating: 'Gtechniq Crystal Serum Ultra 10H',
        averagePaintMicrons: '118 µm Original Factory Clearcoat'
      },
      vaultClimate: {
        ctekConditioner: 'Connected (Float Stage 4)',
        relativeHumidityPct: 48,
        ambientTempC: 18.5
      }
    },
    walkaroundHotspots: [
      {
        id: 'hs-gt3-aero',
        label: 'Active DRS Swan-Neck Wing',
        category: 'Aero',
        angleDeg: 145,
        xPercent: 82,
        yPercent: 34,
        headline: 'Hydraulic Active DRS & 860 kg Downforce',
        specDetail: 'Dual-element CFRP rear wing with hydraulic DRS actuators calibrated to 8.5° AoA.',
        healthMetric: 'Actuator Pressure: 165 bar (Nominal)',
        lastVerified: '2024-09-18 @ Silverstone',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-gt3-brakes',
        label: 'Surface Transforms Ceramic Rotors',
        category: 'Brakes',
        angleDeg: 45,
        xPercent: 25,
        yPercent: 64,
        headline: '410mm Continuous-Carbon Ceramic Rotors & Centre-Locks',
        specDetail: 'Fitted with Pagid RSC1 pads & Castrol React SRF fluid. Centre-locks torqued to 600 Nm.',
        healthMetric: 'Carbide Mass: 96% Remaining (9.8mm Pad)',
        lastVerified: '2024-09-18 @ 3,850 mi',
        status: 'BESPOKE'
      },
      {
        id: 'hs-gt3-engine',
        label: '4.0L Flat-6 & Kline Inconel',
        category: 'Powertrain',
        angleDeg: 215,
        xPercent: 78,
        yPercent: 56,
        headline: '9,000 RPM ITB Flat-6 + Kline Inconel Exhaust',
        specDetail: 'Solid lifter valvetrain, rigid rocker arms, Kline Inconel manifolds (-14.2 kg) & Mobil 1 C40 GT.',
        healthMetric: 'DME Range 1–6: 0 Ignitions (112.4 hrs)',
        lastVerified: '2024-09-18 (PIWIS 4)',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-gt3-suspension',
        label: 'Manthey 4-Way Track Geometry',
        category: 'Suspension',
        angleDeg: 315,
        xPercent: 32,
        yPercent: 58,
        headline: 'Double-Wishbone Front Axle & Aero Teardrop Arms',
        specDetail: 'Corner-weighted for 85 kg driver + 50% fuel. Camber -2.8° F / -2.4° R with CFRP anti-roll bars.',
        healthMetric: 'Cross-Weight: 50.02% (Zero Play)',
        lastVerified: '2024-09-18 @ Silverstone',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-gt3-cockpit',
        label: 'Weissach Carbon Roll Cage & VBOX',
        category: 'Cockpit',
        angleDeg: 90,
        xPercent: 51,
        yPercent: 40,
        headline: 'Exposed Satin Carbon Roll Cage & Racelogic VBOX HD2',
        specDetail: 'Direct Porsche CAN-bus integration logging brake pressure, throttle trace, and damper settings.',
        healthMetric: 'LiFePO4 Battery: 13.4V (CTEK Float)',
        lastVerified: 'Live Vault Telemetry',
        status: 'BESPOKE'
      }
    ],
    services: [
      {
        id: 'srv-001',
        date: '2024-09-18',
        mileage: 3850,
        provider: 'Porsche Centre Silverstone (Official Motorsport Partner)',
        masterTechnician: 'M. Lindner (Porsche Gold Certified)',
        invoiceRef: 'PCS-2024-09841',
        type: 'Pre-Track Engineering',
        costGbp: 1680,
        dmeOverRevStatus: 'Ranges 1–6: 0 Ignitions (112.4 Operating Hours)',
        technicianNotes: 'Comprehensive post-Spa Francorchamps motorsport inspection. Castrol React SRF racing brake fluid pressure bled across all four corners. Surface Transforms rotor density measured via Proceq Carboteq tool (96% mass remaining). Corner-weight balance and kinematic toe verified on Manthey optical laser rig. Centre-lock wheel nuts cleaned, re-greased with Castrol Optimol Paste TA, and torqued to 600 Nm.',
        partsReplaced: [
          'Castrol React SRF Racing Brake Fluid (2.0L)',
          'Mobil 1 ESP X4 0W-40 C40 GT Spec Oil (7.8L)',
          '9GT-115-562 OEM Motorsport Oil Filter & Titanium Drain Plug',
          '992-609-161 Porsche Motorsport Cabin & Intake Filters'
        ],
        detailedMeasurements: [
          {
            category: 'ECU & DME Telemetry',
            component: 'PIWIS 4 Over-Rev & Operating Hours Log',
            partNumber: 'DME-992-GT3RS',
            measurement: 'Range 1–6: 0 / 0 / 0 / 0 / 0 / 0',
            torqueOrSpec: '112.4h Total / 14.2h Track'
          },
          {
            category: 'Brakes & Rotors',
            component: 'Carbide Density & Pad Thickness Check',
            partNumber: 'ST-KIT-1042 / Pagid RSC1',
            measurement: 'FL 96% | FR 95% | RL 97% | RR 97%',
            torqueOrSpec: 'Caliper Studs: 115 Nm / Centre-Lock: 600 Nm'
          },
          {
            category: 'Chassis & Alignment',
            component: 'Manthey Optical 4-Wheel Laser Alignment',
            measurement: 'Camber -2.8° F / -2.4° R | Cross-weight 50.0%',
            torqueOrSpec: 'Subframe Bolts Verified: 110 Nm'
          }
        ],
        verifiedOfficial: true,
        documents: ['PIWIS4_DME_OverRev_Certificate.pdf', 'Carboteq_Rotor_Density_Scan.pdf', 'Manthey_CornerWeight_Sheet.pdf']
      },
      {
        id: 'srv-002',
        date: '2024-04-02',
        mileage: 1200,
        provider: 'Porsche Centre Reading (Official Factory Centre)',
        masterTechnician: 'S. Vance (GT Specialist)',
        invoiceRef: 'PCR-2024-03119',
        type: 'Inspection & Fluids',
        costGbp: 920,
        dmeOverRevStatus: 'Ranges 1–6: 0 Ignitions (38.1 Operating Hours)',
        technicianNotes: 'Post break-in 1,200-mile engine oil and filter service per Weissach Motorsport protocol. Magnetic sump plug inspected—zero ferrous debris. Active aero hydraulic lines and front axle lift pressure tested.',
        partsReplaced: [
          'Mobil 1 0W-40 C40 GT Oil (7.8L)',
          'OEM Oil Filter Element & Crush Washers'
        ],
        detailedMeasurements: [
          {
            category: 'Powertrain & Fluids',
            component: 'Break-In Oil Analysis & Filter Teardown',
            partNumber: '0W40-C40-GT',
            measurement: '0 ppm abnormal wear metals',
            torqueOrSpec: 'Oil Sump Plugs: 30 Nm / 60 Nm'
          }
        ],
        verifiedOfficial: true,
        documents: ['PDI_RunIn_Clearance_Certificate.pdf']
      }
    ],
    modifications: [
      {
        id: 'mod-001',
        category: 'Exhaust & Powertrain',
        name: 'Inconel 625 Race Manifolds & Valved Rear Silencer System',
        brand: 'Kline Innovation',
        partNumber: 'KLN-992-GT3RS-INC',
        dateInstalled: '2024-05-15',
        installedBy: 'JCR Developments, Silverstone',
        costGbp: 8650,
        reversible: true,
        originalPartsRetained: true,
        oemStorageLocation: 'Cotswolds Sanctuary Crate #04-A',
        dynoGainHp: 18,
        weightDeltaKg: -14.2,
        notes: 'Retains factory vacuum/electronic valve actuation via steering wheel mode dial. Produces F1-pitch acoustic resonance above 7,500 RPM while achieving 99.8 dB static noise test compliance with valves closed.'
      },
      {
        id: 'mod-002',
        category: 'Braking & Forged Wheels',
        name: 'Continuous-Fibre Carbon-Ceramic Rotors (410mm F / 390mm R) & Pagid RSC1',
        brand: 'Surface Transforms',
        partNumber: 'ST-KIT-1042-PCCB',
        dateInstalled: '2024-06-20',
        installedBy: 'Manthey Racing UK',
        costGbp: 14500,
        reversible: true,
        originalPartsRetained: true,
        oemStorageLocation: 'Cotswolds Sanctuary Climate Locker #02 (0 Miles on OEM PCCB)',
        weightDeltaKg: -4.8,
        notes: '3D woven continuous carbon-fibre construction runs 120°C cooler than chopped-fibre discs and can be factory refurbished up to 3 times. Preserves original delivery-mileage Porsche PCCB discs untouched in vault storage for 100% concours originality.'
      },
      {
        id: 'mod-003',
        category: 'ECU & Telemetry',
        name: 'VBOX Video HD2 Motorsport Package with Dual 1080p Cameras & CAN-Bus',
        brand: 'Racelogic Motorsport',
        partNumber: 'RLVDHD2-POR992',
        dateInstalled: '2024-07-04',
        installedBy: 'Racelogic UK HQ, Buckingham',
        costGbp: 3200,
        reversible: true,
        originalPartsRetained: true,
        oemStorageLocation: 'Non-Invasive Loom (Plug-and-Play Connector)',
        notes: '25Hz GPS + GLONASS receiver with direct inductive CAN-bus clip reading RPM, throttle percentage, brake line pressure (bar), steering angle, DRS state, and G-force onto synchronous video.'
      }
    ],
    reminders: [
      {
        id: 'rem-001',
        title: 'Castrol React SRF Brake Fluid Pressure Bleed (Post 3 Track Days)',
        category: 'Brake Fluid',
        dueDate: '2026-11-28',
        dueMileage: 4600,
        urgent: true,
        status: 'Pending',
        assignedCenter: 'Porsche Centre Silverstone',
        technicalContext: 'Wet boiling point protection (>270°C) prior to final autumn Silverstone GP test.'
      },
      {
        id: 'rem-002',
        title: 'Michelin Cup 2 R Heat-Cycle & Inner Shoulder Inspection (Cycle 6/12)',
        category: 'Tires',
        dueDate: '2026-12-10',
        dueMileage: 4800,
        urgent: false,
        status: 'Pending',
        assignedCenter: 'Manthey Racing UK Support',
        technicalContext: 'Operating at -2.8° front camber; verify inner carcass wear before cycle 8 grip drop-off.'
      },
      {
        id: 'rem-003',
        title: 'Annual Porsche Approved 111-Point Warranty & PIWIS DME Audit',
        category: 'Warranty & Classiche',
        dueDate: '2027-03-12',
        dueMileage: 7500,
        urgent: false,
        status: 'Booked',
        assignedCenter: 'Porsche Centre Reading',
        technicalContext: 'Maintains unbroken Porsche factory warranty and verified Stage 0 DME provenance.'
      }
    ],
    trackSetups: [
      {
        id: 'trk-001',
        circuitName: 'Silverstone Grand Prix Circuit',
        country: 'United Kingdom',
        weatherCondition: 'Dry (Warm)',
        bestLapTime: '2:06.42',
        tyreCompound: 'Michelin Pilot Sport Cup 2 R (N0)',
        tyreHeatCycles: 4,
        coldPressureFrontPsi: 21.0,
        coldPressureRearPsi: 22.0,
        hotTargetPressureFrontPsi: 28.5,
        hotTargetPressureRearPsi: 29.5,
        frontCamberDeg: -2.8,
        rearCamberDeg: -2.4,
        frontToeMm: '+0.4mm Total Toe-In',
        rearToeMm: '+3.2mm Total Toe-In',
        rideHeightFrontMm: 98,
        rideHeightRearMm: 122,
        damperFrontBump: '+2 Clicks (High-speed aero support through Maggotts/Becketts)',
        damperFrontRebound: '+1 Click',
        damperRearBump: '+2 Clicks',
        damperRearRebound: '+3 Clicks',
        rearWingAngleDeg: 8.5,
        brakeBiasFrontPercent: 54,
        fuelLoadLiters: 45,
        notes: 'Phenomenal front-end bite into Copse at 142 mph. PTV+ set to +1 Lock/+2 Coast. Tyres require 1.5 progressive sight laps to reach 28.5 PSI / 78°C core.'
      },
      {
        id: 'trk-002',
        circuitName: 'Circuit de Spa-Francorchamps',
        country: 'Belgium',
        weatherCondition: 'Damp',
        bestLapTime: '2:29.18',
        tyreCompound: 'Michelin Pilot Sport Cup 2 (275/335 N0)',
        tyreHeatCycles: 2,
        coldPressureFrontPsi: 23.5,
        coldPressureRearPsi: 24.5,
        hotTargetPressureFrontPsi: 30.0,
        hotTargetPressureRearPsi: 31.0,
        frontCamberDeg: -2.4,
        rearCamberDeg: -2.0,
        frontToeMm: '0.0mm Neutral',
        rearToeMm: '+2.8mm Toe-In',
        rideHeightFrontMm: 102,
        rideHeightRearMm: 126,
        damperFrontBump: '-2 Clicks (Compression compliance at bottom of Eau Rouge)',
        damperFrontRebound: '0 Baseline',
        damperRearBump: '-1 Click',
        damperRearRebound: '0 Baseline',
        rearWingAngleDeg: 6.0,
        brakeBiasFrontPercent: 52,
        fuelLoadLiters: 55,
        notes: 'Softened front compression prevents splitter strike through Raidillon compression at 156 mph. ESC/TC set to +3 slip allowance.'
      }
    ]
  },
  {
    id: 'car-ferrari-488-pista',
    slug: 'ferrari-488-pista',
    silhouetteType: 'pista',
    accentHex: '#EF4444',
    make: 'Ferrari',
    model: '488 Pista',
    subModel: 'Tailor Made Carbon Speciale',
    year: 2020,
    vin: 'ZFF86HLA8L0249811',
    engineNumber: 'F154CD-289401',
    paintCode: 'FER.322 / Blu Tour de France 522',
    licensePlate: 'V8 PST',
    heroImage: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1600&q=85',
    galleryImages: [
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1200&q=80'
    ],
    exteriorColor: 'Rosso Corsa DS 322 with Blu Tour de France & Bianco Avus NART Livery',
    interiorColor: 'Nero Alcantara with Giallo Modena Cavallino & Matte Carbon Fibre',
    engine: '3.9L Twin-Turbocharged 90° Flat-Plane V8 (F154CD Titanium Con-Rods)',
    transmission: '7-Speed F1 Dual-Clutch Magna Getrag 7DCL750',
    powerBhp: 710,
    torqueNm: 770,
    curbWeightKg: 1380,
    currentMileage: 5890,
    estimatedValueGbp: 355000,
    purchaseDate: '2021-08-14',
    purchasePriceGbp: 315000,
    garageLocation: 'Mayfair Mews Sanctuary, Vault 01',
    tagline: 'Maranello Challenge-derived V8 masterpiece with F1 S-Duct aerodynamics and Inconel manifolds.',
    keyStats: {
      zeroToSixtyMph: '2.8s',
      topSpeedMph: 211,
      drivetrain: 'Mid-Engine, RWD',
      downforceKg: 390
    },
    factoryOptions: [
      { code: 'TM01', description: 'Ferrari Tailor Made Maranello Bespoke Specification Commission' },
      { code: 'CEFS', description: 'Carbon Fibre Front Flaps, S-Duct Air Splitter & Side Air Splitters' },
      { code: 'CEL2', description: 'Engine Covers & Rear Diffuser in Exposed Matte Carbon Fibre' },
      { code: '4HAR', description: '4-Point FIA Safety Harnesses in Rosso with Carbon Racing Monocoque Seats' },
      { code: 'LOGO', description: 'Hand-Painted Scuderia Ferrari Fender Shields (Airbrushed Factory Option)' },
      { code: 'ELEV', description: 'Front & Rear Suspension Lifter System' }
    ],
    consumables: {
      dmeOverRev: {
        ranges1To6: 'DEIS Telemetry Clean (Zero Hard Limiter Events)',
        lastReadoutDate: '2024-07-10 (H.R. Owen DEIS Scan)',
        operatingHours: 164.0,
        status: 'CLASSICHE ELIGIBLE'
      },
      carbonCeramicBrakes: {
        discType: 'Brembo CCM3 Carbon-Ceramic (398mm F / 360mm R)',
        frontLeftWearPct: 92,
        frontRightWearPct: 91,
        rearLeftWearPct: 94,
        rearRightWearPct: 94,
        padCompound: 'Brembo Ferrari OEM High-Friction CCM Compound',
        padLifeRemainingMm: 10.4
      },
      tyreSet: {
        compound: 'Michelin Pilot Sport Cup 2 K2 (Ferrari Bespoke Compound)',
        dateCodeDot: 'DOT 4823',
        heatCycles: 3,
        maxRecommendedCycles: 10,
        treadDepthFrontMm: 4.8,
        treadDepthRearMm: 4.5
      },
      paintAndProtection: {
        ppfBrand: 'Topaz Skin Level 5 Bespoke Edge-Wrapped Film',
        coverage: '100% Exterior + Carbon S-Duct & Sill Channels',
        ceramicCoating: 'Modesta BC-04 Nano-Titanium Glass Coating',
        averagePaintMicrons: '132 µm Hand-Finished Factory Paint'
      },
      vaultClimate: {
        ctekConditioner: 'Connected (Float Stage 4)',
        relativeHumidityPct: 46,
        ambientTempC: 19.0
      }
    },
    walkaroundHotspots: [
      {
        id: 'hs-pista-sduct',
        label: 'F1 Aero S-Duct Nose',
        category: 'Aero',
        angleDeg: 15,
        xPercent: 18,
        yPercent: 52,
        headline: 'Formula 1-Derived Front Aero S-Duct',
        specDetail: 'Channels high-pressure air from front bumper Venturi through bonnet exit, increasing front axle downforce by 18%.',
        healthMetric: 'Topaz Level 5 PPF: Zero Stone Rash',
        lastVerified: '2024-07-10 @ H.R. Owen',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-pista-engine',
        label: 'F154CD Twin-Turbo V8',
        category: 'Powertrain',
        angleDeg: 180,
        xPercent: 72,
        yPercent: 46,
        headline: '3.9L F154CD V8 with Titanium Con-Rods & Inconel Headers',
        specDetail: '4x International Engine of the Year winner. Ball-bearing IHI turbos with rev-speed sensors and lightweight flywheel.',
        healthMetric: 'Compression & DEIS Telemetry: 100% Nominal',
        lastVerified: '2024-07-10 @ 5,400 mi',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-pista-brakes',
        label: 'Brembo CCM3 & Titanium Studs',
        category: 'Brakes',
        angleDeg: 300,
        xPercent: 28,
        yPercent: 64,
        headline: 'Brembo CCM3 Carbon-Ceramic System & FDE',
        specDetail: 'Coupled with Ferrari Dynamic Enhancer (FDE) lateral brake torque vectoring and OEM Titanium wheel bolts.',
        healthMetric: 'CCM3 Wear Index: 8% Used (92% Life)',
        lastVerified: '2024-07-10 (DEIS Digital Measure)',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-pista-cockpit',
        label: 'Tailor Made Carbon Cockpit',
        category: 'Cockpit',
        angleDeg: 95,
        xPercent: 48,
        yPercent: 42,
        headline: 'Tailor Made Nero Alcantara & LED Shift-Light Wheel',
        specDetail: 'No glovebox, sculpted Alcantara floor pans, matte carbon shift paddles, and Manettino with CT-Off FDE.',
        healthMetric: 'Zero Sticky Button Degradation',
        lastVerified: '2024-07-10 @ H.R. Owen',
        status: 'BESPOKE'
      }
    ],
    services: [
      {
        id: 'srv-003',
        date: '2024-07-10',
        mileage: 5400,
        provider: 'H.R. Owen Ferrari London (Official Service Centre)',
        masterTechnician: 'L. Bellini (Ferrari Master Diagnostic Tech)',
        invoiceRef: 'HRO-FER-88412',
        type: 'Annual Service',
        costGbp: 2350,
        dmeOverRevStatus: 'DEIS Report Clean — 0 Over-Rev Events / CCM3 Wear < 9%',
        technicianNotes: 'Year 4 Ferrari Genuine Maintenance Service plus supplemental preventative maintenance. Auxiliary drive belts replaced, Shell Helix Ultra 5W-40 oil flushed, Getrag 7DCL750 dual-clutch hydraulic filter inspected, and Brembo CCM3 carbon-ceramic disc weight loss recorded via Ferrari DEIS diagnostic computer (92% front / 94% rear remaining). Physical VIP build book and service warranty booklet stamped.',
        partsReplaced: [
          'Ferrari Shell Helix Ultra 5W-40 Synthetic (9.2L)',
          '295949 OEM Auxiliary Compressor & Alternator Belt Kit',
          '312508 NGK Iridium Racing Spark Plugs (x8)',
          'Shell Donax TX DCT Hydraulic Fluid Top-Up'
        ],
        detailedMeasurements: [
          {
            category: 'Brakes & Rotors',
            component: 'DEIS Electronic CCM3 Carbon Disc Wear Calculation',
            partNumber: 'BREMBO-CCM3-398',
            measurement: 'FL: 92% | FR: 91% | RL: 94% | RR: 94%',
            torqueOrSpec: 'Titanium Wheel Bolts: 120 Nm'
          },
          {
            category: 'Body, PPF & Concours',
            component: 'Ultrasonic Paint Depth & Tailor Made Livery Audit',
            measurement: '128–136 µm Across All Aluminium & Carbon Panels',
            torqueOrSpec: '100% Factory Original Paint Verified'
          }
        ],
        verifiedOfficial: true,
        documents: ['HR_Owen_Ferrari_Service_Certificate.pdf', 'DEIS_CCM_Brake_Wear_Report.pdf', 'Paint_Micron_Chart.pdf']
      }
    ],
    modifications: [
      {
        id: 'mod-004',
        category: 'PPF & Concours Protection',
        name: 'Level 5 Bespoke Edge-Wrapped PPF & Modesta BC-04 Titanium Coating',
        brand: 'Topaz Detailing London',
        partNumber: 'TPZ-LVL5-488PISTA',
        dateInstalled: '2021-08-20',
        installedBy: 'Topaz Detailing HQ, Park Royal',
        costGbp: 7400,
        reversible: true,
        originalPartsRetained: true,
        oemStorageLocation: 'Applied Directly Over Factory Paint (Zero Blade Cutting)',
        notes: 'Stage 2 enhancement correction prior to custom-plotted seamless PPF installation covering 100% of painted surfaces, hand-painted Scuderia shields, and carbon aero S-Duct channels.'
      },
      {
        id: 'mod-005',
        category: 'Exhaust & Powertrain',
        name: 'Inconel 200-Cell High-Flow Sport Catalysts with Gold Thermal Shielding',
        brand: 'Novitec Rosso',
        partNumber: 'F1-488-75-NOV',
        dateInstalled: '2022-04-11',
        installedBy: 'dk Engineering, Chorleywood',
        costGbp: 5600,
        reversible: true,
        originalPartsRetained: true,
        oemStorageLocation: 'dk Engineering Climate Storage Vault #118',
        dynoGainHp: 22,
        weightDeltaKg: -7.5,
        notes: 'Reduces engine bay radiant heat by 35°C and sharpens turbocharger transient response while remaining fully emissions compliant. OEM catalysts sealed in dry storage.'
      }
    ],
    reminders: [
      {
        id: 'rem-004',
        title: 'Ferrari Power15 Extended Factory Warranty & Classiche Pre-Check',
        category: 'Warranty & Classiche',
        dueDate: '2027-01-20',
        dueMileage: 6800,
        urgent: false,
        status: 'Booked',
        assignedCenter: 'H.R. Owen Ferrari London',
        technicalContext: 'Annual 190-point Ferrari factory inspection to extend comprehensive Power15 coverage.'
      }
    ],
    trackSetups: [
      {
        id: 'trk-003',
        circuitName: 'Donington Park GP Circuit',
        country: 'United Kingdom',
        weatherCondition: 'Dry (Warm)',
        bestLapTime: '1:34.80',
        tyreCompound: 'Michelin Pilot Sport Cup 2 K2 (Ferrari Spec)',
        tyreHeatCycles: 2,
        coldPressureFrontPsi: 22.0,
        coldPressureRearPsi: 21.0,
        hotTargetPressureFrontPsi: 29.0,
        hotTargetPressureRearPsi: 28.0,
        frontCamberDeg: -2.4,
        rearCamberDeg: -2.0,
        frontToeMm: '+0.6mm Toe-In',
        rearToeMm: '+2.6mm Toe-In',
        rideHeightFrontMm: 105,
        rideHeightRearMm: 128,
        damperFrontBump: 'SCM-E Magnetorheological: Race Stiff (Bumpy Road OFF)',
        damperFrontRebound: 'Factory Track Calibration',
        damperRearBump: 'SCM-E Race Stiff',
        damperRearRebound: 'Factory Track Calibration',
        rearWingAngleDeg: 14.0,
        brakeBiasFrontPercent: 55,
        fuelLoadLiters: 50,
        notes: 'Manettino in CT-Off with Side Slip Control 6.0 & Ferrari Dynamic Enhancer active. Zero turbo lag exiting Melbourne Hairpin.'
      }
    ]
  },
  {
    id: 'car-mclaren-765lt',
    slug: 'mclaren-765lt-spider',
    silhouetteType: '765lt',
    accentHex: '#38BDF8',
    make: 'McLaren',
    model: '765LT Spider',
    subModel: 'MSO Bespoke #142 of 765',
    year: 2022,
    vin: 'SBM14FCA2NW765142',
    engineNumber: 'M840T-765-00142',
    paintCode: 'MSO Curacao Blue / Visual Carbon Pack 1-3',
    licensePlate: 'LT22 SPY',
    heroImage: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1600&q=85',
    galleryImages: [
      'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80'
    ],
    exteriorColor: 'MSO Curacao Blue with Gloss Visual Carbon Fibre Exterior Packs 1, 2 & 3',
    interiorColor: 'Carbon Black Alcantara with McLaren Orange Laser-Perforations & Senna P1-GTR Shells',
    engine: '4.0L Twin-Turbocharged Flat-Plane V8 (M840T with Senna Forged Pistons & Triple-Layer Gasket)',
    transmission: '7-Speed SSG Dual-Clutch with Formula 1 Ignition-Cut Shift Strategy',
    powerBhp: 755,
    torqueNm: 800,
    curbWeightKg: 1388,
    currentMileage: 3120,
    estimatedValueGbp: 385000,
    purchaseDate: '2022-10-05',
    purchasePriceGbp: 395000,
    garageLocation: 'Cheshire Sanctuary, Monocell Bay 02',
    tagline: 'Longtail aerodynamic violence with full-titanium quad exhaust, Senna brakes, and PCC II hydraulic suspension.',
    keyStats: {
      zeroToSixtyMph: '2.7s',
      topSpeedMph: 205,
      drivetrain: 'Carbon Monocage II-S, Mid-Engine RWD',
      downforceKg: 480
    },
    factoryOptions: [
      { code: 'MSO-CB', description: 'McLaren Special Operations Curacao Blue Paintwork & Hand-Painted Callouts' },
      { code: 'CFP-123', description: 'Gloss Visual Carbon Fibre Exterior Packs 1, 2 & 3 (Splitter, Diffuser, Tonneau, B-Pillars)' },
      { code: 'MSO-FN', description: 'MSO Gloss Carbon Front Fender Louvres & Roof Tonneau Air Scoop' },
      { code: 'SEN-ST', description: 'Super-Lightweight Carbon Fibre Racing Seats (McLaren Senna Specification)' },
      { code: 'TRK-BR', description: 'McLaren Track Brake Upgrade (Senna Twin-Booster & High-Thermal CCM-R Discs)' },
      { code: 'MTT-3C', description: 'McLaren Track Telemetry (MTT) with Lap Time Predictor & 3 Integrated Cameras' }
    ],
    consumables: {
      dmeOverRev: {
        ranges1To6: 'MDS2 ECU Audit Clean (Zero Faults / PCC II 140 Bar)',
        lastReadoutDate: '2024-08-04 (McLaren Manchester MDS2)',
        operatingHours: 89.2,
        status: 'VERIFIED OPTIMAL'
      },
      carbonCeramicBrakes: {
        discType: 'McLaren Senna Spec CCM-R Next-Gen Carbon Ceramic (390mm)',
        frontLeftWearPct: 95,
        frontRightWearPct: 95,
        rearLeftWearPct: 96,
        rearRightWearPct: 96,
        padCompound: 'McLaren Track Spec High-Thermal Compound',
        padLifeRemainingMm: 10.1
      },
      tyreSet: {
        compound: 'Pirelli P-Zero Trofeo R (MC2 McLaren LT Bespoke Spec)',
        dateCodeDot: 'DOT 1923',
        heatCycles: 7,
        maxRecommendedCycles: 10,
        treadDepthFrontMm: 3.1,
        treadDepthRearMm: 2.9
      },
      paintAndProtection: {
        ppfBrand: 'SunTek Reaction Self-Healing Hydrophobic PPF + Gorilla Glass Windscreen Protection',
        coverage: '100% Exterior + Exposed Carbon Monocage Sills',
        ceramicCoating: 'Feynlab Self-Heal Plus Ceramic',
        averagePaintMicrons: '124 µm MSO Hand-Sprayed Finish'
      },
      vaultClimate: {
        ctekConditioner: 'Connected (Float Stage 4)',
        relativeHumidityPct: 45,
        ambientTempC: 18.0
      }
    },
    walkaroundHotspots: [
      {
        id: 'hs-765-airbrake',
        label: 'Longtail Active Airbrake & Quad Titanium',
        category: 'Aero',
        angleDeg: 165,
        xPercent: 84,
        yPercent: 40,
        headline: 'Active Longtail Airbrake & Top-Exit Quad Titanium Exhaust',
        specDetail: 'Airbrake deploys to 60° under heavy braking (+60% rear load). 3.8 kg all-titanium exhaust saving 40% over Inconel.',
        healthMetric: 'Airbrake Hydraulic Response: 0.18s (100%)',
        lastVerified: '2024-08-04 @ McLaren',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-765-pcc2',
        label: 'PCC II Hydraulic Accumulators',
        category: 'Suspension',
        angleDeg: 240,
        xPercent: 68,
        yPercent: 62,
        headline: 'Proactive Chassis Control II (Interlinked Hydraulic Suspension)',
        specDetail: 'Eliminates conventional mechanical anti-roll bars in favour of high-pressure nitrogen accumulators and helper springs.',
        healthMetric: 'Accumulator Pressure: 140.2 Bar (Spec: 140 Bar)',
        lastVerified: '2024-08-04 @ 2,950 mi',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-765-brakes',
        label: 'Senna CCM-R Track Brakes',
        category: 'Brakes',
        angleDeg: 35,
        xPercent: 24,
        yPercent: 62,
        headline: 'McLaren Senna CCM-R Rotors & F1-Style Integrated Caliper Cooling',
        specDetail: '7-month woven carbon-ceramic discs with 4x thermal conductivity of standard CCB. Stops 124–0 mph in 108m.',
        healthMetric: 'CCM-R Thermal Mass: 95% Remaining',
        lastVerified: '2024-08-04 (MDS2)',
        status: 'OPTIMAL'
      },
      {
        id: 'hs-765-monocage',
        label: 'Monocage II-S & Senna Seats',
        category: 'Cockpit',
        angleDeg: 90,
        xPercent: 49,
        yPercent: 44,
        headline: 'Carbon Fibre Monocage II-S & 3.35 kg Senna Carbon Shells',
        specDetail: 'Structural carbon tub requiring zero additional chassis bracing over Coupe. Fitted with Lithium-Ion charger port.',
        healthMetric: 'Li-Ion Battery Health: 99% SoH',
        lastVerified: 'Live Vault Telemetry',
        status: 'BESPOKE'
      }
    ],
    services: [
      {
        id: 'srv-004',
        date: '2024-08-04',
        mileage: 2950,
        provider: 'McLaren Manchester (Official Retailer & LT Specialist)',
        masterTechnician: 'D. Hughes (McLaren Senior LT Technician)',
        invoiceRef: 'MCM-2024-76509',
        type: 'Annual Service',
        costGbp: 2240,
        dmeOverRevStatus: 'MDS2 Clean — PCC II Accumulators 140.2 Bar (Zero Leaks)',
        technicianNotes: 'Year 2 Official McLaren Service completed. Full Proactive Chassis Control II (PCC II) hydraulic suspension circuit pressure-tested; all four nitrogen accumulators verified at 140.2 bar baseline with zero damper weeping. Active Longtail Airbrake high-speed actuator sweep calibrated. Underbody carbon diffuser removed for full Monocage II-S inspection and bolt torque audit.',
        partsReplaced: [
          'Mobil 1 ESP X3 0W-40 McLaren Specification Oil (8.0L)',
          '11A0194CP01 OEM Oil Filter & O-Ring Kit',
          'Pentosin CHF 202 PCC II Hydraulic Fluid Flush',
          'Castrol React SRF Brake Fluid Flush'
        ],
        detailedMeasurements: [
          {
            category: 'Chassis & Alignment',
            component: 'PCC II Hydraulic Suspension Accumulator Test',
            partNumber: 'PCC2-ACC-765LT',
            measurement: 'FL 140.2 | FR 140.1 | RL 140.3 | RR 140.2 Bar',
            torqueOrSpec: 'Target Window: 138–142 Bar'
          },
          {
            category: 'Brakes & Rotors',
            component: 'Senna CCM-R Rotor Weight & Thermal Check',
            partNumber: 'CCM-R-390MM',
            measurement: '95% Mass Remaining across all 4 corners',
            torqueOrSpec: 'Titanium 10-Spoke Wheel Bolts: 130 Nm'
          }
        ],
        verifiedOfficial: true,
        documents: ['McLaren_MDS2_Health_Certificate.pdf', 'PCC2_Accumulator_Pressure_Log.pdf']
      }
    ],
    modifications: [
      {
        id: 'mod-006',
        category: 'Aero & Carbon',
        name: 'MSO Gloss Visual Carbon Front Fender Louvres & Bespoke Door Sill Plaque',
        brand: 'McLaren Special Operations (MSO)',
        partNumber: 'MSO-765LT-CF-LVR',
        dateInstalled: '2022-10-05',
        installedBy: 'McLaren Production Centre (MPC), Woking',
        costGbp: 24500,
        reversible: false,
        originalPartsRetained: false,
        oemStorageLocation: 'Factory Line Installed (Original Build Sheet Option)',
        weightDeltaKg: -2.4,
        notes: 'Factory commissioned through MSO prior to delivery. Vents high-pressure wheel-arch turbulence and is documented on the signed Woking MSO build certificate.'
      }
    ],
    reminders: [
      {
        id: 'rem-005',
        title: 'Pirelli P-Zero Trofeo R MC2 Replacement (Heat Cycle 7/10 & 2.9mm Rear)',
        category: 'Tires',
        dueDate: '2026-11-30',
        dueMileage: 3400,
        urgent: true,
        status: 'Pending',
        assignedCenter: 'McLaren Manchester',
        technicalContext: 'Rear tread approaching 2.5mm wet-weather threshold; fresh MC2 set reserved in climate storage.'
      }
    ],
    trackSetups: [
      {
        id: 'trk-004',
        circuitName: 'Anglesey Coastal Circuit (Trac Môn)',
        country: 'United Kingdom',
        weatherCondition: 'Dry (Cool)',
        bestLapTime: '1:10.94',
        tyreCompound: 'Pirelli P-Zero Trofeo R (MC2 Spec)',
        tyreHeatCycles: 5,
        coldPressureFrontPsi: 20.5,
        coldPressureRearPsi: 21.0,
        hotTargetPressureFrontPsi: 27.5,
        hotTargetPressureRearPsi: 28.0,
        frontCamberDeg: -2.7,
        rearCamberDeg: -2.1,
        frontToeMm: '+0.2mm Toe-In',
        rearToeMm: '+3.0mm Toe-In',
        rideHeightFrontMm: 94,
        rideHeightRearMm: 115,
        damperFrontBump: 'PCC II Active Dynamics: Track Mode + Aero Downforce Lock',
        damperFrontRebound: 'Track Mode Hydraulic Interlink',
        damperRearBump: 'Track Mode Hydraulic Interlink',
        damperRearRebound: 'Track Mode Hydraulic Interlink',
        rearWingAngleDeg: 28.0,
        brakeBiasFrontPercent: 56,
        fuelLoadLiters: 40,
        notes: 'Variable Drift Control (VDC) set to 20% slip angle. Longtail Airbrake stability into Rocket hairpin from 158 mph is unmatched.'
      }
    ]
  }
];
