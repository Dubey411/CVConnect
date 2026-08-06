import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';

export default function CTASection({ onGetStarted }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-32 border-t border-[#20364d]/50 relative overflow-hidden" ref={ref}>
      {/* Animated glowing background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, rgba(59,224,197,0.12), rgba(96,165,250,0.06), transparent 70%)' }}
        />
      </motion.div>

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59,224,197,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,224,197,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3be0c5]/30 text-[#3be0c5] font-mono text-[10px] tracking-widest uppercase"
            style={{ background: 'rgba(59,224,197,0.06)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#3be0c5] animate-pulse" />
            Start Free Today
          </motion.div>

          <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            Ready to beat{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
              ATS filters?
            </span>
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed max-w-lg mx-auto">
            Upload your resume today. In under 5 seconds, get an ATS-optimized, print-ready PDF tailored to your exact target role.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={onGetStarted}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="group relative flex items-center gap-2.5 bg-[#3be0c5] text-[#081422] font-bold text-sm py-4 px-8 rounded-xl overflow-hidden transition-all duration-200"
              style={{ boxShadow: '0 0 40px rgba(59,224,197,0.4)' }}
            >
              {/* Ripple */}
              <motion.span
                className="absolute inset-0 bg-white/20 rounded-xl"
                initial={{ scale: 0, opacity: 1 }}
                whileHover={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
              Analyze My Resume — Free
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <p className="text-xs text-slate-500">No account required to try.</p>
          </div>

          {/* Social proof row */}
          <div className="flex items-center justify-center gap-8 pt-4 border-t border-[#20364d]/60">
            {[
              ['98%', 'ATS Accuracy'],
              ['<5s', 'Analysis Time'],
              ['Free', 'To Start'],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-[#3be0c5] font-mono">{val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-mono">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
