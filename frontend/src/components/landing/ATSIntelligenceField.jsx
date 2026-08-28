import React from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * ATSIntelligenceField.jsx — "Modern Indian Artisan" Ambient Canvas
 *
 * 1. Asymmetric Radial Wash:
 *    - Origin at top-left 25% offset
 *    - Color stops: 8% (#EDE4D3), 42% (#E0D2BC), 78% (#C9B89B), 100% (#A8412E)
 *    - Breathing gradient: origin slowly shifts between 25%/30% and 35%/22% over 20s
 * 2. Hand-block-printed Paper Grain:
 *    - 2.5% opacity SVG noise texture
 *    - Grain drift: drifts in a 30-second loop moving 1-2% in random directions with steps(8)
 * 3. Floating Pigment Blobs:
 *    - Three large, extremely soft (120px blur) radial blobs in madder red, turmeric, indigo
 *    - 4-6% opacity, drifting independently on 18-24s loops like dye spreading in water
 * 4. Ajrakh Geometric Hairline Motif:
 *    - Single hairline geometric border divider (0.75px) with subtle 8-point geometric star marks
 * 5. Motion restraint: Every motion is slow, meditative, and non-distracting.
 */

export default function ATSIntelligenceField() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ backgroundColor: '#EDE4D3' }}
    >
      {/* ── 1. ASYMMETRIC BREATHING RADIAL GRADIENT WASH ─────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="artisanWash" cx="25%" cy="30%" r="115%" fx="25%" fy="30%">
            {!shouldReduceMotion && (
              <>
                <animate
                  attributeName="cx"
                  values="25%; 35%; 25%"
                  dur="20s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                />
                <animate
                  attributeName="cy"
                  values="30%; 22%; 30%"
                  dur="20s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                />
                <animate
                  attributeName="fx"
                  values="25%; 35%; 25%"
                  dur="20s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                />
                <animate
                  attributeName="fy"
                  values="30%; 22%; 30%"
                  dur="20s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                />
              </>
            )}
            <stop offset="8%" stopColor="#EDE4D3" />
            <stop offset="42%" stopColor="#E0D2BC" />
            <stop offset="78%" stopColor="#C9B89B" />
            <stop offset="100%" stopColor="#A8412E" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#artisanWash)" />
      </svg>

      {/* ── 2. THREE FLOATING PIGMENT BLOBS (120px BLUR, DYE IN WATER) ───── */}
      {/* Blob 1: Madder-Root Red (#A8412E) ~5% opacity */}
      <div
        className="absolute top-[8%] left-[18%] w-[580px] h-[580px] rounded-full pointer-events-none artisan-animated"
        style={{
          background: 'radial-gradient(circle, rgba(168, 65, 46, 0.055) 0%, rgba(168, 65, 46, 0.02) 50%, transparent 75%)',
          filter: 'blur(120px)',
          animation: shouldReduceMotion ? 'none' : 'dyeDriftMadder 18s ease-in-out infinite alternate',
        }}
      />

      {/* Blob 2: Muted Turmeric (#D4A24C) ~5% opacity */}
      <div
        className="absolute top-[28%] right-[10%] w-[640px] h-[640px] rounded-full pointer-events-none artisan-animated"
        style={{
          background: 'radial-gradient(circle, rgba(212, 162, 76, 0.05) 0%, rgba(212, 162, 76, 0.015) 50%, transparent 75%)',
          filter: 'blur(120px)',
          animation: shouldReduceMotion ? 'none' : 'dyeDriftTurmeric 24s ease-in-out infinite alternate',
        }}
      />

      {/* Blob 3: Indigo-Charcoal (#2B2D42) ~4% opacity */}
      <div
        className="absolute bottom-[5%] left-[28%] w-[560px] h-[560px] rounded-full pointer-events-none artisan-animated"
        style={{
          background: 'radial-gradient(circle, rgba(43, 45, 66, 0.04) 0%, rgba(43, 45, 66, 0.01) 50%, transparent 75%)',
          filter: 'blur(120px)',
          animation: shouldReduceMotion ? 'none' : 'dyeDriftIndigo 21s ease-in-out infinite alternate',
        }}
      />

      {/* ── 3. AJRAKH GEOMETRIC HAIRLINE BORDER MOTIF (DIVIDER LEVEL) ─────── */}
      <div className="absolute top-[78px] inset-x-0 h-4 pointer-events-none px-6 max-w-6xl mx-auto flex items-center justify-between opacity-30">
        <svg className="w-full h-2" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="4" x2="100%" y2="4" stroke="#2B2D42" strokeWidth="0.75" strokeDasharray="3 9" />
          {/* Subtle Ajrakh 8-point geometric star / crosshair registration marks */}
          <circle cx="5%" cy="4" r="1.5" fill="#A8412E" />
          <circle cx="25%" cy="4" r="1.2" fill="#D4A24C" />
          <circle cx="50%" cy="4" r="1.5" fill="#2B2D42" />
          <circle cx="75%" cy="4" r="1.2" fill="#D4A24C" />
          <circle cx="95%" cy="4" r="1.5" fill="#A8412E" />
        </svg>
      </div>

      {/* ── 4. 2.5% OPACITY SVG NOISE WITH 30s STOP-MOTION GRAIN DRIFT ───── */}
      <div
        className="absolute -inset-[5%] w-[110%] h-[110%] opacity-[0.025] pointer-events-none artisan-animated"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><filter id=\"blockPrintNoise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.82\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23blockPrintNoise)\"/></svg>')",
          animation: shouldReduceMotion ? 'none' : 'grainDrift 30s steps(8) infinite alternate',
        }}
      />
    </div>
  );
}
