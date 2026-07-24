import { useState, useEffect, useCallback, useRef } from 'react';
import { request } from '../api';
import {
  Sliders, Zap, Shield, Save, CheckCircle, RefreshCw,
  Play, Pause, Target, BarChart2, Calendar, FileText, Upload, Trash2, ChevronDown, Check
} from 'lucide-react';

const PLATFORM_META = {
  unstop:      { name: 'Unstop',     icon: '⚡', color: '#F7C948', bg: 'rgba(247,201,72,0.12)' },
  wellfound:   { name: 'Wellfound',  icon: '🚀', color: '#00B894', bg: 'rgba(0,184,148,0.12)' },
  linkedin:    { name: 'LinkedIn',    icon: '🔗', color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
  internshala: { name: 'Internshala',icon: '🎓', color: '#00B5AD', bg: 'rgba(0,181,173,0.12)' },
  indeed:      { name: 'Indeed',     icon: '🏢', color: '#2164F3', bg: 'rgba(33,100,243,0.12)' },
  glassdoor:   { name: 'Glassdoor',  icon: '🔮', color: '#0CAA41', bg: 'rgba(12,170,65,0.12)' },
  naukri:      { name: 'Naukri',     icon: '📋', color: '#FF7555', bg: 'rgba(255,117,85,0.12)' },
};

const ROLE_CATEGORIES = [
  { key: 'Full Stack', label: 'Full Stack Developer', icon: '💻', color: 'from-blue-500/20 to-indigo-500/10', border: 'border-blue-500/40', badge: 'bg-blue-500/15 text-blue-300' },
  { key: 'Data',       label: 'Data Engineer / Analyst', icon: '📊', color: 'from-teal-500/20 to-emerald-500/10', border: 'border-teal-500/40', badge: 'bg-teal-500/15 text-teal-300' },
  { key: 'ML',         label: 'ML / AI Engineer',     icon: '🤖', color: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/40', badge: 'bg-purple-500/15 text-purple-300' },
  { key: 'General',    label: 'General / Master',     icon: '📄', color: 'from-slate-500/20 to-slate-700/10', border: 'border-slate-500/40', badge: 'bg-slate-500/15 text-slate-300' },
];

function RoleResumeSlot({ category, resume, onUpload, onDelete }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('category', category.key);
      formData.append('title', `${category.key}_Resume.pdf`);

      await request({
        method: 'post',
        url: '/resumes/upload',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpload?.();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`rounded-xl border p-4 bg-gradient-to-br ${category.color} ${category.border} transition-all`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx"
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon}</span>
          <div>
            <h4 className="text-xs font-semibold text-white">{category.label}</h4>
            <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full mt-0.5 ${category.badge}`}>
              {category.key} Role
            </span>
          </div>
        </div>
      </div>

      {resume ? (
        <div className="rounded-lg bg-surface/80 border border-line p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={16} className="text-aqua shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{resume.title || `${category.key}_Resume.pdf`}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Uploaded {new Date(resume.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDelete?.(resume.id)}
              className="text-slate-500 hover:text-coral transition-colors p-1"
              title="Delete resume"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 w-full text-[11px] font-medium text-slate-300 hover:text-aqua border border-line/60 rounded-md py-1 px-2 flex items-center justify-center gap-1 hover:bg-white/5 transition-colors"
          >
            <Upload size={11} /> {uploading ? 'Uploading…' : 'Replace Resume'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-24 rounded-lg border-2 border-dashed border-line hover:border-aqua/50 bg-ink/30 hover:bg-aqua/5 flex flex-col items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-white"
        >
          <Upload size={18} className="text-aqua" />
          <span className="text-xs font-medium">{uploading ? 'Uploading…' : `Upload ${category.key} Resume`}</span>
          <span className="text-[10px] text-slate-500">PDF or DOCX (max 10MB)</span>
        </button>
      )}
    </div>
  );
}

function PlatformRuleCard({ item, resumes, onSave }) {
  const meta = PLATFORM_META[item.platform] || { name: item.platform, icon: '🌐', color: '#3be0c5', bg: 'rgba(59,224,197,0.12)' };
  const [dailyLimit, setDailyLimit] = useState(item.dailyLimit);
  const [targetRole, setTargetRole] = useState(item.targetRole);
  const [assignedResumeId, setAssignedResumeId] = useState(item.resumeId || '');
  const [isEnabled, setIsEnabled] = useState(item.isEnabled);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setDailyLimit(item.dailyLimit);
    setTargetRole(item.targetRole);
    setAssignedResumeId(item.resumeId || '');
    setIsEnabled(item.isEnabled);
  }, [item]);

  const save = async () => {
    setBusy(true);
    setSavedMsg('');
    try {
      await request({
        method: 'put',
        url: `/automation/rules/${item.platform}`,
        data: {
          dailyLimit: Number(dailyLimit),
          targetRole,
          resumeId: assignedResumeId || null,
          isEnabled
        },
      });
      setSavedMsg('Saved!');
      onSave?.();
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err) {
      setSavedMsg(err.response?.data?.error?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.min(100, Math.round((item.appliedToday / (dailyLimit || 1)) * 100));

  return (
    <div className={`rounded-2xl border p-5 transition-all ${isEnabled ? 'border-line bg-ink' : 'border-line/40 bg-ink/50 opacity-75'}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: meta.bg }}>
            {meta.icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">{meta.name}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {item.appliedToday} applied today · {item.totalApplied} total
            </p>
          </div>
        </div>

        {/* Toggle active / paused */}
        <button
          onClick={() => setIsEnabled(e => !e)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
            isEnabled
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700'
          }`}
        >
          {isEnabled ? <Play size={11} className="fill-current" /> : <Pause size={11} />}
          {isEnabled ? 'Automation Active' : 'Paused'}
        </button>
      </div>

      {/* Daily progress bar */}
      <div className="my-4">
        <div className="flex justify-between text-[11px] mb-1.5 font-mono">
          <span className="text-slate-400">Today's Progress</span>
          <span className={pct >= 100 ? 'text-coral font-bold' : 'text-aqua font-semibold'}>
            {item.appliedToday} / {dailyLimit} applications ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${pct >= 100 ? 'bg-coral' : 'bg-gradient-to-r from-aqua to-teal-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Settings Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-2">
        {/* Target Role Input */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Target size={12} className="text-aqua" /> Target Role Filter
          </label>
          <input
            className="input text-xs w-full"
            type="text"
            placeholder="e.g. Data Engineer, Frontend"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
          />
        </div>

        {/* Assigned Resume Selector */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
            <FileText size={12} className="text-purple-400" /> Assigned Role Resume
          </label>
          <select
            className="input text-xs w-full cursor-pointer"
            value={assignedResumeId}
            onChange={e => setAssignedResumeId(e.target.value)}
          >
            <option value="">Auto-Select Matching Category</option>
            {resumes.map(r => (
              <option key={r.id} value={r.id}>
                [{r.category}] {r.title || `${r.category}_Resume.pdf`}
              </option>
            ))}
          </select>
        </div>

        {/* Daily Limit Slider / Input */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1 justify-between">
            <span className="flex items-center gap-1"><Zap size={12} className="text-amber-400" /> Daily Limit</span>
            <span className="font-mono text-white text-xs">{dailyLimit} / day</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="flex-1 accent-aqua h-1.5 bg-surface rounded-lg cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="200"
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="input text-xs w-16 text-center font-mono py-1"
            />
          </div>
        </div>
      </div>

      {/* Footer Save Button */}
      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">
          Targeting: <strong className="text-mist font-normal">{targetRole || 'Any Role'}</strong>
        </span>
        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className={`text-[11px] font-medium ${savedMsg === 'Saved!' ? 'text-emerald-400' : 'text-coral'}`}>
              {savedMsg}
            </span>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="button-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={12} /> {busy ? 'Saving…' : 'Update Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutoApplyControls() {
  const [rules, setRules] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [summary, setSummary] = useState({ totalToday: 0, overallTotal: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [rulesRes, resumesRes] = await Promise.all([
        request({ method: 'get', url: '/automation/rules' }),
        request({ method: 'get', url: '/resumes?limit=50' }),
      ]);
      setRules(rulesRes.platformRules || []);
      setSummary(rulesRes.summary || { totalToday: 0, overallTotal: 0 });
      setResumes(resumesRes.items || []);
    } catch (err) {
      console.error('Fetch auto-apply controls data failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteResume = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await request({ method: 'delete', url: `/resumes/${id}` });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  const activeCount = rules.filter(r => r.isEnabled).length;
  const totalDailyTarget = rules.reduce((acc, r) => acc + (r.isEnabled ? r.dailyLimit : 0), 0);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Automation & Controls</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Auto-Apply Vault & Daily Rules
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Store role-tailored resumes for Full Stack, Data Level, and ML jobs. CVConnect will automatically select the matching resume when applying across your connected platforms.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="button-quiet text-xs py-2 px-3 flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar size={14} className="text-aqua" /> Applied Today
          </div>
          <p className="text-2xl font-bold text-white font-mono">{summary.totalToday}</p>
          <p className="text-[10px] text-slate-500 mt-1">out of {totalDailyTarget} daily target</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BarChart2 size={14} className="text-emerald-400" /> Total Applications
          </div>
          <p className="text-2xl font-bold text-white font-mono">{summary.overallTotal}</p>
          <p className="text-[10px] text-slate-500 mt-1">all-time across platforms</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Zap size={14} className="text-amber-400" /> Active Automation
          </div>
          <p className="text-2xl font-bold text-white font-mono">{activeCount} / {rules.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">platforms auto-applying</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Shield size={14} className="text-purple-400" /> Rate Safety
          </div>
          <p className="text-xs font-semibold text-emerald-400 mt-1.5 flex items-center gap-1">
            <CheckCircle size={13} /> Human Pace Active
          </p>
          <p className="text-[10px] text-slate-500 mt-1">45s–90s anti-bot delay</p>
        </div>
      </div>

      {/* Role Resumes Vault Section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              📁 Role Resumes Vault
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload distinct resumes tailored for Full Stack, Data Engineering, and ML/AI opportunities.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROLE_CATEGORIES.map(category => {
            const resumeForCategory = resumes.find(r => r.category === category.key);
            return (
              <RoleResumeSlot
                key={category.key}
                category={category}
                resume={resumeForCategory}
                onUpload={fetchAll}
                onDelete={handleDeleteResume}
              />
            );
          })}
        </div>
      </div>

      {/* Section Subhead: Platform Rules */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders size={16} className="text-aqua" /> Platform Automation Rules
          </h2>
          <span className="text-[11px] text-slate-400">Configure max applications & assigned role resume</span>
        </div>

        {/* Rules Cards List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl border border-line bg-surface animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map(item => (
              <PlatformRuleCard
                key={item.platform}
                item={item}
                resumes={resumes}
                onSave={fetchAll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
