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
            color: '#C17A5B',
            borderColor: '#C17A5B',
            background: 'rgba(193,122,91,0.08)',
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
        style={{ background: 'transparent' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgba(193,122,91,0.05),transparent)] pointer-events-none" />

        <div id="s3-content" className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#C17A5B]">Step 02 — Keyword Intelligence</p>
            <h2 className="text-4xl font-bold text-[#2A2622] tracking-tight">
              AI maps your skills to{' '}
              <span className="text-[#1E2B37]">
                the job requirements.
              </span>
            </h2>
          </div>

          <div className="relative grid grid-cols-[1fr_80px_1fr] gap-0 items-start">
            {/* Resume keywords (left) */}
            <div className="rounded-2xl p-5 space-y-2.5" style={{ background: '#FAF7F2', border: '1px solid rgba(30,43,55,0.16)', boxShadow: '0 12px 36px rgba(30,43,55,0.08)' }}>
              <p className="font-mono text-[10px] text-[#6E6259] uppercase tracking-widest mb-3">Your Resume</p>
              {KEYWORDS.map((k, i) => (
                <div
                  key={k.kw}
                  id={`kw-match-${i}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    border: '1px solid rgba(30,43,55,0.12)',
                    color: k.match ? '#6E6259' : '#C17A5B',
                    background: k.match ? 'transparent' : 'rgba(193,122,91,0.06)',
                    borderColor: k.match ? 'rgba(30,43,55,0.12)' : 'rgba(193,122,91,0.3)',
                  }}
                >
                  <span>{k.kw}</span>
                  {!k.match && (
                    <span className="kw-missing text-[10px] opacity-0" style={{ color: '#C17A5B' }}>Missing ✕</span>
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
                      stroke="#C17A5B"
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
            <div ref={jdRef} className="rounded-2xl p-5 space-y-2.5" style={{ background: '#FAF7F2', border: '1px solid rgba(30,43,55,0.16)', boxShadow: '0 12px 36px rgba(30,43,55,0.08)' }}>
              <p className="font-mono text-[10px] text-[#6E6259] uppercase tracking-widest mb-3">Job Description</p>
              {KEYWORDS.map((k) => (
                <div key={k.kw} className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(193,122,91,0.08)', border: '1px solid rgba(193,122,91,0.25)', color: '#2A2622' }}>
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
            <p className="w-full text-center text-xs text-[#6E6259] mb-1 font-mono">AI suggests adding:</p>
            {SUGGESTIONS.map(s => (
              <span key={s} className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#1E2B37]"
                style={{ background: 'rgba(30,43,55,0.08)', border: '1px solid rgba(30,43,55,0.25)' }}>
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
