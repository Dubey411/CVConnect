import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ─── Floating status chips — fewer, less intrusive ─────────────────── */
const floatingCards = [
  { label: 'ATS Score +15',   color: '#C17A5B', delay: 0.3,  top: '12%',  left: '-10%'  },
  { label: 'Keyword Added',   color: '#5B3A4A', delay: 0.8,  top: '42%',  left: '-13%'  },
  { label: 'PDF Ready',       color: '#C17A5B', delay: 1.1,  top: '70%',  left: '-8%'   },
  { label: 'Role Match 88%',  color: '#5B3A4A', delay: 0.5,  top: '10%',  right: '-10%' },
  { label: 'Grammar Fixed',   color: '#C17A5B', delay: 1.0,  top: '40%',  right: '-13%' },
];

function FloatingCard({ label, color, delay, top, left, right }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: [0, -5, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.5 },
      }}
      className="absolute hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium whitespace-nowrap z-20 pointer-events-none"
      style={{
        top, left, right,
        background: 'rgba(250,247,242,0.9)',
        border: `1px solid ${color}40a,
        color: '#2A2622',
        boxShadow: '0 4px 16px rgba(91,58,74,0.08)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </motion.div>
  );
}

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

/* ─── Dashboard mockup ───────────────────────────────────────────────── */
function DashboardMockup() {
  const [score, setScore] = useState(63);
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setScore(88), 1400);
    const interval = setInterval(() => setActiveStep(s => (s + 1) % 4), 2000);
    return () => { clearTimeout(t1); clearInterval(interval); };
  }, []);

  const steps = ['Parsing', 'Analyzing', 'Optimizing', 'Done ✓'];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#FAF7F2',
        border: '1px solid rgba(91,58,74,0.16)',
        boxShadow: '0 24px 60px rgba(91,58,74,0.12)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(91,58,74,0.1)', background: 'rgba(245,240,232,0.8)' }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#C17A5B' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#D59B82' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#5B3A4A' }} />
        <span className="ml-auto text-[10px] text-[#6E6259] font-mono">CVConnect Studio</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Candidate + Role grid */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(245,240,232,0.65)', border: '1px solid rgba(91,58,74,0.1)' }}
          >
            <p className="text-[9px] text-[#6E6259] mb-1 uppercase tracking-wider">Candidate</p>
            <p className="text-xs font-semibold text-[#2A2622]">Shubham Dubey</p>
            <p className="text-[10px] text-[#6E6259] mt-0.5">Computer Engineer</p>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(245,240,232,0.65)', border: '1px solid rgba(91,58,74,0.1)' }}
          >
            <p className="text-[9px] text-[#6E6259] mb-1 uppercase tracking-wider">Target Role</p>
            <p className="text-xs font-semibold text-[#C17A5B]">Data Analyst</p>
            <p className="text-[10px] text-[#6E6259] mt-0.5">Nova Technology</p>
          </div>
        </div>

        {/* ATS Score */}
        <div
          className="p-4 rounded-lg"
          style={{ background: 'rgba(245,240,232,0.65)', border: '1px solid rgba(91,58,74,0.1)' }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-[#6E6259]">ATS Score</span>
            <motion.span
              className="font-mono text-sm font-bold text-[#C17A5BX]"
              key={score}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {score}%
            </motion.span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(91,58,74,0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #C17A5B, #5B3A4A)' }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Before / After */}
        <div
          className="rounded-lg overflow-hidden text-[10px]"
          style={{ border: '1px solid rgba(91,58,74,0.12)' }}
        >
          <div
            className="grid grid-cols-2 px-3 py-2 border-b"
            style={{ borderColor: 'rgba(91,58,74,0.1)', background: 'rgba(245,240,232,0.85)' }}
          >
            <span className="text-[#6E6259]">Before</span>
            <span className="text-[#C17A5B] font-medium">After</span>
          </div>
          <div
            className="grid grid-cols-2 p-3 gap-3 leading-relaxed"
            style={{ background: '#FAF7F2' }}
          >
            <span className="text-[#6E6259] line-through">responsible for building data pipelines…</span>
            <motion.span
              className="text-[#2A2622]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <strong className="text-[#2A2622] font-semibold">Engineered</strong> automated pipelines reducing report time by <strong className="text-[#C17A5B] font-semibold">40%</strong>.
            </motion.span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="flex-1 text-center py-1.5 rounded text-[9px]"
              animate={{
                background: i === activeStep ? 'rgba(193,122,91,0.12)' : 'rgba(245,240,232,0.5)',
                color:      i === activeStep ? '#C17A5B' : '#6E6259',
                borderColor: i === activeStep ? 'rgba(193,122,91,0.35)' : 'rgba(91,58,74,0.1)',
              }}
              transition={{ duration: 0.3 }}
              style={{ border: '1px solid' }}
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
    <section className="max-w-6xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-16 lg:gap-20 items-center relative z-10">

      {/* Left — copy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-7"
      >
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-[#C17A5B] font-medium"
          style={{
            background: 'rgba(193,122,91,0.08)',
            border: '1px solid rgba(193,122,91,0.25)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#C17A5B] animate-pulse" />
          AI Resume Optimization · v2.4
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-tight text-[#2A2622]"
        >
          Give your resume{' '}
          <span className="text-[#C17A5B]">a clearer voice.</span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="text-[#6E6259] text-base leading-relaxed max-w-md"
        >
          Upload your resume. Paste a job description. Get an ATS-optimized, print-ready PDF in under 5 seconds — powered by real ML, not templates.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.6 }}
          className="flex flex-wrap gap-3"
        >
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 text-sm font-semibold text-[#F5F0E8] py-3 px-7 rounded-xl shadow-md"
            style={{ background: '#C17A5B' }}
          >
            Analyze My Resume
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
          <motion.button
            onClick={onSignIn}
            whileHover={{ scale: 1.01 }}
            className="flex items-center text-sm text-[#2A2622] hover:text-[#5B3A4A] py-3 px-7 rounded-xl transition-colors"
            style={{ border: '1px solid rgba(91,58,74,0.2)', background: 'rgba(245,240,232,0.7)' }}
          >
            Sign in to Dashboard
          </motion.button>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.72, duration: 0.6 }}
          className="flex flex-wrap items-center gap-5 pt-3 border-t text-xs text-[#6E6259]"
          style={{ borderColor: 'rgba(91,58,74,0.12)' }}
        >
          {['100% Free Tier', 'Calibri Print-Ready', 'No Hallucinations'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle size={11} className="text-[#C17A5B] shrink-0" />
              {t}
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.6 }}
          className="grid grid-cols-3 gap-6"
        >
          {[
            { val: 98, suffix: '%', label: 'ATS Accuracy'  },
            { val: 5,  suffix: 's', label: 'Avg Analysis'  },
            { val: 35, suffix: '+', label: 'Industries'    },
          ].map(({ val, suffix, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-[#2A2622] font-mono tabular-nums">
                <AnimatedCounter to={val} />{suffix}
              </p>
              <p className="text-[11px] text-[#6E6259] mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right — dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Subtle glow behind dashboard */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 60%, rgba(193,122,91,0.1) 0%, transparent 65%)',
            filter: 'blur(20px)',
          }}
        />
        {floatingCards.map((c, i) => <FloatingCard key={i} {...c} />)}
        <DashboardMockup />
      </motion.div>
    </section>
  );
}
