/**
 * History.jsx — Resume History
 * Shows saved / optimized resume drafts only.
 * Application history removed (auto-apply is disabled).
 */
import { useEffect, useState } from 'react';
import {
  Clock, FileText, ArrowUpRight, CheckCircle2, AlertCircle,
  RefreshCw, Trash2, Sparkles, Download
} from 'lucide-react';
import { request } from '../api';

function ScoreBadge({ label, value, thresholds = [75, 50] }) {
  const color =
    value >= thresholds[0] ? 'text-aqua'
    : value >= thresholds[1] ? 'text-amber-400'
    : 'text-slate-400';
  return (
    <div className="bg-black/20 p-2.5 rounded-lg border border-line/50">
      <span className="text-[10px] text-slate-500 block mb-0.5">{label}</span>
      <span className={`text-lg font-bold font-mono ${color}`}>
        {value != null ? `${value}%` : '—'}
      </span>
    </div>
  );
}

export default function History({ onLoadResume }) {
  const [resumes, setResumes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchResumes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await request({ method: 'get', url: '/resumes?limit=100' });
      setResumes(res.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load resumes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this resume draft?')) return;
    setDeletingId(id);
    try {
      await request({ method: 'delete', url: `/resumes/${id}` });
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Resume History</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Your Saved Drafts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every resume you've uploaded or had AI-tailored to a job description.
          </p>
        </div>
        <button
          onClick={fetchResumes}
          disabled={loading}
          className="button-quiet flex items-center gap-2 text-xs py-2 px-3"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-l-2 border-coral bg-coral/10 p-4 text-sm text-coral rounded-r">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="panel p-14 text-center text-slate-400">
          <RefreshCw size={22} className="animate-spin mx-auto mb-3 text-aqua" />
          Loading resume history…
        </div>
      ) : resumes.length === 0 ? (
        /* Empty state */
        <div className="panel p-14 text-center">
          <FileText size={40} className="mx-auto mb-4 text-slate-700" />
          <h3 className="text-lg font-semibold text-white">No resumes yet</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
            Upload a resume and paste a job description in the Workspace to create your first tailored draft.
          </p>
        </div>
      ) : (
        /* Resume grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((item) => {
            const date      = new Date(item.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const score     = item.matchScore ? Math.round(item.matchScore) : null;
            const ats       = item.atsScore   ? Math.round(item.atsScore)   : null;
            const tailored  = !!item.optimized;
            const isDel     = deletingId === item.id;
            const title     = item.title || item.job?.title || item.original?.contact?.name || 'Resume Draft';
            const sub       = item.job?.company || item.original?.contact?.email || 'Uploaded Resume';

            return (
              <div
                key={item.id}
                className="panel p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                {/* Card top */}
                <div>
                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock size={12} /> {date}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      tailored
                        ? 'bg-aqua/10 text-aqua border-aqua/25'
                        : 'bg-slate-700/40 text-slate-400 border-slate-700/40'
                    }`}>
                      {tailored ? '✨ AI Tailored' : 'Original'}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-white line-clamp-1">{title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sub}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={isDel}
                      className="shrink-0 text-slate-600 hover:text-coral transition-colors p-1 mt-0.5"
                      title="Delete"
                    >
                      <Trash2 size={13} className={isDel ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {/* Score pills */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <ScoreBadge label="JD Match"  value={score} />
                    <ScoreBadge label="ATS Score" value={ats}   />
                  </div>

                  {/* Category tag */}
                  {item.category && (
                    <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-mono border border-line/50 text-slate-500">
                      {item.category}
                    </span>
                  )}
                </div>

                {/* Card bottom */}
                <div className="mt-5 pt-3 border-t border-line/50 flex items-center justify-between">
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${tailored ? 'text-aqua' : 'text-slate-500'}`}>
                    {tailored
                      ? <><Sparkles size={11} /> Tailored Draft</>
                      : <><FileText size={11} /> Original Upload</>
                    }
                  </span>
                  {onLoadResume && (
                    <button
                      onClick={() => onLoadResume(item)}
                      className="text-xs font-semibold text-aqua hover:underline flex items-center gap-1"
                    >
                      Open in Workspace <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
