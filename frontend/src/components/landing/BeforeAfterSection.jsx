import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const BEFORE = 'Responsible for generating and distributing monthly reports to stakeholders.';
const AFTER  = 'Engineered automated reporting pipelines, delivering real-time stakeholder dashboards and reducing manual reporting time by 40% MoM.';

function TypeWriter({ text, active }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active) { setDisplayed(''); return; }
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [active, text]);
  return (
    <span>
      {displayed}
      {active && displayed.length < text.length && (
        <span className="inline-block w-0.5 h-3.5 bg-[#3be0c5] ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

export default function BeforeAfterSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => setTyping(true), 600);
      return () => clearTimeout(t);
    }
  }, [isInView]);

  const improvements = [
    { label: 'Action verb added',      color: '#3be0c5' },
    { label: 'Quantified impact',       color: '#34d399' },
    { label: 'Metric injected: 40%',   color: '#a78bfa' },
    { label: 'ATS keywords present',   color: '#60a5fa' },
  ];

  return (
    <section className="py-24 border-t border-[#20364d]/50 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14 space-y-3"
        >
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Optimization</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Before vs{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#34d399] bg-clip-text text-transparent">
              After
            </span>
          </h2>
          <p className="text-slate-400 text-sm">Weak bullets become powerful, metric-driven achievements.</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(12,27,44,0.8)',
              border: '1px solid rgba(251,141,118,0.3)',
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#20364d]/60">
              <span className="w-2 h-2 rounded-full bg-[#fb8d76]" />
              <span className="font-mono text-[10px] text-[#fb8d76] uppercase tracking-widest">Original Bullet</span>
            </div>
            <div className="p-6">
              <motion.p
                className="text-slate-400 text-sm leading-relaxed"
                animate={isInView ? { opacity: [1, 0.3] } : {}}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {BEFORE}
              </motion.p>
              <div className="mt-5 pt-5 border-t border-[#20364d]/60 space-y-2">
                {['Vague verb: "responsible"', 'No quantified impact', 'Passive phrasing', 'Missing ATS keywords'].map(issue => (
                  <p key={issue} className="flex items-center gap-2 text-xs text-[#fb8d76]">
                    <span className="w-1 h-1 rounded-full bg-[#fb8d76]" />
                    {issue}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(12,27,44,0.8)',
              border: '1px solid rgba(59,224,197,0.3)',
              boxShadow: '0 0 40px rgba(59,224,197,0.06)',
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#20364d]/60">
              <span className="w-2 h-2 rounded-full bg-[#3be0c5] animate-pulse" />
              <span className="font-mono text-[10px] text-[#3be0c5] uppercase tracking-widest">AI Optimised</span>
            </div>
            <div className="p-6">
              <p className="text-white text-sm leading-relaxed min-h-[84px]">
                <TypeWriter text={AFTER} active={typing} />
              </p>
              <div className="mt-5 pt-5 border-t border-[#20364d]/60 space-y-2">
                {improvements.map(({ label, color }) => (
                  <motion.p
                    key={label}
                    className="flex items-center gap-2 text-xs font-medium"
                    style={{ color }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={typing ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.8 + improvements.findIndex(i => i.label === label) * 0.15 }}
                  >
                    <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                    ✓ {label}
                  </motion.p>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
