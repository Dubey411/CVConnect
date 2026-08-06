/**
 * S10_CTA — Final CTA with Particle Canvas + Magnetic Button
 * No pin — full viewport section
 * - requestAnimationFrame particle system on canvas
 * - Animated gradient blob mesh
 * - Magnetic button effect (mouse tracking)
 * - Headline: "Ready to Beat ATS Filters?"
 */
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/* ─── Particle Canvas ───────────────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    let rafId;
    let particles = [];

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Spawn particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.6 ? '#3be0c5' : '#60a5fa',
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height)  p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Draw connection lines to nearby particles
        particles.forEach(p2 => {
          const dx = p.x - p2.x, dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 120) * 0.15;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/* ─── Magnetic Button ───────────────────────────────────────────────────── */
function MagneticButton({ onClick, children }) {
  const btnRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 18 });
  const springY = useSpring(y, { stiffness: 200, damping: 18 });

  function handleMove(e) {
    const rect = btnRef.current.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    x.set((e.clientX - cx) * 0.35);
    y.set((e.clientY - cy) * 0.35);
  }

  function handleLeave() { x.set(0); y.set(0); }

  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="group relative flex items-center gap-3 font-bold text-[#081422] py-5 px-10 rounded-2xl text-base overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #3be0c5, #5de8d2)',
        boxShadow: '0 0 50px rgba(59,224,197,0.45), 0 0 100px rgba(59,224,197,0.15)',
        x: springX,
        y: springY,
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Ripple shimmer */}
      <motion.div
        className="absolute inset-0 bg-white/20"
        initial={{ x: '-100%', skewX: -15 }}
        whileHover={{ x: '200%', skewX: -15 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      {children}
      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
    </motion.button>
  );
}

/* ─── S10 CTA ───────────────────────────────────────────────────────────── */
export default function S10_CTA({ onGetStarted }) {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden text-center px-6"
      style={{ background: '#081422' }}
    >
      <ParticleCanvas />

      {/* Animated gradient blobs */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ width: 700, height: 700, top: '50%', left: '50%', x: '-50%', y: '-50%' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'conic-gradient(from 0deg, rgba(59,224,197,0.06), rgba(96,165,250,0.04), rgba(167,139,250,0.03), rgba(59,224,197,0.06))',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }} />
      </motion.div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59,224,197,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,224,197,1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 space-y-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3be0c5]/30 font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]"
          style={{ background: 'rgba(59,224,197,0.06)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#3be0c5] animate-pulse" />
          100% Free to Start
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08]"
        >
          Ready to beat{' '}
          <span className="bg-gradient-to-r from-[#3be0c5] via-[#60a5fa] to-[#a78bfa] bg-clip-text text-transparent">
            ATS filters?
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto"
        >
          Upload your resume. In under 5 seconds — ATS-optimized, keyword-perfect, print-ready PDF delivered.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <MagneticButton onClick={onGetStarted}>
            Analyze Resume
          </MagneticButton>
          <p className="text-xs text-slate-600 font-mono">No account required · Zero data retention</p>
        </motion.div>

        {/* Trust stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-10 pt-6 border-t border-[#20364d]/60"
        >
          {[
            ['98%', 'ATS Accuracy'],
            ['<5s', 'Analysis Time'],
            ['Free', 'To Start'],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-[#3be0c5] font-mono">{val}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-mono">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
