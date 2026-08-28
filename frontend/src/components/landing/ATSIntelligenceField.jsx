import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * ATSIntelligenceField.jsx — Modern Indian Artisan Ambient Field
 *
 * Combines:
 * - Warm undyed cotton parchment base (#EDE4D3) with asymmetric radial wash
 * - Luminous 3D golden silk ribbon curves sweeping across the canvas
 * - Radiant glowing starlight pearls stationed along the trajectories
 * - Delicate traveling light pulses
 * - Warm dotted constellation matrix behind the product dashboard
 * - Three soft floating pigment blobs (madder red, turmeric, indigo)
 * - 2.5% opacity hand-block-printed paper grain texture
 * - 100% pointer-events-none & z-0
 */

export default function ATSIntelligenceField() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const parallaxRibbons = useTransform(scrollY, [0, 900], [0, shouldReduceMotion ? 0 : -35]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ backgroundColor: '#EDE4D3' }}
    >
      {/* ── 1. ASYMMETRIC BREATHING WATERCOLOR WASH ──────────────────────── */}
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
                  values="25%; 33%; 25%"
                  dur="22s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                />
                <animate
                  attributeName="cy"
                  values="30%; 23%; 30%"
                  dur="22s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                />
              </>
            )}
            <stop offset="8%" stopColor="#EDE4D3" />
            <stop offset="42%" stopColor="#E0D2BC" />
            <stop offset="78%" stopColor="#C9B89B" />
            <stop offset="100%" stopColor="#A8412E" stopOpacity="0.30" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#artisanWash)" />
      </svg>

      {/* ── 2. THREE SOFT FLOATING PIGMENT BLOBS (120px BLUR) ────────────── */}
      {/* Madder Red Blob */}
      <div
        className="absolute top-[10%] left-[16%] w-[620px] h-[620px] rounded-full pointer-events-none artisan-animated"
        style={{
          background: 'radial-gradient(circle, rgba(168, 65, 46, 0.055) 0%, rgba(168, 65, 46, 0.015) 55%, transparent 75%)',
          filter: 'blur(120px)',
          animation: shouldReduceMotion ? 'none' : 'dyeDriftMadder 18s ease-in-out infinite alternate',
        }}
      />

      {/* Muted Turmeric Blob */}
      <div
        className="absolute top-[24%] right-[8%] w-[680px] h-[680px] rounded-full pointer-events-none artisan-animated"
        style={{
          background: 'radial-gradient(circle, rgba(212, 162, 76, 0.065) 0%, rgba(212, 162, 76, 0.02) 55%, transparent 75%)',
          filter: 'blur(120px)',
          animation: shouldReduceMotion ? 'none' : 'dyeDriftTurmeric 24s ease-in-out infinite alternate',
        }}
      />

      {/* Indigo-Charcoal Blob */}
      <div
        className="absolute bottom-[4%] left-[25%] w-[600px] h-[600px] rounded-full pointer-events-none artisan-animated"
        style={{
          background: 'radial-gradient(circle, rgba(43, 45, 66, 0.045) 0%, rgba(43, 45, 66, 0.01) 55%, transparent 75%)',
          filter: 'blur(120px)',
          animation: shouldReduceMotion ? 'none' : 'dyeDriftIndigo 21s ease-in-out infinite alternate',
        }}
      />

      {/* ── 3. WARM DOTTED CONSTELLATION MATRIX BEHIND DASHBOARD ─────────── */}
      <div
        className="absolute top-[2%] right-[0%] w-[62vw] h-[820px] pointer-events-none hidden md:block"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 65% at 60% 45%, black 25%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 60% 45%, black 25%, transparent 80%)',
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="artisan-matrix-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.15" fill="#D4A24C" fillOpacity="0.28" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#artisan-matrix-grid)" />
        </svg>
      </div>

      {/* ── 4. LUMINOUS GOLDEN SILK RIBBONS & STARLIGHT PEARLS ───────────── */}
      <motion.div style={{ y: parallaxRibbons }} className="absolute inset-0 w-full h-full">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Liquid Gold Shimmer Gradient */}
            <linearGradient id="artisanGoldSilk" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C89462" stopOpacity="0.55" />
              <stop offset="25%" stopColor="#F5D7A1" stopOpacity="0.90" />
              <stop offset="50%" stopColor="#FFE7B3" stopOpacity="0.98" />
              <stop offset="75%" stopColor="#D4A24C" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#A8412E" stopOpacity="0.60" />
            </linearGradient>

            {/* Soft Ambient Ribbon Glow */}
            <filter id="ribbonGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blurWide" />
              <feGaussianBlur stdDeviation="2.5" result="blurSharp" />
              <feMerge>
                <feMergeNode in="blurWide" />
                <feMergeNode in="blurSharp" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radiant Pearl Halo */}
            <filter id="pearlHalo" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial Pearl Gradient */}
            <radialGradient id="pearlShine" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#FDE6BE" />
              <stop offset="75%" stopColor="#D4A24C" />
              <stop offset="100%" stopColor="#A8412E" />
            </radialGradient>
          </defs>

          {/* ── Left Sweeping Ribbon Curve ── */}
          <path
            d="M 120 170 C 55 270, 45 380, 75 440 C 115 520, 135 640, 80 780 C 50 850, 120 900, 240 910"
            stroke="rgba(218, 165, 98, 0.32)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#ribbonGlowFilter)"
          />
          <path
            d="M 120 170 C 55 270, 45 380, 75 440 C 115 520, 135 640, 80 780 C 50 850, 120 900, 240 910"
            stroke="url(#artisanGoldSilk)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M 120 170 C 55 270, 45 380, 75 440 C 115 520, 135 640, 80 780 C 50 850, 120 900, 240 910"
            stroke="#FFFFFF"
            strokeWidth="1.0"
            strokeOpacity="0.70"
            strokeLinecap="round"
          />

          {/* ── Top Horizon Curve (Flowing across upper canvas) ── */}
          <path
            d="M 30 230 C 250 150, 480 270, 740 250 C 980 230, 1180 130, 1350 170"
            stroke="rgba(218, 165, 98, 0.28)"
            strokeWidth="12"
            strokeLinecap="round"
            filter="url(#ribbonGlowFilter)"
          />
          <path
            d="M 30 230 C 250 150, 480 270, 740 250 C 980 230, 1180 130, 1350 170"
            stroke="url(#artisanGoldSilk)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 30 230 C 250 150, 480 270, 740 250 C 980 230, 1180 130, 1350 170"
            stroke="#FFFFFF"
            strokeWidth="0.9"
            strokeOpacity="0.65"
            strokeLinecap="round"
          />

          {/* ── Right Cascading Ribbon Curve ── */}
          <path
            d="M 1350 170 C 1430 270, 1400 480, 1370 620 C 1340 760, 1410 830, 1330 870 C 1250 910, 980 890, 720 910"
            stroke="rgba(218, 165, 98, 0.32)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#ribbonGlowFilter)"
          />
          <path
            d="M 1350 170 C 1430 270, 1400 480, 1370 620 C 1340 760, 1410 830, 1330 870 C 1250 910, 980 890, 720 910"
            stroke="url(#artisanGoldSilk)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M 1350 170 C 1430 270, 1400 480, 1370 620 C 1340 760, 1410 830, 1330 870 C 1250 910, 980 890, 720 910"
            stroke="#FFFFFF"
            strokeWidth="1.0"
            strokeOpacity="0.70"
            strokeLinecap="round"
          />

          {/* ── Radiant Starlight Pearls Stationed Along Curves ── */}
          <circle cx="120" cy="170" r="10" fill="rgba(245, 215, 161, 0.45)" filter="url(#pearlHalo)" />
          <circle cx="120" cy="170" r="4.5" fill="url(#pearlShine)" />
          <circle cx="118.5" cy="168.5" r="1.5" fill="#FFFFFF" />

          <circle cx="65" cy="340" r="9" fill="rgba(245, 215, 161, 0.40)" filter="url(#pearlHalo)" />
          <circle cx="65" cy="340" r="3.8" fill="url(#pearlShine)" />
          <circle cx="64" cy="339" r="1.3" fill="#FFFFFF" />

          <circle cx="90" cy="715" r="10" fill="rgba(245, 215, 161, 0.42)" filter="url(#pearlHalo)" />
          <circle cx="90" cy="715" r="4.2" fill="url(#pearlShine)" />
          <circle cx="88.5" cy="713.5" r="1.4" fill="#FFFFFF" />

          <circle cx="560" cy="265" r="9" fill="rgba(245, 215, 161, 0.38)" filter="url(#pearlHalo)" />
          <circle cx="560" cy="265" r="3.8" fill="url(#pearlShine)" />
          <circle cx="558.5" cy="263.5" r="1.3" fill="#FFFFFF" />

          <circle cx="1375" cy="340" r="11" fill="rgba(245, 215, 161, 0.45)" filter="url(#pearlHalo)" />
          <circle cx="1375" cy="340" r="4.5" fill="url(#pearlShine)" />
          <circle cx="1373.5" cy="338.5" r="1.5" fill="#FFFFFF" />

          <circle cx="1340" cy="740" r="10" fill="rgba(245, 215, 161, 0.40)" filter="url(#pearlHalo)" />
          <circle cx="1340" cy="740" r="4.2" fill="url(#pearlShine)" />
          <circle cx="1338.5" cy="738.5" r="1.4" fill="#FFFFFF" />

          <circle cx="820" cy="895" r="9" fill="rgba(245, 215, 161, 0.38)" filter="url(#pearlHalo)" />
          <circle cx="820" cy="895" r="3.8" fill="url(#pearlShine)" />
          <circle cx="818.5" cy="893.5" r="1.3" fill="#FFFFFF" />

          {/* Traveling Light Pulses */}
          {!shouldReduceMotion && (
            <>
              <circle r="4" fill="#FFFFFF" filter="url(#pearlHalo)">
                <animateMotion
                  dur="14s"
                  repeatCount="indefinite"
                  path="M 120 170 C 55 270, 45 380, 75 440 C 115 520, 135 640, 80 780 C 50 850, 120 900, 240 910"
                />
              </circle>
              <circle r="4" fill="#FFFFFF" filter="url(#pearlHalo)">
                <animateMotion
                  dur="17s"
                  begin="3.5s"
                  repeatCount="indefinite"
                  path="M 1350 170 C 1430 270, 1400 480, 1370 620 C 1340 760, 1410 830, 1330 870 C 1250 910, 980 890, 720 910"
                />
              </circle>
            </>
          )}
        </svg>
      </motion.div>

      {/* ── 5. 2.5% OPACITY HAND-BLOCK-PRINTED GRAIN DRIFT ───────────────── */}
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
