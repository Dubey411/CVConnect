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
  { icon: Zap,      title: 'ATS Analysis',         desc: 'Multidimensional scoring across skills, domain, and experience.',  color: '#C17A5B' },
  { icon: Cpu,      title: 'AI Resume Rewrite',     desc: 'Action-verb optimization and metric-driven bullet improvements.',   color: '#1E2B37' },
  { icon: Key,      title: 'Keyword Intelligence',  desc: 'Gap detection and truthful keyword injection from your real skills.',color: '#C17A5B' },
  { icon: Shield,   title: 'Local ML Fallback',     desc: 'Scikit-learn NLP engine activates when cloud LLMs are unavailable.', color: '#1E2B37' },
  { icon: FileText, title: 'PDF Export',            desc: 'Calibri A4 print-ready templates. No watermarks. Ever.',            color: '#C17A5B' },
  { icon: Layers,   title: 'Resume Parsing',        desc: 'Deep structured extraction of your resume into semantic JSON.',     color: '#1E2B37' },
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
        style={{ background: 'transparent' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,transparent,transparent)] pointer-events-none" />

        <div id="s9-title" className="text-center mb-10 space-y-2 relative z-10">
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#C17A5B]">Capabilities</p>
          <h2 className="text-4xl font-bold text-[#2A2622] tracking-tight">
            Everything you need,{' '}
            <span className="text-[#1E2B37]">
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
                    background: visible ? '#FAF7F2' : 'rgba(250,247,242,0.5)',
                    borderColor: visible ? 'rgba(30,43,55,0.18)' : 'rgba(30,43,55,0.08)',
                    boxShadow: visible ? '0 10px 30px rgba(30,43,55,0.06)' : 'none',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
                  }}
                >
                  {visible && (
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
                      style={{ background: `radial-gradient(ellipse at 20% 20%, ${card.color}04, transparent 70%)` }}
                    />
                  )}
                  {/* Bottom accent */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: visible ? `linear-gradient(90deg, transparent, ${card.color}60, transparent)` : 'transparent' }}
                  />

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(245,240,232,0.85)', border: '1px solid rgba(30,43,55,0.12)' }}
                  >
                    <card.icon size={18} style={{ color: '#C17A5B' }} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2A2622] mb-2">{card.title}</h3>
                  <p className="text-[#6E6259] text-xs leading-relaxed">{card.desc}</p>

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
                  background: i < visibleCount ? '#C17A5B' : 'rgba(30,43,55,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
