import { useEffect, useState } from 'react';
import { Clock, FileText, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { request } from '../api';

export default function History({ onLoadResume }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await request({ method: 'get', url: '/resumes?limit=50' });
      setItems(res.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume entry?')) return;
    setDeletingId(id);
    try {
      await request({ method: 'delete', url: `/resumes/${id}` });
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete resume.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Optimization History</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your Saved Resumes</h1>
          <p className="mt-1 text-sm text-slate-400">Manage, compare, reload, or delete your saved resume versions.</p>
        </div>
        <button 
          onClick={fetchHistory} 
          disabled={loading}
          className="button-quiet flex items-center gap-2 text-xs py-2 px-3 text-slate-300 hover:text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
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
          Loading your saved resumes...
        </div>
      ) : items.length === 0 ? (
        <div className="panel p-12 text-center">
          <Clock size={40} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-white">No saved resumes found</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
            Upload a resume and match it against a job description in the Workspace to create your first optimized draft.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
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
                    <div className="flex items-center gap-2">
                      {hasOptimized ? (
                        <span className="flex items-center gap-1 text-aqua font-medium text-[11px]">
                          <CheckCircle2 size={13} /> Optimized
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                          <AlertCircle size={13} /> Draft
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={isDeleting}
                        title="Delete Resume"
                        className="text-slate-500 hover:text-coral transition-colors p-1 rounded hover:bg-white/5"
                      >
                        <Trash2 size={14} className={isDeleting ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-aqua transition-colors line-clamp-1">
                    {item.job?.title || 'General Resume Upload'}
                  </h3>
                  {item.job?.company && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.job.company}</p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-line">
                    <div className="bg-surface/50 p-2.5 rounded text-center">
                      <p className="font-mono text-[10px] uppercase text-slate-500">Match Score</p>
                      <p className="text-lg font-semibold text-white mt-0.5">
                        {score !== null ? `${score}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-surface/50 p-2.5 rounded text-center">
                      <p className="font-mono text-[10px] uppercase text-slate-500">ATS Score</p>
                      <p className="text-lg font-semibold text-aqua mt-0.5">
                        {ats !== null ? `${ats}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500 uppercase">
                    v{item.version || 1}.0
                  </span>
                  <button
                    onClick={() => onLoadResume && onLoadResume(item)}
                    className="button-quiet text-xs text-aqua hover:text-white flex items-center gap-1 font-medium py-1 px-2.5"
                  >
                    View in Workspace <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
