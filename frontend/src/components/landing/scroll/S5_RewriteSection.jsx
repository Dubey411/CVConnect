/**
 * S5_RewriteSection — AI Resume Rewrite (Typewriter)
 * Pin: 200vh
 * - Shows 4 original bullets, each fades out while new AI bullet types in
 * - Action verbs, metrics, and keywords highlighted via <mark> spans
 * - Characters typed one-by-one synchronized with scroll progress
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const BULLETS = [
  {
    before: 'Responsible for building data pipelines and sharing reports.',
    after:  '[Engineered] automated data pipelines delivering [real-time] dashboards, reducing manual reporting by [40%].',
  },
  {
    before: 'Worked on the company website and added new features.',
    after:  '[Developed] [12+] high-performance React components, improving [page load speed by 35%] and [user retention].',
  },
  {
    before: 'Made a machine learning model for predicting outcomes.',
    after:  '[Architected] an ML prediction model achieving [94% accuracy], deployed to [production] with [<200ms] latency.',
  },
  {
    before: 'Helped team with data analysis tasks.',
    after:  '[Spearheaded] cross-functional data analysis initiatives, uncovering [3 revenue opportunities] worth [$50K+].',
  },
];

/** Parses bracket notation into plain text + highlight spans */
function renderHighlighted(text) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <mark key={i} style={{ background: 'rgba(59,224,197,0.15)', color: '#3be0c5', borderRadius: 3, padding: '0 3px' }}>
          {part.slice(1, -1)}
        </mark>
      );
    }
    return part;
  });
}

function BulletRow({ bullet, phase }) {
  // phase: 0=original, 1=typing, 2=done
  const [typed, setTyped] = useState('');
  const timerRef = useRef(null);

  // Strip brackets for plain typing text
  const plainAfter = bullet.after.replace(/\[([^\]]+)\]/g, '$1');

  useEffect(() => {
    if (phase === 1) {
      let i = 0;
      timerRef.current = setInterval(() => {
        i++;
        setTyped(plainAfter.slice(0, i));
        if (i >= plainAfter.length) clearInterval(timerRef.current);
      }, 18);
    }
    if (phase === 0) setTyped('');
    return () => clearInterval(timerRef.current);
  }, [phase, plainAfter]);

  return (
    <div className="rounded-xl p-4 border transition-all duration-500 relative overflow-hidden"
      style={{
        background: phase >= 1 ? 'rgba(59,224,197,0.04)' : 'rgba(12,27,44,0.8)',
        borderColor: phase >= 1 ? 'rgba(59,224,197,0.3)' : 'rgba(32,54,77,0.7)',
        boxShadow: phase >= 1 ? '0 0 20px rgba(59,224,197,0.06)' : 'none',
      }}
    >
      {/* Before (shown while phase === 0) */}
      <p className="text-sm text-slate-400 leading-relaxed transition-all duration-500"
        style={{ opacity: phase === 0 ? 1 : 0, position: phase > 0 ? 'absolute' : 'relative', pointerEvents: 'none' }}>
        {bullet.before}
      </p>

      {/* After (types in during phase === 1, shows highlighted in phase === 2) */}
      {phase > 0 && (
        <p className="text-sm text-slate-100 leading-relaxed">
          {phase === 2
            ? renderHighlighted(bullet.after)
            : (
              <>
                {typed}
                <span className="inline-block w-0.5 h-3.5 bg-[#3be0c5] ml-0.5 animate-pulse align-middle" />
              </>
            )
          }
        </p>
      )}

      {/* Bottom badge */}
      {phase >= 1 && (
        <div className="mt-2 flex gap-2">
          {['Action verb', 'Metric', 'Keyword'].map(tag => (
            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(59,224,197,0.1)', color: '#3be0c5', border: '1px solid rgba(59,224,197,0.25)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function S5_RewriteSection() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  // phases[i]: 0=original, 1=typing, 2=done
  const [phases, setPhases] = useState([0, 0, 0, 0]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('#s5-content', { opacity: 0, y: 30, duration: 0.5,
        scrollTrigger: { trigger: wrapRef.current, start: 'top top', toggleActions: 'play none none reverse' },
      });

      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: 'top top',
        end: '+=200%',
        scrub: false,
        pin: stickyRef.current,
        anticipatePin: 1,
        onUpdate(self) {
          const p = self.progress;
          // Each bullet activates at intervals: 0.1, 0.3, 0.55, 0.75
          const thresholds = [0.1, 0.3, 0.55, 0.75];
          const doneThr    = [0.28, 0.52, 0.73, 0.95];
          setPhases(prev => prev.map((ph, i) => {
            if (p >= doneThr[i]) return 2;
            if (p >= thresholds[i]) return ph === 0 ? 1 : ph;
            return 0;
          }));
        },
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '300vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: '#081422' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(167,139,250,0.04),transparent)] pointer-events-none" />

        <div id="s5-content" className="w-full max-w-4xl mx-auto px-6">
          <div className="text-center mb-10 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Step 04 — AI Rewrite</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Weak bullets become{' '}
              <span className="bg-gradient-to-r from-[#a78bfa] to-[#3be0c5] bg-clip-text text-transparent">
                powerful achievements.
              </span>
            </h2>
            <p className="text-slate-400 text-sm">Watch AI rewrite your resume bullets with action verbs, metrics and keywords.</p>
          </div>

          <div className="space-y-3">
            {BULLETS.map((b, i) => (
              <BulletRow key={i} bullet={b} phase={phases[i]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
