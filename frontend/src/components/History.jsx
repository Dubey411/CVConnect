import { useEffect, useState } from 'react';
import {
  Clock, FileText, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw, Trash2,
  ExternalLink, Zap, Layers, Filter, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { request } from '../api';

const PLATFORM_META = {
  unstop:      { name: 'Unstop',     icon: '⚡', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  wellfound:   { name: 'Wellfound',  icon: '🚀', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  linkedin:    { name: 'LinkedIn',    icon: '🔗', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  internshala: { name: 'Internshala',icon: '🎓', color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/30' },
  indeed:      { name: 'Indeed',     icon: '🏢', color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/30' },
  glassdoor:   { name: 'Glassdoor',  icon: '🔮', color: 'text-emerald-300', bg: 'bg-emerald-300/10 border-emerald-300/30' },
  naukri:      { name: 'Naukri',     icon: '📋', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30' },
};

export default function History({ onLoadResume }) {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'resumes'
  const [applications, setApplications] = useState([]);
  const [appSummary, setAppSummary] = useState({ total: 0, submitted: 0, failed: 0 });
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'submitted' | 'failed'
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const [appsRes, resumesRes] = await Promise.all([
        request({ method: 'get', url: '/applications' }),
        request({ method: 'get', url: '/resumes?limit=50' }),
      ]);
      setApplications(appsRes.applications || []);
      setAppSummary(appsRes.summary || { total: 0, submitted: 0, failed: 0 });
      setResumes(resumesRes.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteResume = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume entry?')) return;
    setDeletingId(id);
    try {
      await request({ method: 'delete', url: `/resumes/${id}` });
      setResumes(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete resume.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredApps = applications.filter(app => {
    if (filterStatus === 'submitted') return app.status === 'submitted';
    if (filterStatus === 'failed') return app.status === 'failed';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Application & Resume History</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your Activity Log</h1>
          <p className="mt-1 text-sm text-slate-400">Track all your auto-applies, workplace submissions, and saved resume versions in one place.</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="button-quiet flex items-center gap-2 text-xs py-2 px-3 text-slate-300 hover:text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-line pb-1">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
            activeTab === 'applications'
              ? 'border-aqua text-aqua bg-aqua/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={14} /> Job Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('resumes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
            activeTab === 'resumes'
              ? 'border-aqua text-aqua bg-aqua/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText size={14} /> Saved Resumes ({resumes.length})
        </button>
      </div>

      {error && (
        <div className="border-l-2 border-coral bg-coral/10 p-4 text-sm text-coral rounded-r">
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-aqua" />
          Loading your history log...
        </div>
      ) : activeTab === 'applications' ? (
        /* ---------------- Applications History View ---------------- */
        <div className="space-y-4">
          {/* Sub-filter Bar */}
          <div className="flex items-center justify-between gap-4 bg-surface/50 p-3 rounded-xl border border-line">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter:</span>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === 'all' ? 'bg-aqua text-ink font-semibold' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                All ({applications.length})
              </button>
              <button
                onClick={() => setFilterStatus('submitted')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === 'submitted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                Submitted ({appSummary.submitted || 0})
              </button>
              <button
                onClick={() => setFilterStatus('failed')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === 'failed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                Failed ({appSummary.failed || 0})
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Showing {filteredApps.length} entries
            </span>
          </div>

          {filteredApps.length === 0 ? (
            <div className="panel p-12 text-center">
              <Clock size={40} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-semibold text-white">No applications found</h3>
              <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
                Paste a job description URL in the Workspace or use Auto-Apply Controls to submit your first job application.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApps.map((app) => {
                const meta = PLATFORM_META[app.platform] || { name: app.platform, icon: '🌐', color: 'text-slate-300', bg: 'bg-slate-700/20 border-slate-600/30' };
                const jobTitle = app.job?.title || app.targetUrl?.split('/').pop()?.replace(/-/g, ' ') || 'Job Application';
                const company = app.job?.company || 'Direct Platform Listing';
                const dateStr = new Date(app.createdAt).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={app.id} className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Platform Badge */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl border ${meta.bg}`}>
                        {meta.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-white truncate capitalize">{jobTitle}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            {meta.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{company} · <span className="font-mono text-[11px] text-slate-500">{dateStr}</span></p>

                        {/* Error details if failed */}
                        {app.status === 'failed' && app.errorDetails && (
                          <p className="mt-1.5 text-[11px] text-rose-400 bg-rose-500/10 border-l-2 border-rose-500 px-2 py-1 rounded-r">
                            ⚠️ {app.errorDetails}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {app.status === 'submitted' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                          <CheckCircle size={13} /> Submitted
                        </span>
                      ) : app.status === 'failed' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-full">
                          <XCircle size={13} /> Failed
                        </span>
                      ) : app.status === 'applying' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full">
                          <Loader2 size={13} className="animate-spin" /> Applying…
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-700/40 border border-slate-600/40 px-3 py-1 rounded-full">
                          Pending
                        </span>
                      )}

                      {app.targetUrl && (
                        <a
                          href={app.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="button-quiet p-2 text-slate-400 hover:text-white"
                          title="Open original job page"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ---------------- Saved Resumes View ---------------- */
        <div>
          {resumes.length === 0 ? (
            <div className="panel p-12 text-center">
              <Clock size={40} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-semibold text-white">No saved resumes found</h3>
              <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
                Upload a resume and match it against a job description in the Workspace to create your first optimized draft.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.map((item) => {
                const dateStr = new Date(item.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                const score = item.matchScore ? Math.round(item.matchScore) : null;
                const ats = item.atsScore ? Math.round(item.atsScore) : null;
                const hasOptimized = !!item.optimized;
                const isDeleting = deletingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="panel p-5 flex flex-col justify-between hover:border-slate-700 transition-all group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <Clock size={13} /> {dateStr}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {item.category || 'General'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-white line-clamp-1">
                          {item.title || item.job?.title || item.original?.contact?.name || 'Resume Draft'}
                        </h3>
                        <button
                          onClick={(e) => handleDeleteResume(item.id, e)}
                          disabled={isDeleting}
                          className="text-slate-500 hover:text-coral transition-colors p-1"
                          title="Delete resume"
                        >
                          <Trash2 size={14} className={isDeleting ? 'animate-spin' : ''} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {item.job?.company ? `${item.job.company}` : (item.original?.contact?.email || 'Uploaded Resume')}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="bg-surface/60 p-2.5 rounded-lg border border-line/60">
                          <span className="text-[10px] text-slate-400 block font-mono">Match Score</span>
                          <span className={`text-base font-bold font-mono ${score >= 75 ? 'text-aqua' : score >= 50 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {score !== null ? `${score}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="bg-surface/60 p-2.5 rounded-lg border border-line/60">
                          <span className="text-[10px] text-slate-400 block font-mono">ATS Ready</span>
                          <span className={`text-base font-bold font-mono ${ats >= 75 ? 'text-emerald-400' : ats >= 50 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {ats !== null ? `${ats}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        {hasOptimized ? <CheckCircle2 size={12} /> : <AlertCircle size={12} className="text-amber-400" />}
                        {hasOptimized ? 'Tailored Draft' : 'Original Upload'}
                      </span>

                      {onLoadResume && (
                        <button
                          onClick={() => onLoadResume(item)}
                          className="text-xs font-semibold text-aqua hover:underline flex items-center gap-1"
                        >
                          Open in Workspace <ArrowUpRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
