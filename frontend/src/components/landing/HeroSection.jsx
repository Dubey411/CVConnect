import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const floatingCards = [
  { label: '+15 ATS Score',   color: '#3be0c5', delay: 0,    top: '8%',   left: '-12%'  },
  { label: 'Keyword Added',   color: '#a78bfa', delay: 0.6,  top: '30%',  left: '-15%'  },
  { label: 'Grammar Fixed',   color: '#34d399', delay: 1.2,  top: '58%',  left: '-10%'  },
  { label: 'Action Verbs ✦', color: '#f472b6', delay: 1.8,  top: '80%',  left: '-5%'   },
  { label: 'Role Match 88%',  color: '#3be0c5', delay: 0.3,  top: '5%',   right: '-12%' },
  { label: 'Resume Parsed',   color: '#fbbf24', delay: 0.9,  top: '28%',  right: '-15%' },
  { label: 'PDF Ready ✓',    color: '#34d399', delay: 1.5,  top: '55%',  right: '-10%' },
];

function FloatingCard({ label, color, delay, top, left, right }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.4, delay },
        scale:   { duration: 0.4, delay },
        y: { duration: 3 + delay * 0.4, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.3 }
      }}
      className="absolute hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md text-xs font-semibold whitespace-nowrap z-20 pointer-events-none"
      style={{
        top, left, right,
        background: `${color}12`,
        border: `1px solid ${color}40`,
        color,
        boxShadow: `0 0 20px ${color}20`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      {label}
    </motion.div>
  );
}

function AnimatedCounter({ to, duration = 1.8 }) {
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
    <div className="bg-[#0c1b2c]/90 border border-[#20364d] rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#20364d]/60 bg-[#081422]/60">
        <span className="w-2.5 h-2.5 rounded-full bg-[#fb8d76]/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#3be0c5]/80" />
        <span className="ml-auto font-mono text-[10px] text-slate-500">CVConnect Studio</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-[#20364d]/60">
            <p className="font-mono text-[9px] text-slate-500 mb-1">CANDIDATE</p>
            <p className="text-xs font-semibold text-white">Shubham Dubey</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Computer Engineer</p>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-[#20364d]/60">
            <p className="font-mono text-[9px] text-slate-500 mb-1">TARGET ROLE</p>
            <p className="text-xs font-semibold text-[#3be0c5]">Data Analyst Intern</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Nova Technology</p>
          </div>
        </div>
        <div className="bg-slate-950/60 p-4 rounded-lg border border-[#20364d]/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-300">ATS Score</span>
            <motion.span className="font-mono text-sm font-bold text-[#3be0c5]" key={score} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {score}%
            </motion.span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #3be0c5, #60a5fa)' }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-[#20364d]/60 overflow-hidden text-[10px]">
          <div className="grid grid-cols-2 bg-slate-950/80 px-3 py-2 border-b border-[#20364d]/60">
            <span className="font-mono text-slate-500">ORIGINAL</span>
            <span className="font-mono text-[#3be0c5]">OPTIMISED</span>
          </div>
          <div className="grid grid-cols-2 p-3 gap-3 bg-slate-950/30 leading-relaxed">
            <span className="text-slate-500 line-through">responsible for building data pipelines…</span>
            <motion.span className="text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <strong>Engineered</strong> automated pipelines reducing report time by <strong className="text-[#3be0c5]">40%</strong>.
            </motion.span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="flex-1 text-center py-1.5 rounded text-[9px] font-mono"
              animate={{
                background:   i === activeStep ? 'rgba(59,224,197,0.15)' : 'rgba(0,0,0,0.3)',
                color:        i === activeStep ? '#3be0c5' : '#64748b',
                borderColor:  i === activeStep ? 'rgba(59,224,197,0.4)' : 'rgba(32,54,77,0.6)',
              }}
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

export default function HeroSection({ onGetStarted, onSignIn }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  return (
    <section className="max-w-7xl mx-auto px-6 py-24 lg:py-32 grid lg:grid-cols-2 gap-16 items-center relative z-10">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="space-y-7"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3be0c5]/30 text-[#3be0c5] font-mono text-[10px] tracking-widest uppercase"
          style={{ background: 'rgba(59,224,197,0.06)' }}
        >
          <Sparkles size={10} />
          AI Resume Optimization · v2.4 Production
        </motion.div>

        <h1 className="text-5xl lg:text-[3.8rem] font-bold leading-[1.06] tracking-tight text-white">
          Give your best evidence{' '}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
              a clearer voice.
            </span>
            <motion.span
              className="absolute -bottom-1 left-0 h-px w-full block"
              style={{ background: 'linear-gradient(90deg, #3be0c5, #60a5fa)' }}
              initial={{ scaleX: 0, originX: '0%' }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.7 }}
            />
          </span>
        </h1>

        <p className="text-slate-400 text-base leading-relaxed max-w-lg">
          Upload your resume. Paste a job description. Get an ATS-optimized, print-ready PDF in under 5 seconds — powered by real ML, not templates.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 bg-[#3be0c5] text-[#081422] font-semibold text-sm py-3 px-7 rounded-xl transition-all duration-200"
            style={{ boxShadow: '0 0 32px rgba(59,224,197,0.35)' }}
          >
            Analyze My Resume
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
          <motion.button
            onClick={onSignIn}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 border border-[#20364d] hover:border-[#3be0c5]/40 text-slate-300 hover:text-white text-sm py-3 px-7 rounded-xl transition-all duration-200 bg-white/[0.03]"
          >
            Sign in to Dashboard
          </motion.button>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-[#20364d]/60 text-xs text-slate-500">
          {['100% Free Tier', 'Calibri Print-Ready', 'No Hallucinations'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle size={11} className="text-[#3be0c5] shrink-0" />
              {t}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 pt-2">
          {[
            { val: 98, suffix: '%', label: 'ATS Accuracy'  },
            { val: 5,  suffix: 's', label: 'Avg Analysis'  },
            { val: 35, suffix: '+', label: 'Industries'    },
          ].map(({ val, suffix, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">
                <AnimatedCounter to={val} />{suffix}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Dashboard + Floating Cards */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
        className="relative"
        style={{ perspective: 1200 }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          mouseX.set(e.clientX - rect.left - rect.width / 2);
          mouseY.set(e.clientY - rect.top  - rect.height / 2);
        }}
        onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
      >
        <div className="absolute inset-0 bg-[#3be0c5]/6 blur-[80px] rounded-3xl pointer-events-none" />
        {floatingCards.map((c, i) => <FloatingCard key={i} {...c} />)}
        <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
          <DashboardMockup />
        </motion.div>
      </motion.div>
    </section>
  );
}
