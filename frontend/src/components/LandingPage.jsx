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

gsap.registerPlugin(ScrollTrigger);

/* ─── Ambient Background — intentionally minimal ─────────────────────── */
function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Very subtle top-left glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 800, height: 800,
          top: '-30%', left: '-25%',
          background: 'radial-gradient(ellipse, rgba(59,224,197,0.04) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Very subtle bottom-right glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 700, height: 700,
          bottom: '-25%', right: '-20%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.04) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Barely-there grid — only visible on close inspection */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
        }}
      />
    </div>
  );
}

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
            ? 'bg-[#0b1826]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
            : 'bg-[#0b1826]/70 backdrop-blur-md border border-white/[0.07]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[#081422] text-[10px] shrink-0"
            style={{ background: '#3be0c5' }}
          >
            CV
          </div>
          <span className="font-semibold text-white text-xs tracking-tight">CVConnect</span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[8px] font-mono text-[#3be0c5]/70 border border-[#3be0c5]/20"
            style={{ background: 'rgba(59,224,197,0.05)' }}
          >
            v2.4
          </span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSignIn}
            className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors duration-200 px-3 py-1.5"
          >
            Sign in
          </button>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#071622] px-3.5 py-1.5 rounded-full"
            style={{ background: '#3be0c5' }}
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
    <footer className="border-t border-white/[0.06] py-10 relative z-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[#081422] text-[10px]"
            style={{ background: '#3be0c5' }}
          >CV</div>
          <span className="font-medium text-slate-400 text-sm">CVConnect</span>
        </div>
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} CVConnect · AI Resume Optimization · v2.4
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-emerald-600/90">All systems operational</span>
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
        style={{ background: 'linear-gradient(180deg, transparent, rgba(59,224,197,0.5), transparent)' }}
        animate={{ scaleY: [0.6, 1, 0.6], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-[9px] text-slate-600 tracking-widest">scroll</span>
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
      className="min-h-screen text-slate-100 selection:bg-[#3be0c5]/30 selection:text-white relative overflow-x-hidden"
      style={{ background: '#071622' }}
    >
      <AmbientBackground />

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
