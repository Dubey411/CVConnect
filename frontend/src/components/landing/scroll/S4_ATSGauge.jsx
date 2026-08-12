/**
 * S4_ATSGauge — ATS Score Animation
 * Pin duration: 250vh
 * - Radial SVG gauge scrubs from 54% → 91% synchronized with scroll
 * - Category bars animate
 * - Glow intensifies as score increases
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CATEGORIES = [
  { label: 'Skills Match',     from: 48, to: 92, color: '#3be0c5' },
  { label: 'Keywords',         from: 40, to: 88, color: '#60a5fa' },
  { label: 'Experience Fit',   from: 55, to: 82, color: '#a78bfa' },
  { label: 'Education',        from: 70, to: 95, color: '#34d399' },
  { label: 'Domain Alignment', from: 45, to: 85, color: '#f472b6' },
];

export default function S4_ATSGauge() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  const progressObj = useRef({ score: 54 });
  const [score, setScore] = useState(54);
  const [barPcts, setBarPcts] = useState(CATEGORIES.map(c => c.from));

  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate score object so we can read it in onUpdate
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: '+=250%',
          scrub: 1.8,
          pin: stickyRef.current,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = Math.min(self.progress, 1);
            const live = Math.round(54 + (91 - 54) * p);
            setScore(live);
            setBarPcts(CATEGORIES.map(c => Math.round(c.from + (c.to - c.from) * p)));
          },
        },
      });

      tl.from('#s4-content', { opacity: 0, y: 30, duration: 0.4 });
      tl.to(progressObj.current, { score: 91, ease: 'none', duration: 2 }, '<0.2');
      tl.to('#s4-content', { opacity: 0, duration: 0.3 }, '+=0.3');
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const strokeDash = (score / 100) * circumference;
  const glowIntensity = Math.round((score - 54) / (91 - 54) * 40);

  return (
    <section ref={wrapRef} style={{ height: '350vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: '#081422' }}>

        {/* Dynamic background glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{ background: 'rgba(59,224,197,0.04)', border: '1px solid rgba(59,224,197,0.1)' }}
        />

        <div id="s4-content" className="w-full max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Radial gauge */}
          <div className="flex flex-col items-center gap-6">
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5] text-center mb-2">Step 03 — ATS Optimization</p>
              <h2 className="text-4xl font-bold text-white tracking-tight text-center leading-[1.15]">
                Watch your score{' '}
                <span className="bg-gradient-to-r from-[#3be0c5] to-[#34d399] bg-clip-text text-transparent">
                  climb in real time.
                </span>
              </h2>
            </div>

            {/* Gauge */}
            <div className="relative" style={{ width: 220, height: 220 }}>
              <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
                {/* Track */}
                <circle cx="110" cy="110" r={radius} fill="none" stroke="#1e3a4a" strokeWidth="14" />
                {/* Progress */}
                <circle
                  cx="110" cy="110" r={radius}
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - strokeDash}
                  style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                />
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#3be0c5" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-5xl font-bold font-mono tabular-nums"
                  style={{
                    color: '#3be0c5',
                    transition: 'none',
                  }}
                >
                  {score}%
                </span>
                <span className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest">ATS Score</span>
              </div>
            </div>

            {/* Score milestones */}
            <div className="flex gap-4">
              {[54, 68, 82, 91].map(m => (
                <div key={m} className="text-center">
                  <div
                    className="text-sm font-bold font-mono"
                    style={{ color: score >= m ? '#3be0c5' : '#334155' }}
                  >
                    {m}%
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1"
                    style={{ background: score >= m ? '#3be0c5' : '#334155' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Category bars */}
          <div className="space-y-5">
            <h3 className="text-white font-semibold mb-6 text-lg">Score Breakdown</h3>
            {CATEGORIES.map((cat, i) => (
              <div key={cat.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{cat.label}</span>
                  <span className="font-mono text-white">{barPcts[i]}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1e3a4a' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${barPcts[i]}%`,
                      background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)`,
                      boxShadow: `0 0 10px ${cat.color}60`,
                      transition: 'width 0.12s linear',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
