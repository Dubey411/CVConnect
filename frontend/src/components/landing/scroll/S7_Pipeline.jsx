/**
 * S7_Pipeline — Horizontal Animated Timeline
 * Pin: 250vh
 * - 7 nodes in a horizontal line
 * - Connecting line draws progressively with scroll (SVG strokeDashoffset)
 * - Each node lights up and label appears as line reaches it
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NODES = [
  { id: 'n1', label: 'Upload',    sub: 'PDF / DOCX',       color: '#C17A5B' },
  { id: 'n2', label: 'Parse',     sub: 'Structure extract', color: '#5B3A4A' },
  { id: 'n3', label: 'Analyze',   sub: 'ATS scoring',       color: '#C17A5B' },
  { id: 'n4', label: 'Rewrite',   sub: 'NLP bullets',       color: '#5B3A4A' },
  { id: 'n5', label: 'Optimize',  sub: 'Keyword inject',    color: '#C17A5B' },
  { id: 'n6', label: 'ATS Score', sub: 'Final check',       color: '#5B3A4A' },
  { id: 'n7', label: 'PDF',       sub: 'Calibri A4',        color: '#C17A5B' },
];

export default function S7_Pipeline() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  const lineRef   = useRef(null);
  const [activeNode, setActiveNode] = useState(-1);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const totalLineLen = lineRef.current?.getTotalLength?.() ?? 1000;
      gsap.set(lineRef.current, { strokeDasharray: totalLineLen, strokeDashoffset: totalLineLen });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: '+=250%',
          scrub: 1.5,
          pin: stickyRef.current,
          anticipatePin: 1,
          onUpdate(self) {
            const p = self.progress;
            const nodeIdx = Math.floor(p * (NODES.length + 1)) - 1;
            setActiveNode(nodeIdx);
          },
        },
      });

      // Section entrance
      tl.from('#s7-content', { opacity: 0, y: 30, duration: 0.4 });

      // Draw the connecting line
      tl.to(lineRef.current, {
        strokeDashoffset: 0,
        ease: 'none',
        duration: 3,
      }, '<0.3');

      // Exit
      tl.to('#s7-content', { opacity: 0, duration: 0.3 }, '+=0.3');
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '350vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'transparent' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_60%,transparent,transparent)] pointer-events-none" />

        <div id="s7-content" className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#C17A5B]">Step 06 — Full Pipeline</p>
            <h2 className="text-4xl font-bold text-[#2A2622] tracking-tight">
              Seven steps.{' '}
              <span className="text-[#5B3A4A]">
                Under 5 seconds.
              </span>
            </h2>
          </div>

          {/* Horizontal timeline */}
          <div className="relative px-6">
            {/* SVG connecting line */}
            <svg
              className="absolute inset-0 w-full pointer-events-none"
              style={{ height: 56, top: '50%', transform: 'translateY(-50%)' }}
              viewBox="0 0 1000 56"
              preserveAspectRatio="none"
            >
              {/* Background track */}
              <line x1="60" y1="28" x2="940" y2="28" stroke="rgba(91,58,74,0.15)" strokeWidth="2" />
              {/* Animated progress line */}
              <line
                ref={lineRef}
                x1="60" y1="28" x2="940" y2="28"
                stroke="url(#pipelineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="pipelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#C17A5B" />
                  <stop offset="50%"  stopColor="#5B3A4A" />
                  <stop offset="100%" stopColor="#C17A5B" />
                </linearGradient>
              </defs>
            </svg>

            {/* Nodes */}
            <div className="relative grid grid-cols-7 gap-0 z-10">
              {NODES.map((node, i) => {
                const isActive = i <= activeNode;
                return (
                  <div key={node.id} className="flex flex-col items-center gap-3">
                    {/* Circle node */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500"
                      style={{
                        background:   isActive ? 'rgba(193,122,91,0.15)' : '#FAF7F2',
                        borderColor:  isActive ? '#C17A5B' : 'rgba(91,58,74,0.2)',
                        color:        isActive ? '#C17A5B' : '#6E6259',
                        boxShadow:    isActive ? '0 0 20px rgba(193,122,91,0.25)' : 'none',
                        transform:    isActive ? 'scale(1.08)' : 'scale(1)',
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Label */}
                    <div className="text-center transition-all duration-500" style={{ opacity: isActive ? 1 : 0.25 }}>
                      <p className="text-xs font-semibold text-[#2A2622] whitespace-nowrap">{node.label}</p>
                      <p className="text-[10px] text-[#6E6259] whitespace-nowrap mt-0.5">{node.sub}</p>
                    </div>

                    {/* Active indicator dot */}
                    {isActive && i === activeNode && (
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: node.color }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom time badge */}
          <div className="text-center mt-14">
            <span className="font-mono text-xs text-slate-500 px-4 py-2 rounded-full border border-[#20364d]">
              ⚡ Average: 4.2 seconds · No manual work required
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
