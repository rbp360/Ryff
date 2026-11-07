'use client';

import { useState, useRef } from 'react';
import { PrestigeCar, WalkaroundHotspot } from '@/lib/prestige/car-data';

interface Car360WalkaroundStudioProps {
  car: PrestigeCar;
}

type StudioLayer = 'studio' | 'xray' | 'aero';

export function Car360WalkaroundStudio({ car }: Car360WalkaroundStudioProps) {
  const [angleDeg, setAngleDeg] = useState<number>(35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [studioLayer, setStudioLayer] = useState<StudioLayer>('studio');
  const [selectedHotspot, setSelectedHotspot] = useState<WalkaroundHotspot>(
    car.walkaroundHotspots[0]
  );

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef<number>(0);
  const dragStartAngle = useRef<number>(35);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not start stage drag if clicking a button or hotspot pin
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartAngle.current = angleDeg;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    const nextAngle = (dragStartAngle.current + Math.round(deltaX * 0.65)) % 360;
    setAngleDeg(nextAngle < 0 ? nextAngle + 360 : nextAngle);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Compute 3D perspective transforms based on current turntable angle
  const rad = (angleDeg * Math.PI) / 180;
  const sinA = Math.sin(rad);
  const cosA = Math.cos(rad);
  const facingSide = sinA >= 0 ? 1 : -1;
  const profileCompression = 0.78 + 0.22 * Math.abs(cosA);
  const tiltY = sinA * 18;
  const tiltX = cosA * 3;

  const angleViewLabel =
    angleDeg >= 335 || angleDeg < 25
      ? 'FRONT 3/4 STUDIO'
      : angleDeg >= 25 && angleDeg < 70
      ? 'FRONT AERO PROFILE'
      : angleDeg >= 70 && angleDeg < 115
      ? 'DRIVER SIDE ELEVATION'
      : angleDeg >= 115 && angleDeg < 165
      ? 'REAR 3/4 DIFFUSER'
      : angleDeg >= 165 && angleDeg < 205
      ? 'REAR WING & EXHAUST'
      : angleDeg >= 205 && angleDeg < 255
      ? 'POWERTRAIN QUARTER'
      : angleDeg >= 255 && angleDeg < 295
      ? 'PASSENGER SIDE PROFILE'
      : 'FRONT TRACK STANCE';

  // Select background gallery image subtly blended with angle
  const galleryIndex =
    car.galleryImages.length > 0
      ? Math.floor(((angleDeg % 360) / 360) * car.galleryImages.length) %
        car.galleryImages.length
      : 0;
  const activeBackdropUrl = car.galleryImages[galleryIndex] || car.heroImage;

  const renderSilhouetteSvg = () => {
    const strokeMain = studioLayer === 'xray' ? '#38BDF8' : car.accentHex || '#D4AF37';
    const isGt3 = car.silhouetteType === 'gt3rs';
    const isPista = car.silhouetteType === 'pista';

    return (
      <svg
        viewBox="0 0 800 320"
        style={{
          width: '100%',
          maxWidth: '720px',
          height: 'auto',
          overflow: 'visible',
          filter:
            studioLayer === 'xray'
              ? 'drop-shadow(0 0 18px rgba(56, 189, 248, 0.35))'
              : 'drop-shadow(0 18px 28px rgba(0, 0, 0, 0.85))',
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: `perspective(1100px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(
            1
          )}deg) scaleX(${(facingSide * profileCompression).toFixed(3)})`,
        }}
      >
        <defs>
          <linearGradient id="auraBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="45%" stopColor="rgba(25,28,36,0.88)" />
            <stop offset="100%" stopColor="rgba(8,10,14,0.96)" />
          </linearGradient>
          <linearGradient id="auraGoldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={strokeMain} stopOpacity="0.2" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor={strokeMain} stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="rotorGlow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={studioLayer === 'xray' ? '#F59E0B' : '#D4AF37'}
              stopOpacity="0.45"
            />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Turntable Reflection Ring */}
        <ellipse
          cx="400"
          cy="252"
          rx="340"
          ry="28"
          fill="none"
          stroke={strokeMain}
          strokeOpacity="0.28"
          strokeDasharray="6 8"
          strokeWidth="1.5"
        />
        <ellipse
          cx="400"
          cy="252"
          rx="285"
          ry="16"
          fill="rgba(212, 175, 55, 0.04)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />

        {/* Aero Streamlines Layer */}
        {studioLayer === 'aero' && (
          <g stroke="#38BDF8" strokeWidth="1.8" fill="none" opacity="0.85">
            <path
              d="M 30 195 Q 140 165, 235 125 T 460 92 Q 610 88, 755 62"
              strokeDasharray="10 6"
            />
            <path
              d="M 20 225 Q 150 218, 280 225 T 690 215"
              stroke="#22C55E"
              strokeDasharray="8 5"
            />
            <path
              d="M 95 170 Q 260 105, 440 86 T 730 48"
              stroke="#D4AF37"
              strokeWidth="1.4"
            />
            {/* Downforce Vector Arrows */}
            <g stroke="#EF4444" strokeWidth="2.2">
              <line x1="165" y1="115" x2="165" y2="168" />
              <polyline points="159,160 165,170 171,160" />
              <line x1="655" y1="45" x2="655" y2="112" />
              <polyline points="649,104 655,114 661,104" />
            </g>
            <text
              x="605"
              y="38"
              fill="#D4AF37"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="700"
            >
              PEAK LOAD: {car.keyStats.downforceKg || 480} KG
            </text>
          </g>
        )}

        {/* Vehicle Outer Body & Aero Silhouette */}
        {isGt3 ? (
          <g>
            {/* 992 GT3 RS Swan-Neck Wing & Endplates */}
            <path
              d="M 625 138 L 650 76 L 705 74 L 690 144 Z"
              fill="rgba(16,19,26,0.9)"
              stroke={strokeMain}
              strokeWidth="2"
            />
            <path
              d="M 638 74 L 722 68 L 726 79 L 640 83 Z"
              fill={strokeMain}
              fillOpacity="0.35"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            {/* Main GT3 RS Body Shell */}
            <path
              d="M 82 216 L 102 172 C 138 156, 195 148, 250 142 C 298 106, 360 88, 448 90 C 525 92, 588 122, 658 142 L 708 148 L 716 208 L 672 224 L 112 224 Z"
              fill="url(#auraBodyGrad)"
              stroke="url(#auraGoldLine)"
              strokeWidth="2.4"
            />
            {/* Front Fender Louvres & Roof Fins */}
            <path
              d="M 195 152 L 205 145 M 206 152 L 216 145 M 217 152 L 227 145"
              stroke={strokeMain}
              strokeWidth="2"
            />
            {/* Weissach Roll Cage X-Brace */}
            <path
              d="M 435 102 L 545 140 M 545 102 L 435 140"
              stroke={studioLayer === 'xray' ? '#38BDF8' : strokeMain}
              strokeWidth="1.8"
              strokeOpacity="0.75"
            />
          </g>
        ) : isPista ? (
          <g>
            {/* Ferrari 488 Pista S-Duct & Low Slung Mid-Engine Silhouette */}
            <path
              d="M 74 218 L 106 178 C 150 162, 212 152, 268 144 C 325 102, 395 92, 465 98 C 540 105, 615 130, 692 136 L 718 162 L 706 218 L 650 224 L 105 224 Z"
              fill="url(#auraBodyGrad)"
              stroke="url(#auraGoldLine)"
              strokeWidth="2.4"
            />
            {/* Side Scuderia Air Intake Scallop */}
            <path
              d="M 445 148 C 495 142, 535 155, 558 186 L 455 190 Z"
              fill="rgba(0,0,0,0.65)"
              stroke={strokeMain}
              strokeWidth="1.6"
            />
            {/* S-Duct Nose Channel */}
            <path
              d="M 118 190 Q 165 175, 212 148"
              stroke="#EF4444"
              strokeWidth="2"
              fill="none"
            />
          </g>
        ) : (
          <g>
            {/* McLaren 765LT Longtail & Deployed Airbrake */}
            <path
              d="M 632 134 L 714 106 L 722 116 L 648 140 Z"
              fill={strokeMain}
              fillOpacity="0.35"
              stroke="#FFFFFF"
              strokeWidth="1.6"
            />
            <path
              d="M 70 218 L 98 180 C 148 164, 215 150, 272 140 C 322 98, 392 90, 458 98 C 532 108, 618 128, 718 136 L 732 178 L 710 218 L 652 224 L 96 224 Z"
              fill="url(#auraBodyGrad)"
              stroke="url(#auraGoldLine)"
              strokeWidth="2.4"
            />
            {/* Teardrop Glasshouse & Top-Exit Quad Titanium Exhaust */}
            <circle cx="688" cy="148" r="4" fill="#38BDF8" />
            <circle cx="699" cy="148" r="4" fill="#38BDF8" />
          </g>
        )}

        {/* Glasshouse & Side Window Line */}
        <path
          d="M 272 140 C 318 106, 375 96, 448 98 L 548 138 L 285 142 Z"
          fill="rgba(56, 189, 248, 0.06)"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1.4"
        />

        {/* X-Ray Internal Mechanical Overlay (Engine Block, Carbon Tub, Damper Struts) */}
        {studioLayer === 'xray' && (
          <g opacity="0.92">
            {/* Carbon Monocoque / Chassis Spine */}
            <rect
              x="255"
              y="146"
              width="255"
              height="62"
              rx="8"
              fill="rgba(56, 189, 248, 0.08)"
              stroke="#38BDF8"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            {/* Powertrain Block */}
            <rect
              x={isGt3 ? '545' : '475'}
              y="148"
              width="92"
              height="54"
              rx="6"
              fill="rgba(212, 175, 55, 0.18)"
              stroke="#D4AF37"
              strokeWidth="2"
            />
            {/* Coilover Damper Struts */}
            <line x1="210" y1="142" x2="210" y2="212" stroke="#22C55E" strokeWidth="3" />
            <line x1="590" y1="138" x2="590" y2="212" stroke="#22C55E" strokeWidth="3" />
          </g>
        )}

        {/* Front & Rear Forged Wheels + Carbon Ceramic Rotors */}
        {[210, 590].map((cx, i) => (
          <g key={cx}>
            <circle cx={cx} cy="214" r="46" fill="#07080A" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
            <circle cx={cx} cy="214" r="35" fill="url(#rotorGlow)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            {/* Drilled Carbon Ceramic Rotor Ring */}
            <circle
              cx={cx}
              cy="214"
              r="27"
              fill="none"
              stroke="rgba(229, 231, 235, 0.45)"
              strokeWidth="6"
              strokeDasharray="3 4"
            />
            {/* 6-Piston / 4-Piston Caliper */}
            <path
              d={
                i === 0
                  ? `M ${cx - 28} 196 L ${cx - 18} 192 L ${cx - 16} 216 L ${cx - 28} 214 Z`
                  : `M ${cx + 18} 192 L ${cx + 28} 196 L ${cx + 28} 214 L ${cx + 16} 216 Z`
              }
              fill={isPista ? '#EF4444' : '#D4AF37'}
            />
            {/* Centre-Lock / Titanium Hub */}
            <circle
              cx={cx}
              cy="214"
              r="8"
              fill={isGt3 ? '#EF4444' : '#D4AF37'}
              stroke="#000"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div
      style={{
        borderRadius: '18px',
        border: '1px solid rgba(212, 175, 55, 0.28)',
        backgroundColor: '#08090C',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
        marginBottom: '28px',
      }}
    >
      {/* Top Studio Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 22px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(12, 14, 18, 0.95)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(212, 175, 55, 0.14)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#D4AF37',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#D4AF37',
                boxShadow: '0 0 8px #D4AF37',
              }}
            />
            360° Interactive Telemetry Studio
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#9CA3AF',
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
            }}
          >
            {angleDeg.toString().padStart(3, '0')}° &bull; {angleViewLabel}
          </span>
        </div>

        {/* Layer Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'studio', label: 'Concours Studio' },
            { id: 'xray', label: 'Mechanical X-Ray' },
            { id: 'aero', label: 'CFD Aero Vectors' },
          ].map((mode) => {
            const active = studioLayer === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setStudioLayer(mode.id as StudioLayer)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  backgroundColor: active
                    ? 'rgba(212, 175, 55, 0.2)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: active ? '#F5E6B8' : '#9CA3AF',
                  border: active
                    ? '1px solid rgba(212, 175, 55, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Stage: 360 Turntable Left + Active Component Inspector Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        }}
      >
        {/* Left/Center Interactive Drag Stage */}
        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'relative',
            minHeight: '350px',
            padding: '28px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            overflow: 'hidden',
            background:
              'radial-gradient(ellipse 75% 55% at 50% 60%, rgba(212, 175, 55, 0.11), rgba(8, 9, 12, 0.96) 75%)',
          }}
        >
          {/* Ambient Photographic Studio Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${activeBackdropUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: studioLayer === 'studio' ? 0.24 : 0.1,
              filter: 'contrast(1.15) saturate(0.85)',
              transform: `scale(1.06) translateX(${(sinA * -12).toFixed(1)}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(8,9,12,0.75) 0%, rgba(8,9,12,0.35) 50%, rgba(8,9,12,0.95) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Telemetry Strip inside Stage */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: '#9CA3AF',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontFamily: 'monospace' }}>
              CHASSIS: <strong style={{ color: '#F3F4F6' }}>{car.vin}</strong> &bull; ENGINE:{' '}
              <strong style={{ color: '#D4AF37' }}>{car.engineNumber}</strong>
            </div>
            <div
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#4ADE80',
                fontWeight: 700,
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            >
              ● {car.consumables.dmeOverRev.status}
            </div>
          </div>

          {/* Interactive 3D Vector Stage + Clickable Telemetry Hotspots */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              maxWidth: '680px',
              margin: '12px auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {renderSilhouetteSvg()}

            {/* Interactive Telemetry Hotspot Pins */}
            {car.walkaroundHotspots.map((spot, idx) => {
              const isSelected = selectedHotspot.id === spot.id;
              // Shift pin X slightly with rotation to create 3D parallax
              const parallaxOffset = sinA * ((spot.xPercent - 50) * 0.18);
              const leftPct = Math.max(8, Math.min(92, spot.xPercent + parallaxOffset));

              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHotspot(spot);
                    setAngleDeg(spot.angleDeg);
                  }}
                  title={spot.label}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: `${spot.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isSelected ? '30px' : '24px',
                    height: isSelected ? '30px' : '24px',
                    borderRadius: '50%',
                    backgroundColor: isSelected
                      ? '#D4AF37'
                      : 'rgba(10, 12, 16, 0.88)',
                    border: isSelected
                      ? '2px solid #FFFFFF'
                      : '1.5px solid rgba(212, 175, 55, 0.75)',
                    color: isSelected ? '#07080A' : '#D4AF37',
                    fontWeight: 900,
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected
                      ? '0 0 20px rgba(212, 175, 55, 0.9)'
                      : '0 0 12px rgba(0, 0, 0, 0.8)',
                    transition: 'all 0.2s ease',
                    zIndex: isSelected ? 10 : 5,
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Bottom 360° Degree Scrubber & Angle Presets */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                ⇄ Drag Stage or Scrub 360° Turntable
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: 'Front 3/4', deg: 35 },
                  { label: 'Profile', deg: 90 },
                  { label: 'Rear Aero', deg: 155 },
                  { label: 'Powertrain', deg: 215 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setAngleDeg(preset.deg)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor:
                        Math.abs(angleDeg - preset.deg) < 15
                          ? 'rgba(212, 175, 55, 0.22)'
                          : 'rgba(255, 255, 255, 0.05)',
                      color:
                        Math.abs(angleDeg - preset.deg) < 15 ? '#D4AF37' : '#9CA3AF',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={359}
              value={angleDeg}
              onChange={(e) => setAngleDeg(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#D4AF37',
                cursor: 'pointer',
                height: '4px',
              }}
            />
          </div>
        </div>

        {/* Right Telemetry Hotspot Dossier Panel */}
        <div
          style={{
            borderLeft: '1px solid rgba(255, 255, 255, 0.07)',
            backgroundColor: 'rgba(13, 15, 20, 0.95)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#D4AF37',
                }}
              >
                Inspection Node // {selectedHotspot.category}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor:
                    selectedHotspot.status === 'BESPOKE'
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(34, 197, 94, 0.15)',
                  color:
                    selectedHotspot.status === 'BESPOKE' ? '#38BDF8' : '#4ADE80',
                  fontFamily: 'monospace',
                }}
              >
                {selectedHotspot.status}
              </span>
            </div>

            <h3
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}
            >
              {selectedHotspot.headline}
            </h3>

            <p
              style={{
                fontSize: '13px',
                color: '#9CA3AF',
                lineHeight: 1.55,
                margin: '0 0 16px',
              }}
            >
              {selectedHotspot.specDetail}
            </p>

            {/* Precision Readout Box */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#9CA3AF' }}>Live Telemetry Metric:</span>
                <span
                  style={{
                    color: '#F3F4F6',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                >
                  {selectedHotspot.healthMetric}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#9CA3AF' }}>Last Verified Stamp:</span>
                <span style={{ color: '#D4AF37', fontFamily: 'monospace' }}>
                  {selectedHotspot.lastVerified}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Selector Pills for All Hotspots */}
          <div>
            <div
              style={{
                fontSize: '10px',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                fontWeight: 700,
              }}
            >
              Select Vehicle Inspection Zone ({car.walkaroundHotspots.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {car.walkaroundHotspots.map((spot, idx) => {
                const active = spot.id === selectedHotspot.id;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => {
                      setSelectedHotspot(spot);
                      setAngleDeg(spot.angleDeg);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: active ? 700 : 500,
                      backgroundColor: active
                        ? 'rgba(212, 175, 55, 0.18)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: active
                        ? '1px solid rgba(212, 175, 55, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.07)',
                      color: active ? '#F5E6B8' : '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        color: active ? '#D4AF37' : '#6B7280',
                      }}
                    >
                      0{idx + 1}
                    </span>
                    <span>{spot.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

