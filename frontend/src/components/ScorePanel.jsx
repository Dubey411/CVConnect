import { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, Sparkles, Zap, Check, Loader2 } from 'lucide-react';
import { io as ioClient } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { request } from '../api';

const labels = { skills: 'Skills', experience: 'Experience', keywords: 'Keywords', domain: 'Domain', education: 'Education' };

const ALL_PLATFORMS = ['unstop', 'internshala', 'wellfound', 'linkedin', 'indeed', 'naukri', 'glassdoor'];

const detectPlatform = (urlStr) => {
  if (!urlStr) return 'unstop';
  const u = urlStr.toLowerCase();
  if (u.includes('unstop.com')) return 'unstop';
  if (u.includes('internshala.com')) return 'internshala';
  if (u.includes('wellfound.com') || u.includes('angel.co')) return 'wellfound';
  if (u.includes('linkedin.com')) return 'linkedin';
  if (u.includes('indeed.')) return 'indeed';
  if (u.includes('naukri.com')) return 'naukri';
  if (u.includes('glassdoor.')) return 'glassdoor';
  return 'unstop';
};

export default function ScorePanel({ analysis, onRewrite, busy, resumeId, jobId, targetUrl }) {
  const user = useSelector(s => s.auth.user);
  const [applyState, setApplyState] = useState('idle'); // idle | selecting | applying | done | error
  const [progressMsg, setProgressMsg] = useState('Initializing stealth bot…');
  const [progressPercent, setProgressPercent] = useState(10);
  const [jobUrl, setJobUrl] = useState(targetUrl || '');
  const [selectedPlatform, setSelectedPlatform] = useState(detectPlatform(targetUrl || ''));
  const [urlError, setUrlError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [missingInputData, setMissingInputData] = useState(null);

  // Socket.io real-time progress updates
  useEffect(() => {
    if (!user?.id) return;
    const socket = ioClient(import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:5000');
    socket.emit('subscribe', user.id);

    socket.on('application:progress', (data) => {
      if (data.message) setProgressMsg(data.message);
      if (data.percent !== undefined) setProgressPercent(data.percent);

      if (data.stage === 'ai_analyzing') {
        setApplyState('ai_analyzing');
      } else if (data.stage === 'ai_filling') {
        setApplyState('ai_filling');
      } else if (data.stage === 'verifying' || data.status === 'verifying') {
        setApplyState('verifying');
      } else if (data.status === 'complete' || data.stage === 'complete' || data.percent === 100) {
        setApplyState('verified');
      } else if (data.status === 'failed' || data.stage === 'failed') {
        setErrorMsg(data.message || 'Auto-apply verification failed.');
        setApplyState('failed');
      }
    });

    socket.on('application:user_input_required', (data) => {
      setMissingInputData(data);
      setApplyState('user_input_required');
    });

    return () => socket.close();
  }, [user?.id]);

  if (!analysis) return (
    <div className="panel flex min-h-72 flex-col justify-between p-5">
      <div>
        <p className="eyebrow">Match intelligence</p>
        <h2 className="mt-2 text-xl font-semibold">Nothing to score—yet.</h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">Add a resume and target role to see where your evidence lines up.</p>
      </div>
      <div className="font-mono text-[11px] text-slate-500">Weighted by skills, experience, keywords, domain & education</div>
    </div>
  );

  const data = Object.entries(analysis.components).map(([key, value]) => ({ dimension: labels[key], value }));
  const color = analysis.score >= 75 ? 'text-aqua' : analysis.score >= 55 ? 'text-amber-300' : 'text-coral';

  const triggerAutoApply = async (plat) => {
    const finalUrl = jobUrl.trim() || targetUrl || '';
    if (!finalUrl) {
      setUrlError('Please paste the job listing URL before applying.');
      setApplyState('selecting');
      return;
    }
    try { new URL(finalUrl); } catch {
      setUrlError('Please enter a valid URL (e.g. https://unstop.com/jobs/...).');
      setApplyState('selecting');
      return;
    }
    
    const targetPlatform = plat || detectPlatform(finalUrl);
    setSelectedPlatform(targetPlatform);
    setUrlError('');
    setApplyState('applying');
    setProgressMsg(`Starting bot for ${targetPlatform.toUpperCase()}…`);
    setProgressPercent(10);
    setErrorMsg('');

    try {
      await request({
        method: 'post',
        url: '/applications/apply',
        data: {
          platform: targetPlatform,
          resumeId,
          jobId,
          targetUrl: finalUrl
        }
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || `Platform ${targetPlatform} account not connected. Please visit Connect Platforms.`);
      setApplyState('error');
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Match intelligence</p>
          <h2 className="mt-1 text-lg font-semibold">Application readiness</h2>
        </div>
        <span className="font-mono text-[10px] text-slate-500">ATS {analysis.atsScore}/100</span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className={`text-5xl font-semibold tracking-tighter ${color}`}>
          {analysis.score}<span className="text-lg">%</span>
        </div>
        <p className="max-w-32 text-xs leading-5 text-slate-400">Strong foundation. Close the most relevant gaps before applying.</p>
      </div>

      <div className="h-44">
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="#20364d"/>
            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9eacb9', fontSize: 10 }}/>
            <Radar dataKey="value" stroke="#3be0c5" fill="#3be0c5" fillOpacity={.25}/>
            <Tooltip contentStyle={{ background: '#0c1b2c', border: '1px solid #20364d' }}/>
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="rule -mx-5"/>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-mist">Skills to evidence</p>
        {analysis.missingSkills.slice(0, 3).map(skill => (
          <div key={skill} className="flex items-center gap-2 text-xs text-slate-400">
            <AlertTriangle size={13} className="text-coral"/>{skill}
          </div>
        ))}
        {analysis.matchedSkills.slice(0, 2).map(skill => (
          <div key={skill} className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={13} className="text-aqua"/>{skill}
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="mt-3 p-2.5 bg-coral/10 border border-coral/30 rounded text-[11px] text-coral">
          {errorMsg}
        </div>
      )}

      <div className="mt-5 space-y-2">
        <button onClick={onRewrite} disabled={busy} className="button-primary w-full disabled:opacity-50 text-xs py-2">
          <Sparkles size={14}/>{busy ? 'Optimising…' : 'Generate honest improvements'}
        </button>

        {applyState === 'selecting' ? (
          <div className="panel p-3 bg-surface/60 border border-line space-y-3">
            <p className="text-[11px] text-slate-300 font-medium">1. Target job listing URL:</p>
            <div>
              <input
                type="url"
                className="input text-xs w-full"
                placeholder="https://unstop.com/jobs/... or internshala.com/..."
                value={jobUrl}
                onChange={e => {
                  const val = e.target.value;
                  setJobUrl(val);
                  setSelectedPlatform(detectPlatform(val));
                  setUrlError('');
                }}
                autoFocus
              />
              {urlError && <p className="text-[10px] text-coral mt-1">{urlError}</p>}
            </div>
            <p className="text-[11px] text-slate-300 font-medium">2. Platform detected: <span className="text-aqua uppercase font-semibold">{selectedPlatform}</span></p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => { setSelectedPlatform(p); triggerAutoApply(p); }}
                  className={`button-quiet text-[11px] py-1 px-2 capitalize justify-center border ${
                    selectedPlatform === p ? 'border-aqua text-aqua font-semibold bg-aqua/10' : 'border-line text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => { setApplyState('idle'); setUrlError(''); }} className="text-[10px] text-slate-400 hover:text-white w-full text-center">
              Cancel
            </button>
          </div>
        ) : applyState === 'applying' ? (
          <div className="p-3 bg-aqua/10 border border-aqua/30 rounded space-y-2">
            <div className="flex items-center justify-between text-xs text-aqua font-medium">
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                {selectedPlatform.toUpperCase()} Bot Progress
              </span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-aqua transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] text-slate-300 truncate">{progressMsg}</p>
          </div>
        ) : applyState === 'ai_analyzing' ? (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-center text-xs text-blue-400 font-medium flex items-center justify-center gap-1.5">
            <Loader2 size={14} className="animate-spin" /> AI is analyzing form structure...
          </div>
        ) : applyState === 'ai_filling' ? (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                AI Form Filler Engine
              </span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] text-slate-300 truncate">{progressMsg}</p>
          </div>
        ) : applyState === 'user_input_required' && missingInputData ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <AlertTriangle size={14} /> Application Paused — Missing Input
            </div>
            <p className="text-[11px] text-slate-300">{missingInputData.reason}</p>
            <div className="text-[10px] font-mono text-slate-400">
              Required: {missingInputData.missingFields?.map(f => f.label).join(', ')}
            </div>
            <a href="/accounts" className="inline-block mt-1 text-xs text-emerald-400 underline font-medium">
              Update Candidate Profile Settings &rarr;
            </a>
          </div>
        ) : applyState === 'verifying' ? (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-center text-xs text-blue-400 font-medium flex items-center justify-center gap-1.5">
            <Loader2 size={14} className="animate-spin" /> Verifying with Unstop API...
          </div>
        ) : applyState === 'verified' || applyState === 'done' ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded space-y-1 text-center">
            <div className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
              <Check size={15} /> ✅ Application verified on {selectedPlatform.toUpperCase()}! 🎉
            </div>
            <p className="text-[10px] text-slate-400">Recorded in Activity Tracker</p>
            <button onClick={() => setApplyState('idle')} className="text-[10px] text-aqua hover:underline mt-1 block w-full text-center">
              Apply to another position
            </button>
          </div>
        ) : applyState === 'failed' || applyState === 'error' ? (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded space-y-2 text-center font-medium">
            <div className="text-xs text-coral flex items-center justify-center gap-1.5">
              <AlertTriangle size={15} /> <span>{errorMsg || 'Verification failed'}</span>
            </div>
            {(errorMsg?.toLowerCase().includes('login') || errorMsg?.toLowerCase().includes('session') || errorMsg?.toLowerCase().includes('reconnect')) && (
              <div className="pt-1 text-left bg-amber-500/10 border border-amber-500/30 p-2 rounded">
                <span className="text-[11px] text-amber-300 font-semibold block mb-1">⚠️ Session Expired on {selectedPlatform.toUpperCase()}</span>
                <p className="text-[10px] text-slate-300 mb-2">Please connect or reconnect your account in the Platforms tab.</p>
                <button
                  onClick={() => {
                    localStorage.setItem('cvconnect_active_tab', 'platforms');
                    window.location.reload();
                  }}
                  className="text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 px-3 py-1 rounded-md transition-colors w-full text-center"
                >
                  Go to Platforms & Reconnect →
                </button>
              </div>
            )}
            <button onClick={() => setApplyState('idle')} className="text-[10px] text-slate-400 hover:text-white mt-1 block w-full text-center">
              Try again
            </button>
          </div>
        ) : (
          <button 
            onClick={() => triggerAutoApply(selectedPlatform)} 
            disabled={busy || applyState === 'applying'} 
            className="button bg-aqua/10 hover:bg-aqua/20 text-aqua border border-aqua/30 w-full text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <Zap size={14}/>
            ⚡ 1-Click Auto-Apply on {selectedPlatform.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}

