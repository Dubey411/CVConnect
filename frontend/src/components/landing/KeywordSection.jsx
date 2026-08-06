import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

const jobKeywords = ['Python', 'SQL', 'Power BI', 'Excel', 'Data Viz', 'Machine Learning'];
const resumeKeywords = [
  { kw: 'Python',           present: true  },
  { kw: 'SQL',              present: true  },
  { kw: 'Power BI',         present: false },
  { kw: 'Excel',            present: true  },
  { kw: 'Data Viz',         present: false },
  { kw: 'Machine Learning', present: true  },
];
const suggested = ['Power BI', 'Dashboarding', 'Data Visualization', 'Tableau', 'Business Intelligence'];

export default function KeywordSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isInView]);

  return (
    <section className="py-24 border-t border-[#20364d]/50" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14 space-y-3"
        >
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Keyword Intelligence</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Smart{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#a78bfa] bg-clip-text text-transparent">
              keyword detection
            </span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            AI scans the job description, finds your keyword gaps, and injects only skills you actually possess.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* JD Keywords */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(12,27,44,0.8)', border: '1px solid rgba(32,54,77,0.8)' }}
          >
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Job Description</p>
            <div className="space-y-2 mt-2">
              {jobKeywords.map((kw, i) => (
                <motion.div
                  key={kw}
                  initial={{ opacity: 0, x: -10 }}
                  animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300"
                  style={{ background: 'rgba(59,224,197,0.06)', border: '1px solid rgba(59,224,197,0.15)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3be0c5]" />
                  {kw}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Scanning Resume */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(12,27,44,0.8)', border: '1px solid rgba(32,54,77,0.8)' }}
          >
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Scanning Resume</p>
            {phase >= 1 && (
              <motion.div
                className="h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, #3be0c5, transparent)' }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8 }}
              />
            )}
            <div className="space-y-2 mt-2">
              {resumeKeywords.map((item, i) => (
                <motion.div
                  key={item.kw}
                  initial={{ opacity: 0 }}
                  animate={phase >= 2 ? { opacity: 1 } : {}}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: item.present ? 'rgba(52,211,153,0.06)' : 'rgba(251,141,118,0.06)',
                    border: `1px solid ${item.present ? 'rgba(52,211,153,0.2)' : 'rgba(251,141,118,0.2)'}`,
                    color: item.present ? '#34d399' : '#fb8d76',
                  }}
                >
                  <span>{item.kw}</span>
                  {item.present ? <Check size={12} /> : <X size={12} />}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Suggested Keywords */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'rgba(12,27,44,0.8)',
              border: '1px solid rgba(167,139,250,0.3)',
              boxShadow: '0 0 30px rgba(167,139,250,0.05)',
            }}
          >
            <p className="font-mono text-[10px] text-[#a78bfa] uppercase tracking-widest">AI Suggestions</p>
            <div className="space-y-2 mt-2">
              {suggested.map((kw, i) => (
                <motion.div
                  key={kw}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: i * 0.12 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#a78bfa]"
                  style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
                >
                  <span className="text-[#a78bfa]">+</span>
                  {kw}
                </motion.div>
              ))}
            </div>
            {phase >= 3 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-slate-500 pt-2 border-t border-[#20364d]/60"
              >
                ✓ Only verified skills injected
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
