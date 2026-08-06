/**
 * S9_FeatureStack — Stacking Feature Cards
 * Pin: 300vh
 * - 6 feature cards enter from bottom-right one by one as scroll progresses
 * - Previous cards stay pinned and stack
 * - Each card has glow + glassmorphism border
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Zap, Cpu, Shield, Key, FileText, Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  { icon: Zap,      title: 'ATS Analysis',         desc: 'Multidimensional scoring across skills, domain, and experience.',  color: '#3be0c5' },
  { icon: Cpu,      title: 'AI Resume Rewrite',     desc: 'Action-verb optimization and metric-driven bullet improvements.',   color: '#60a5fa' },
  { icon: Key,      title: 'Keyword Intelligence',  desc: 'Gap detection and truthful keyword injection from your real skills.',color: '#a78bfa' },
  { icon: Shield,   title: 'Local ML Fallback',     desc: 'Scikit-learn NLP engine activates when cloud LLMs are unavailable.', color: '#34d399' },
  { icon: FileText, title: 'PDF Export',            desc: 'Calibri A4 print-ready templates. No watermarks. Ever.',            color: '#f472b6' },
  { icon: Layers,   title: 'Resume Parsing',        desc: 'Deep structured extraction of your resume into semantic JSON.',     color: '#fb923c' },
];

export default function S9_FeatureStack() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('#s9-title', { opacity: 0, y: 20, duration: 0.5,
        scrollTrigger: { trigger: wrapRef.current, start: 'top top', toggleActions: 'play none none reverse' },
      });

      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: 'top top',
        end: '+=300%',
        scrub: false,
        pin: stickyRef.current,
        anticipatePin: 1,
        onUpdate(self) {
          const count = Math.floor(self.progress * (CARDS.length + 1));
          setVisibleCount(Math.min(count, CARDS.length));
        },
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '400vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: '#081422' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(59,224,197,0.03),transparent)] pointer-events-none" />

        <div id="s9-title" className="text-center mb-10 space-y-2 relative z-10">
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Capabilities</p>
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Everything you need,{' '}
            <span className="bg-gradient-to-r from-[#3be0c5] to-[#a78bfa] bg-clip-text text-transparent">
              nothing you don't.
            </span>
          </h2>
        </div>

        {/* Stacking card grid */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CARDS.map((card, i) => {
              const visible = i < visibleCount;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl p-6 border transition-all duration-700 relative overflow-hidden"
                  style={{
                    background: visible ? 'rgba(12,27,44,0.9)' : 'rgba(12,27,44,0.1)',
                    borderColor: visible ? `${card.color}40` : 'rgba(32,54,77,0.3)',
                    boxShadow: visible ? `0 0 30px ${card.color}10` : 'none',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
                  }}
                >
                  {/* Glow on visible */}
                  {visible && (
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at 20% 20%, ${card.color}06, transparent 70%)` }}
                    />
                  )}
                  {/* Bottom accent */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: visible ? `linear-gradient(90deg, transparent, ${card.color}60, transparent)` : 'transparent' }}
                  />

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${card.color}12`, border: `1px solid ${card.color}30` }}
                  >
                    <card.icon size={20} style={{ color: card.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{card.desc}</p>

                  {/* Entry number badge */}
                  {visible && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold"
                      style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}
                    >
                      {i + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {CARDS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width:  i < visibleCount ? 20 : 6,
                  height: 6,
                  background: i < visibleCount ? '#3be0c5' : '#1e3a4a',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
