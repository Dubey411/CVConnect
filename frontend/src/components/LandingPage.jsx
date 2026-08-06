/**
 * LandingPage.jsx — Root entry point
 * - Initializes Lenis smooth scroll (singleton) and ticks via GSAP ticker
 * - Mounts hero section (existing) + ScrollStory (GSAP-driven cinematic sections)
 * - Mouse spotlight, ambient particles, sticky nav
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import HeroSection  from './landing/HeroSection';
import ScrollStory  from './landing/scroll/ScrollStory';

gsap.registerPlugin(ScrollTrigger);

/* ─── Mouse spotlight ──────────────────────────────────────────────────── */
function MouseSpotlight() {
  const x  = useMotionValue(typeof window !== 'undefined' ? window.innerWidth  / 2 : 0);
  const y  = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  const sx = useSpring(x, { stiffness: 60, damping: 22 });
  const sy = useSpring(y, { stiffness: 60, damping: 22 });

  useEffect(() => {
    const move = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [x, y]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 700, height: 700,
          x: sx, y: sy,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(59,224,197,0.045) 0%, transparent 65%)',
          top: 0, left: 0,
        }}
      />
    </div>
  );
}

/* ─── Ambient Background ──────────────────────────────────────────────── */
function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Blob 1 */}
      <motion.div
        className="absolute rounded-full opacity-25"
        style={{
          width: 900, height: 900,
          top: '-20%', left: '-20%',
          background: 'radial-gradient(ellipse, rgba(59,224,197,0.07) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Blob 2 */}
      <motion.div
        className="absolute rounded-full opacity-20"
        style={{
          width: 800, height: 800,
          bottom: '-20%', right: '-20%',
          background: 'radial-gradient(ellipse, rgba(96,165,250,0.07) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
        animate={{ x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,224,197,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,224,197,1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      {/* Glowing dots */}
      {[...Array(14)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left:  `${8 + (i * 6.8) % 86}%`,
            top:   `${4 + (i * 9.3) % 92}%`,
            background: i % 3 === 0 ? '#3be0c5' : i % 3 === 1 ? '#60a5fa' : '#a78bfa',
            opacity: 0.35,
          }}
          animate={{ opacity: [0.15, 0.55, 0.15], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
        />
      ))}
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────────────────────────── */
function Nav({ onGetStarted, onSignIn }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-[100] px-4 pt-3.5 pointer-events-none"
    >
      <div
        className={`max-w-2xl mx-auto h-12 px-4 rounded-full flex items-center justify-between pointer-events-auto transition-all duration-300 backdrop-blur-xl ${
          scrolled
            ? 'bg-[#0c1b2c]/90 border border-[#3be0c5]/30 shadow-[0_12px_40px_rgba(0,0,0,0.8)]'
            : 'bg-[#081422]/75 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[#081422] text-[10px]"
            style={{ background: 'linear-gradient(135deg, #3be0c5, #60a5fa)' }}
          >
            CV
          </div>
          <span className="font-semibold text-white text-xs tracking-tight">CVConnect</span>
          <span
            className="ml-1 px-1.5 py-0.2 rounded-full font-mono text-[8px] text-[#3be0c5] border border-[#3be0c5]/30 uppercase tracking-widest"
            style={{ background: 'rgba(59,224,197,0.06)' }}
          >
            v2.4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSignIn} className="text-xs font-medium text-slate-400 hover:text-white transition-colors px-2.5 py-1">
            Sign In
          </button>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1 text-xs font-semibold text-[#081422] px-3 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #3be0c5, #5de8d2)',
              boxShadow: '0 0 16px rgba(59,224,197,0.35)',
            }}
          >
            Get Started <ArrowRight size={11} />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[#20364d]/50 py-10 relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[#081422] text-xs"
            style={{ background: 'linear-gradient(135deg, #3be0c5, #60a5fa)' }}
          >CV</div>
          <span className="font-semibold text-white text-sm tracking-tight">CVConnect</span>
        </div>
        <p className="text-xs text-slate-500 font-mono">
          © {new Date().getFullYear()} CVConnect · Truth-first resume optimization · v2.4 Production
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-mono">All Systems Operational</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Scroll indicator ────────────────────────────────────────────────── */
function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5 }}
    >
      <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Scroll to explore</span>
      <motion.div
        className="w-px h-12 rounded-full"
        style={{ background: 'linear-gradient(180deg, transparent, #3be0c5, transparent)' }}
        animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

/* ─── LandingPage ─────────────────────────────────────────────────────── */
export default function LandingPage({ onGetStarted, onSignIn }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Tick Lenis via GSAP ticker for synchronized scroll
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Connect Lenis to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
      lenis.destroy();
    };
  }, []);

  return (
    <div
      className="min-h-screen text-slate-100 selection:bg-[#3be0c5] selection:text-[#081422] relative overflow-x-hidden"
      style={{ background: '#081422' }}
    >
      <AmbientBackground />
      <MouseSpotlight />

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
