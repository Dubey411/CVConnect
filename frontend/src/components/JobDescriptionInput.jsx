import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Link2, Sparkles, RefreshCw } from 'lucide-react';
import { request } from '../api';

export default function JobDescriptionInput({ job, busy, onAnalyze }) {
  const [title, setTitle] = useState(job?.title || '');
  const [company, setCompany] = useState(job?.company || '');
  const [description, setDescription] = useState(job?.description || '');
  const [jobUrl, setJobUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  const handleFetchUrl = async (e) => {
    e.preventDefault();
    if (!jobUrl || !jobUrl.startsWith('http')) return;
    setFetchingUrl(true);
    setScrapeError('');
    try {
      const res = await request({
        method: 'post',
        url: '/jobs/scrape',
        data: { url: jobUrl }
      });
      if (res.job) {
        if (res.job.title) setTitle(res.job.title);
        if (res.job.company) setCompany(res.job.company);
        if (res.job.description) setDescription(res.job.description);
      }
    } catch (err) {
      const errObj = err.response?.data?.error;
      if (errObj?.guessedTitle && !title) {
        setTitle(errObj.guessedTitle);
      }
      setScrapeError(errObj?.message || 'Could not fetch job link. Please paste description manually.');
    } finally {
      setFetchingUrl(false);
    }
  };

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness size={17} className="text-aqua" />
          <h2 className="text-sm font-semibold">Target position</h2>
        </div>
      </div>

      {/* URL Link Extractor Option */}
      <div className="p-3 bg-surface/60 rounded border border-line space-y-2">
        <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Option A: Auto-Extract from Job Link
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="url"
              className="input pl-8 text-xs py-1.5"
              placeholder="Paste LinkedIn, Indeed, or Job URL..."
              value={jobUrl}
              onChange={e => setJobUrl(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={fetchingUrl || !jobUrl}
            onClick={handleFetchUrl}
            className="button-quiet border border-aqua/30 text-aqua hover:bg-aqua/10 text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40"
          >
            {fetchingUrl ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {fetchingUrl ? 'Extracting...' : 'Fetch Link'}
          </button>
        </div>
        {scrapeError && (
          <p className="text-[11px] text-coral mt-1">{scrapeError}</p>
        )}
      </div>

      <div className="text-[10px] font-mono uppercase text-slate-500 text-center">
        — OR Option B: Enter Job Details Manually —
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Role title
          <input
            className="input mt-1 text-xs"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Data Analyst / Software Engineer"
          />
        </label>
        <label className="text-xs text-slate-400">
          Company <span className="text-slate-600">optional</span>
          <input
            className="input mt-1 text-xs"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Google / Microsoft"
          />
        </label>
      </div>

      <label className="block text-xs text-slate-400">
        Job description
        <textarea
          className="input mt-1 min-h-32 text-xs resize-y leading-relaxed"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Full job description (automatically filled via link or pasted manually)..."
        />
      </label>

      <button
        type="button"
        disabled={busy || description.length < 50 || title.length < 2}
        onClick={() => onAnalyze({ title, company, description })}
        className="button-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Reading role…' : (
          <>
            Analyse fit <ArrowRight size={15} />
          </>
        )}
      </button>
    </div>
  );
}
