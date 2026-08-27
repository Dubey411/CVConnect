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

    // Spawn particles — fewer, smaller, more subtle
    for (let i = 0; i < 40; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1 + 0.3,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.25 + 0.05,
        color: Math.random() > 0.7 ? '#C17A5B' : '#6E6259',
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

        // Draw connection lines — only very close particles
        particles.forEach(p2 => {
          const dx = p.x - p2.x, dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#C17A5B';
            ctx.globalAlpha = (1 - dist / 80) * 0.07;
            ctx.lineWidth   = 0.4;
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
      className="group relative flex items-center gap-3 font-bold text-[#F5F0E8] py-5 px-10 rounded-2xl text-base overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #C17A5B, #A05A44)',
        boxShadow: '0 12px 36px rgba(193,122,91,0.35)',
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
      style={{ background: 'transparent' }}
    >
      <ParticleCanvas />

      {/* Subtle top-center glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, transparent 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 space-y-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C17A5B]/30 font-mono text-[10px] tracking-widest uppercase text-[#C17A5B]"
          style={{ background: 'rgba(193,122,91,0.08)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#C17A5B] animate-pulse" />
          100% Free to Start
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl lg:text-6xl font-bold text-[#2A2622] tracking-tight leading-[1.08]"
        >
          Ready to beat{' '}
          <span className="text-[#1E2B37]">
            ATS filters?
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#6E6259] text-lg leading-relaxed max-w-xl mx-auto"
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
          <p className="text-xs text-[#6E6259] font-mono">No account required · Zero data retention</p>
        </motion.div>

        {/* Trust stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-10 pt-6 border-t border-[#1E2B37]/15"
        >
          {[
            ['98%', 'ATS Accuracy'],
            ['<5s', 'Analysis Time'],
            ['Free', 'To Start'],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-[#C17A5B] font-mono">{val}</p>
              <p className="text-[10px] text-[#6E6259] mt-0.5 uppercase tracking-widest font-mono">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
