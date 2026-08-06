import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Cpu, Shield, Zap, FileText, Key, Layers } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'ATS Readiness Scoring',
    desc: 'Instant multidimensional analysis scoring skills, domain alignment, and experience against any job description.',
    color: '#3be0c5',
    gradient: 'from-[#3be0c5]/10 to-transparent',
  },
  {
    icon: Cpu,
    title: 'Local ML Engine',
    desc: 'Dual-engine architecture falls back to offline scikit-learn NLP if cloud LLMs are exhausted.',
    color: '#60a5fa',
    gradient: 'from-[#60a5fa]/10 to-transparent',
  },
  {
    icon: Shield,
    title: 'Truth-Preserving AI',
    desc: 'Zero hallucinations. Only injects skills verifiably present in your original raw resume text.',
    color: '#34d399',
    gradient: 'from-[#34d399]/10 to-transparent',
  },
  {
    icon: FileText,
    title: 'Calibri A4 Export',
    desc: 'Print-ready Calibri layouts styled clean, polished, and executive-grade — not a template.',
    color: '#a78bfa',
    gradient: 'from-[#a78bfa]/10 to-transparent',
  },
  {
    icon: Key,
    title: 'Keyword Intelligence',
    desc: 'Detects critical keyword gaps between job descriptions and your resume, then fills them truthfully.',
    color: '#f472b6',
    gradient: 'from-[#f472b6]/10 to-transparent',
  },
  {
    icon: Layers,
    title: 'Resume Parsing',
    desc: 'Structured extraction of your resume into a semantic JSON object for deep NLP processing.',
    color: '#fb923c',
    gradient: 'from-[#fb923c]/10 to-transparent',
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 border-t border-[#20364d]/50 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16 space-y-3"
        >
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Capabilities</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Built for{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
              precise tailoring.
            </span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Every capability designed to maximize your ATS score without compromising authenticity.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`group relative rounded-2xl p-6 cursor-default overflow-hidden`}
              style={{
                background: 'rgba(12,27,44,0.8)',
                border: `1px solid rgba(32,54,77,0.8)`,
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 30% 30%, ${feat.color}08, transparent 70%)` }}
              />

              {/* Animated border on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ border: `1px solid ${feat.color}40` }}
              />

              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `${feat.color}12`,
                  border: `1px solid ${feat.color}30`,
                }}
              >
                <feat.icon size={20} style={{ color: feat.color }} />
              </div>

              <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-white transition-colors">
                {feat.title}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>

              {/* Bottom accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${feat.color}60, transparent)` }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
