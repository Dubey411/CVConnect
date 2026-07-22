import { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, Sparkles, Zap, Check } from 'lucide-react';
import { request } from '../api';

const labels = { skills: 'Skills', experience: 'Experience', keywords: 'Keywords', domain: 'Domain', education: 'Education' };

export default function ScorePanel({ analysis, onRewrite, busy, resumeId, jobId }) {
  const [applyState, setApplyState] = useState('idle'); // idle | selecting | applying | done | error
  const [selectedPlatform, setSelectedPlatform] = useState('unstop');
  const [errorMsg, setErrorMsg] = useState('');

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

  const triggerAutoApply = async (platform) => {
    setApplyState('applying');
    setErrorMsg('');
    try {
      await request({
        method: 'post',
        url: '/applications/apply',
        data: {
          platform,
          resumeId,
          jobId
        }
      });
      setApplyState('done');
      setTimeout(() => setApplyState('idle'), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Platform account not connected. Please visit Connect Platforms.');
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
          <div className="panel p-3 bg-surface/60 border border-line space-y-2">
            <p className="text-[11px] text-slate-300 font-medium">Select Auto-Apply Target Platform:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['unstop', 'internshala', 'linkedin', 'indeed'].map(p => (
                <button
                  key={p}
                  onClick={() => triggerAutoApply(p)}
                  className="button-quiet text-[11px] py-1 px-2 capitalize justify-center"
                >
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => setApplyState('idle')} className="text-[10px] text-slate-400 hover:text-white w-full text-center mt-1">
              Cancel
            </button>
          </div>
        ) : applyState === 'done' ? (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-center text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5">
            <Check size={14} /> Auto-Apply Initiated! Check Activity Tracker.
          </div>
        ) : (
          <button 
            onClick={() => setApplyState('selecting')} 
            disabled={busy || applyState === 'applying'} 
            className="button bg-aqua/10 hover:bg-aqua/20 text-aqua border border-aqua/30 w-full text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <Zap size={14}/>
            {applyState === 'applying' ? 'Launching Auto-Apply Bot...' : '⚡ 1-Click Auto-Apply Now'}
          </button>
        )}
      </div>
    </div>
  );
}

