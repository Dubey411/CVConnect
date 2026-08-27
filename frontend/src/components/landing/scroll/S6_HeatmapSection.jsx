/**
 * S6_HeatmapSection — Resume AI Vision Heatmap
 * Pin: 200vh
 * - Resume darkens as scroll enters
 * - Cyan glow = strong sections, orange glow = weak sections
 * - Continuous scan beam loops slowly
 * - Looks like computer vision / thermal imaging
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HEATMAP_ZONES = [
  { id: 'hz-header',     label: 'Header',     strength: 'strong', top: '4%',  height: '12%' },
  { id: 'hz-skills',     label: 'Skills',     strength: 'strong', top: '18%', height: '12%' },
  { id: 'hz-experience', label: 'Experience', strength: 'strong', top: '33%', height: '22%' },
  { id: 'hz-education',  label: 'Education',  strength: 'weak',   top: '57%', height: '14%' },
  { id: 'hz-projects',   label: 'Projects',   strength: 'weak',   top: '74%', height: '16%' },
  { id: 'hz-summary',    label: 'Summary',    strength: 'weak',   top: '92%', height: '6%'  },
];

export default function S6_HeatmapSection() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  const beamRef   = useRef(null);

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

      // Darken resume panel
      tl.from('#s6-content', { opacity: 0, y: 30, duration: 0.4 });
      tl.to('#hz-resume-overlay', { opacity: 0.75, duration: 0.6 }, '<0.2');

      // Reveal heatmap zones one by one
      HEATMAP_ZONES.forEach((zone, i) => {
        tl.to(`#${zone.id}`, {
          opacity: 1,
          boxShadow: zone.strength === 'strong'
            ? '0 0 24px 8px #C17A5B'
            : '0 0 24px 8px rgba(30,43,55,0.4)',
          duration: 0.25,
        }, `<${i === 0 ? 0.3 : 0.15}`);
      });

      // Fade section out
      tl.to('#s6-content', { opacity: 0, duration: 0.35 }, '+=0.3');
    }, wrapRef);

    // Looping scan beam (independent of scroll)
    const beamTween = gsap.to(beamRef.current, {
      top: '95%',
      duration: 2.5,
      ease: 'none',
      repeat: -1,
      yoyo: false,
      onRepeat: () => gsap.set(beamRef.current, { top: '-2%' }),
    });

    return () => { ctx.revert(); beamTween.kill(); };
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '300vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'transparent' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(193,122,91,0.04),transparent)] pointer-events-none" />

        <div id="s6-content" className="w-full max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Labels */}
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-[#C17A5B] mb-2">Step 05 — AI Vision Mode</p>
              <h2 className="text-4xl font-bold text-[#2A2622] tracking-tight leading-[1.1]">
                AI identifies what{' '}
                <span className="text-[#C17A5BX]">
                  needs attention.
                </span>
              </h2>
              <p className="text-[#6E6259] text-sm mt-4 leading-relaxed">
                A heatmap overlay reveals strong and weak sections instantly. Strong areas glow cyan — weak areas glow orange.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ background: 'rgba(193,122,91,0.3)', boxShadow: '0 0 10px #C17A5B' }} />
                <span className="text-sm text-[#2A2622] font-medium">Strong — high ATS impact</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ background: 'rgba(30,43,55,0.3)', boxShadow: '0 0 10px #1E2B37' }} />
                <span className="text-sm text-[#2A2622] font-medium">Weak — needs optimization</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1E2B37]/15">
              {HEATMAP_ZONES.map(zone => (
                <div key={zone.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#6E6259] capitalize font-medium">{zone.label}</span>
                  <span className="font-mono" style={{ color: zone.strength === 'strong' ? '#C17A5B' : '#1E2B37' }}>
                    {zone.strength === 'strong' ? '● Strong' : '● Needs work'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resume heatmap */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-2xl blur-xl opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(#3be0c5, #fb8d76, transparent 70%)' }} />

            <div className="relative rounded-xl overflow-hidden border border-[#1E2B37]/20"
              style={{ background: '#FAF7F2', minHeight: 460, boxShadow: '0 20px 50px rgba(30,43,55,0.1)' }}>

              {/* Dark overlay that fades in */}
              <div id="hz-resume-overlay"
                className="absolute inset-0 z-10 pointer-events-none rounded-xl"
                style={{ background: 'rgba(42,38,34,0.12)', opacity: 0 }}
              />

              {/* Looping scan beam */}
              <div
                ref={beamRef}
                className="absolute left-0 right-0 z-30 pointer-events-none"
                style={{
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #C17A5B, transparent)',
                  boxShadow: '0 0 16px 4px rgba(59,224,197,0.3)',
                  top: '-2%',
                }}
              />

              {/* Resume placeholder content */}
              <div className="p-5 space-y-3 relative z-0">
                <div className="pb-3 border-b border-[#20364d]/40">
                  <div className="h-4 w-40 rounded bg-[#1E2B37]/20 mb-1" />
                  <div className="h-2 w-56 rounded bg-slate-700/30" />
                </div>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2 rounded bg-slate-700/40" style={{ width: `${60 + (i * 13) % 38}%` }} />
                    <div className="h-2 rounded bg-slate-700/25" style={{ width: `${40 + (i * 7) % 30}%` }} />
                  </div>
                ))}
              </div>

              {/* Heatmap zones (absolutely positioned, z-20) */}
              {HEATMAP_ZONES.map(zone => (
                <div
                  key={zone.id}
                  id={zone.id}
                  className="absolute left-3 right-3 rounded-lg z-20 pointer-events-none"
                  style={{
                    top: zone.top,
                    height: zone.height,
                    opacity: 0,
                    border: `1px solid ${zone.strength === 'strong' ? 'rgba(59,224,197,0.5)' : 'rgba(251,141,118,0.5)'}`,
                    background: zone.strength === 'strong' ? 'rgba(59,224,197,0.06)' : 'rgba(251,141,118,0.06)',
                  }}
                >
                  <span
                    className="absolute top-1 right-2 text-[9px] font-mono uppercase tracking-widest"
                    style={{ color: zone.strength === 'strong' ? '#C17A5B' : '#1E2B37' }}
                  >
                    {zone.label} — {zone.strength}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
