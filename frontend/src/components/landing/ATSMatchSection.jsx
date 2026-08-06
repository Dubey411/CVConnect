import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

function RadialGauge({ score, isInView }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!isInView) return;
    let current = 0;
    const target = score;
    const interval = setInterval(() => {
      current += 1.2;
      if (current >= target) { setDisplayed(target); clearInterval(interval); }
      else setDisplayed(Math.floor(current));
    }, 16);
    return () => clearInterval(interval);
  }, [isInView, score]);

  const strokeDash = (displayed / 100) * circumference;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Track */}
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#20364d" strokeWidth="10" />
        {/* Progress */}
        <motion.circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference - strokeDash }}
          transition={{ duration: 0.05 }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#3be0c5" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white font-mono tabular-nums">{displayed}%</span>
        <span className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-widest">Match</span>
      </div>
    </div>
  );
}

function AnimatedBar({ label, pct, color, delay, isInView }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-white">{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#20364d' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${pct}%` } : {}}
          transition={{ delay, duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function ATSMatchSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const bars = [
    { label: 'Skills Match',      pct: 92, color: '#3be0c5', delay: 0.2 },
    { label: 'Keywords',          pct: 85, color: '#60a5fa', delay: 0.35 },
    { label: 'Experience Fit',    pct: 78, color: '#a78bfa', delay: 0.5 },
    { label: 'Education',         pct: 95, color: '#34d399', delay: 0.65 },
    { label: 'Domain Alignment',  pct: 80, color: '#f472b6', delay: 0.8 },
  ];

  return (
    <section className="py-24 border-t border-[#20364d]/50 relative" ref={ref}>
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(59,224,197,0.04),transparent)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14 space-y-3"
        >
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">ATS Intelligence</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Multidimensional{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
              match scoring
            </span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Radial gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-6"
          >
            <div
              className="p-8 rounded-2xl"
              style={{
                background: 'rgba(12,27,44,0.8)',
                border: '1px solid rgba(59,224,197,0.2)',
                boxShadow: '0 0 60px rgba(59,224,197,0.05)',
              }}
            >
              <RadialGauge score={88} isInView={isInView} />
              <p className="text-center text-xs text-slate-500 mt-4 font-mono">Overall ATS Match Score</p>
            </div>
            <div className="flex gap-3">
              {[
                { label: 'Before', val: '63%', color: '#fb8d76' },
                { label: 'After',  val: '88%', color: '#3be0c5' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center px-5 py-3 rounded-xl" style={{ background: `${color}0d`, border: `1px solid ${color}30` }}>
                  <p className="text-lg font-bold font-mono" style={{ color }}>{val}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Category bars */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="space-y-5"
          >
            <h3 className="text-white font-semibold mb-6">Score Breakdown</h3>
            {bars.map(bar => (
              <AnimatedBar key={bar.label} {...bar} isInView={isInView} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
