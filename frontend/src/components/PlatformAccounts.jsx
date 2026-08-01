import { useState, useEffect, useCallback } from 'react';
import { io as ioClient } from 'socket.io-client';
import { request } from '../api';
import {
  Monitor, Wifi, WifiOff, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Shield, Key, Globe, CheckCircle, XCircle, AlertCircle, Clock,
  ExternalLink, Zap, Lock, Smartphone, Info
} from 'lucide-react';

// ─── Platform metadata ────────────────────────────────────────────────────────

const PLATFORM_META = {
  linkedin:    { name: 'LinkedIn',    icon: '🔗', color: '#0A66C2', bg: 'rgba(10,102,194,0.12)',  tokenName: 'li_at cookie',    tokenHowTo: 'Open LinkedIn → DevTools → Application → Cookies → li_at' },
  wellfound:   { name: 'Wellfound',  icon: '🚀', color: '#00B894', bg: 'rgba(0,184,148,0.12)',   tokenName: '_wellfound cookie', tokenHowTo: 'Open Wellfound → DevTools → Cookies → _wellfound' },
  unstop:      { name: 'Unstop',     icon: '⚡', color: '#F7C948', bg: 'rgba(247,201,72,0.12)',  tokenName: 'JWT Token',        tokenHowTo: 'Profile → Settings → API Token (JWT)' },
  internshala: { name: 'Internshala',icon: '🎓', color: '#00B5AD', bg: 'rgba(0,181,173,0.12)',   tokenName: 'PHPSESSID cookie', tokenHowTo: 'Open Internshala → DevTools → Cookies → PHPSESSID' },
  indeed:      { name: 'Indeed',     icon: '🏢', color: '#2164F3', bg: 'rgba(33,100,243,0.12)',  tokenName: 'CTK cookie',       tokenHowTo: 'Open Indeed → DevTools → Cookies → CTK' },
  glassdoor:   { name: 'Glassdoor',  icon: '🔮', color: '#0CAA41', bg: 'rgba(12,170,65,0.12)',   tokenName: 'JSESSIONID',       tokenHowTo: 'Open Glassdoor → DevTools → Cookies → JSESSIONID' },
  naukri:      { name: 'Naukri',     icon: '📋', color: '#FF7555', bg: 'rgba(255,117,85,0.12)',  tokenName: 'nauk_at cookie',   tokenHowTo: 'Open Naukri → DevTools → Cookies → nauk_at' },
};

const SESSION_PLATFORMS = ['linkedin', 'wellfound', 'unstop', 'internshala', 'indeed', 'glassdoor', 'naukri'];

// ─── Status helpers ───────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const map = {
    connected:  'bg-emerald-400 shadow-emerald-400/50 shadow-sm',
    connecting: 'bg-amber-400 animate-pulse',
    waiting:    'bg-amber-400 animate-pulse',
    expired:    'bg-orange-400',
    failed:     'bg-coral',
    pending:    'bg-slate-500',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[status] || 'bg-slate-500'}`} />;
}

function StatusBadge({ status, label }) {
  const map = {
    connected:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    connecting: 'bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse',
    waiting:    'bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse',
    expired:    'bg-orange-500/15 text-orange-400 border border-orange-500/25',
    failed:     'bg-coral/15 text-coral border border-coral/25',
    pending:    'bg-slate-700 text-slate-400 border border-slate-600',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[status] || map.pending}`}>
      <StatusDot status={status} />
      {label || status}
    </span>
  );
}

// ─── Token Connect Panel (existing method) ────────────────────────────────────

function TokenConnectPanel({ platform, tokenConnection, onConnected, onDisconnect }) {
  const meta = PLATFORM_META[platform];
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState('');

  const verifyToken = async () => {
    if (!token.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await request({ method: 'post', url: '/platforms/verify', data: { platform, token: token.trim() } });
      setVerifyResult({ ok: true, ...res });
    } catch (err) {
      setVerifyResult({ ok: false, message: err.response?.data?.error?.message || 'Invalid token' });
    } finally { setVerifying(false); }
  };

  const connect = async () => {
    if (!email.trim() || !token.trim()) { setError('Fill in both fields.'); return; }
    setBusy(true); setError('');
    try {
      await request({ method: 'post', url: '/platforms/connect', data: { platform, accountEmail: email.trim(), token: token.trim() } });
      onConnected?.();
      setExpanded(false);
      setToken('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Connection failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-line bg-surface/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <Key size={14} className="text-slate-400" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-mist">Token / Cookie Method</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Manual session extraction · Advanced</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tokenConnection
            ? <StatusBadge status={tokenConnection.status} label={tokenConnection.status === 'connected' ? 'Active' : tokenConnection.status} />
            : <span className="text-[10px] text-slate-500">Not connected</span>
          }
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4 space-y-4">
          {/* How to get the token */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-blue-300 font-medium">How to get your {meta?.tokenName}</p>
              <p className="text-[11px] text-slate-400 mt-1">{meta?.tokenHowTo}</p>
            </div>
          </div>

          {/* Existing connection info */}
          {tokenConnection?.status === 'connected' && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-emerald-300 font-medium">Connected as {tokenConnection.accountEmail}</p>
                {tokenConnection.tokenExpiresAt && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Expires: {new Date(tokenConnection.tokenExpiresAt).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
              <button onClick={() => onDisconnect?.('token')} className="text-[11px] text-coral hover:underline flex items-center gap-1">
                <Trash2 size={11} /> Disconnect
              </button>
            </div>
          )}

          {/* Input fields */}
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Account email</label>
              <input
                className="input text-xs w-full"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">{meta?.tokenName}</label>
              <div className="flex gap-2">
                <input
                  className="input text-xs flex-1 font-mono"
                  type="password"
                  placeholder="Paste token / cookie value here"
                  value={token}
                  onChange={e => { setToken(e.target.value); setVerifyResult(null); }}
                />
                <button
                  onClick={verifyToken}
                  disabled={!token.trim() || verifying}
                  className="button-quiet text-[11px] px-3 shrink-0"
                >
                  {verifying ? '…' : 'Verify'}
                </button>
              </div>
            </div>

            {verifyResult && (
              <div className={`rounded-lg p-2.5 text-[11px] flex items-center gap-1.5 ${verifyResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-coral/10 text-coral border border-coral/20'}`}>
                {verifyResult.ok
                  ? <><CheckCircle size={12} /> Valid token{verifyResult.username ? ` — ${verifyResult.username}` : ''}</>
                  : <><XCircle size={12} /> {verifyResult.message}</>
                }
              </div>
            )}

            {error && <p className="text-[11px] text-coral">{error}</p>}

            <button
              onClick={connect}
              disabled={busy || !token.trim() || !email.trim()}
              className="button-primary w-full text-xs py-2 disabled:opacity-50"
            >
              {busy ? 'Connecting…' : `Connect ${meta?.name || platform}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Browser Session Panel (new method) ───────────────────────────────────────

function BrowserSessionPanel({ platform, browserSession, statusMessage, isConnecting, onLaunch, onValidate, onDisconnect }) {
  const meta = PLATFORM_META[platform];
  const status = isConnecting ? 'connecting' : (browserSession?.status || 'pending');

  return (
    <div className="rounded-xl border border-aqua/20 bg-aqua/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-aqua/15">
            <Monitor size={14} className="text-aqua" />
          </div>
          <div>
            <p className="text-xs font-semibold text-aqua">Browser Session <span className="ml-1 text-[10px] bg-aqua/20 text-aqua px-1.5 py-0.5 rounded-full">Recommended</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Log in once manually · No passwords stored</p>
          </div>
        </div>
        <StatusBadge
          status={status}
          label={status === 'connected' ? 'Connected' : status === 'connecting' || status === 'waiting' ? 'Waiting…' : status === 'expired' ? 'Expired' : status === 'failed' ? 'Failed' : 'Not connected'}
        />
      </div>

      {/* Status message area */}
      {(isConnecting || statusMessage) && (
        <div className="mx-4 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5 h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-[11px] text-amber-300">{statusMessage || `Waiting for you to log in to ${meta?.name} in the browser window…`}</p>
        </div>
      )}

      {/* Connected info */}
      {status === 'connected' && browserSession?.accountEmail && (
        <div className="mx-4 mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center gap-2">
          <CheckCircle size={13} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-[11px] text-emerald-300 font-medium">{browserSession.accountEmail}</p>
            <p className="text-[10px] text-slate-500">
              Connected {browserSession.connectedAt ? new Date(browserSession.connectedAt).toLocaleDateString('en-IN') : ''}
              {browserSession.lastUsedAt && ` · Last used ${new Date(browserSession.lastUsedAt).toLocaleDateString('en-IN')}`}
            </p>
          </div>
        </div>
      )}

      {/* Expired notice */}
      {status === 'expired' && (
        <div className="mx-4 mb-3 rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5 flex items-center gap-2">
          <AlertCircle size={13} className="text-orange-400 shrink-0" />
          <p className="text-[11px] text-orange-300">Session expired. Platform has logged you out. Please reconnect.</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {status !== 'connected' && (
          <button
            onClick={onLaunch}
            disabled={isConnecting}
            className="button-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isConnecting ? (
              <><div className="h-3.5 w-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin" /> Waiting for login…</>
            ) : (
              <><Globe size={13} /> {status === 'expired' ? 'Reconnect' : 'Connect'} (Open Browser)</>
            )}
          </button>
        )}

        {status === 'connected' && (
          <>
            <button
              onClick={onLaunch}
              disabled={isConnecting}
              className="button-quiet text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> Reconnect
            </button>
            <button
              onClick={onValidate}
              disabled={isConnecting}
              className="button-quiet text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <CheckCircle size={12} /> Re-verify
            </button>
            <button
              onClick={() => onDisconnect?.('session')}
              className="button-quiet text-xs py-2 px-3 flex items-center gap-1.5 text-coral hover:bg-coral/10"
            >
              <Trash2 size={12} /> Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────

function PlatformCard({ platform, browserSession, tokenConnection, onRefresh }) {
  const meta = PLATFORM_META[platform] || { name: platform, icon: '🌐', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Real-time session status via WebSocket
  useEffect(() => {
    const token = localStorage.getItem('cvconnect_token');
    if (!token) return;

    const socket = ioClient(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
    });

    socket.on('connect', () => {
      const userId = JSON.parse(atob(token.split('.')[1]))?.sub;
      if (userId) socket.emit('subscribe', userId);
    });

    socket.on('session:status', ({ platform: p, status, message }) => {
      if (p !== platform) return;
      setStatusMsg(message || '');
      if (['connected', 'failed', 'expired'].includes(status)) {
        setIsConnecting(false);
        onRefresh?.();
      }
    });

    return () => socket.disconnect();
  }, [platform]);

  const handleLaunch = async () => {
    setIsConnecting(true);
    setStatusMsg(`Opening ${meta.name} login window on your computer…`);
    try {
      await request({ method: 'post', url: `/sessions/${platform}/launch` });
      setStatusMsg(`${meta.name} browser opened! Complete your login in the window (waits 10 mins).`);
    } catch (err) {
      setIsConnecting(false);
      setStatusMsg(`Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleValidate = async () => {
    setIsConnecting(true);
    setStatusMsg('Checking session validity in headless mode…');
    try {
      const result = await request({ method: 'post', url: `/sessions/${platform}/validate` });
      setStatusMsg(result.valid ? 'Session confirmed valid!' : 'Session has expired. Please reconnect.');
    } catch {
      setStatusMsg('Validation failed. Check backend.');
    } finally {
      setIsConnecting(false);
      onRefresh?.();
    }
  };

  const handleDisconnect = async (method) => {
    try {
      if (method === 'session') {
        await request({ method: 'delete', url: `/sessions/${platform}` });
      } else {
        await request({ method: 'delete', url: `/platforms/${platform}` });
      }
      onRefresh?.();
    } catch (err) {
      console.error('Disconnect failed:', err.message);
    }
  };

  const sessionStatus = browserSession?.status || 'pending';
  const tokenStatus = tokenConnection?.status;
  const bestStatus = sessionStatus === 'connected' ? 'connected' : tokenStatus === 'connected' ? 'connected' : sessionStatus === 'expired' ? 'expired' : 'pending';

  return (
    <div className="rounded-2xl border border-line bg-ink overflow-hidden">
      {/* Platform header */}
      <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: meta.bg }}>
            {meta.icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">{meta.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusDot status={isConnecting ? 'connecting' : bestStatus} />
              <span className="text-[11px] text-slate-400">
                {isConnecting ? 'Connecting…' : bestStatus === 'connected' ? 'Account connected' : bestStatus === 'expired' ? 'Re-auth required' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowHowItWorks(v => !v)}
          className="text-[11px] text-slate-400 hover:text-aqua flex items-center gap-1 transition-colors"
        >
          <Info size={12} />
          {showHowItWorks ? 'Less' : 'How it works'}
        </button>
      </div>

      {/* How it works explainer */}
      {showHowItWorks && (
        <div className="px-5 py-4 bg-white/3 border-b border-line space-y-3">
          <p className="text-[11px] text-slate-300 font-medium">Two ways to connect {meta.name}:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-aqua/8 border border-aqua/20 p-3">
              <p className="text-[11px] text-aqua font-semibold flex items-center gap-1.5 mb-1.5"><Monitor size={11} /> Browser Session (Recommended)</p>
              <p className="text-[11px] text-slate-400 leading-5">CVConnect opens a real browser window. You log in normally. The login state is saved automatically — no passwords ever stored. Works with 2FA, OTPs, everything.</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-line p-3">
              <p className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5 mb-1.5"><Key size={11} /> Token / Cookie (Advanced)</p>
              <p className="text-[11px] text-slate-400 leading-5">Copy a session cookie or API token from your browser's DevTools and paste it here. Faster to set up but expires sooner and requires manual refresh.</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection methods */}
      <div className="p-5 space-y-3">
        <BrowserSessionPanel
          platform={platform}
          browserSession={browserSession}
          statusMessage={statusMsg}
          isConnecting={isConnecting}
          onLaunch={handleLaunch}
          onValidate={handleValidate}
          onDisconnect={handleDisconnect}
        />

        <TokenConnectPanel
          platform={platform}
          tokenConnection={tokenConnection}
          onConnected={onRefresh}
          onDisconnect={handleDisconnect}
        />
      </div>
    </div>
  );
}

function CandidateProfileCard() {
  const [profile, setProfile] = useState({
    name: '', phone: '', gender: 'Male', location: '', college: '', degree: ''
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    request({ method: 'get', url: '/profile' }).then(res => {
      if (res.profile) setProfile(prev => ({ ...prev, ...res.profile }));
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError('');
    try {
      const res = await request({ method: 'patch', url: '/profile', data: profile });
      if (res.profile) setProfile(prev => ({ ...prev, ...res.profile }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally { setBusy(false); }
  };

  return (
    <div className="mb-6 rounded-xl border border-aqua/30 bg-surface/90 p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Smartphone size={16} className="text-aqua" /> Candidate Application Details
          </h3>
          <p className="text-xs text-slate-400">Provide your real details so the AI Form Filler applies with 100% accuracy on Unstop, LinkedIn, etc.</p>
        </div>
        {saved && <span className="text-xs text-emerald-400 font-medium flex items-center gap-1"><CheckCircle size={13}/> Profile Saved!</span>}
      </div>

      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Full Name *
          <input required type="text" className="input mt-1.5 text-xs py-2" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="Shubham Dubey" />
        </label>
        <label className="text-xs text-slate-400">
          Mobile Phone Number *
          <input required type="tel" className="input mt-1.5 text-xs py-2" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="10-digit mobile number" />
        </label>
        <label className="text-xs text-slate-400">
          Gender *
          <select className="input mt-1.5 text-xs py-2" value={profile.gender || 'Male'} onChange={e => setProfile({...profile, gender: e.target.value})}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Target Location / City *
          <input required type="text" className="input mt-1.5 text-xs py-2" value={profile.location || ''} onChange={e => setProfile({...profile, location: e.target.value})} placeholder="Mumbai, Maharashtra, India" />
        </label>
        <label className="text-xs text-slate-400 sm:col-span-2">
          College / Institution
          <input type="text" className="input mt-1.5 text-xs py-2" value={profile.college || ''} onChange={e => setProfile({...profile, college: e.target.value})} placeholder="e.g. Mumbai University / IIT Bombay" />
        </label>
        {error && <p className="text-xs text-coral sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" disabled={busy} className="button-primary text-xs py-2 px-5">
            {busy ? 'Saving Profile...' : 'Save Candidate Application Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main PlatformAccounts page ───────────────────────────────────────────────

export default function PlatformAccounts() {
  const [sessions, setSessions] = useState([]);
  const [tokenConnections, setTokenConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [sessRes, tokenRes] = await Promise.all([
        request({ method: 'get', url: '/sessions' }),
        request({ method: 'get', url: '/platforms' }),
      ]);
      setSessions(sessRes.sessions || []);
      setTokenConnections(tokenRes.connections || []);
    } catch (e) {
      console.error('PlatformAccounts load failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getBrowserSession = (platform) => sessions.find(s => s.platform === platform);
  const getTokenConnection = (platform) => tokenConnections.find(c => c.platform === platform);

  const connectedCount = SESSION_PLATFORMS.filter(p => {
    const bs = getBrowserSession(p);
    const tc = getTokenConnection(p);
    return bs?.status === 'connected' || tc?.status === 'connected';
  }).length;

  const disconnectedOrExpired = SESSION_PLATFORMS.filter(p => {
    const bs = getBrowserSession(p);
    const tc = getTokenConnection(p);
    const bsConnected = bs?.status === 'connected';
    const tcConnected = tc?.status === 'connected';
    return !bsConnected && !tcConnected;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Platform Accounts</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Connect your job platforms.
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Connect once, apply everywhere. CVConnect launches a real browser session so you never have to share your password.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-semibold text-aqua">{connectedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">of {SESSION_PLATFORMS.length} connected</p>
        </div>
      </div>

      {/* Disconnected / Expired Platform Urgent Alert Banner */}
      {disconnectedOrExpired.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200 space-y-2 shadow-lg animate-pulse-slow">
          <div className="flex items-center gap-2 font-semibold text-amber-300 text-sm">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <span>Platform Connection Action Required</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            You are currently not logged into: <strong className="text-amber-200 font-semibold">{disconnectedOrExpired.map(p => PLATFORM_META[p]?.name || p).join(', ')}</strong>.
            If auto-apply fails or says session expired, click <span className="text-aqua font-semibold">"Launch Interactive Login"</span> on the platform card below to connect or reconnect your account.
          </p>
        </div>
      )}

      {/* Candidate Profile Form */}
      <CandidateProfileCard />

      {/* Security banner */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-aqua/10 to-purple-500/10 border border-aqua/20 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aqua/15 shrink-0">
          <Shield size={16} className="text-aqua" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Zero-credential security model</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-5">
            CVConnect never asks for, stores, or transmits your passwords. The Browser Session method saves only your authenticated browser state (cookies, localStorage) to your computer. Tokens are AES-256-GCM encrypted at rest.
          </p>
        </div>
      </div>

      {/* How the flow works */}
      <div className="mb-6 rounded-xl bg-surface border border-line p-4">
        <p className="text-[11px] font-semibold text-mist mb-3 flex items-center gap-1.5"><Zap size={11} className="text-aqua" /> How auto-apply works after connecting</p>
        <div className="flex items-start gap-0">
          {[
            { icon: Lock, label: 'Connect once', sub: 'Log in manually in the browser window that opens' },
            { icon: Globe, label: 'Paste job URL', sub: 'Copy the listing URL from any connected platform' },
            { icon: Zap, label: 'Click Apply', sub: 'CVConnect opens your saved session and submits automatically' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-0 flex-1">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-aqua/15">
                  <step.icon size={14} className="text-aqua" />
                </div>
                {i < 2 && <div className="w-px flex-1 min-h-4 bg-line" />}
              </div>
              <div className="ml-3 pb-4">
                <p className="text-xs font-medium text-white">{step.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-5">{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl border border-line bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {SESSION_PLATFORMS.map(platform => (
            <PlatformCard
              key={platform}
              platform={platform}
              browserSession={getBrowserSession(platform)}
              tokenConnection={getTokenConnection(platform)}
              onRefresh={fetchAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
