import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Target, Award, Lightbulb, RefreshCw,
  Zap, CheckCircle2, AlertCircle, Layers, PieChart, ShieldCheck
} from 'lucide-react';
import { request } from '../api';

const PLATFORM_META = {
  unstop:      { name: 'Unstop',     icon: '⚡', color: '#F7C948', bg: 'rgba(247,201,72,0.12)' },
  wellfound:   { name: 'Wellfound',  icon: '🚀', color: '#00B894', bg: 'rgba(0,184,148,0.12)' },
  linkedin:    { name: 'LinkedIn',    icon: '🔗', color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
  internshala: { name: 'Internshala',icon: '🎓', color: '#00B5AD', bg: 'rgba(0,181,173,0.12)' },
  indeed:      { name: 'Indeed',     icon: '🏢', color: '#2164F3', bg: 'rgba(33,100,243,0.12)' },
  glassdoor:   { name: 'Glassdoor',  icon: '🔮', color: '#0CAA41', bg: 'rgba(12,170,65,0.12)' },
  naukri:      { name: 'Naukri',     icon: '📋', color: '#FF7555', bg: 'rgba(255,117,85,0.12)' },
};

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [appSummary, setAppSummary] = useState({
    total: 0,
    todayCount: 0,
    submitted: 0,
    failed: 0,
    platforms: {}
  });
  const [resumeStats, setResumeStats] = useState({
    totalResumes: 0,
    avgMatch: 0,
    avgAts: 0,
    topGaps: [],
    topSkills: []
  });

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const [appsRes, resumesRes] = await Promise.all([
        request({ method: 'get', url: '/applications' }),
        request({ method: 'get', url: '/resumes?limit=100' }),
      ]);

      setAppSummary(appsRes.summary || { total: 0, todayCount: 0, submitted: 0, failed: 0, platforms: {} });

      const items = resumesRes.items || [];
      let totalMatch = 0;
      let totalAts = 0;
      let matchCount = 0;
      let atsCount = 0;
      const gapCounts = {};
      const skillCounts = {};

      items.forEach(item => {
        if (item.matchScore) {
          totalMatch += item.matchScore;
          matchCount++;
        }
        if (item.atsScore) {
          totalAts += item.atsScore;
          atsCount++;
        }
        if (item.skillGap && Array.isArray(item.skillGap)) {
          item.skillGap.forEach(skill => {
            gapCounts[skill] = (gapCounts[skill] || 0) + 1;
          });
        }
        if (item.optimized?.skills && Array.isArray(item.optimized.skills)) {
          item.optimized.skills.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          });
        }
      });

      const topGaps = Object.entries(gapCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      setResumeStats({
        totalResumes: items.length,
        avgMatch: matchCount ? Math.round(totalMatch / matchCount) : 0,
        avgAts: atsCount ? Math.round(totalAts / atsCount) : 0,
        topGaps,
        topSkills
      });
    } catch (err) {
      console.error('Failed to load insights data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const successPct = appSummary.total ? Math.round((appSummary.submitted / appSummary.total) * 100) : 100;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analytics & Application Intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Career & Auto-Apply Insights</h1>
          <p className="mt-1 text-sm text-slate-400">Data-driven analysis connecting auto-apply velocity, platform distribution, ATS match scores, and skill gap intelligence.</p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="button-quiet flex items-center gap-2 text-xs py-2 px-3 text-slate-300 hover:text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="panel p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-aqua" />
          Analyzing your application portfolio & resume metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metrics Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Total Applications</span>
                <Zap size={16} className="text-amber-400" />
              </div>
              <p className="text-3xl font-bold font-mono text-white">{appSummary.total}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{appSummary.todayCount} submitted today</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Submission Success Rate</span>
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <p className="text-3xl font-bold font-mono text-emerald-400">{successPct}%</p>
              <p className="text-[11px] text-slate-400 mt-1">{appSummary.submitted} succeeded · {appSummary.failed} failed</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Average Match Score</span>
                <Target size={16} className="text-aqua" />
              </div>
              <p className="text-3xl font-bold font-mono text-aqua">{resumeStats.avgMatch ? `${resumeStats.avgMatch}%` : 'N/A'}</p>
              <p className="text-[11px] text-slate-400 mt-1">across target job descriptions</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Average ATS Readiness</span>
                <Award size={16} className="text-purple-400" />
              </div>
              <p className="text-3xl font-bold font-mono text-purple-400">{resumeStats.avgAts ? `${resumeStats.avgAts}%` : 'N/A'}</p>
              <p className="text-[11px] text-slate-400 mt-1">parser compliance rating</p>
            </div>
          </div>

          {/* Platform Distribution Breakdown Section */}
          <div className="panel p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart size={16} className="text-aqua" /> Platform Application Volume Breakdown
            </h2>

            {Object.keys(appSummary.platforms || {}).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No applications submitted across platforms yet. Use Auto-Apply Controls to begin.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(appSummary.platforms).map(([platform, count]) => {
                  const meta = PLATFORM_META[platform] || { name: platform, icon: '🌐', color: '#3be0c5', bg: 'rgba(59,224,197,0.12)' };
                  const pct = Math.round((count / (appSummary.total || 1)) * 100);

                  return (
                    <div key={platform} className="p-3.5 rounded-xl border border-line bg-surface/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 flex items-center justify-center rounded-lg text-lg" style={{ background: meta.bg }}>
                          {meta.icon}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white capitalize">{meta.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{count} applications ({pct}%)</p>
                        </div>
                      </div>
                      <div className="h-2 w-16 rounded-full bg-surface overflow-hidden">
                        <div className="h-full bg-aqua" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Skill Gaps & Strengths Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="panel p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-400" /> Frequent Skill Gaps
              </h3>
              <p className="text-xs text-slate-400 mb-4">Skills frequently requested by target job posts that were missing in initial drafts.</p>

              {resumeStats.topGaps.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No skill gaps identified yet. Analyze job descriptions in Workspace.</p>
              ) : (
                <div className="space-y-2">
                  {resumeStats.topGaps.map(gap => (
                    <div key={gap.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface/50 border border-line/60">
                      <span className="font-medium text-slate-300">{gap.name}</span>
                      <span className="font-mono text-[11px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-400/10">
                        Missing in {gap.count} roles
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" /> Top Matching Strengths
              </h3>
              <p className="text-xs text-slate-400 mb-4">Core competencies consistently verified and highlighted in your Role Resumes.</p>

              {resumeStats.topSkills.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">Upload role resumes in Auto-Apply Controls to highlight strengths.</p>
              ) : (
                <div className="space-y-2">
                  {resumeStats.topSkills.map(skill => (
                    <div key={skill.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface/50 border border-line/60">
                      <span className="font-medium text-slate-300">{skill.name}</span>
                      <span className="font-mono text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-400/10">
                        Present in {skill.count} versions
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Strategic Advice Card */}
          <div className="panel p-6 border-l-4 border-aqua bg-surface/40">
            <div className="flex items-start gap-3">
              <Lightbulb size={20} className="text-aqua shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-white">Strategic Optimization Tip</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Your portfolio has <strong className="text-white">{appSummary.submitted} verified auto-applies</strong> across platforms.
                  Ensure your <strong className="text-aqua">Data Engineer</strong> and <strong className="text-aqua">Full Stack</strong> Role Resumes in the Auto-Apply Vault are updated with your latest projects to maximize interview callback rates!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
