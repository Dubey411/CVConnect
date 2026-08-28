import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Sparkles, FileText, BarChart2, Check, ChevronDown } from 'lucide-react';

/**
 * ATSIntelligenceField.jsx
 *
 * Exact implementation of the luminous "ATS Intelligence Field" background:
 * - Warm golden-silk ribbon curves sweeping across the canvas
 * - Glowing orb pearl nodes stationed along the trajectories
 * - Glassmorphic floating token nodes (AI Power, 📄, Smart Parsing, Real-time Analysis, 📊, ✓, Optimized Output)
 * - Warm dot matrix grid behind the right-hand dashboard
 * - Luminous central spotlight with warm sand/honey corner vignettes
 * - Delicate traveling light pulses along the curves
 * - 100% pointer-events-none & z-0
 */

export default function ATSIntelligenceField() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Subtle multi-plane parallax response
  const parallaxGlow = useTransform(scrollY, [0, 800], [0, shouldReduceMotion ? 0 : -30]);
  const parallaxCurves = useTransform(scrollY, [0, 800], [0, shouldReduceMotion ? 0 : -50]);
  const parallaxTokens = useTransform(scrollY, [0, 800], [0, shouldReduceMotion ? 0 : -75]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ backgroundColor: '#F5F1E9' }}
    >
      {/* ── 1. AMBIENT LIGHTING & GLOWING VIGNETTES ──────────────────────── */}
      <motion.div style={{ y: parallaxGlow }} className="absolute inset-0">
        {/* Central Luminous Spotlight (Highlights Headline & Dashboard) */}
        <div
          className="absolute top-[8%] left-[15%] w-[70vw] h-[75vh] rounded-full"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255, 253, 249, 0.85) 0%, rgba(245, 241, 233, 0.4) 55%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Top-Left Warm Toasted Glow */}
        <div
          className="absolute -top-[12%] -left-[10%] w-[680px] h-[680px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212, 163, 115, 0.22) 0%, rgba(229, 217, 201, 0.12) 50%, transparent 70%)',
            filter: 'blur(80px)',
            animation: shouldReduceMotion ? 'none' : 'driftTopLeft 22s ease-in-out infinite alternate',
          }}
        />

        {/* Right Dashboard Ambient Glow */}
        <div
          className="absolute top-[10%] right-[0%] w-[720px] h-[720px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(185, 120, 60, 0.18) 0%, rgba(212, 163, 115, 0.08) 45%, transparent 70%)',
            filter: 'blur(90px)',
            animation: shouldReduceMotion ? 'none' : 'breatheGlow 24s ease-in-out infinite alternate',
          }}
        />

        {/* Bottom Sweeping Warm Sand Aura */}
        <div
          className="absolute -bottom-[15%] left-[20%] w-[65vw] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse at 50% 60%, rgba(200, 148, 98, 0.16) 0%, rgba(229, 217, 201, 0.08) 50%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </motion.div>

      {/* ── 2. DOTTED CONSTELLATION GRID ─────────────────────────────────── */}
      <div
        className="absolute top-[2%] right-[0%] w-[60vw] h-[800px] pointer-events-none hidden md:block"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 65% at 60% 45%, black 25%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 60% 45%, black 25%, transparent 80%)',
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ats-matrix-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.1" fill="#B9783C" fillOpacity="0.22" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ats-matrix-grid)" />
        </svg>
      </div>

      {/* ── 3. LUMINOUS GOLDEN-SILK RIBBON STRANDS & TRAVELING SIGNALS ────── */}
      <motion.div style={{ y: parallaxCurves }} className="absolute inset-0 w-full h-full">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Golden Strand Gradient */}
            <linearGradient id="goldStrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C89462" stopOpacity="0.35" />
              <stop offset="35%" stopColor="#B9783C" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#D4A373" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#A96B32" stopOpacity="0.30" />
            </linearGradient>

            {/* Soft Ambient Line Glow */}
            <filter id="ribbonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense Orb Glow */}
            <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Curve 1: Left Sweeping S-Curve (AI Power -> Document Icon -> Smart Parsing) */}
          <path
            d="M 120 180 C 60 280, 50 380, 80 440 C 120 520, 140 640, 80 780 C 50 850, 120 900, 240 910"
            stroke="rgba(212, 163, 115, 0.25)"
            strokeWidth="3.5"
            filter="url(#ribbonGlow)"
          />
          <path
            id="strand-left"
            d="M 120 180 C 60 280, 50 380, 80 440 C 120 520, 140 640, 80 780 C 50 850, 120 900, 240 910"
            stroke="url(#goldStrandGrad)"
            strokeWidth="1.6"
          />

          {/* ── Curve 2: Top Arch Flowing Across Title Behind Dashboard ───── */}
          <path
            d="M 40 240 C 260 160, 480 280, 740 260 C 980 240, 1180 140, 1340 180"
            stroke="rgba(212, 163, 115, 0.20)"
            strokeWidth="3"
            filter="url(#ribbonGlow)"
          />
          <path
            id="strand-top"
            d="M 40 240 C 260 160, 480 280, 740 260 C 980 240, 1180 140, 1340 180"
            stroke="url(#goldStrandGrad)"
            strokeWidth="1.4"
          />

          {/* ── Curve 3: Right Arc Cascading Through Analytics to Output ─── */}
          <path
            d="M 1340 180 C 1420 280, 1390 480, 1360 620 C 1330 760, 1400 830, 1320 870 C 1240 910, 980 890, 720 910"
            stroke="rgba(212, 163, 115, 0.22)"
            strokeWidth="3.5"
            filter="url(#ribbonGlow)"
          />
          <path
            id="strand-right"
            d="M 1340 180 C 1420 280, 1390 480, 1360 620 C 1330 760, 1400 830, 1320 870 C 1240 910, 980 890, 720 910"
            stroke="url(#goldStrandGrad)"
            strokeWidth="1.6"
          />

          {/* ── Curve 4: Delicate Diagonal Connecting Swirl ───────────────── */}
          <path
            d="M 80 440 C 280 420, 520 680, 840 640 C 1100 600, 1260 760, 1340 850"
            stroke="rgba(185, 120, 60, 0.18)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* ── Golden Glowing Orb Pearls Along Curves ────────────────────── */}
          {/* Pearl 1 (near top-left) */}
          <circle cx="120" cy="180" r="3.5" fill="#D4A373" filter="url(#orbGlow)" />
          <circle cx="120" cy="180" r="2" fill="#FFFFFF" />

          {/* Pearl 2 (mid left above document) */}
          <circle cx="68" cy="340" r="3.2" fill="#B9783C" filter="url(#orbGlow)" />
          <circle cx="68" cy="340" r="1.8" fill="#FFF5EB" />

          {/* Pearl 3 (lower left near smart parsing) */}
          <circle cx="95" cy="710" r="3" fill="#D4A373" filter="url(#orbGlow)" />

          {/* Pearl 4 (center top arch) */}
          <circle cx="560" cy="270" r="2.8" fill="#C89462" filter="url(#orbGlow)" />

          {/* Pearl 5 (right side near chart) */}
          <circle cx="1370" cy="340" r="3.5" fill="#B9783C" filter="url(#orbGlow)" />
          <circle cx="1370" cy="340" r="2" fill="#FFFFFF" />

          {/* Pearl 6 (lower right near output) */}
          <circle cx="1340" cy="740" r="3.2" fill="#D4A373" filter="url(#orbGlow)" />
          <circle cx="1340" cy="740" r="1.8" fill="#FFF5EB" />

          {/* Pearl 7 (bottom center flow) */}
          <circle cx="820" cy="895" r="3" fill="#B9783C" filter="url(#orbGlow)" />

          {/* ── Traveling Intelligence Light Signals ─────────────────────── */}
          {!shouldReduceMotion && (
            <>
              {/* Signal 1: Travels down left curve */}
              <circle r="3.2" fill="#FFFFFF" filter="url(#orbGlow)">
                <animateMotion
                  dur="14s"
                  repeatCount="indefinite"
                  path="M 120 180 C 60 280, 50 380, 80 440 C 120 520, 140 640, 80 780 C 50 850, 120 900, 240 910"
                />
              </circle>

              {/* Signal 2: Travels down right curve */}
              <circle r="3" fill="#FFFFFF" filter="url(#orbGlow)">
                <animateMotion
                  dur="18s"
                  begin="4s"
                  repeatCount="indefinite"
                  path="M 1340 180 C 1420 280, 1390 480, 1360 620 C 1330 760, 1400 830, 1320 870 C 1240 910, 980 890, 720 910"
                />
              </circle>
            </>
          )}
        </svg>
      </motion.div>

      {/* ── 4. FLOATING GLASS TOKENS & BADGES (MATCHING REFERENCE IMAGE) ── */}
      <motion.div
        style={{ y: parallaxTokens }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Token 1: [✦ AI Power] (Top Left) */}
        <div
          className="absolute top-[22%] left-[4.5%] hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#B9783C]/35 bg-[#FAF6F0]/85 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.12)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 12s ease-in-out infinite alternate',
          }}
        >
          <Sparkles size={13} className="text-[#A96B32]" />
          <span className="text-[11.5px] font-medium text-[#25231F]/85 tracking-tight font-sans">
            AI Power
          </span>
        </div>

        {/* Token 2: [📄 Document Coin Node] (Mid Left) */}
        <div
          className="absolute top-[44%] left-[4.8%] hidden lg:flex w-9 h-9 rounded-full items-center justify-center border border-[#B9783C]/35 bg-[#FAF6F0]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.14)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat2 15s ease-in-out 1s infinite alternate',
          }}
        >
          <FileText size={16} className="text-[#A96B32]" />
        </div>

        {/* Token 3: [● Smart Parsing] (Bottom Left) */}
        <div
          className="absolute bottom-[13%] left-[3.2%] hidden lg:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#B9783C]/35 bg-[#FAF6F0]/85 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.12)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 16s ease-in-out 2s infinite alternate',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#B9783C] shadow-[0_0_6px_#B9783C]" />
          <span className="text-[11.5px] font-medium text-[#25231F]/85 tracking-tight font-sans">
            Smart Parsing
          </span>
        </div>

        {/* Token 4: [✦ Real-time Analysis] (Top Right) */}
        <div
          className="absolute top-[12%] right-[5.5%] hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#B9783C]/35 bg-[#FAF6F0]/85 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.12)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat2 14s ease-in-out 0.5s infinite alternate',
          }}
        >
          <Sparkles size={13} className="text-[#A96B32]" />
          <span className="text-[11.5px] font-medium text-[#25231F]/85 tracking-tight font-sans">
            Real-time Analysis
          </span>
        </div>

        {/* Token 5: [📊 Bar Chart Coin Node] (Mid Right) */}
        <div
          className="absolute top-[18.5%] right-[9.2%] hidden lg:flex w-9 h-9 rounded-full items-center justify-center border border-[#B9783C]/35 bg-[#FAF6F0]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.14)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 17s ease-in-out 1.5s infinite alternate',
          }}
        >
          <BarChart2 size={16} className="text-[#A96B32]" />
        </div>

        {/* Token 6: [✓ Checkmark Coin Node] (Bottom Right) */}
        <div
          className="absolute bottom-[16%] right-[5.2%] hidden lg:flex w-9 h-9 rounded-full items-center justify-center border border-[#B9783C]/35 bg-[#FAF6F0]/90 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.14)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat2 13s ease-in-out 2.5s infinite alternate',
          }}
        >
          <Check size={16} className="text-[#A96B32] stroke-[2.5]" />
        </div>

        {/* Token 7: [⌄ Optimized Output] (Bottom Right Pill) */}
        <div
          className="absolute bottom-[10.5%] right-[5%] hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#B9783C]/35 bg-[#FAF6F0]/85 backdrop-blur-md shadow-[0_6px_20px_rgba(185,120,60,0.12)]"
          style={{
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 15s ease-in-out 3s infinite alternate',
          }}
        >
          <ChevronDown size={14} className="text-[#A96B32]" />
          <span className="text-[11.5px] font-medium text-[#25231F]/85 tracking-tight font-sans">
            Optimized Output
          </span>
        </div>
      </motion.div>

      {/* ── 5. ORGANIC NOISE TEXTURE OVERLAY ─────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><filter id=\"noiseFilter\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.82\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23noiseFilter)\"/></svg>')",
        }}
      />
    </div>
  );
}
