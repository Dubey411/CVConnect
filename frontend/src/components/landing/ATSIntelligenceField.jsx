import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * ATSIntelligenceField.jsx — "Modern Indian Artisan" Background
 *
 * Concepts:
 * 1. Asymmetric low-contrast wash:
 *    - Origin top-left at 25% offset with stops at 8% (#EDE4D3), 42% (#E4D7C2), 78% (#D8C7AF)
 *    - Soft watercolor bleed transitions (not cold algorithmic CSS blends)
 * 2. Hand-block-printed paper grain:
 *    - 2.5% SVG noise texture overlay mimicking raw khadi / undyed cotton pulp
 * 3. Ajrakh geometric hairline border rule:
 *    - Single hairline rule (0.75px) with subtle 8-petal geometric star registration marks
 *    - Inspired by Sindhi/Kutch Ajrakh block grids — architectural, restrained, subordinate
 * 4. Zero generic floating curves or scattered chips.
 */

export default function ATSIntelligenceField() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const parallaxGrid = useTransform(scrollY, [0, 900], [0, shouldReduceMotion ? 0 : -20]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ backgroundColor: '#EDE4D3' }}
    >
      {/* ── 1. ASYMMETRIC LOW-CONTRAST WATERCOLOR WASH ───────────────────── */}
      {/* Primary Wash: Origin top-left at 25% offset, stops at 8%, 42%, 78% */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 135% 115% at 25% 15%, 
              #EDE4D3 8%, 
              #E4D7C2 42%, 
              #D8C7AF 78%
            )
          `,
        }}
      />

      {/* Secondary Organic Bleed: Soft madder-turmeric undertone wash (subtle bleeding) */}
      <div
        className="absolute -top-[10%] left-[20%] w-[65vw] h-[65vh] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(212, 162, 76, 0.08) 0%, rgba(168, 65, 46, 0.04) 45%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Soft Indigo-Charcoal Grounding Wash (Lower Right Corner) */}
      <div
        className="absolute -bottom-[15%] -right-[10%] w-[55vw] h-[55vh] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(43, 45, 66, 0.05) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />

      {/* ── 2. AJRAKH GEOMETRIC HAIRLINE BORDER RULE & MOTIF ─────────────── */}
      <motion.div style={{ y: parallaxGrid }} className="absolute inset-0 pointer-events-none">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ajrakh 8-point geometric star registration marker pattern */}
            <pattern id="ajrakh-hairline-grid" width="120" height="120" patternUnits="userSpaceOnUse">
              {/* Very faint hairline guide lines */}
              <line x1="0" y1="60" x2="120" y2="60" stroke="rgba(43, 45, 66, 0.035)" strokeWidth="0.7" />
              <line x1="60" y1="0" x2="60" y2="120" stroke="rgba(43, 45, 66, 0.035)" strokeWidth="0.7" />

              {/* Minimalist geometric registration crosshair marker at intersection */}
              <circle cx="60" cy="60" r="1.5" fill="rgba(168, 65, 46, 0.15)" />
              <path
                d="M 54 60 L 66 60 M 60 54 L 60 66"
                stroke="rgba(43, 45, 66, 0.07)"
                strokeWidth="0.75"
              />
              {/* Tiny corner diamond accents */}
              <polygon
                points="60,57.5 62.5,60 60,62.5 57.5,60"
                fill="none"
                stroke="rgba(212, 162, 76, 0.14)"
                strokeWidth="0.6"
              />
            </pattern>
          </defs>

          {/* Masked pattern area — softly concentrated on the hero region */}
          <rect
            width="100%"
            height="100%"
            fill="url(#ajrakh-hairline-grid)"
            style={{
              maskImage: 'radial-gradient(ellipse 75% 70% at 50% 35%, black 20%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 35%, black 20%, transparent 80%)',
            }}
          />

          {/* Subtle perimeter boundary hairline rule with geometric corner notches */}
          <g opacity="0.45" stroke="rgba(43, 45, 66, 0.16)" strokeWidth="0.75">
            {/* Top perimeter guideline */}
            <line x1="5%" y1="120" x2="95%" y2="120" strokeDasharray="3 9" />
          </g>
        </svg>
      </motion.div>

      {/* ── 3. HAND-BLOCK-PRINTED 2.5% PAPER GRAIN TEXTURE ───────────────── */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><filter id=\"blockPrintNoise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.78\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23blockPrintNoise)\"/></svg>')",
        }}
      />
    </div>
  );
}
