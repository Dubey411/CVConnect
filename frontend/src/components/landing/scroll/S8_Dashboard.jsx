/**
 * S8_Dashboard — Expanding Dashboard KPIs
 * Pin: 250vh
 * - Dashboard panel scales from narrow → full width
 * - KPI counters count up synchronized with scroll progress
 * - ATS score, Keyword count, Grammar issues, Role match all animate
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const KPIS = [
  { label: 'ATS Score',       from: 54,  to: 91,  suffix: '%',  color: '#9E6634', up: true  },
  { label: 'Keywords Added',  from: 0,   to: 12,  suffix: '',   color: '#16202C', up: true  },
  { label: 'Grammar Issues',  from: 8,   to: 0,   suffix: '',   color: '#9E6634', up: false },
  { label: 'Role Match',      from: 63,  to: 88,  suffix: '%',  color: '#16202C', up: true  },
];

function KPICard({ kpi, value }) {
  const delta = kpi.to - kpi.from;
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1 border transition-all"
      style={{
        background: '#FAF7F2',
        borderColor: 'rgba(22,32,44,0.16)',
        boxShadow: '0 4px 20px rgba(22,32,44,0.06)',
      }}
    >
      <p className="text-[10px] font-mono text-[#6E6259] uppercase tracking-widest">{kpi.label}</p>
      <p className="text-3xl font-bold font-mono tabular-nums" style={{ color: kpi.color }}>
        {value}{kpi.suffix}
      </p>
      <div className="flex items-center gap-1 text-xs mt-1">
        <span style={{ color: '#9E6634' }}>
          {kpi.up ? '↑' : '↓'}
        </span>
        <span className="text-[#6E6259]">
          {kpi.up
            ? `+${Math.abs(delta)}${kpi.suffix} from original`
            : `-${Math.abs(delta)} issues resolved`}
        </span>
      </div>
      {/* Mini bar */}
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(22,32,44,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: kpi.up
              ? `${(value / kpi.to) * 100}%`
              : `${100 - (value / kpi.from) * 100}%`,
            background: kpi.color,
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
}

export default function S8_Dashboard() {
  const wrapRef   = useRef(null);
  const stickyRef = useRef(null);
  const panelRef  = useRef(null);
  const [kpiValues, setKpiValues] = useState(KPIS.map(k => k.from));

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: '+=250%',
          scrub: 1.5,
          pin: stickyRef.current,
          anticipatePin: 1,
          onUpdate(self) {
            const p = Math.min(self.progress, 1);
            setKpiValues(KPIS.map(k => {
              const live = k.from + (k.to - k.from) * p;
              return k.to > k.from ? Math.round(live) : Math.round(live);
            }));
          },
        },
      });

      // Section entrance
      tl.from('#s8-content', { opacity: 0, y: 30, duration: 0.4 });

      // Dashboard panel expands
      tl.fromTo(panelRef.current,
        { width: '60%', opacity: 0.6 },
        { width: '100%', opacity: 1, ease: 'power2.out', duration: 1.5 },
        '<0.2',
      );

      // Exit
      tl.to('#s8-content', { opacity: 0, duration: 0.35 }, '+=0.3');
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} style={{ height: '350vh' }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'transparent' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,transparent,transparent)] pointer-events-none" />

        <div id="s8-content" className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#9E6634]">Step 07 — Live Dashboard</p>
            <h2 className="text-4xl font-bold text-[#2A2622] tracking-tight">
              Watch every metric{' '}
              <span className="text-[#16202C]">
                improve in real time.
              </span>
            </h2>
          </div>

          {/* Dashboard panel */}
          <div ref={panelRef} className="mx-auto" style={{ width: '60%' }}>
            {/* Dashboard chrome */}
            <div className="rounded-2xl overflow-hidden border border-[#16202C]/20"
              style={{ background: '#FAF7F2', boxShadow: '0 20px 60px rgba(22,32,44,0.12)' }}>

              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#16202C]/12"
                style={{ background: 'rgba(245,240,232,0.85)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9E6634]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D49B82]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16202C]" />
                </div>
                <span className="font-mono text-[10px] text-[#6E6259]">CVConnect Analytics</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9E6634] animate-pulse" />
                  <span className="font-mono text-[9px] text-emerald-400">LIVE</span>
                </div>
              </div>

              {/* KPI grid */}
              <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPIS.map((kpi, i) => (
                  <KPICard key={kpi.label} kpi={kpi} value={kpiValues[i]} />
                ))}
              </div>

              {/* Chart area */}
              <div className="px-5 pb-5">
                <div className="rounded-xl p-4 border border-[#16202C]/20/60" style={{ background: 'rgba(12,27,44,0.5)' }}>
                  <p className="font-mono text-[10px] text-[#6E6259] uppercase tracking-widest mb-4">ATS Score Progression</p>
                  <div className="flex items-end gap-2 h-20">
                    {[54, 62, 68, 74, 82, 87, 91].map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm transition-all duration-200"
                          style={{
                            height: `${(val / 91) * 80}px`,
                            background: `linear-gradient(180deg, #3be0c5, #60a5fa)`,
                            opacity: kpiValues[0] >= val ? 1 : 0.2,
                          }}
                        />
                        <span className="text-[8px] font-mono text-slate-600">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
