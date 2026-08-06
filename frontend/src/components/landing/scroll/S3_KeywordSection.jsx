/**
 * S3_KeywordSection — Keyword Detection
 * Pin duration: 200vh
 * - Resume on left, Job Description slides in from right
 * - SVG connection lines animate for matched keywords
 * - Missing keywords pulse red
 * - AI suggestions appear bottom
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const KEYWORDS = [
  { kw: 'Python',           match: true  },
  { kw: 'SQL',              match: true  },
  { kw: 'React',            match: true  },
  { kw: 'Power BI',         match: false },
  { kw: 'Data Viz',         match: false },
  { kw: 'Machine Learning', match: true  },
];

const SUGGESTIONS = ['Power BI', 'Dashboarding', 'Data Visualization'];

export default function S3_KeywordSection() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  const jdRef     = useRef(null);
  const svgRef    = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: '+=200%',
          scrub: 1.2,
          pin: stickyRef.current,
          anticipatePin: 1,
        },
      });

      // Slide section in
      tl.from('#s3-content', { opacity: 0, y: 40, duration: 0.4 });

      // JD panel slides in from right
      tl.from(jdRef.current, { x: '100%', opacity: 0, duration: 0.8, ease: 'power3.out' }, '<0.2');

      // Matched keyword lines draw in sequence
      KEYWORDS.forEach((k, i) => {
        if (k.match) {
          tl.to(`#kw-line-${i}`, {
            strokeDashoffset: 0,
            duration: 0.3,
            ease: 'none',
          }, '<0.15');
          tl.to(`#kw-match-${i}`, {
            color: '#3be0c5',
            borderColor: 'rgba(59,224,197,0.5)',
            background: 'rgba(59,224,197,0.08)',
            duration: 0.2,
          }, '<');
        }
      });

      // Missing keywords pulse (CSS handles the pulse, we just show them)
      tl.to('.kw-missing', { opacity: 1, duration: 0.4 }, '<0.3');

      // Suggestions appear
      tl.to('#s3-suggestions', { opacity: 1, y: 0, duration: 0.5 }, '<0.3');

      // Fade out
      tl.to('#s3-content', { opacity: 0, duration: 0.3 }, '+=0.4');
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '300vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: '#081422' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgba(96,165,250,0.04),transparent)] pointer-events-none" />

        <div id="s3-content" className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Step 02 — Keyword Intelligence</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              AI maps your skills to{' '}
              <span className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-transparent">
                the job requirements.
              </span>
            </h2>
          </div>

          <div className="relative grid grid-cols-[1fr_80px_1fr] gap-0 items-start">
            {/* Resume keywords (left) */}
            <div className="rounded-2xl p-5 space-y-2.5" style={{ background: 'rgba(12,27,44,0.9)', border: '1px solid rgba(32,54,77,0.8)' }}>
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-3">Your Resume</p>
              {KEYWORDS.map((k, i) => (
                <div
                  key={k.kw}
                  id={`kw-match-${i}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    border: '1px solid rgba(32,54,77,0.8)',
                    color: k.match ? '#94a3b8' : '#fb8d76',
                    background: k.match ? 'transparent' : 'rgba(251,141,118,0.05)',
                    borderColor: k.match ? 'rgba(32,54,77,0.8)' : 'rgba(251,141,118,0.3)',
                  }}
                >
                  <span>{k.kw}</span>
                  {!k.match && (
                    <span className="kw-missing text-[10px] opacity-0" style={{ color: '#fb8d76' }}>Missing ✕</span>
                  )}
                </div>
              ))}
            </div>

            {/* SVG connection lines */}
            <div className="relative">
              <svg ref={svgRef} className="w-full h-full absolute inset-0" style={{ minHeight: 300 }} viewBox="0 0 80 300" preserveAspectRatio="none">
                {KEYWORDS.filter(k => k.match).map((k, i) => {
                  const yi = 24 + KEYWORDS.findIndex(kw => kw.kw === k.kw) * 44;
                  const pathLen = 100;
                  return (
                    <path
                      key={k.kw}
                      id={`kw-line-${KEYWORDS.findIndex(kw => kw.kw === k.kw)}`}
                      d={`M 0 ${yi} C 40 ${yi}, 40 ${yi}, 80 ${yi}`}
                      stroke="#3be0c5"
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.7"
                      strokeDasharray={pathLen}
                      strokeDashoffset={pathLen}
                    />
                  );
                })}
              </svg>
            </div>

            {/* JD keywords (right) */}
            <div ref={jdRef} className="rounded-2xl p-5 space-y-2.5" style={{ background: 'rgba(12,27,44,0.9)', border: '1px solid rgba(32,54,77,0.8)' }}>
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-3">Job Description</p>
              {KEYWORDS.map((k) => (
                <div key={k.kw} className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(59,224,197,0.05)', border: '1px solid rgba(59,224,197,0.15)', color: '#3be0c5' }}>
                  {k.kw}
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div
            id="s3-suggestions"
            className="mt-6 flex flex-wrap gap-2 justify-center"
            style={{ opacity: 0, transform: 'translateY(12px)' }}
          >
            <p className="w-full text-center text-xs text-slate-500 mb-1 font-mono">AI suggests adding:</p>
            {SUGGESTIONS.map(s => (
              <span key={s} className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#a78bfa]"
                style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)' }}>
                + {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CSS pulse animation for missing keywords */}
      <style>{`
        @keyframes kw-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .kw-missing { animation: kw-pulse 1.4s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
