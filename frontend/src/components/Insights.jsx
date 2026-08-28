import { useEffect, useState } from 'react';
import {
  BarChart3, Target, Award, Lightbulb, RefreshCw,
  FileText, CheckCircle2, AlertCircle, Layers, Sparkles
} from 'lucide-react';
import { request } from '../api';

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [resumeStats, setResumeStats] = useState({
    totalResumes: 0,
    tailoredCount: 0,
    avgMatch: 0,
    avgAts: 0,
    topGaps: [],
    topSkills: [],
    categories: {}
  });

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const resumesRes = await request({ method: 'get', url: '/resumes?limit=100' });
      const items = resumesRes.items || [];

      let totalMatch = 0;
      let totalAts = 0;
      let matchCount = 0;
      let atsCount = 0;
      let tailoredCount = 0;
      const gapCounts = {};
      const skillCounts = {};
      const catCounts = {};

      items.forEach(item => {
        if (item.optimized) tailoredCount++;
        if (item.matchScore) {
          totalMatch += item.matchScore;
          matchCount++;
        }
        if (item.atsScore) {
          totalAts += item.atsScore;
          atsCount++;
        }

        const cat = item.category || 'General';
        catCounts[cat] = (catCounts[cat] || 0) + 1;

        if (item.skillGap && Array.isArray(item.skillGap)) {
          item.skillGap.forEach(skill => {
            if (skill) gapCounts[skill] = (gapCounts[skill] || 0) + 1;
          });
        }
        if (item.optimized?.skills && Array.isArray(item.optimized.skills)) {
          item.optimized.skills.forEach(skill => {
            if (skill) skillCounts[skill] = (skillCounts[skill] || 0) + 1;
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
        tailoredCount,
        avgMatch: matchCount ? Math.round(totalMatch / matchCount) : 0,
        avgAts: atsCount ? Math.round(totalAts / atsCount) : 0,
        topGaps,
        topSkills,
        categories: catCounts
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

  const tailoredPct = resumeStats.totalResumes
    ? Math.round((resumeStats.tailoredCount / resumeStats.totalResumes) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Resume & Match Intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2B2D42]">Resume Analytics</h1>
          <p className="mt-1 text-sm text-[#5F6170]">
            Data-driven analysis of your resume drafts, ATS compliance ratings, match scores, and recurring skill gaps.
          </p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="button-quiet flex items-center gap-2 text-xs py-2 px-3 text-[#2B2D42] hover:text-[#2B2D42]"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="panel p-12 text-center text-[#5F6170]">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-aqua" />
          Analyzing your resume portfolio & match metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metrics Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between text-[#5F6170] text-xs mb-2">
                <span>Total Saved Drafts</span>
                <FileText size={16} className="text-[#A8412E]" />
              </div>
              <p className="text-3xl font-bold font-mono text-[#2B2D42]">{resumeStats.totalResumes}</p>
              <p className="text-[11px] text-[#5F6170] mt-1 font-mono">{resumeStats.tailoredCount} AI-tailored versions</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-[#5F6170] text-xs mb-2">
                <span>Tailored Version Rate</span>
                <Sparkles size={16} className="text-[#2B2D42]" />
              </div>
              <p className="text-3xl font-bold font-mono text-[#2B2D42]">{tailoredPct}%</p>
              <p className="text-[11px] text-[#5F6170] mt-1">{resumeStats.tailoredCount} tailored · {resumeStats.totalResumes - resumeStats.tailoredCount} original</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-[#5F6170] text-xs mb-2">
                <span>Average Match Score</span>
                <Target size={16} className="text-aqua" />
              </div>
              <p className="text-3xl font-bold font-mono text-aqua">{resumeStats.avgMatch ? `${resumeStats.avgMatch}%` : 'N/A'}</p>
              <p className="text-[11px] text-[#5F6170] mt-1">across target job descriptions</p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-[#5F6170] text-xs mb-2">
                <span>Average ATS Readiness</span>
                <Award size={16} className="text-[#A8412E]" />
              </div>
              <p className="text-3xl font-bold font-mono text-[#A8412E]">{resumeStats.avgAts ? `${resumeStats.avgAts}%` : 'N/A'}</p>
              <p className="text-[11px] text-[#5F6170] mt-1">parser compliance rating</p>
            </div>
          </div>

          {/* Category Distribution Breakdown Section */}
          <div className="panel p-6">
            <h2 className="text-sm font-semibold text-[#2B2D42] mb-4 flex items-center gap-2">
              <Layers size={16} className="text-aqua" /> Target Role Categories
            </h2>

            {Object.keys(resumeStats.categories || {}).length === 0 ? (
              <p className="text-xs text-[#5F6170] italic py-4">No resume categories logged yet. Upload or match resumes in the Workspace to begin.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(resumeStats.categories).map(([cat, count]) => {
                  const pct = Math.round((count / (resumeStats.totalResumes || 1)) * 100);

                  return (
                    <div key={cat} className="p-3.5 rounded-xl border border-line bg-[#F5EFE4] border border-[#2B2D42]/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 flex items-center justify-center rounded-lg text-sm bg-aqua/10 text-aqua font-mono font-bold border border-aqua/20">
                          {cat.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#2B2D42] capitalize">{cat}</p>
                          <p className="text-[10px] text-[#5F6170] mt-0.5">{count} drafts ({pct}%)</p>
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
              <h3 className="text-sm font-semibold text-[#2B2D42] mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-[#A8412E]" /> Frequent Skill Gaps
              </h3>
              <p className="text-xs text-[#5F6170] mb-4">Skills frequently requested by target job posts that were missing in initial drafts.</p>

              {resumeStats.topGaps.length === 0 ? (
                <p className="text-xs text-[#5F6170] italic py-4">No skill gaps identified yet. Analyze job descriptions in Workspace.</p>
              ) : (
                <div className="space-y-2">
                  {resumeStats.topGaps.map(gap => (
                    <div key={gap.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#F5EFE4] border border-[#2B2D42]/10">
                      <span className="font-medium text-[#2B2D42]">{gap.name}</span>
                      <span className="font-mono text-[11px] text-[#A8412E] font-semibold px-2 py-0.5 rounded bg-[#D4A24C]/15">
                        Missing in {gap.count} roles
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel p-6">
              <h3 className="text-sm font-semibold text-[#2B2D42] mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#2B2D42]" /> Top Matching Strengths
              </h3>
              <p className="text-xs text-[#5F6170] mb-4">Core competencies consistently verified and highlighted in your tailored resumes.</p>

              {resumeStats.topSkills.length === 0 ? (
                <p className="text-xs text-[#5F6170] italic py-4">Tailor resumes in the Workspace to highlight your key strengths.</p>
              ) : (
                <div className="space-y-2">
                  {resumeStats.topSkills.map(skill => (
                    <div key={skill.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#F5EFE4] border border-[#2B2D42]/10">
                      <span className="font-medium text-[#2B2D42]">{skill.name}</span>
                      <span className="font-mono text-[11px] text-[#2B2D42] font-semibold px-2 py-0.5 rounded bg-[#A8412E]/10">
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
                <h3 className="text-sm font-semibold text-[#2B2D42]">Strategic Tailoring Tip</h3>
                <p className="text-xs text-[#2B2D42] mt-1 leading-relaxed">
                  You have <strong className="text-[#2B2D42]">{resumeStats.totalResumes} saved resume drafts</strong> in your portfolio.
                  Focus on filling the top missing skills identified above in your experience bullet points to bring your average ATS match score above <strong className="text-aqua">80%</strong>!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
