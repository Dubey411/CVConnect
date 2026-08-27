import { useState, useEffect, useRef } from 'react';
import {
  Target, Zap, Award, Sparkles, AlertCircle, ArrowUpRight,
  CheckCircle2, RefreshCw, Briefcase, FileText, ChevronRight,
  Plus, Search, ExternalLink, Globe
} from 'lucide-react';
import { request } from '../api';

// ── Platform badge colours ──────────────────────────────────────────────────
const PLATFORM_META = {
  'Unstop':       { color: 'bg-purple-500/15 border-purple-500/30 text-purple-300',  dot: 'bg-purple-400' },
  'Internshala':  { color: 'bg-orange-500/15 border-orange-500/30 text-orange-300',  dot: 'bg-orange-400' },
  'Indeed India': { color: 'bg-sky-500/15 border-sky-500/30 text-sky-300',           dot: 'bg-sky-400'    },
  'LinkedIn':     { color: 'bg-blue-600/15 border-blue-500/30 text-blue-300',        dot: 'bg-blue-500'   },
  'Glassdoor':    { color: 'bg-green-600/15 border-green-500/30 text-green-300',      dot: 'bg-green-500'  },
  'Adzuna':       { color: 'bg-amber-500/15 border-amber-500/30 text-amber-300',      dot: 'bg-amber-400'  },
};

function PlatformBadge({ platform }) {
  const meta = PLATFORM_META[platform] || { color: 'bg-slate-700/40 border-slate-600/30 text-slate-400', dot: 'bg-slate-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {platform}
    </span>
  );
}

export default function MatchLeaderboard({ onSelectJob, onNavigateToApply }) {
  const fileInputRef = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'top', 'good'
  const [platformFilter, setPlatformFilter] = useState('all');

  useEffect(() => { fetchResumes(); }, []);

  useEffect(() => {
    if (selectedResumeId) runBatchMatch(selectedResumeId);
  }, [selectedResumeId]);

  const fetchResumes = async () => {
    try {
      const res = await request({ method: 'get', url: '/resumes?limit=50' });
      if (res.items && res.items.length > 0) {
        // Deduplicate resumes by title + category to prevent repetitive dropdown lists
        const uniqueMap = new Map();
        for (const r of res.items) {
          const displayTitle = r.title || r.category || 'Resume';
          const key = `${displayTitle.trim().toLowerCase()}::${(r.category || 'general').trim().toLowerCase()}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, r);
          }
        }
        const uniqueResumes = Array.from(uniqueMap.values());
        setResumes(uniqueResumes);
        if (!selectedResumeId && uniqueResumes.length > 0) {
          setSelectedResumeId(uniqueResumes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('category', 'General');
      const res = await request({
        method: 'post', url: '/resumes/upload', data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.resume) {
        await fetchResumes();
        setSelectedResumeId(res.resume.id);
        runDiscoverAndMatch(res.resume.id);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const runBatchMatch = async (resumeId) => {
    if (!resumeId) return;
    setLoading(true); setError(null);
    try {
      const data = await request({ method: 'post', url: '/jobs/batch-match', data: { resumeId } });
      setMatchData(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to analyze job matches.');
    } finally { setLoading(false); }
  };

  const runDiscoverAndMatch = async (resumeId) => {
    setDiscovering(true); setLoading(true); setError(null);
    try {
      const data = await request({
        method: 'post', url: '/jobs/discover-and-match',
        data: { resumeId: resumeId || selectedResumeId }
      });
      setMatchData(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to discover matching jobs.');
    } finally { setDiscovering(false); setLoading(false); }
  };

  const rankedJobs = matchData?.rankedJobs || [];
  const summary = matchData?.summary || { totalJobs: 0, topMatchScore: 0, avgScore: 0, highFitCount: 0 };

  // Derive unique platforms from results
  const availablePlatforms = [...new Set(rankedJobs.map(j => j.platform || j.requirements?.platform).filter(Boolean))];

  const allScores = rankedJobs.map(j => j.selectionChance || j.matchScore || 50);
  const maxScore = allScores.length ? Math.max(...allScores) : 50;

  // Relative cutoffs based on candidate's actual score range
  const topCutoff = Math.max(45, Math.round(maxScore * 0.85));
  const goodCutoff = Math.max(40, Math.round(maxScore * 0.70));

  const filteredJobs = rankedJobs.filter(job => {
    const chance = job.selectionChance || job.matchScore || 50;
    const platform = job.platform || job.requirements?.platform;
    const passScore = filter === 'top' ? chance >= topCutoff
      : filter === 'good' ? chance >= goodCutoff
      : true;
    const passPlatform = platformFilter === 'all' || platform === platformFilter;
    return passScore && passPlatform;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="hidden" />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#16202C] via-[#1E2C3A] to-[#16202C] border border-aqua/15 p-6 md:p-8">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-aqua/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aqua/10 border border-aqua/30 text-aqua text-xs font-semibold">
              <Target size={13} />
              AI Job Matching · Live Search
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Find Best Matching Jobs
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Searches across <strong className="text-white">Unstop · Internshala · Indeed India · LinkedIn · Glassdoor</strong> and ranks them by how well they match your resume.
            </p>
          </div>

          {/* Resume Selector & Inline Upload */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl w-full md:w-auto md:min-w-[320px] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 shrink-0">
                <FileText size={13} className="text-violet-400" />
                Active Resume:
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-[11px] font-semibold transition-colors shadow-sm shadow-violet-600/30 shrink-0 whitespace-nowrap"
              >
                <Plus size={12} />
                <span>{uploading ? 'Uploading…' : 'Upload Resume'}</span>
              </button>
            </div>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 transition-colors"
            >
              {resumes.length === 0 ? (
                <option value="">No Resumes Uploaded</option>
              ) : (
                resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.title || r.category} ({r.category || 'General'})</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 relative z-10">
          {[
            { label: 'Top Fit Score', value: summary.topMatchScore > 0 ? `${summary.topMatchScore}%` : 'N/A', icon: <Target size={20}/>, color: 'emerald' },
            { label: 'High Match Roles', value: `${summary.highFitCount}`, suffix: 'roles', icon: <Award size={20}/>, color: 'violet' },
            { label: 'Average Match', value: summary.avgScore > 0 ? `${summary.avgScore}%` : 'N/A', icon: <Zap size={20}/>, color: 'sky' },
            { label: 'Total Opportunities', value: `${summary.totalJobs}`, suffix: 'jobs', icon: <Briefcase size={20}/>, color: 'purple' }
          ].map(({ label, value, suffix, icon, color }) => (
            <div key={label} className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>{icon}</div>
              <div>
                <div className="text-xs text-slate-400 font-medium">{label}</div>
                <div className={`text-xl font-bold text-${color}-400`}>
                  {value} {suffix && <span className="text-xs text-slate-500 font-normal">{suffix}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Score Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl flex-wrap">
          {[
            { id: 'all',  label: `All (${rankedJobs.length})` },
            { id: 'top',  label: `🟢 Top Fits (${topCutoff}%+)` },
            { id: 'good', label: `🟡 Strong Fits (${goodCutoff}%+)` }
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >{label}</button>
          ))}
          {/* Platform Filter Pills */}
          {availablePlatforms.length > 0 && (
            <span className="mx-1 w-px h-4 bg-slate-700 self-center" />
          )}
          {availablePlatforms.map(p => (
            <button key={p} onClick={() => setPlatformFilter(prev => prev === p ? 'all' : p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                platformFilter === p ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >{p}</button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => runDiscoverAndMatch(selectedResumeId)}
            disabled={loading || !selectedResumeId}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
          >
            <Search size={13} className={discovering ? 'animate-spin' : ''} />
            <span>{discovering ? 'Searching Live Jobs…' : '🔍 Find Jobs from Resume'}</span>
          </button>
          <button
            onClick={() => runBatchMatch(selectedResumeId)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw size={13} className={loading && !discovering ? 'animate-spin text-violet-400' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <RefreshCw size={32} className="animate-spin text-violet-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-white font-semibold">
              {discovering ? '🔍 Searching Unstop · Internshala · Indeed India · LinkedIn…' : 'Running ML Match Scoring…'}
            </h3>
            <p className="text-xs text-slate-400">Fetching real live job listings and computing ML selection probability</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredJobs.length === 0 && (
        <div className="py-16 text-center space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <Briefcase size={40} className="text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-white font-medium text-lg">
              {rankedJobs.length > 0 ? `No roles matched active filter '${filter}'` : 'No Opportunities Found Yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {rankedJobs.length > 0
                ? `Your top match score among these opportunities is ${maxScore}%. Clear active filters to view all ${rankedJobs.length} live jobs.`
                : "Upload your resume and click Find Jobs from Resume — we'll search Unstop, Internshala, Indeed India, LinkedIn & Glassdoor live for you."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {rankedJobs.length > 0 ? (
              <button
                onClick={() => { setFilter('all'); setPlatformFilter('all'); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
              >
                Show All {rankedJobs.length} Opportunities
              </button>
            ) : (
              <>
                <button onClick={() => runDiscoverAndMatch(selectedResumeId)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
                >
                  <Search size={15} />Find Live Jobs for My Resume
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  <Plus size={15} />Upload Resume PDF
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Job Cards */}
      {!loading && !error && filteredJobs.length > 0 && (
        <div className="space-y-4">
          {filteredJobs.map((job, idx) => {
            const chance = job.selectionChance || job.matchScore || 50;
            const isTop = chance >= topCutoff;
            const isGood = chance >= goodCutoff && !isTop;
            const platform = job.platform || job.requirements?.platform;
            const targetUrl = job.targetUrl || job.requirements?.targetUrl;
            const isSearchLink = job.requirements?.isSearchLink;

            return (
              <div
                key={job.id}
                className={`group relative overflow-hidden rounded-2xl bg-slate-900/80 border transition-all duration-300 hover:border-slate-700 p-5 md:p-6 ${
                  isTop ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                  : isGood ? 'border-sky-500/30 hover:border-sky-500/60'
                  : isSearchLink ? 'border-violet-500/20 hover:border-violet-500/40'
                  : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left: Job details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      {platform && <PlatformBadge platform={platform} />}
                      {isTop && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 size={11} /> High Match
                        </span>
                      )}
                      {isSearchLink && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-semibold">
                          <Globe size={11} /> Live Search
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                        {job.title}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">{job.company}</p>
                    </div>

                    {/* Matched Skills */}
                    {job.matchedSkills?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 mr-1">Matched:</span>
                        {job.matchedSkills.slice(0, 6).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Missing Skills */}
                    {job.missingSkills?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 mr-1">Skill Gap:</span>
                        {job.missingSkills.slice(0, 4).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
                            ! {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Score + Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {/* Score */}
                    <div className="text-center min-w-[72px]">
                      <div className={`text-3xl font-extrabold tracking-tight ${
                        isTop ? 'text-emerald-400' : isGood ? 'text-sky-400' : 'text-slate-400'
                      }`}>
                        {isSearchLink ? '—' : `${chance}%`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        {isSearchLink ? 'Live Search' : 'Selection Chance'}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      {/* View on Platform */}
                      {targetUrl && (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
                        >
                          <ExternalLink size={12} />
                          {isSearchLink ? `Open ${platform}` : 'View Job'}
                        </a>
                      )}

                      {/* Tailor Resume (only for real listings, not search links) */}
                      {!isSearchLink && (
                        <button
                          onClick={() => {
                            if (onSelectJob) onSelectJob(job);
                            if (onNavigateToApply) onNavigateToApply(job);
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all ${
                            isTop
                              ? 'bg-aqua/15 hover:bg-aqua/25 text-aqua border border-aqua/30'
                              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Sparkles size={12} />
                          Tailor Resume
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
