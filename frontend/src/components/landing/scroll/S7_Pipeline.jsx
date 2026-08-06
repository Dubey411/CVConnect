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
  { id: 'n1', label: 'Upload',    sub: 'PDF / DOCX',       color: '#3be0c5' },
  { id: 'n2', label: 'Parse',     sub: 'Structure extract', color: '#60a5fa' },
  { id: 'n3', label: 'Analyze',   sub: 'ATS scoring',       color: '#a78bfa' },
  { id: 'n4', label: 'Rewrite',   sub: 'NLP bullets',       color: '#f472b6' },
  { id: 'n5', label: 'Optimize',  sub: 'Keyword inject',    color: '#fb923c' },
  { id: 'n6', label: 'ATS Score', sub: 'Final check',       color: '#34d399' },
  { id: 'n7', label: 'PDF',       sub: 'Calibri A4',        color: '#3be0c5' },
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
        style={{ background: '#081422' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_60%,rgba(59,224,197,0.04),transparent)] pointer-events-none" />

        <div id="s7-content" className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#3be0c5]">Step 06 — Full Pipeline</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Seven steps.{' '}
              <span className="bg-gradient-to-r from-[#3be0c5] to-[#60a5fa] bg-clip-text text-transparent">
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
              <line x1="60" y1="28" x2="940" y2="28" stroke="#1e3a4a" strokeWidth="2" />
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
                  <stop offset="0%"   stopColor="#3be0c5" />
                  <stop offset="50%"  stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#3be0c5" />
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
                        background:   isActive ? `${node.color}18` : '#0c1b2c',
                        borderColor:  isActive ? node.color : '#1e3a4a',
                        color:        isActive ? node.color : '#334155',
                        boxShadow:    isActive ? `0 0 28px ${node.color}60` : 'none',
                        transform:    isActive ? 'scale(1.08)' : 'scale(1)',
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Label */}
                    <div className="text-center transition-all duration-500" style={{ opacity: isActive ? 1 : 0.25 }}>
                      <p className="text-xs font-semibold text-white whitespace-nowrap">{node.label}</p>
                      <p className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{node.sub}</p>
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
