import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Target, Award, Lightbulb, RefreshCw } from 'lucide-react';
import { request } from '../api';

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    avgMatch: 0,
    avgAts: 0,
    topGaps: [],
    topSkills: [],
    domains: {}
  });

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await request({ method: 'get', url: '/resumes?limit=100' });
      const items = res.items || [];
      
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

      setStats({
        total: items.length,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analytics & Performance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Application Insights</h1>
          <p className="mt-1 text-sm text-slate-400">Data-driven analysis of your resume match rates, skill gaps, and ATS readiness.</p>
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
          Analyzing your application portfolio...
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[10px] uppercase">Total Optimizations</span>
                <BarChart3 size={18} className="text-aqua" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-400">Resumes matched against target roles</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[10px] uppercase">Avg Job Match</span>
                <Target size={18} className="text-emerald-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">
                {stats.avgMatch ? `${stats.avgMatch}%` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Average alignment with target descriptions</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[10px] uppercase">Avg ATS Score</span>
                <Award size={18} className="text-aqua" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">
                {stats.avgAts ? `${stats.avgAts}%` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Scanner readability & keyword rating</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[10px] uppercase">Readiness Level</span>
                <TrendingUp size={18} className="text-cyan-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">
                {stats.avgAts > 75 ? 'High' : stats.avgAts > 50 ? 'Moderate' : 'Building'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Overall job application strength</p>
            </div>
          </div>

          {/* Skill Gaps vs High Impact Skills */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Skill Gaps */}
            <div className="panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-amber-400" />
                <h3 className="text-base font-semibold text-white">Most Frequent Skill Gaps</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Skills required by your target jobs that are currently missing from your resume drafts.
              </p>
              {stats.topGaps.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No missing skill patterns detected yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topGaps.map(gap => (
                    <div key={gap.name} className="flex items-center justify-between bg-surface/50 p-3 rounded border border-line">
                      <span className="text-sm font-medium text-slate-200 capitalize">{gap.name}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 font-semibold">
                        Missing in {gap.count} {gap.count === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Performing Skills */}
            <div className="panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-aqua" />
                <h3 className="text-base font-semibold text-white">Top Optimized Skills</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Your most frequently matched skills highlighted across your optimized versions.
              </p>
              {stats.topSkills.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No skill match data yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topSkills.map(skill => (
                    <div key={skill.name} className="flex items-center justify-between bg-surface/50 p-3 rounded border border-line">
                      <span className="text-sm font-medium text-slate-200">{skill.name}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-aqua/10 text-aqua font-semibold">
                        Matched {skill.count} {skill.count === 1 ? 'time' : 'times'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
