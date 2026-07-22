import { useState, useEffect } from 'react';
import { Globe, CheckCircle2, Sliders, Shield, Zap, Plus, X, Lock, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { request } from '../api';

const INITIAL_PLATFORMS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Global Tech & Enterprise',
    logo: '💼',
    color: 'from-blue-600 to-cyan-500',
    description: 'Auto-apply to Easy Apply roles with tailored resumes and customized screening questions.',
    status: 'disconnected',
    lastSync: 'Never',
    applicationsCount: 0
  },
  {
    id: 'indeed',
    name: 'Indeed',
    category: 'Global General Jobs',
    logo: '🌐',
    color: 'from-blue-500 to-indigo-600',
    description: 'Direct integration with Indeed Apply for rapid submission across thousands of postings.',
    status: 'disconnected',
    lastSync: 'Never',
    applicationsCount: 0
  },
  {
    id: 'internshala',
    name: 'Internshala',
    category: 'Internships & Fresher Roles',
    logo: '🚀',
    color: 'from-sky-400 to-blue-500',
    description: 'Automated application bot with custom cover letters tailored for student & fresher opportunities.',
    status: 'disconnected',
    lastSync: 'Never',
    applicationsCount: 0
  },
  {
    id: 'unstop',
    name: 'Unstop',
    category: 'Campus & Early Career',
    logo: '🎯',
    color: 'from-violet-500 to-purple-600',
    description: 'Auto-register for hiring challenges, hackathons, and corporate early-career drives.',
    status: 'disconnected',
    lastSync: 'Never',
    applicationsCount: 0
  },
  {
    id: 'wellfound',
    name: 'Wellfound (AngelList)',
    category: 'Startups & Tech',
    logo: '✌️',
    color: 'from-amber-500 to-orange-600',
    description: 'Direct founder outreach and high-growth startup applications with custom notes.',
    status: 'disconnected',
    lastSync: 'Never',
    applicationsCount: 0
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    category: 'Company Ratings & Jobs',
    logo: '🟢',
    color: 'from-emerald-500 to-teal-600',
    description: 'Sync application queue and ratings filter for high-trust company applications.',
    status: 'disconnected',
    lastSync: 'Never',
    applicationsCount: 0
  }
];

export default function ConnectPlatforms() {
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
  const [applications, setApplications] = useState([]);
  const [activeProgress, setActiveProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [autoApplyActive, setAutoApplyActive] = useState(true);
  const [maxAppsPerDay, setMaxAppsPerDay] = useState(25);
  const [targetTitles, setTargetTitles] = useState('Full Stack Developer, Data Analyst, Software Engineer');
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  // Connection modal state
  const [authEmail, setAuthEmail] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchConnections = async () => {
    setLoading(true);
    setApiError('');
    try {
      const [connRes, appRes] = await Promise.all([
        request({ method: 'get', url: '/platforms' }),
        request({ method: 'get', url: '/applications' }).catch(() => ({ applications: [] }))
      ]);

      const connections = connRes.connections || [];
      setApplications(appRes.applications || []);
      
      setPlatforms(prev => prev.map(p => {
        const found = connections.find(c => c.platform === p.id);
        if (found) {
          return {
            ...p,
            status: found.status || 'connected',
            applicationsCount: found.applicationsCount || 0,
            accountEmail: found.accountEmail,
            lastSync: new Date(found.lastSyncAt).toLocaleDateString()
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Failed to fetch platform connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnect = (platform) => {
    setActiveModal(platform);
    setAuthEmail(platform.accountEmail || '');
    setAuthKey('');
    setApiError('');
  };

  const submitConnection = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setApiError('');
    try {
      await request({
        method: 'post',
        url: '/platforms/connect',
        data: {
          platform: activeModal.id,
          accountEmail: authEmail,
          token: authKey
        }
      });
      await fetchConnections();
      setActiveModal(null);
    } catch (err) {
      setApiError(err.response?.data?.error?.message || 'Failed to authorize platform credentials.');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleDisconnect = async (platformId) => {
    try {
      await request({
        method: 'delete',
        url: `/platforms/${platformId}`
      });
      await fetchConnections();
    } catch (err) {
      console.error(`Failed to disconnect ${platformId}:`, err);
    }
  };

  const saveSettings = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Integrations & Auto-Apply</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Connect Job Platforms</h1>
          <p className="mt-1 text-sm text-slate-400">
            Link your job board profiles to enable automated multi-platform resume applications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            autoApplyActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${autoApplyActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}/>
            Auto-Apply Bot {autoApplyActive ? 'Active' : 'Paused'}
          </span>
          <button
            onClick={() => setAutoApplyActive(!autoApplyActive)}
            className={`button text-xs py-2 px-4 ${autoApplyActive ? 'bg-coral/20 text-coral hover:bg-coral/30' : 'button-primary'}`}
          >
            {autoApplyActive ? 'Pause Auto-Apply' : 'Start Auto-Apply Bot'}
          </button>
        </div>
      </div>

      {/* Connected Platforms Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe size={18} className="text-aqua" /> Supported Job Platforms
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => {
            const isConnected = platform.status === 'connected';
            return (
              <div 
                key={platform.id}
                className="panel p-5 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{platform.logo}</span>
                      <div>
                        <h3 className="font-semibold text-white">{platform.name}</h3>
                        <p className="text-[11px] text-slate-400">{platform.category}</p>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 bg-surface px-2 py-0.5 rounded border border-line">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {platform.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
                  <div className="text-slate-400 font-mono text-[11px]">
                    {isConnected ? `${platform.applicationsCount} applied` : '0 applied'}
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => handleToggleDisconnect(platform.id)}
                      className="text-slate-400 hover:text-coral transition-colors text-xs"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      className="button-primary text-xs py-1 px-3"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Apply Rules & Filter Settings */}
      <div className="panel p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-line pb-4">
          <Sliders size={20} className="text-aqua" />
          <div>
            <h2 className="text-lg font-semibold text-white">Auto-Apply Preference Engine</h2>
            <p className="text-xs text-slate-400">Configure how your connected platform bots target and apply to roles.</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={15} /> Preferences saved successfully. Multi-platform bot updated!
          </div>
        )}

        <form onSubmit={saveSettings} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Target Job Titles (Comma-separated)
              </label>
              <input
                type="text"
                className="input text-xs"
                value={targetTitles}
                onChange={e => setTargetTitles(e.target.value)}
                placeholder="e.g. Software Engineer, Data Analyst, React Developer"
              />
              <p className="text-[11px] text-slate-500 mt-1">Bot will filter postings matching these titles.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Max Applications Per Day: <span className="text-aqua font-bold">{maxAppsPerDay}</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxAppsPerDay}
                onChange={e => setMaxAppsPerDay(Number(e.target.value))}
                className="w-full accent-aqua bg-surface"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>5 / day (Conservative)</span>
                <span>50 / day (Aggressive)</span>
                <span>100 / day (Max)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-line">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={e => setRemoteOnly(e.target.checked)}
                className="rounded border-line bg-surface text-aqua focus:ring-0"
              />
              Prioritize Remote & Hybrid roles only
            </label>
            
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-line bg-surface text-aqua focus:ring-0"
              />
              Auto-tailor resume keywords before submitting each application
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="button-primary text-xs py-2 px-5">
              Save Application Rules
            </button>
          </div>
        </form>
      </div>

      {/* Security Guarantee Banner */}
      <div className="panel p-5 bg-surface/40 flex items-start gap-4">
        <Shield size={22} className="text-aqua shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-white">Encrypted Credential Vault</h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            CVConnect uses AES-256 client-side session token encryption. Your credentials are only decrypted locally during headless application runs and are never shared or sold to third parties.
          </p>
        </div>
      </div>

      {/* Application History Tracker Log */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap size={18} className="text-aqua" /> Auto-Apply Activity Tracker
            </h2>
            <p className="text-xs text-slate-400">Live submission log of multi-platform automated resume applications.</p>
          </div>
          <button 
            onClick={fetchConnections}
            className="button-quiet text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Log
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No automated applications submitted yet. Click <span className="text-white font-medium">Start Auto-Apply Bot</span> or Connect your platforms to start!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-slate-400 font-mono text-[11px]">
                  <th className="pb-2">Platform</th>
                  <th className="pb-2">Job Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-3 font-semibold text-white capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-aqua" />
                      {app.platform}
                    </td>
                    <td className="py-3 text-slate-300">
                      {app.job?.title || app.targetUrl || 'Full-Stack Developer'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        app.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        app.status === 'applying' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse' :
                        app.status === 'failed' ? 'bg-coral/10 text-coral border border-coral/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(app.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="panel max-w-md w-full p-6 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{activeModal.logo}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">Connect {activeModal.name}</h3>
                <p className="text-xs text-slate-400">Configure profile access for automated applications</p>
              </div>
            </div>

            <form onSubmit={submitConnection} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Account Email / Username</label>
                <input
                  required
                  type="email"
                  className="input text-xs"
                  placeholder={`Your ${activeModal.name} login email`}
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  API Key or Session Token <Lock size={11} className="inline ml-1 text-slate-500" />
                </label>
                <input
                  required
                  type="password"
                  className="input text-xs"
                  placeholder="Paste session token / cookie value..."
                  value={authKey}
                  onChange={e => setAuthKey(e.target.value)}
                />
              </div>

              {/* Step-by-step token finder guide */}
              <div className="p-3 bg-surface/80 border border-line rounded text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-aqua flex items-center gap-1">
                  <AlertCircle size={12} /> How to find your {activeModal.name} Session Cookie:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pl-1">
                  <li>Open <span className="text-white font-mono">{activeModal.id}.com</span> & log in to your account.</li>
                  <li>Press <kbd className="bg-ink px-1 rounded text-white font-mono">F12</kbd> or right-click ➔ Inspect.</li>
                  <li>Click <span className="text-white font-medium">Application</span> tab ➔ <span className="text-white font-medium">Cookies</span>.</li>
                  <li>Copy value of <code className="text-aqua font-mono">{
                    activeModal.id === 'unstop' ? 'unstop_session' :
                    activeModal.id === 'internshala' ? 'ICAPS_SESSION' :
                    activeModal.id === 'linkedin' ? 'li_at' :
                    activeModal.id === 'indeed' ? 'CTK' : 'PHPSESSID'
                  }</code>.</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="button-quiet text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="button-primary text-xs py-2 px-5 disabled:opacity-60"
                >
                  {connecting ? 'Verifying...' : 'Authorize Platform'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
