import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  { id: 1, label: 'Resume Upload',       desc: 'PDF or DOCX parsed in <1s',        color: '#3be0c5' },
  { id: 2, label: 'Resume Parser',        desc: 'Structured JSON extraction',        color: '#60a5fa' },
  { id: 3, label: 'ATS Analysis',         desc: 'Multidimensional scoring',          color: '#a78bfa' },
  { id: 4, label: 'AI NLP Rewrite',       desc: 'Action-verb optimization',          color: '#f472b6' },
  { id: 5, label: 'Keyword Injection',    desc: 'Role-specific term insertion',      color: '#fb923c' },
  { id: 6, label: 'ATS Score',            desc: 'Final compliance check',            color: '#34d399' },
  { id: 7, label: 'PDF Export',           desc: 'Calibri A4 print-ready',            color: '#3be0c5' },
];

function PipelineStep({ step, index, total, isActive }) {
  const isLast = index === total - 1;
  return (
    <div className="flex flex-col items-center relative">
      {/* Node */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={isActive ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.35 }}
        transition={{ delay: index * 0.1, duration: 0.4, ease: 'backOut' }}
        className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500"
        style={{
          background:   isActive ? `${step.color}20` : 'rgba(12,27,44,0.8)',
          borderColor:  isActive ? step.color        : 'rgba(32,54,77,0.6)',
          color:        isActive ? step.color        : '#64748b',
          boxShadow:    isActive ? `0 0 24px ${step.color}40` : 'none',
        }}
      >
        {step.id}
      </motion.div>

      {/* Connector line (horizontal on md+, skip last) */}
      {!isLast && (
        <motion.div
          className="absolute top-6 left-12 h-px hidden md:block"
          style={{ width: 'calc(100% - 48px)' }}
          initial={{ scaleX: 0 }}
          animate={isActive ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.4, ease: 'easeOut', originX: '0%' }}
        >
          <div
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${step.color}, ${steps[index + 1].color})` }}
          />
        </motion.div>
      )}

      {/* Label */}
      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0, y: 6 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
      >
        <p className="text-xs font-semibold text-white whitespace-nowrap">{step.label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{step.desc}</p>
      </motion.div>
    </div>
  );
}

export default function PipelineSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 border-t border-[#20364d]/50 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3be0c5]/2 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">AI Pipeline</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            From upload to{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
              ATS-ready PDF
            </span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Seven precision steps, executed in under 5 seconds. Each stage lights up as your resume transforms.
          </p>
        </motion.div>

        {/* Pipeline row */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4 md:gap-0 justify-center">
          {steps.map((step, i) => (
            <PipelineStep
              key={step.id}
              step={step}
              index={i}
              total={steps.length}
              isActive={isInView}
            />
          ))}
        </div>

        {/* Animated progress bar below */}
        <motion.div
          className="mt-12 max-w-2xl mx-auto h-1 rounded-full overflow-hidden"
          style={{ background: '#20364d' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #3be0c5, #60a5fa, #a78bfa)' }}
            initial={{ width: '0%' }}
            animate={isInView ? { width: '100%' } : {}}
            transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.3 }}
          />
        </motion.div>
        <motion.p
          className="text-center text-[11px] font-mono text-slate-500 mt-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 2 }}
        >
          ⚡ Average processing time: 4.2 seconds
        </motion.p>
      </div>
    </section>
  );
}
