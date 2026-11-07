export interface ServiceRecord {
  id: string;
  date: string;
  mileage: number;
  provider: string;
  type: 'Annual Service' | 'Inspection & Fluids' | 'Brake Service' | 'Major Overhaul' | 'Warranty Campaign' | 'Pre-Track Prep';
  costGbp: number;
  technicianNotes: string;
  partsReplaced: string[];
  verifiedOfficial: boolean;
  documents?: string[];
}

export interface ModificationRecord {
  id: string;
  category: 'Exhaust & Powertrain' | 'Aero & Exterior' | 'Suspension & Chassis' | 'Braking & Wheels' | 'ECU & Telemetry' | 'Interior & Safety';
  name: string;
  brand: string;
  dateInstalled: string;
  installedBy: string;
  costGbp: number;
  reversible: boolean;
  originalPartsRetained: boolean;
  dynoGainHp?: number;
  weightDeltaKg?: number;
  notes: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  category: 'Service' | 'Inspection' | 'Tires' | 'Brake Fluid' | 'Insurance' | 'Track Check';
  dueDate: string;
  dueMileage?: number;
  urgent: boolean;
  status: 'Pending' | 'Completed' | 'Booked';
  assignedCenter?: string;
}

export interface TrackSetupProfile {
  id: string;
  circuitName: string;
  country: string;
  weatherCondition: 'Dry (Warm)' | 'Dry (Cool)' | 'Damp' | 'Wet';
  bestLapTime: string;
  tyreCompound: string;
  coldPressureFrontPsi: number;
  coldPressureRearPsi: number;
  hotTargetPressureFrontPsi: number;
  hotTargetPressureRearPsi: number;
  frontCamberDeg: number;
  rearCamberDeg: number;
  damperFrontBump: string;
  damperFrontRebound: string;
  damperRearBump: string;
  damperRearRebound: string;
  rearWingAngleDeg: number;
  brakeBiasFrontPercent: number;
  fuelLoadLiters: number;
  notes: string;
}

export interface PrestigeCar {
  id: string;
  slug: string;
  make: string;
  model: string;
  subModel?: string;
  year: number;
  vin: string;
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
  };
  services: ServiceRecord[];
  modifications: ModificationRecord[];
  reminders: ReminderItem[];
  trackSetups: TrackSetupProfile[];
}

export const PRESTIGE_CARS: PrestigeCar[] = [
  {
    id: 'car-992-gt3rs',
    slug: 'porsche-992-gt3-rs',
    make: 'Porsche',
    model: '911 GT3 RS',
    subModel: 'Weissach Package',
    year: 2024,
    vin: 'WP0AF2A97RS198421',
    licensePlate: 'RS24 GT3',
    heroImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80'
    ],
    exteriorColor: 'Ice Grey Metallic with Pyro Red Accents',
    interiorColor: 'Black Race-Tex & Carbon Bucket Seats with Guards Red Stitching',
    engine: '4.0-litre Naturally Aspirated Flat-6 (9,000 RPM redline)',
    transmission: '7-Speed Dual-Clutch Porsche Doppelkupplung (PDK)',
    powerBhp: 518,
    torqueNm: 465,
    curbWeightKg: 1450,
    currentMileage: 4210,
    estimatedValueGbp: 285000,
    purchaseDate: '2024-03-12',
    purchasePriceGbp: 268000,
    garageLocation: 'Cotswolds Vault, Bay 04',
    tagline: 'Track-honed aerodynamic weapon with active DRS and multi-stage steering-wheel dampers.',
    keyStats: {
      zeroToSixtyMph: '3.0s',
      topSpeedMph: 184,
      drivetrain: 'Rear-Engine, RWD'
    },
    services: [
      {
        id: 'srv-001',
        date: '2024-09-18',
        mileage: 3850,
        provider: 'Porsche Centre Silverstone (Official Heritage & Motorsport)',
        type: 'Pre-Track Prep',
        costGbp: 1420,
        technicianNotes: 'Full track inspection post-Spa Francorchamps. High-temp Castrol SRF brake fluid flush, corner weight balance re-verified, ceramic disc wear measurement (0.2mm wear, excellent condition), carbon wing actuators recalibrated.',
        partsReplaced: ['Castrol React SRF Racing Brake Fluid', 'Porsche Motorsport Air Filters', 'OEM Sump Washer & Mobile 1 0W-40 C40 GT Oil'],
        verifiedOfficial: true,
        documents: ['Silverstone_Motorsport_Inspection_Report.pdf', 'Dyno_Baseline_Scan.pdf']
      },
      {
        id: 'srv-002',
        date: '2024-04-02',
        mileage: 1200,
        provider: 'Porsche Centre Reading',
        type: 'Inspection & Fluids',
        costGbp: 890,
        technicianNotes: 'Running-in check and first scheduled engine oil change completed to official factory spec. Telemetry log downloaded and clear of any over-rev flags (Stage 0).',
        partsReplaced: ['Engine Oil Filter', 'Mobil 1 0W-40 C40 GT (7.8L)'],
        verifiedOfficial: true,
        documents: ['PDI_RunIn_Clearance.pdf']
      }
    ],
    modifications: [
      {
        id: 'mod-001',
        category: 'Exhaust & Powertrain',
        name: 'Inconel Race Manifolds & Valved Titanium Exhaust System',
        brand: 'Kline Innovation',
        dateInstalled: '2024-05-15',
        installedBy: 'JCR Developments, Silverstone',
        costGbp: 8650,
        reversible: true,
        originalPartsRetained: true,
        dynoGainHp: 18,
        weightDeltaKg: -14.2,
        notes: 'Retains valve actuation via OEM steering wheel button. Incredible high-pitch scream above 7,500 RPM while remaining track-day noise-test compliant (101dB static with valves shut).'
      },
      {
        id: 'mod-002',
        category: 'Braking & Wheels',
        name: 'Surface Transforms Carbon-Ceramic Discs with Pagid RSC1 Pads',
        brand: 'Surface Transforms',
        dateInstalled: '2024-06-20',
        installedBy: 'Manthey Racing UK',
        costGbp: 14500,
        reversible: true,
        originalPartsRetained: true,
        weightDeltaKg: -4.8,
        notes: 'Refurbishable continuous-carbon construction for high-frequency track endurance. OEM PCCB discs stored in dry vault packaging.'
      },
      {
        id: 'mod-003',
        category: 'ECU & Telemetry',
        name: 'VBOX Video HD2 Track Package with Dual 1080p Cameras & CAN-bus Telemetry',
        brand: 'Racelogic UK',
        dateInstalled: '2024-07-04',
        installedBy: 'Racelogic Motorsport Division',
        costGbp: 3200,
        reversible: true,
        originalPartsRetained: true,
        notes: 'Direct CAN-bus integration reads throttle position, brake pressure, steering angle, gear position, and tyre pressure directly onto video overlays.'
      }
    ],
    reminders: [
      {
        id: 'rem-001',
        title: 'Castrol SRF Brake Fluid Renewal (Post 3 Track Sessions)',
        category: 'Brake Fluid',
        dueDate: '2024-12-10',
        dueMileage: 5500,
        urgent: true,
        status: 'Pending',
        assignedCenter: 'Porsche Centre Silverstone'
      },
      {
        id: 'rem-002',
        title: 'Michelin Pilot Sport Cup 2 R Tyre Tread Depth Inspection',
        category: 'Tires',
        dueDate: '2024-11-25',
        dueMileage: 4800,
        urgent: false,
        status: 'Pending',
        assignedCenter: 'Trackside Support Team'
      },
      {
        id: 'rem-003',
        title: 'Annual Porsche Approved Warranty & 111-Point Check',
        category: 'Service',
        dueDate: '2025-03-12',
        dueMileage: 8000,
        urgent: false,
        status: 'Booked',
        assignedCenter: 'Porsche Centre Reading'
      }
    ],
    trackSetups: [
      {
        id: 'trk-001',
        circuitName: 'Silverstone Grand Prix Circuit',
        country: 'United Kingdom',
        weatherCondition: 'Dry (Warm)',
        bestLapTime: '2:09.42',
        tyreCompound: 'Michelin Pilot Sport Cup 2 R (N0)',
        coldPressureFrontPsi: 21.0,
        coldPressureRearPsi: 22.0,
        hotTargetPressureFrontPsi: 28.5,
        hotTargetPressureRearPsi: 29.5,
        frontCamberDeg: -2.8,
        rearCamberDeg: -2.4,
        damperFrontBump: 'Setting +2 (Stiffened for Abbey / Maggotts)',
        damperFrontRebound: 'Setting +1',
        damperRearBump: 'Setting +2',
        damperRearRebound: 'Setting +3',
        rearWingAngleDeg: 8.5,
        brakeBiasFrontPercent: 54,
        fuelLoadLiters: 45,
        notes: 'High speed stability phenomenal through Copse. DRS activation set to manual trigger via steering wheel toggle. Tyres require 2 full build laps to hit 75°C optimal carcass temperature.'
      },
      {
        id: 'trk-002',
        circuitName: 'Circuit de Spa-Francorchamps',
        country: 'Belgium',
        weatherCondition: 'Damp',
        bestLapTime: '2:34.18',
        tyreCompound: 'Michelin Pilot Sport Cup 2 (Standard)',
        coldPressureFrontPsi: 23.5,
        coldPressureRearPsi: 24.5,
        hotTargetPressureFrontPsi: 30.0,
        hotTargetPressureRearPsi: 31.0,
        frontCamberDeg: -2.2,
        rearCamberDeg: -1.9,
        damperFrontBump: 'Setting -2 (Compliance over Eau Rouge kerbs)',
        damperFrontRebound: 'Setting 0',
        damperRearBump: 'Setting -1',
        damperRearRebound: 'Setting 0',
        rearWingAngleDeg: 6.0,
        brakeBiasFrontPercent: 52,
        fuelLoadLiters: 55,
        notes: 'Softer bump rebound allows safe compression without bottoming out at bottom of Raidillon. DRS closed through Blanchimont.'
      }
    ]
  },
  {
    id: 'car-ferrari-488-pista',
    slug: 'ferrari-488-pista',
    make: 'Ferrari',
    model: '488 Pista',
    subModel: 'Tailor Made Carbon Speciale',
    year: 2020,
    vin: 'ZFF86HLA8L0249811',
    licensePlate: 'V8 PST',
    heroImage: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1200&q=80'
    ],
    exteriorColor: 'Rosso Corsa with Blu Tour de France / Bianco Racing Livery',
    interiorColor: 'Nera Alcantara with Giallo Cavallino Embroidery & Matt Carbon Fibre',
    engine: '3.9-litre Twin-Turbocharged 90° V8 (International Engine of the Year)',
    transmission: '7-Speed Dual-Clutch F1 Sequential Transmission',
    powerBhp: 710,
    torqueNm: 770,
    curbWeightKg: 1380,
    currentMileage: 5890,
    estimatedValueGbp: 345000,
    purchaseDate: '2021-08-14',
    purchasePriceGbp: 315000,
    garageLocation: 'Mayfair Mews Private Stacking Facility',
    tagline: 'Maranello purest turbocharged track weapon featuring F1 S-Duct aero and titanium internals.',
    keyStats: {
      zeroToSixtyMph: '2.8s',
      topSpeedMph: 211,
      drivetrain: 'Mid-Engine, RWD'
    },
    services: [
      {
        id: 'srv-003',
        date: '2024-07-10',
        mileage: 5400,
        provider: 'H.R. Owen Ferrari London',
        type: 'Annual Service',
        costGbp: 2350,
        technicianNotes: 'Year 4 Ferrari Genuine Maintenance programme. Auxiliary belts replaced, brake fluid renewed, gearbox hydraulic filter serviced. Full Ferrari Classiche passport stamps validated.',
        partsReplaced: ['Engine Drive Belt Set', 'Ferrari Shell Helix Ultra 5W-40', 'Cabin Pollen Filter Set', 'OEM Spark Plugs (x8)'],
        verifiedOfficial: true,
        documents: ['HR_Owen_Ferrari_Official_Stamp.pdf']
      }
    ],
    modifications: [
      {
        id: 'mod-004',
        category: 'Aero & Exterior',
        name: 'Full Body Self-Healing PPF & Gtechniq Ceramic Coating',
        brand: 'XPEL Ultimate Plus 10mil',
        dateInstalled: '2021-08-20',
        installedBy: 'Topaz Detailing London',
        costGbp: 6800,
        reversible: true,
        originalPartsRetained: true,
        notes: 'Custom templated wrapped edges covering 100% of bodywork and carbon S-Duct intake channels.'
      },
      {
        id: 'mod-005',
        category: 'Exhaust & Powertrain',
        name: '200-Cell High Flow Sport Catalysts with Thermal Heat Shields',
        brand: 'Novitec Rosso',
        dateInstalled: '2022-04-11',
        installedBy: 'Scuderia Car Parts, Egham',
        costGbp: 5200,
        reversible: true,
        originalPartsRetained: true,
        dynoGainHp: 22,
        notes: 'Sharper throttle spool and reduced engine bay temps while passing MOT emissions.'
      }
    ],
    reminders: [
      {
        id: 'rem-004',
        title: 'Ferrari Power15 Extended Warranty Inspection',
        category: 'Inspection',
        dueDate: '2025-01-20',
        dueMileage: 6500,
        urgent: false,
        status: 'Booked',
        assignedCenter: 'H.R. Owen Ferrari London'
      }
    ],
    trackSetups: [
      {
        id: 'trk-003',
        circuitName: 'Donington Park GP',
        country: 'United Kingdom',
        weatherCondition: 'Dry (Warm)',
        bestLapTime: '1:36.50',
        tyreCompound: 'Michelin Pilot Sport Cup 2 K1 (Ferrari Spec)',
        coldPressureFrontPsi: 22.0,
        coldPressureRearPsi: 21.0,
        hotTargetPressureFrontPsi: 29.0,
        hotTargetPressureRearPsi: 28.0,
        frontCamberDeg: -2.4,
        rearCamberDeg: -2.0,
        damperFrontBump: 'Bumpy Road mode OFF (Stiff Track)',
        damperFrontRebound: 'Factory Track',
        damperRearBump: 'Factory Track',
        damperRearRebound: 'Factory Track',
        rearWingAngleDeg: 0,
        brakeBiasFrontPercent: 55,
        fuelLoadLiters: 50,
        notes: 'Ferrari Dynamic Enhancer (FDE) engaged in CT Off mode. Astonishing corner-exit traction down Craner Curves.'
      }
    ]
  },
  {
    id: 'car-mclaren-765lt',
    slug: 'mclaren-765lt-spider',
    make: 'McLaren',
    model: '765LT Spider',
    subModel: '1 of 765 Worldwide',
    year: 2022,
    vin: 'SBM11DAA2NW004721',
    licensePlate: 'LT22 SPY',
    heroImage: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80'
    ],
    exteriorColor: 'MSO Curacao Blue with Gloss Visual Carbon Exterior Pack 1, 2 & 3',
    interiorColor: 'Carbon Black Alcantara with McLaren Orange Perforations & Senna Carbon Seats',
    engine: '4.0-litre Twin-Turbo M840T Flat-Plane V8',
    transmission: '7-Speed Seamless Shift Gearbox (SSG)',
    powerBhp: 755,
    torqueNm: 800,
    curbWeightKg: 1388,
    currentMileage: 3120,
    estimatedValueGbp: 375000,
    purchaseDate: '2022-10-05',
    purchasePriceGbp: 395000,
    garageLocation: 'Cheshire Private Collection Facility',
    tagline: 'Extreme Longtail lightness with titanium quad-exit exhaust and Active Longtail Airbrake.',
    keyStats: {
      zeroToSixtyMph: '2.7s',
      topSpeedMph: 205,
      drivetrain: 'Mid-Engine, RWD'
    },
    services: [
      {
        id: 'srv-004',
        date: '2024-08-04',
        mileage: 2950,
        provider: 'McLaren Manchester (Official Retailer)',
        type: 'Annual Service',
        costGbp: 2100,
        technicianNotes: 'Year 2 service completed. Hydraulic suspension fluid accumulator pressures checked (140 bar baseline verified). Airbrake calibration test flawless.',
        partsReplaced: ['Mobil 1 ESP 0W-40 Formula Engine Oil', 'High-pressure Hydraulic Fluid Filter'],
        verifiedOfficial: true,
        documents: ['McLaren_Manchester_Certificate.pdf']
      }
    ],
    modifications: [
      {
        id: 'mod-006',
        category: 'Aero & Exterior',
        name: 'MSO Carbon Roof Scoop & Extended Carbon Front Fenders with Louvres',
        brand: 'McLaren Special Operations (MSO)',
        dateInstalled: '2022-10-05',
        installedBy: 'McLaren Special Operations, Woking',
        costGbp: 24500,
        reversible: false,
        originalPartsRetained: false,
        notes: 'Factory ordered MSO bespoke option with signed confirmation plate in door sill.'
      }
    ],
    reminders: [
      {
        id: 'rem-005',
        title: 'Pirelli Trofeo R Tyre Wear Check (Front Inner Shoulders)',
        category: 'Tires',
        dueDate: '2024-11-30',
        dueMileage: 3500,
        urgent: true,
        status: 'Pending',
        assignedCenter: 'McLaren Manchester'
      }
    ],
    trackSetups: [
      {
        id: 'trk-004',
        circuitName: 'Anglesey Coastal Circuit',
        country: 'United Kingdom',
        weatherCondition: 'Dry (Cool)',
        bestLapTime: '1:11.80',
        tyreCompound: 'Pirelli P-Zero Trofeo R (MC2)',
        coldPressureFrontPsi: 20.5,
        coldPressureRearPsi: 21.0,
        hotTargetPressureFrontPsi: 27.5,
        hotTargetPressureRearPsi: 28.0,
        frontCamberDeg: -2.7,
        rearCamberDeg: -2.1,
        damperFrontBump: 'Track Mode Active Suspension Level 3',
        damperFrontRebound: 'Track Mode Level 3',
        damperRearBump: 'Track Mode Level 3',
        damperRearRebound: 'Track Mode Level 3',
        rearWingAngleDeg: 12.0,
        brakeBiasFrontPercent: 56,
        fuelLoadLiters: 40,
        notes: 'The Proactive Chassis Control II provides astonishing mid-corner composure through Church corner. Airbrake provides massive braking confidence from 140mph.'
      }
    ]
  }
];

