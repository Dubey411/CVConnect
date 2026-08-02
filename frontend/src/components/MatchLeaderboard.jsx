import { useState, useEffect, useRef } from 'react';
import {
  Target, Zap, Award, Sparkles, AlertCircle, ArrowUpRight,
  CheckCircle2, XCircle, RefreshCw, Briefcase, FileText, ChevronRight, Plus
} from 'lucide-react';
import { request } from '../api';

export default function MatchLeaderboard({ onSelectJob, onNavigateToApply }) {
  const fileInputRef = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'top', 'good'

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    if (selectedResumeId || resumes.length > 0) {
      runBatchMatch(selectedResumeId);
    }
  }, [selectedResumeId]);

  const fetchResumes = async () => {
    try {
      const res = await request({ method: 'get', url: '/resumes?limit=20' });
      if (res.items && res.items.length > 0) {
        setResumes(res.items);
        if (!selectedResumeId) setSelectedResumeId(res.items[0].id);
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
        method: 'post',
        url: '/resumes/upload',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.resume) {
        await fetchResumes();
        setSelectedResumeId(res.resume.id);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const runBatchMatch = async (resumeId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await request({
        method: 'post',
        url: '/jobs/batch-match',
        data: { resumeId }
      });
      setMatchData(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to analyze job matches.');
    } finally {
      setLoading(false);
    }
  };

  const rankedJobs = matchData?.rankedJobs || [];
  const summary = matchData?.summary || { totalJobs: 0, topMatchScore: 0, avgScore: 0, highFitCount: 0 };

  const filteredJobs = rankedJobs.filter(job => {
    if (filter === 'top') return job.matchScore >= 80;
    if (filter === 'good') return job.matchScore >= 65 && job.matchScore < 80;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/40 border border-violet-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={13} className="animate-pulse" />
              AI Multi-Job Resume Matcher
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Best Matched Opportunities Leaderboard
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Instant vector NLP match scoring across all target postings. Identify your top candidate fit and apply with 1-click.
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
                  <option key={r.id} value={r.id}>
                    {r.title || r.category} ({r.category || 'General'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 relative z-10">
          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Target size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Top Fit Score</div>
              <div className="text-xl font-bold text-emerald-400">
                {summary.topMatchScore > 0 ? `${summary.topMatchScore}%` : 'N/A'}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Award size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">High Match Roles</div>
              <div className="text-xl font-bold text-white">
                {summary.highFitCount} <span className="text-xs text-slate-500 font-normal">roles</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Zap size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Average Match</div>
              <div className="text-xl font-bold text-sky-400">
                {summary.avgScore > 0 ? `${summary.avgScore}%` : 'N/A'}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Opportunities</div>
              <div className="text-xl font-bold text-white">
                {summary.totalJobs} <span className="text-xs text-slate-500 font-normal">jobs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Opportunities ({rankedJobs.length})
          </button>
          <button
            onClick={() => setFilter('top')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'top'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟢 Top Fits (80%+)
          </button>
          <button
            onClick={() => setFilter('good')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'good'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟡 Strong Fits (65%–79%)
          </button>
        </div>

        <button
          onClick={() => runBatchMatch(selectedResumeId)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-violet-400' : ''} />
          Refresh Scores
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <RefreshCw size={32} className="animate-spin text-violet-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-white font-semibold">Running AI Match Engine…</h3>
            <p className="text-xs text-slate-400">Comparing vector skills & keyword density across all saved roles</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredJobs.length === 0 && (
        <div className="py-16 text-center space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <Briefcase size={40} className="text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-white font-medium text-lg">No Resumes or Target Postings Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Upload a resume PDF or enter target job links in Tailoring Studio to calculate your instant fit leaderboard.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
            >
              <Plus size={15} />
              <span>Upload Resume PDF / DOCX</span>
            </button>
          </div>
        </div>
      )}

      {/* Ranked Job List */}
      {!loading && !error && filteredJobs.length > 0 && (
        <div className="space-y-4">
          {filteredJobs.map((job, idx) => {
            const isTop = job.matchScore >= 80;
            const isGood = job.matchScore >= 65 && job.matchScore < 80;

            return (
              <div
                key={job.id}
                className={`group relative overflow-hidden rounded-2xl bg-slate-900/80 border transition-all duration-300 hover:border-slate-700 p-5 md:p-6 ${
                  isTop
                    ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                    : isGood
                    ? 'border-sky-500/30 hover:border-sky-500/60'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Job Details & Rank */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {job.company}
                      </span>
                      {isTop && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 size={12} /> High Match Fit
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                      {job.title}
                    </h2>

                    {/* Matched Skills Badges */}
                    <div className="space-y-2">
                      {job.matchedSkills && job.matchedSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-400 mr-1">Matched Skills:</span>
                          {job.matchedSkills.slice(0, 6).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Missing Skills Gap Badges */}
                      {job.missingSkills && job.missingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-400 mr-1">Skill Gap:</span>
                          {job.missingSkills.slice(0, 4).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono"
                            >
                              ! {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score Gauge & Apply Action */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-center">
                      <div className={`text-3xl font-extrabold tracking-tight ${
                        isTop ? 'text-emerald-400' : isGood ? 'text-sky-400' : 'text-slate-400'
                      }`}>
                        {job.matchScore}%
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        Match Score
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectJob) onSelectJob(job);
                        if (onNavigateToApply) onNavigateToApply(job);
                      }}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                        isTop
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30'
                      }`}
                    >
                      <span>Auto-Apply</span>
                      <ArrowUpRight size={14} />
                    </button>
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
