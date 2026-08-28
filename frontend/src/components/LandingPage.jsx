/**
 * LandingPage.jsx — Root entry point
 * - Initializes Lenis smooth scroll + GSAP ticker sync
 * - Minimal ambient background, no pulsing particles
 * - Floating glass-capsule nav
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import HeroSection from './landing/HeroSection';
import ScrollStory from './landing/scroll/ScrollStory';
import ATSIntelligenceField from './landing/ATSIntelligenceField';

gsap.registerPlugin(ScrollTrigger);

/* ─── Nav — compact floating glass capsule ───────────────────────────── */
function Nav({ onGetStarted, onSignIn }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 pointer-events-none"
    >
      <header
        className={`max-w-xl mx-auto h-12 px-4 rounded-full flex items-center justify-between pointer-events-auto transition-all duration-500 ${
          scrolled
            ? 'bg-[#FAF6EE]/90 backdrop-blur-xl border border-[#2B2D42]/14 shadow-[0_8px_30px_rgba(22,32,44,0.12)]'
            : 'bg-[#F5F0E8]/75 backdrop-blur-md border border-[#16202C+]/12 shadow-[0_4px_20px_rgba(22,32,44,0.06)]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[#F5EFE4] text-[10px] shrink-0 shadow-sm"
            style={{ background: '#16202C' }}
          >
            CV
          </div>
          <span className="font-semibold text-[#2B2D42] text-xs tracking-tight">CVConnect</span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[8px] font-mono text-[#A8412E] border border-[#9E6634]/25"
            style={{ background: 'rgba(158, 102, 52, 0.08)' }}
          >
            v2.4
          </span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSignIn}
            className="text-[11px] font-medium text-[#6E6259] hover:text-[#2B2D42] transition-colors duration-200 px-3 py-1.5"
          >
            Sign in
          </button>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#F5EFE4] px-3.5 py-1.5 rounded-full shadow-sm"
            style={{ background: '#A8412E' }}
          >
            Get started <ArrowRight size={11} />
          </motion.button>
        </div>
      </header>
    </motion.div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[#16202C]/15 py-10 relative z-10 bg-[#F5F0E8]/40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[#081422] text-[10px]"
            style={{ background: '#16202C' }}
          >CV</div>
          <span className="font-medium text-[#2B2D42] text-sm tracking-tight">CVConnect</span>
        </div>
        <p className="text-xs text-[#6E6259]">
          © {new Date().getFullYear()} CVConnect · AI Resume Optimization · v2.4
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A8412E] animate-pulse" />
          <span className="text-[11px] text-[#6E6259]">All systems operational</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Scroll Indicator ───────────────────────────────────────────────── */
function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 0.8 }}
    >
      <motion.div
        className="w-px h-10 rounded-full"
        style={{ background: 'linear-gradient(180deg, transparent, #A8412E, transparent)' }}
        animate={{ scaleY: [0.6, 1, 0.6], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-[9px] text-[#6E6259] tracking-widest uppercase">scroll</span>
    </motion.div>
  );
}

/* ─── LandingPage ────────────────────────────────────────────────────── */
export default function LandingPage({ onGetStarted, onSignIn }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <div
      className="min-h-screen text-[#2B2D42] selection:bg-[#A8412E]/25 selection:text-[#2B2D42] relative overflow-x-hidden"
      style={{ backgroundColor: '#EDE4D3' }}
    >
      <ATSIntelligenceField />

      <div className="relative z-10">
        <Nav onGetStarted={onGetStarted} onSignIn={onSignIn} />

        {/* Hero */}
        <div className="relative pt-16">
          <HeroSection onGetStarted={onGetStarted} onSignIn={onSignIn} />
          <ScrollIndicator />
        </div>

        {/* Cinematic scroll sections */}
        <ScrollStory onGetStarted={onGetStarted} />

        <Footer />
      </div>
    </div>
  );
}
