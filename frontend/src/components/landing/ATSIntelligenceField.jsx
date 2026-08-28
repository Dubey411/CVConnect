import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * ATSIntelligenceField.jsx
 *
 * Ambient "ATS Intelligence Field" background for CVConnect:
 * - Huge, ultra-soft radial gradient glows (warm ivory, beige, burnt orange, soft charcoal)
 * - Delicate floating intelligent particles with slow organic breathing
 * - Subtle connected curved data paths with glowing traveling pulses
 * - Faded architectural dot grid behind the hero dashboard
 * - Faint floating peripheral metadata annotations (Smart Parsing, Real-time Analysis, etc.)
 * - Parallax scroll depth (GPU-accelerated, disabled on reduced motion)
 * - 100% pointer-events-none & z-0, strictly subordinate to hero UI
 */

const PARTICLES = [
  { id: 1, x: '8%',  y: '14%', size: 3,   color: '#B9783C', opacity: 0.26, duration: 11, delay: 0 },
  { id: 2, x: '18%', y: '32%', size: 2,   color: '#C89462', opacity: 0.20, duration: 14, delay: 2 },
  { id: 3, x: '24%', y: '68%', size: 3.5, color: '#A96B32', opacity: 0.18, duration: 16, delay: 1 },
  { id: 4, x: '35%', y: '22%', size: 2,   color: '#25231F', opacity: 0.10, duration: 13, delay: 3 },
  { id: 5, x: '42%', y: '82%', size: 2.5, color: '#B9783C', opacity: 0.22, duration: 15, delay: 4 },
  { id: 6, x: '52%', y: '16%', size: 2,   color: '#C89462', opacity: 0.16, duration: 12, delay: 1.5 },
  { id: 7, x: '58%', y: '48%', size: 3,   color: '#A96B32', opacity: 0.24, duration: 17, delay: 2.5 },
  { id: 8, x: '66%', y: '88%', size: 2,   color: '#25231F', opacity: 0.12, duration: 13, delay: 0.5 },
  { id: 9, x: '74%', y: '28%', size: 3.5, color: '#B9783C', opacity: 0.26, duration: 14, delay: 3.5 },
  { id: 10, x: '82%', y: '62%', size: 2,  color: '#C89462', opacity: 0.18, duration: 16, delay: 1 },
  { id: 11, x: '91%', y: '20%', size: 2.5, color: '#A96B32', opacity: 0.20, duration: 12, delay: 2 },
  { id: 12, x: '94%', y: '78%', size: 3,   color: '#B9783C', opacity: 0.22, duration: 15, delay: 4 },
  { id: 13, x: '12%', y: '86%', size: 2,   color: '#C89462', opacity: 0.16, duration: 18, delay: 1 },
  { id: 14, x: '30%', y: '44%', size: 2.5, color: '#B9783C', opacity: 0.20, duration: 14, delay: 3 },
  { id: 15, x: '88%', y: '42%', size: 2,   color: '#25231F', opacity: 0.08, duration: 16, delay: 2 },
];

export default function ATSIntelligenceField() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Gentle parallax depths
  const glowY = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : -35]);
  const linesY = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : -60]);
  const particlesY = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : -95]);
  const labelsY = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : -45]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ backgroundColor: '#F5F1E9' }}
    >
      {/* ── 1. AMBIENT GRADIENT GLOWS ────────────────────────────────────── */}
      <motion.div style={{ y: glowY }} className="absolute inset-0">
        {/* Glow 1: Warm Ivory / Sand (Top-Left) */}
        <div
          className="absolute -top-[10%] -left-[10%] w-[900px] h-[900px] rounded-full ambient-animated"
          style={{
            background: 'radial-gradient(circle, #EEE7DC 0%, rgba(245, 241, 233, 0) 70%)',
            filter: 'blur(90px)',
            opacity: 0.85,
            animation: shouldReduceMotion ? 'none' : 'driftTopLeft 24s ease-in-out infinite alternate',
          }}
        />

        {/* Glow 2: Warm Burnt Orange Anchor (Right-Side Hero / Dashboard) */}
        <div
          className="absolute top-[12%] right-[2%] w-[820px] h-[820px] rounded-full ambient-animated"
          style={{
            background: 'radial-gradient(circle, rgba(185, 120, 60, 0.12) 0%, rgba(200, 148, 98, 0.05) 45%, transparent 70%)',
            filter: 'blur(110px)',
            animation: shouldReduceMotion ? 'none' : 'breatheGlow 20s ease-in-out infinite alternate',
          }}
        />

        {/* Glow 3: Warm Ochre Whisper (Mid-Left) */}
        <div
          className="absolute top-[48%] left-[2%] w-[750px] h-[750px] rounded-full ambient-animated"
          style={{
            background: 'radial-gradient(circle, rgba(169, 107, 50, 0.07) 0%, rgba(229, 217, 201, 0.35) 50%, transparent 70%)',
            filter: 'blur(100px)',
            animation: shouldReduceMotion ? 'none' : 'driftMidLeft 28s ease-in-out infinite alternate',
          }}
        />

        {/* Glow 4: Subtle Charcoal Anchor (Lower-Right) */}
        <div
          className="absolute -bottom-[10%] -right-[5%] w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(37, 35, 31, 0.035) 0%, transparent 70%)',
            filter: 'blur(95px)',
          }}
        />
      </motion.div>

      {/* ── 2. DATA GRID (BEHIND RIGHT-SIDE HERO DASHBOARD) ─────────────── */}
      <div
        className="absolute top-[6%] right-0 w-[55%] h-[720px] pointer-events-none hidden md:block"
        style={{
          maskImage: 'radial-gradient(ellipse 65% 65% at 55% 45%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 55% 45%, black 20%, transparent 80%)',
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ats-data-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1" fill="#A96B32" fillOpacity="0.12" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ats-data-grid)" />
        </svg>
      </div>

      {/* ── 3. CONNECTED CURVED DATA LINES & INTELLIGENCE SIGNALS ───────── */}
      <motion.div style={{ y: linesY }} className="absolute inset-0 w-full h-full">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Path 1: Primary Intelligence Flow (Bottom-Left to Top-Right Dashboard) */}
          <path
            id="ats-flow-path-1"
            d="M 80 760 C 340 720, 520 440, 860 410 C 1060 390, 1220 480, 1400 350"
            stroke="rgba(169, 107, 50, 0.10)"
            strokeWidth="1.2"
            strokeDasharray="4 8"
          />

          {/* Path 2: Sub-Flow (Across Header / Upper Hero) */}
          <path
            id="ats-flow-path-2"
            d="M 220 160 C 460 210, 680 130, 980 200 C 1180 245, 1310 155, 1420 230"
            stroke="rgba(185, 120, 60, 0.08)"
            strokeWidth="1"
          />

          {/* Path 3: Lateral Optimization Stream */}
          <path
            d="M 40 420 C 300 370, 540 560, 890 510 C 1140 470, 1290 590, 1430 540"
            stroke="rgba(200, 148, 98, 0.07)"
            strokeWidth="1"
            strokeDasharray="3 6"
          />

          {/* Traveling Intelligence Signal 1 */}
          {!shouldReduceMotion && (
            <g filter="url(#glow-blur)">
              <circle r="2.8" fill="#B9783C" opacity="0.85">
                <animateMotion
                  dur="16s"
                  repeatCount="indefinite"
                  path="M 80 760 C 340 720, 520 440, 860 410 C 1060 390, 1220 480, 1400 350"
                />
              </circle>
            </g>
          )}

          {/* Traveling Intelligence Signal 2 */}
          {!shouldReduceMotion && (
            <g filter="url(#glow-blur)">
              <circle r="2" fill="#C89462" opacity="0.7">
                <animateMotion
                  dur="22s"
                  begin="6s"
                  repeatCount="indefinite"
                  path="M 220 160 C 460 210, 680 130, 980 200 C 1180 245, 1310 155, 1420 230"
                />
              </circle>
            </g>
          )}
        </svg>
      </motion.div>

      {/* ── 4. FLOATING PARTICLES ─────────────────────────────────────────── */}
      <motion.div style={{ y: particlesY }} className="absolute inset-0">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full ambient-animated"
            style={{
              left: p.x,
              top: p.y,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.opacity,
              boxShadow: `0 0 8px ${p.color}40`,
              animation: shouldReduceMotion
                ? 'none'
                : `particleDrift ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            }}
          />
        ))}
      </motion.div>

      {/* ── 5. SUBTLE PERIPHERAL METADATA LABELS ─────────────────────────── */}
      <motion.div
        style={{ y: labelsY }}
        className="absolute inset-0 hidden xl:block pointer-events-none"
      >
        {/* Label 1: Smart Parsing (Top Left) */}
        <div
          className="absolute top-[18%] left-[4%] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#A96B32]/15 bg-[#F5F1E9]/60 backdrop-blur-[2px] shadow-[0_2px_10px_rgba(37,35,31,0.03)] ambient-animated"
          style={{
            animation: shouldReduceMotion ? 'none' : 'labelFloat 14s ease-in-out 0s infinite alternate',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#B9783C] opacity-75" />
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#25231F]/45 font-medium">
            Smart Parsing · ML Engine
          </span>
        </div>

        {/* Label 2: Real-time Analysis (Top Right) */}
        <div
          className="absolute top-[14%] right-[3%] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#A96B32]/15 bg-[#F5F1E9]/60 backdrop-blur-[2px] shadow-[0_2px_10px_rgba(37,35,31,0.03)] ambient-animated"
          style={{
            animation: shouldReduceMotion ? 'none' : 'labelFloat 16s ease-in-out 2s infinite alternate',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#A96B32] opacity-70 animate-pulse" />
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#25231F]/45 font-medium">
            Real-time Analysis
          </span>
        </div>

        {/* Label 3: ATS Score Intelligence (Mid Left) */}
        <div
          className="absolute top-[56%] left-[3%] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#A96B32]/15 bg-[#F5F1E9]/60 backdrop-blur-[2px] shadow-[0_2px_10px_rgba(37,35,31,0.03)] ambient-animated"
          style={{
            animation: shouldReduceMotion ? 'none' : 'labelFloat 15s ease-in-out 4s infinite alternate',
          }}
        >
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#25231F]/40 font-medium">
            ATS Score Field <span className="text-[#A96B32]/80 ml-0.5">· 98%</span>
          </span>
        </div>

        {/* Label 4: Optimized Output (Lower Right) */}
        <div
          className="absolute top-[72%] right-[4%] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#A96B32]/15 bg-[#F5F1E9]/60 backdrop-blur-[2px] shadow-[0_2px_10px_rgba(37,35,31,0.03)] ambient-animated"
          style={{
            animation: shouldReduceMotion ? 'none' : 'labelFloat 18s ease-in-out 1s infinite alternate',
          }}
        >
          <span className="text-[#B9783C] text-[10px]">✓</span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#25231F]/40 font-medium">
            Optimized Output · 0ms
          </span>
        </div>
      </motion.div>

      {/* ── 6. ORGANIC PAPER GRAIN TEXTURE ───────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><filter id=\"noiseFilter\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.82\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23noiseFilter)\"/></svg>')",
        }}
      />
    </div>
  );
}
