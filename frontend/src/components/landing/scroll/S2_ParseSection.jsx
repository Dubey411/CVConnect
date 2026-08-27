/**
 * S2_ParseSection — AI Resume Parsing
 * Pin: 200vh  |  Scrub: 1.8  |  Glow: minimal
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const RESUME_SECTIONS = [
  { id: 'skills',     label: 'Skills',     y: '18%',  h: '12%' },
  { id: 'experience', label: 'Experience', y: '33%',  h: '22%' },
  { id: 'education',  label: 'Education',  y: '57%',  h: '14%' },
  { id: 'projects',   label: 'Projects',   y: '74%',  h: '18%' },
];

export default function S2_ParseSection() {
  const wrapRef  = useRef(null);
  const stickyRef = useRef(null);
  const beamRef  = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: '+=200%',
          scrub: 1.8,
          pin: stickyRef.current,
          anticipatePin: 1,
        },
      });

      // 1. Slide section into view
      tl.from('#s2-content', { opacity: 0, y: 40, duration: 0.5 });

      // 2. Scan beam moves top → bottom
      tl.fromTo(beamRef.current,
        { top: '0%' },
        { top: '95%', ease: 'none', duration: 2 },
        '<0.3',
      );

      // 3. Sections highlight one by one
      RESUME_SECTIONS.forEach((sec, i) => {
        tl.to(`#highlight-${sec.id}`, {
          opacity: 1,
          boxShadow: '0 0 12px 2px rgba(193,122,91,0.25)',
          background: 'rgba(193,122,91,0.08)',
          duration: 0.25,
        }, `<${i === 0 ? 0.3 : 0.15}`);
        tl.to(`#check-${sec.id}`, { opacity: 1, scale: 1, duration: 0.2 }, '<0.05');
      });

      // 4. Fade out
      tl.to('#s2-content', { opacity: 0, duration: 0.4 }, '+=0.3');
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '300vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'transparent' }}>

        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(193,122,91,0.06),transparent)] pointer-events-none" />

        <div id="s2-content" className="w-full max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Label */}
          <div className="space-y-5">
            <p className="text-xs text-[#C17A5B] font-mono mb-2">Step 01 — AI Parsing</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#2A2622] tracking-tight leading-[1.1]">
              AI reads every{' '}
              <span className="text-[#C17A5B]">line of your resume.</span>
            </h2>
            <p className="text-[#6E6259] text-base leading-relaxed">
              Our NLP engine extracts structured data from every section — then maps it to your target role requirements.
            </p>

            {/* Section checklist */}
            <div className="space-y-3 pt-2">
              {RESUME_SECTIONS.map((sec) => (
                <div key={sec.id} className="flex items-center gap-3">
                  <div
                    id={`check-${sec.id}`}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      opacity: 0,
                      scale: 0.5,
                      background: 'rgba(193,122,91,0.15)',
                      border: '1px solid #C17A5B',
                      color: '#C17A5B',
                    }}
                  >
                    ✓
                  </div>
                  <span className="text-sm text-[#2A2622] capitalize font-medium">{sec.label} detected</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Resume preview with scan beam */}
          <div className="relative">
            <div className="relative rounded-xl overflow-hidden"
              style={{ background: '#FAF7F2', border: '1px solid rgba(30,43,55,0.18)', boxShadow: '0 20px 50px rgba(30,43,55,0.1)', minHeight: 400 }}>

              {/* Scan beam */}
              <div
                ref={beamRef}
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #C17A5B, transparent)',
                  boxShadow: '0 0 12px 3px rgba(193,122,91,0.35)',
                  top: '0%',
                }}
              />

              {/* Resume header */}
              <div className="p-5 border-b" style={{ borderColor: 'rgba(30,43,55,0.1)', background: 'rgba(245,240,232,0.8)' }}>
                <div className="text-[#2A2622] font-semibold text-sm">Shubham Dubey</div>
                <div className="text-[#6E6259] text-xs mt-0.5">Computer Engineer · dubeytech9619@gmail.com</div>
                <div className="flex gap-2 mt-2">
                  {['React', 'Node.js', 'Python', 'SQL'].map(sk => (
                    <span key={sk} className="px-2 py-0.5 rounded text-[10px] text-[#6E6259]" style={{ border: '1px solid rgba(30,43,55,0.15)', background: '#F5F0E8' }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Resume body with highlight zones */}
              <div className="relative p-5 space-y-4">
                {RESUME_SECTIONS.map((sec) => (
                  <div
                    key={sec.id}
                    id={`highlight-${sec.id}`}
                    className="rounded-lg p-3 border transition-all"
                    style={{
                      opacity: 0.15,
                      borderColor: 'rgba(30,43,55,0.12)',
                      background: 'transparent',
                    }}
                  >
                    <p className="text-[10px] font-mono text-[#C17A5B] uppercase tracking-widest mb-2">
                      {sec.label}
                    </p>
                    <div className="space-y-1.5">
                      {[1, 2].map(l => (
                        <div key={l}
                          className="h-2 rounded-full bg-[#1E2B37]/20"
                          style={{ width: l === 1 ? '80%' : '55%' }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
