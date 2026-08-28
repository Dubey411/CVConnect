import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, FileCheck, Layers, Gauge } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ─── Animated counter ───────────────────────────────────────────────── */
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

/* ─── Handcrafted Product UI Mockup (Organic Corner Radii: 14-9px) ────── */
function DashboardMockup() {
  const [score, setScore] = useState(64);
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setScore(88), 1400);
    const interval = setInterval(() => setActiveStep(s => (s + 1) % 4), 2000);
    return () => { clearTimeout(t1); clearInterval(interval); };
  }, []);

  const steps = ['Parsing', 'Analyzing', 'Optimizing', 'Done ✓'];

  return (
    <div
      /* Slightly imperfect, organic corner radii: 14px top-left, 10px top-right, 13px bottom-right, 9px bottom-left */
      className="overflow-hidden relative transition-all duration-300"
      style={{
        borderRadius: '14px 10px 13px 9px',
        background: '#FAF6EE',
        border: '1px solid rgba(43, 45, 66, 0.16)',
        boxShadow: '0 20px 45px -10px rgba(43, 45, 66, 0.12), 0 4px 12px rgba(43, 45, 66, 0.04)',
      }}
    >
      {/* Title bar with subtle Ajrakh hairline divider */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(43, 45, 66, 0.10)', background: 'rgba(237, 228, 211, 0.65)' }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#A8412E' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#D4A24C' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2B2D42' }} />
        <span className="ml-auto text-[10.5px] text-[#5F6170] font-mono tracking-wide">CVConnect Studio · v2.4</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Candidate + Role card grid */}
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

        {/* ATS Score Meter */}
        <div
          className="p-4"
          style={{
            borderRadius: '11px 9px 12px 10px',
            background: 'rgba(237, 228, 211, 0.35)',
            border: '1px solid rgba(43, 45, 66, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#2B2D42] flex items-center gap-1.5">
              <Gauge size={13} className="text-[#A8412E]" />
              ATS Match Intelligence
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

        {/* Typographic Rewrite Comparison */}
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
              <Sparkles size={11} /> Tailored Output
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

        {/* 4 Pipeline Step Indicators */}
        <div className="flex items-center gap-1.5 pt-1">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="flex-1 text-center py-1.5 rounded text-[9.5px] font-medium font-mono"
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

/* ─── Hero Section ───────────────────────────────────────────────────── */
export default function HeroSection({ onGetStarted, onSignIn }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">

      {/* Left Column — Editorial Copy & Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-7"
      >
        {/* Eyebrow badge with Turmeric micro-highlight */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
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

        {/* Headline — Modern Optical Serif (Fraunces) */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl lg:text-[3.6rem] leading-[1.06] tracking-tight text-[#2B2D42] font-serif-fraunces"
        >
          Give your resume{' '}
          <span className="text-[#A8412E] italic font-normal">
            a clearer voice.
          </span>
        </motion.h1>

        {/* Humanist Body Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="text-[#5F6170] text-base leading-relaxed max-w-md font-sans"
        >
          Upload your resume. Paste a job description. Get an ATS-optimized, print-ready PDF in under 5 seconds — powered by real ML, not templates.
        </motion.p>

        {/* Primary and Secondary Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.6 }}
          className="flex flex-wrap gap-3.5 pt-1"
        >
          {/* Primary Action — Deep Madder-Root Red */}
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02, backgroundColor: '#8F3423' }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 text-sm font-semibold text-[#F5EFE4] py-3.5 px-7 transition-all"
            style={{
              borderRadius: '10px 8px 10px 8px',
              background: '#A8412E',
              boxShadow: '0 4px 18px rgba(168, 65, 46, 0.25)',
            }}
          >
            Analyze My Resume
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </motion.button>

          {/* Secondary Action — Handcrafted Khadi Paper with Hairline Border */}
          <motion.button
            onClick={onSignIn}
            whileHover={{ scale: 1.01, borderColor: '#A8412E' }}
            className="flex items-center text-sm text-[#2B2D42] py-3.5 px-6 transition-colors font-medium"
            style={{
              borderRadius: '8px 10px 8px 10px',
              border: '1px solid rgba(43, 45, 66, 0.18)',
              background: '#F5EFE4',
            }}
          >
            Sign in to Dashboard
          </motion.button>
        </motion.div>

        {/* Clean Aligned Feature List (Replacing scattered floating tags) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.72, duration: 0.6 }}
          className="pt-2 border-t"
          style={{ borderColor: 'rgba(43, 45, 66, 0.12)' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Sparkles,   label: 'Smart Parsing',       accent: '#D4A24C' },
              { icon: Layers,     label: 'Keyword Gap Analysis',accent: '#A8412E' },
              { icon: FileCheck,  label: 'Calibri Print-Ready', accent: '#2B2D42' },
              { icon: CheckCircle2, label: '98% ATS Precision', accent: '#D4A24C' },
            ].map(({ icon: Icon, label, accent }) => (
              <div
                key={label}
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{
                  background: 'rgba(245, 239, 228, 0.6)',
                  border: '1px solid rgba(43, 45, 66, 0.08)',
                }}
              >
                <Icon size={14} style={{ color: accent }} className="shrink-0" />
                <span className="text-[11px] font-medium text-[#2B2D42] truncate">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quantitative Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.6 }}
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

      {/* Right Column — Handcrafted Organic Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Subtle warm madder/turmeric glow behind the product card */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(212, 162, 76, 0.12) 0%, rgba(168, 65, 46, 0.06) 45%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
        <DashboardMockup />
      </motion.div>
    </section>
  );
}
