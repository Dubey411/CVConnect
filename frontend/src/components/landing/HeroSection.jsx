import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/* ─── Handcrafted Indian Artisan Vector Glyphs (Subtle Hand-Drawn Style) ─ */
function ArtisanSparkle({ className, color = '#D4A24C' }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 C12 7, 17 12, 22 12 C17 12, 12 17, 12 22 C12 17, 7 12, 2 12 C7 12, 12 7, 12 2 Z" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function ArtisanDiamond({ className, color = '#A8412E' }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3 L21 12 L12 21 L3 12 Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" fill={color} />
    </svg>
  );
}

function ArtisanDocument({ className, color = '#2B2D42' }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 4 C5 3.4 5.4 3 6 3 L14 3 L19 8 L19 20 C19 20.6 18.6 21 18 21 L6 21 C5.4 21 5 20.6 5 20 Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3 L14 8 L19 8" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ArtisanCheckmark({ className, color = '#D4A24C' }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
      <path d="M8 12.5 L10.5 15 L16 9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Animated Metric Counter ────────────────────────────────────────── */
function AnimatedCounter({ to, duration = 1.6 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = to / (duration * 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= to) { setVal(to); clearInterval(timer); }
          else setVal(Math.floor(start));
        }, 1000 / 60);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val}</span>;
}

/* ─── Product UI Card with Varied Imperfect Radii (8-14px) ───────────── */
function ProductCard() {
  const [score, setScore] = useState(64);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setScore(88), 1200);
    const interval = setInterval(() => setActiveStep(s => (s + 1) % 4), 2200);
    return () => { clearTimeout(t1); clearInterval(interval); };
  }, []);

  const steps = ['Parsing', 'Analyzing', 'Optimizing', 'Done ✓'];

  return (
    <div
      /* Varied, organic corner radii: 14px top-left, 9px top-right, 13px bottom-right, 10px bottom-left */
      className="overflow-hidden relative transition-shadow duration-300"
      style={{
        borderRadius: '14px 9px 13px 10px',
        background: '#FAF6EE',
        border: '1px solid rgba(43, 45, 66, 0.14)',
        boxShadow: '0 24px 48px -12px rgba(43, 45, 66, 0.10), 0 4px 16px rgba(43, 45, 66, 0.04)',
      }}
    >
      {/* Card Header Bar with hairline divider */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(43, 45, 66, 0.10)', background: 'rgba(237, 228, 211, 0.65)' }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#A8412E' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#D4A24C' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2B2D42' }} />
        <span className="ml-auto text-[10.5px] text-[#5F6170] font-mono tracking-wider">
          CVConnect Studio · v2.4
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Candidate + Role Grid with artisan varied radii */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3"
            style={{
              borderRadius: '10px 8px 11px 9px',
              background: 'rgba(237, 228, 211, 0.55)',
              border: '1px solid rgba(43, 45, 66, 0.09)',
            }}
          >
            <p className="text-[9px] text-[#5F6170] mb-0.5 uppercase tracking-widest font-mono">Candidate</p>
            <p className="text-sm font-semibold text-[#2B2D42]">Shubham Dubey</p>
            <p className="text-[11px] text-[#5F6170]">Computer Engineer</p>
          </div>
          <div
            className="p-3"
            style={{
              borderRadius: '9px 12px 8px 10px',
              background: 'rgba(237, 228, 211, 0.55)',
              border: '1px solid rgba(43, 45, 66, 0.09)',
            }}
          >
            <p className="text-[9px] text-[#5F6170] mb-0.5 uppercase tracking-widest font-mono">Target Position</p>
            <p className="text-sm font-semibold text-[#A8412E]">Data Analyst</p>
            <p className="text-[11px] text-[#5F6170]">Nova Technology</p>
          </div>
        </div>

        {/* ATS Score Progress Block */}
        <div
          className="p-4"
          style={{
            borderRadius: '11px 9px 12px 10px',
            background: 'rgba(237, 228, 211, 0.35)',
            border: '1px solid rgba(43, 45, 66, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#2B2D42] flex items-center gap-1.5 font-sans">
              <ArtisanSparkle className="shrink-0" color="#A8412E" />
              ATS Score Precision
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-bold font-mono text-[#A8412E]">{score}</span>
              <span className="text-xs text-[#5F6170] font-mono">/100</span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EDE4D3] overflow-hidden border border-[#D8C7AF]/60">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #A8412E, #D4A24C)' }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Before / After Rewrite Box */}
        <div
          className="text-xs overflow-hidden"
          style={{
            borderRadius: '10px 12px 9px 11px',
            border: '1px solid rgba(43, 45, 66, 0.10)',
          }}
        >
          <div
            className="grid grid-cols-2 px-3 py-2 text-[10px] font-mono uppercase tracking-wider border-b"
            style={{ borderColor: 'rgba(43, 45, 66, 0.08)', background: 'rgba(237, 228, 211, 0.7)' }}
          >
            <span className="text-[#5F6170]">Raw Phrasing</span>
            <span className="text-[#A8412E] font-semibold flex items-center gap-1">
              <ArtisanSparkle color="#A8412E" /> Tailored Output
            </span>
          </div>
          <div className="grid grid-cols-2 p-3 gap-3 leading-relaxed bg-[#FAF6EE]">
            <span className="text-[#5F6170] line-through text-[11px]">responsible for building data pipelines…</span>
            <motion.span
              className="text-[#2B2D42] text-[11.5px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <strong className="text-[#2B2D42] font-semibold">Engineered</strong> automated pipelines reducing report time by <strong className="text-[#A8412E] font-semibold">40%</strong>.
            </motion.span>
          </div>
        </div>

        {/* 4 Step Progress Indicators */}
        <div className="flex items-center gap-1.5 pt-1">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="flex-1 text-center py-1.5 text-[9.5px] font-medium font-mono"
              animate={{
                background: i === activeStep ? 'rgba(168, 65, 46, 0.12)' : 'rgba(237, 228, 211, 0.5)',
                color:      i === activeStep ? '#A8412E' : '#5F6170',
                borderColor: i === activeStep ? 'rgba(168, 65, 46, 0.35)' : 'rgba(43, 45, 66, 0.08)',
              }}
              transition={{ duration: 0.25 }}
              style={{ border: '1px solid', borderRadius: '6px 5px 6px 5px' }}
            >
              {s}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Hero Section with Scroll-Reveal Stagger ────────────────────────── */
export default function HeroSection({ onGetStarted, onSignIn }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">

      {/* ── LEFT SIDE: Editorial Copy, CTAs, Feature Row & Metrics ─────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-7"
      >
        {/* Eyebrow Label with Turmeric Micro-Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-[#2B2D42] font-medium"
          style={{
            borderRadius: '9px 7px 9px 7px',
            background: 'rgba(245, 239, 228, 0.85)',
            border: '1px solid rgba(43, 45, 66, 0.14)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#D4A24C] shrink-0" />
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#5F6170]">
            AI Resume Optimization · v2.4
          </span>
        </motion.div>

        {/* Large Serif Headline with Optical Sizing (Fraunces) */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl lg:text-[3.65rem] leading-[1.06] tracking-tight text-[#2B2D42] font-serif-fraunces"
          style={{
            fontVariationSettings: "'opsz' 72",
          }}
        >
          Give your resume{' '}
          <span className="text-[#A8412E] italic font-normal">
            a clearer voice.
          </span>
        </motion.h1>

        {/* Medium Subtext in Humanist Sans */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="text-[#5F6170] text-base leading-relaxed max-w-md font-sans font-normal"
        >
          Upload your resume. Paste a job description. Get an ATS-optimized, print-ready PDF in under 5 seconds — powered by real ML, not templates.
        </motion.p>

        {/* Two CTAs: Primary Terracotta / Madder-Root & Secondary Outline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap gap-3.5 pt-1"
        >
          {/* Primary Action Button */}
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02, backgroundColor: '#8F3423' }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 text-sm font-semibold text-[#F5EFE4] py-3.5 px-7 transition-all cursor-pointer"
            style={{
              borderRadius: '11px 8px 11px 8px',
              background: '#A8412E',
              boxShadow: '0 4px 18px rgba(168, 65, 46, 0.25)',
            }}
          >
            Analyze My Resume
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </motion.button>

          {/* Secondary Outline Action Button */}
          <motion.button
            onClick={onSignIn}
            whileHover={{ scale: 1.01, borderColor: '#A8412E' }}
            className="flex items-center text-sm text-[#2B2D42] py-3.5 px-6 transition-colors font-medium cursor-pointer"
            style={{
              borderRadius: '8px 11px 8px 11px',
              border: '1px solid rgba(43, 45, 66, 0.20)',
              background: '#F5EFE4',
            }}
          >
            Sign in to Dashboard
          </motion.button>
        </motion.div>

        {/* Small Feature Icon Row with Handcrafted Glyphs & Thin Ajrakh Divider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="pt-3 border-t"
          style={{ borderColor: 'rgba(43, 45, 66, 0.12)' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: ArtisanSparkle,   label: 'Smart Parsing',       color: '#D4A24C' },
              { icon: ArtisanDiamond,   label: 'Keyword Gap Analysis',color: '#A8412E' },
              { icon: ArtisanDocument,  label: 'Print-Ready PDF',     color: '#2B2D42' },
              { icon: ArtisanCheckmark, label: '98% ATS Precision',   color: '#D4A24C' },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-2 p-2"
                style={{
                  borderRadius: '8px 6px 8px 6px',
                  background: 'rgba(245, 239, 228, 0.65)',
                  border: '1px solid rgba(43, 45, 66, 0.08)',
                }}
              >
                <Icon className="shrink-0" color={color} />
                <span className="text-[11px] font-medium text-[#2B2D42] truncate font-sans">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Three Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-3 gap-6 pt-1"
        >
          {[
            { val: 98, suffix: '%', label: 'ATS Accuracy' },
            { val: 5,  suffix: 's', label: 'Avg Analysis' },
            { val: 35, suffix: '+', label: 'Industries'   },
          ].map(({ val, suffix, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-[#2B2D42] font-mono tabular-nums">
                <AnimatedCounter to={val} />{suffix}
              </p>
              <p className="text-[11px] text-[#5F6170] mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── RIGHT SIDE: Floating Product UI Card (Scroll-Reveal: 200ms stagger) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Soft atmospheric backlight halo */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(212, 162, 76, 0.12) 0%, rgba(168, 65, 46, 0.05) 45%, transparent 70%)',
            filter: 'blur(35px)',
          }}
        />
        <ProductCard />
      </motion.div>
    </section>
  );
}
