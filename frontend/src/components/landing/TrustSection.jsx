import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

function AnimatedCounter({ to, suffix = '', duration = 2 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = to / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const stats = [
  { val: 98,    suffix: '%',   label: 'ATS Accuracy',       desc: 'In controlled benchmarks',    color: '#3be0c5' },
  { val: 25000, suffix: '+',   label: 'Resumes Processed',  desc: 'Across 35+ industries',        color: '#60a5fa' },
  { val: 5,     suffix: 's',   label: 'Avg Analysis Time',  desc: 'Upload to optimized PDF',      color: '#a78bfa' },
  { val: 35,    suffix: '+',   label: 'Industries Covered', desc: 'Tech, Finance, Healthcare…',   color: '#34d399' },
];

const steps = [
  { num: '01', title: 'Upload Resume',          desc: 'Drop your PDF or DOCX file.'                       },
  { num: '02', title: 'Paste Job Description',  desc: 'Copy-paste the role you\'re targeting.'             },
  { num: '03', title: 'AI Analysis',            desc: 'ML engine scores match across 5 dimensions.'        },
  { num: '04', title: 'Keyword Optimization',   desc: 'Missing keywords injected. Bullets rewritten.'      },
  { num: '05', title: 'Download PDF',           desc: 'Calibri A4 print-ready. No watermarks. Ever.'       },
];

export default function TrustSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 border-t border-[#20364d]/50 relative" ref={ref}>
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(59,224,197,0.03),transparent)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Trust Counters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16 space-y-3"
        >
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Proven Results</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Numbers that{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
              speak for themselves
            </span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-24">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="group rounded-2xl p-6 text-center"
              style={{
                background: 'rgba(12,27,44,0.8)',
                border: `1px solid rgba(32,54,77,0.8)`,
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ border: `1px solid ${s.color}40` }}
              />
              <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: s.color }}>
                <AnimatedCounter to={s.val} suffix={s.suffix} />
              </p>
              <p className="text-white font-semibold text-sm mt-2">{s.label}</p>
              <p className="text-slate-500 text-[11px] mt-1">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* How It Works */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="text-center mb-12 space-y-3"
          >
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">How It Works</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Five steps to your best resume.
            </h2>
          </motion.div>

          <div className="relative space-y-0">
            {/* Vertical line */}
            <motion.div
              className="absolute left-[22px] top-6 bottom-6 w-px"
              style={{ background: 'linear-gradient(180deg, #3be0c5, #60a5fa, #a78bfa)' }}
              initial={{ scaleY: 0, originY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3 }}
            />

            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.4 + i * 0.12 }}
                className="flex gap-6 items-start pb-8 last:pb-0"
              >
                {/* Number circle */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 z-10"
                  style={{
                    background: '#0c1b2c',
                    border: '1px solid rgba(59,224,197,0.4)',
                    color: '#3be0c5',
                    boxShadow: '0 0 16px rgba(59,224,197,0.15)',
                  }}
                >
                  {step.num}
                </div>
                <div className="pt-2.5">
                  <p className="text-white font-semibold text-sm">{step.title}</p>
                  <p className="text-slate-400 text-xs mt-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
