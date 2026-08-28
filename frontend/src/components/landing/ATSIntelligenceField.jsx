import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Sparkles, FileText, BarChart2, Check, ChevronDown } from 'lucide-react';

/**
 * ATSIntelligenceField.jsx
 *
 * True Luminous Golden Silk Ribbon & Premium VisionOS-Grade Glassmorphism:
 * 1. Multi-layered Liquid Golden Ribbons:
 *    - Wide atmospheric bloom (24px glow with gaussian diffusion)
 *    - Rich metallic liquid gold body with specular core filament
 *    - Harmonious dual-strand ribbon weave creating 3D silk depth
 * 2. Real Ultra-Premium Glassmorphism on all 7 Token Nodes:
 *    - Translucent glass with heavy backdrop-blur (18px) and saturation boost
 *    - Specular inner rim reflection (inset 0 1.5px white light highlight)
 *    - Dual-tone gradient glass paneling
 *    - Floating glass coins and pill badges
 * 3. Radiant Golden Orbs & Traveling Starlight Pulses
 * 4. Dotted Constellation Matrix Grid behind Dashboard
 * 5. 100% pointer-events-none & z-0, preserving foreground interactivity
 */

export default function ATSIntelligenceField() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Subtle multi-plane depth response on scroll
  const parallaxGlow = useTransform(scrollY, [0, 900], [0, shouldReduceMotion ? 0 : -25]);
  const parallaxRibbons = useTransform(scrollY, [0, 900], [0, shouldReduceMotion ? 0 : -45]);
  const parallaxTokens = useTransform(scrollY, [0, 900], [0, shouldReduceMotion ? 0 : -70]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ backgroundColor: '#F5F1E9' }}
    >
      {/* ── 1. AMBIENT GLOWS & LIGHTING FIELD ────────────────────────────── */}
      <motion.div style={{ y: parallaxGlow }} className="absolute inset-0">
        {/* Luminous Central Light Well */}
        <div
          className="absolute top-[6%] left-[12%] w-[75vw] h-[80vh] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255, 254, 250, 0.95) 0%, rgba(245, 241, 233, 0.5) 55%, transparent 75%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Golden Honey Glow Behind Hero Dashboard */}
        <div
          className="absolute top-[8%] right-[0%] w-[780px] h-[780px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(212, 148, 76, 0.22) 0%, rgba(230, 184, 118, 0.10) 45%, transparent 70%)',
            filter: 'blur(85px)',
            animation: shouldReduceMotion ? 'none' : 'breatheGlow 22s ease-in-out infinite alternate',
          }}
        />

        {/* Warm Amber Glow at Top-Left */}
        <div
          className="absolute -top-[12%] -left-[8%] w-[720px] h-[720px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(200, 148, 98, 0.20) 0%, rgba(238, 231, 220, 0.4) 50%, transparent 70%)',
            filter: 'blur(80px)',
            animation: shouldReduceMotion ? 'none' : 'driftTopLeft 24s ease-in-out infinite alternate',
          }}
        />

        {/* Deep Sand Aura along Lower Canvas */}
        <div
          className="absolute -bottom-[12%] left-[18%] w-[68vw] h-[520px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 60%, rgba(185, 120, 60, 0.16) 0%, rgba(229, 217, 201, 0.15) 50%, transparent 70%)',
            filter: 'blur(85px)',
          }}
        />
      </motion.div>

      {/* ── 2. DOTTED CONSTELLATION DATA MATRIX ───────────────────────────── */}
      <div
        className="absolute top-[2%] right-[0%] w-[62vw] h-[820px] pointer-events-none hidden md:block"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 65% at 60% 45%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 60% 45%, black 30%, transparent 80%)',
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ats-constellation-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.2" fill="#B9783C" fillOpacity="0.25" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ats-constellation-grid)" />
        </svg>
      </div>

      {/* ── 3. LUMINOUS 3D GOLDEN SILK RIBBONS & ORBS ────────────────────── */}
      <motion.div style={{ y: parallaxRibbons }} className="absolute inset-0 w-full h-full">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Liquid Metallic Gold Shimmer Gradient */}
            <linearGradient id="liquidGoldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C89462" stopOpacity="0.65" />
              <stop offset="18%" stopColor="#F5D7A1" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#FFE7B3" stopOpacity="1" />
              <stop offset="68%" stopColor="#E6B876" stopOpacity="0.95" />
              <stop offset="86%" stopColor="#F9E2B8" stopOpacity="1" />
              <stop offset="100%" stopColor="#A96B32" stopOpacity="0.70" />
            </linearGradient>

            {/* Radiant Bloom Glow Filter */}
            <filter id="ribbonBloomWide" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="wideBlur" />
              <feGaussianBlur stdDeviation="2.5" result="sharpBlur" />
              <feMerge>
                <feMergeNode in="wideBlur" />
                <feMergeNode in="sharpBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Specular Orb Pearl Glow Filter */}
            <filter id="pearlGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial Pearl Gradient */}
            <radialGradient id="goldPearlGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#FDE6BE" />
              <stop offset="70%" stopColor="#D4A373" />
              <stop offset="100%" stopColor="#A96B32" />
            </radialGradient>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════
              RIBBON 1: LEFT SWEEPING SILK WAVE
              Flows from AI Power through Document Node to Smart Parsing
             ═══════════════════════════════════════════════════════════════ */}
          {/* Layer A: Wide Atmospheric Bloom */}
          <path
            d="M 120 180 C 55 280, 48 380, 78 440 C 118 520, 138 640, 82 780 C 52 850, 120 900, 240 910"
            stroke="rgba(218, 165, 98, 0.35)"
            strokeWidth="16"
            strokeLinecap="round"
            filter="url(#ribbonBloomWide)"
          />
          {/* Layer B: Liquid Gold Ribbon Body */}
          <path
            d="M 120 180 C 55 280, 48 380, 78 440 C 118 520, 138 640, 82 780 C 52 850, 120 900, 240 910"
            stroke="url(#liquidGoldRibbon)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Layer C: Specular Light Glint Centerline */}
          <path
            d="M 120 180 C 55 280, 48 380, 78 440 C 118 520, 138 640, 82 780 C 52 850, 120 900, 240 910"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeOpacity="0.75"
            strokeLinecap="round"
          />
          {/* Layer D: Dual Companion Silk Strand (Creates 3D Fold Depth) */}
          <path
            d="M 130 188 C 65 288, 56 386, 86 446 C 126 524, 144 642, 90 782 C 60 852, 126 904, 246 914"
            stroke="rgba(245, 215, 161, 0.45)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* ═══════════════════════════════════════════════════════════════
              RIBBON 2: TOP HORIZON ARCH
              Curves gracefully across upper canvas behind hero title
             ═══════════════════════════════════════════════════════════════ */}
          {/* Layer A: Wide Bloom */}
          <path
            d="M 40 240 C 260 155, 480 275, 740 255 C 980 235, 1180 135, 1340 175"
            stroke="rgba(218, 165, 98, 0.28)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#ribbonBloomWide)"
          />
          {/* Layer B: Liquid Gold Ribbon */}
          <path
            d="M 40 240 C 260 155, 480 275, 740 255 C 980 235, 1180 135, 1340 175"
            stroke="url(#liquidGoldRibbon)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Layer C: Specular Light Glint */}
          <path
            d="M 40 240 C 260 155, 480 275, 740 255 C 980 235, 1180 135, 1340 175"
            stroke="#FFFFFF"
            strokeWidth="1.0"
            strokeOpacity="0.65"
            strokeLinecap="round"
          />

          {/* ═══════════════════════════════════════════════════════════════
              RIBBON 3: RIGHT CASCADING SILK CURVE
              Flows from Real-time Analytics to Checkmark & Output
             ═══════════════════════════════════════════════════════════════ */}
          {/* Layer A: Wide Bloom */}
          <path
            d="M 1340 175 C 1425 275, 1395 480, 1365 620 C 1335 760, 1405 830, 1325 870 C 1245 910, 980 890, 720 910"
            stroke="rgba(218, 165, 98, 0.35)"
            strokeWidth="16"
            strokeLinecap="round"
            filter="url(#ribbonBloomWide)"
          />
          {/* Layer B: Liquid Gold Ribbon Body */}
          <path
            d="M 1340 175 C 1425 275, 1395 480, 1365 620 C 1335 760, 1405 830, 1325 870 C 1245 910, 980 890, 720 910"
            stroke="url(#liquidGoldRibbon)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Layer C: Specular Light Glint */}
          <path
            d="M 1340 175 C 1425 275, 1395 480, 1365 620 C 1335 760, 1405 830, 1325 870 C 1245 910, 980 890, 720 910"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeOpacity="0.75"
            strokeLinecap="round"
          />
          {/* Layer D: Companion Strand */}
          <path
            d="M 1348 182 C 1432 280, 1402 484, 1372 622 C 1342 762, 1410 834, 1332 874 C 1250 914, 984 894, 724 914"
            stroke="rgba(245, 215, 161, 0.45)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* ═══════════════════════════════════════════════════════════════
              RIBBON 4: DELICATE TRANSVERSE CONNECTOR
             ═══════════════════════════════════════════════════════════════ */}
          <path
            d="M 78 440 C 280 415, 520 685, 840 640 C 1100 595, 1260 760, 1340 855"
            stroke="rgba(212, 163, 115, 0.28)"
            strokeWidth="1.6"
            strokeDasharray="5 7"
          />

          {/* ═══════════════════════════════════════════════════════════════
              RADIANT GOLDEN ORB PEARLS ALONG THE RIBBONS
             ═══════════════════════════════════════════════════════════════ */}
          {/* Pearl 1 (near top-left AI Power) */}
          <circle cx="120" cy="180" r="12" fill="rgba(245, 215, 161, 0.4)" filter="url(#pearlGlow)" />
          <circle cx="120" cy="180" r="5" fill="url(#goldPearlGrad)" />
          <circle cx="118.5" cy="178.5" r="1.8" fill="#FFFFFF" />

          {/* Pearl 2 (mid left above document token) */}
          <circle cx="66" cy="340" r="10" fill="rgba(245, 215, 161, 0.35)" filter="url(#pearlGlow)" />
          <circle cx="66" cy="340" r="4.2" fill="url(#goldPearlGrad)" />
          <circle cx="65" cy="339" r="1.5" fill="#FFFFFF" />

          {/* Pearl 3 (lower left near smart parsing) */}
          <circle cx="92" cy="715" r="11" fill="rgba(245, 215, 161, 0.38)" filter="url(#pearlGlow)" />
          <circle cx="92" cy="715" r="4.5" fill="url(#goldPearlGrad)" />
          <circle cx="90.5" cy="713.5" r="1.6" fill="#FFFFFF" />

          {/* Pearl 4 (center top arch) */}
          <circle cx="560" cy="270" r="10" fill="rgba(245, 215, 161, 0.35)" filter="url(#pearlGlow)" />
          <circle cx="560" cy="270" r="4" fill="url(#goldPearlGrad)" />
          <circle cx="558.5" cy="268.5" r="1.5" fill="#FFFFFF" />

          {/* Pearl 5 (right side near chart node) */}
          <circle cx="1370" cy="340" r="12" fill="rgba(245, 215, 161, 0.4)" filter="url(#pearlGlow)" />
          <circle cx="1370" cy="340" r="5" fill="url(#goldPearlGrad)" />
          <circle cx="1368.5" cy="338.5" r="1.8" fill="#FFFFFF" />

          {/* Pearl 6 (lower right near output node) */}
          <circle cx="1340" cy="740" r="11" fill="rgba(245, 215, 161, 0.38)" filter="url(#pearlGlow)" />
          <circle cx="1340" cy="740" r="4.5" fill="url(#goldPearlGrad)" />
          <circle cx="1338.5" cy="738.5" r="1.6" fill="#FFFFFF" />

          {/* Pearl 7 (bottom center flow) */}
          <circle cx="820" cy="895" r="10" fill="rgba(245, 215, 161, 0.35)" filter="url(#pearlGlow)" />
          <circle cx="820" cy="895" r="4.2" fill="url(#goldPearlGrad)" />
          <circle cx="818.5" cy="893.5" r="1.5" fill="#FFFFFF" />

          {/* ═══════════════════════════════════════════════════════════════
              STARLIGHT TRAVELING PULSES
             ═══════════════════════════════════════════════════════════════ */}
          {!shouldReduceMotion && (
            <>
              {/* Left Ribbon Traveling Pulse */}
              <circle r="4.5" fill="#FFFFFF" filter="url(#pearlGlow)">
                <animateMotion
                  dur="13s"
                  repeatCount="indefinite"
                  path="M 120 180 C 55 280, 48 380, 78 440 C 118 520, 138 640, 82 780 C 52 850, 120 900, 240 910"
                />
              </circle>
              <circle r="2.2" fill="#FFFFFF">
                <animateMotion
                  dur="13s"
                  repeatCount="indefinite"
                  path="M 120 180 C 55 280, 48 380, 78 440 C 118 520, 138 640, 82 780 C 52 850, 120 900, 240 910"
                />
              </circle>

              {/* Right Ribbon Traveling Pulse */}
              <circle r="4.5" fill="#FFFFFF" filter="url(#pearlGlow)">
                <animateMotion
                  dur="16s"
                  begin="3.5s"
                  repeatCount="indefinite"
                  path="M 1340 175 C 1425 275, 1395 480, 1365 620 C 1335 760, 1405 830, 1325 870 C 1245 910, 980 890, 720 910"
                />
              </circle>
              <circle r="2.2" fill="#FFFFFF">
                <animateMotion
                  dur="16s"
                  begin="3.5s"
                  repeatCount="indefinite"
                  path="M 1340 175 C 1425 275, 1395 480, 1365 620 C 1335 760, 1405 830, 1325 870 C 1245 910, 980 890, 720 910"
                />
              </circle>
            </>
          )}
        </svg>
      </motion.div>

      {/* ── 4. ULTRA-PREMIUM GLASSMORPHIC TOKEN NODES & COINS ────────────── */}
      <motion.div
        style={{ y: parallaxTokens }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Token 1: [✦ AI Power] (Top Left) */}
        <div
          className="absolute top-[21.5%] left-[4.5%] hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 12s ease-in-out infinite alternate',
          }}
        >
          <Sparkles size={13} className="text-[#A96B32]" />
          <span className="text-[11.5px] font-semibold text-[#25231F] tracking-tight font-sans">
            AI Power
          </span>
        </div>

        {/* Token 2: [📄 Document Coin Node] (Mid Left) */}
        <div
          className="absolute top-[43.5%] left-[4.6%] hidden lg:flex w-10 h-10 rounded-full items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.18), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat2 15s ease-in-out 1s infinite alternate',
          }}
        >
          <FileText size={17} className="text-[#A96B32]" />
        </div>

        {/* Token 3: [● Smart Parsing] (Bottom Left) */}
        <div
          className="absolute bottom-[13%] left-[3.2%] hidden lg:inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 16s ease-in-out 2s infinite alternate',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#B9783C] shadow-[0_0_8px_#B9783C]" />
          <span className="text-[11.5px] font-semibold text-[#25231F] tracking-tight font-sans">
            Smart Parsing
          </span>
        </div>

        {/* Token 4: [✦ Real-time Analysis] (Top Right) */}
        <div
          className="absolute top-[12%] right-[5.5%] hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat2 14s ease-in-out 0.5s infinite alternate',
          }}
        >
          <Sparkles size={13} className="text-[#A96B32]" />
          <span className="text-[11.5px] font-semibold text-[#25231F] tracking-tight font-sans">
            Real-time Analysis
          </span>
        </div>

        {/* Token 5: [📊 Bar Chart Coin Node] (Mid Right) */}
        <div
          className="absolute top-[18.5%] right-[9.2%] hidden lg:flex w-10 h-10 rounded-full items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.18), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 17s ease-in-out 1.5s infinite alternate',
          }}
        >
          <BarChart2 size={17} className="text-[#A96B32]" />
        </div>

        {/* Token 6: [✓ Checkmark Coin Node] (Bottom Right) */}
        <div
          className="absolute bottom-[16%] right-[5.2%] hidden lg:flex w-10 h-10 rounded-full items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.18), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat2 13s ease-in-out 2.5s infinite alternate',
          }}
        >
          <Check size={17} className="text-[#A96B32] stroke-[2.5]" />
        </div>

        {/* Token 7: [⌄ Optimized Output] (Bottom Right Pill) */}
        <div
          className="absolute bottom-[10.5%] right-[5%] hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 250, 242, 0.35) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px -5px rgba(185, 120, 60, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
            animation: shouldReduceMotion ? 'none' : 'tokenFloat1 15s ease-in-out 3s infinite alternate',
          }}
        >
          <ChevronDown size={14} className="text-[#A96B32]" />
          <span className="text-[11.5px] font-semibold text-[#25231F] tracking-tight font-sans">
            Optimized Output
          </span>
        </div>
      </motion.div>

      {/* ── 5. ORGANIC PAPER GRAIN TEXTURE OVERLAY ───────────────────────── */}
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
