import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import HeroSection     from './landing/HeroSection';
import PipelineSection from './landing/PipelineSection';
import BeforeAfterSection from './landing/BeforeAfterSection';
import ATSMatchSection  from './landing/ATSMatchSection';
import KeywordSection   from './landing/KeywordSection';
import FeaturesSection  from './landing/FeaturesSection';
import TrustSection     from './landing/TrustSection';
import CTASection       from './landing/CTASection';

/* ─── Mouse spotlight effect ──────────────────────────────────────────────── */
function MouseSpotlight() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 20 });
  const springY = useSpring(y, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const handle = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, [x, y]);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `radial-gradient(600px circle at ${springX.get()}px ${springY.get()}px, rgba(59,224,197,0.04), transparent 70%)`,
      }}
    />
  );
}

/* ─── Ambient background particles ───────────────────────────────────────── */
function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Moving gradient mesh */}
      <motion.div
        className="absolute -top-1/2 -left-1/4 w-[80%] h-[80%] rounded-full opacity-30"
        style={{ background: 'radial-gradient(ellipse, rgba(59,224,197,0.06) 0%, transparent 60%)' }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-1/4 -right-1/4 w-[70%] h-[70%] rounded-full opacity-20"
        style={{ background: 'radial-gradient(ellipse, rgba(96,165,250,0.08) 0%, transparent 60%)' }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,224,197,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,224,197,1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Tiny glowing dots */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#3be0c5]/40"
          style={{
            left:  `${10 + (i * 7.5) % 85}%`,
            top:   `${5  + (i * 11)  % 90}%`,
          }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 3 + (i % 4),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Sticky Nav ──────────────────────────────────────────────────────────── */
function Nav({ onGetStarted, onSignIn }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b border-[#20364d]/50 backdrop-blur-xl"
      style={{ background: 'rgba(8,20,34,0.85)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[#081422] text-sm"
            style={{ background: 'linear-gradient(135deg, #3be0c5, #60a5fa)' }}
          >
            CV
          </div>
          <span className="font-semibold text-white tracking-tight">CVConnect</span>
          <span
            className="ml-1 px-1.5 py-0.5 rounded-full font-mono text-[9px] text-[#3be0c5] border border-[#3be0c5]/30 uppercase tracking-widest"
            style={{ background: 'rgba(59,224,197,0.06)' }}
          >
            v2.4
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign In
          </button>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#081422] px-4 py-2 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #3be0c5, #5de8d2)',
              boxShadow: '0 0 20px rgba(59,224,197,0.3)',
            }}
          >
            Get Started <ArrowRight size={12} />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[#20364d]/50 py-10 relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[#081422] text-xs"
            style={{ background: 'linear-gradient(135deg, #3be0c5, #60a5fa)' }}
          >
            CV
          </div>
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

/* ─── Main Landing Page ───────────────────────────────────────────────────── */
export default function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <div className="min-h-screen text-slate-100 selection:bg-[#3be0c5] selection:text-[#081422] relative overflow-x-hidden"
      style={{ background: '#081422' }}
    >
      <BackgroundEffects />
      <MouseSpotlight />

      <div className="relative z-10">
        <Nav onGetStarted={onGetStarted} onSignIn={onSignIn} />
        <HeroSection      onGetStarted={onGetStarted} onSignIn={onSignIn} />
        <PipelineSection  />
        <BeforeAfterSection />
        <ATSMatchSection  />
        <KeywordSection   />
        <FeaturesSection  />
        <TrustSection     />
        <CTASection       onGetStarted={onGetStarted} />
        <Footer />
      </div>
    </div>
  );
}
