import { useState, useEffect, useRef } from 'react';
import {
  Globe, CheckCircle2, Sliders, Shield, Zap, X, Lock,
  AlertCircle, RefreshCw, Eye, EyeOff, ChevronRight,
  Clock, Wifi, WifiOff, ExternalLink, Copy, Check
} from 'lucide-react';
import { request } from '../api';

// ─── Platform definitions ───────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'unstop',
    name: 'Unstop',
    category: 'Campus & Early Career',
    logo: '🎯',
    color: 'from-violet-500 to-purple-600',
    accent: '#8b5cf6',
    description: 'Auto-register for hiring challenges, hackathons, and corporate early-career drives.',
    tokenType: 'JWT Bearer Token',
    cookieName: 'access_token',
    cookieDomain: 'unstop.com',
    siteUrl: 'https://unstop.com',
    steps: [
      { text: 'Go to', link: 'https://unstop.com', linkText: 'unstop.com' },
      { text: 'Log in to your account' },
      { text: 'Press', key: 'F12', text2: 'to open DevTools' },
      { text: 'Go to', tab: 'Application', text2: '→ Cookies → unstop.com' },
      { text: 'Find cookie named', code: 'access_token', text2: 'and copy its value' },
    ],
    note: 'The token is a long JWT (starts with eyJ...). Your token expiry is shown before saving.'
  },
  {
    id: 'internshala',
    name: 'Internshala',
    category: 'Internships & Fresher Roles',
    logo: '🚀',
    color: 'from-sky-400 to-blue-500',
    accent: '#0ea5e9',
    description: 'Automated application bot with custom cover letters tailored for student & fresher opportunities.',
    tokenType: 'Session Cookie',
    cookieName: 'PHPSESSID',
    cookieDomain: 'internshala.com',
    siteUrl: 'https://internshala.com',
    steps: [
      { text: 'Go to', link: 'https://internshala.com', linkText: 'internshala.com' },
      { text: 'Log in to your account' },
      { text: 'Press', key: 'F12', text2: 'to open DevTools' },
      { text: 'Go to', tab: 'Application', text2: '→ Cookies → internshala.com' },
      { text: 'Find cookie named', code: 'PHPSESSID', text2: 'and copy its full value' },
    ],
    note: 'The PHPSESSID is a 26–40 character alphanumeric string (letters + numbers only). Must be at least 26 chars.'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Global Tech & Enterprise',
    logo: '💼',
    color: 'from-blue-600 to-cyan-500',
    accent: '#2563eb',
    description: 'Auto-apply to Easy Apply roles with tailored resumes and customized screening questions.',
    tokenType: 'Session Cookie',
    cookieName: 'li_at',
    cookieDomain: 'linkedin.com',
    siteUrl: 'https://www.linkedin.com',
    steps: [
      { text: 'Go to', link: 'https://www.linkedin.com', linkText: 'linkedin.com' },
      { text: 'Log in to your account' },
      { text: 'Press', key: 'F12', text2: 'to open DevTools' },
      { text: 'Go to', tab: 'Application', text2: '→ Cookies → linkedin.com' },
      { text: 'Find cookie named', code: 'li_at', text2: 'and copy its value' },
    ],
    note: 'li_at is your LinkedIn session auth cookie. It is verified against LinkedIn\'s internal API.'
  },
  {
    id: 'wellfound',
    name: 'Wellfound (AngelList)',
    category: 'Startups & Tech',
    logo: '✌️',
    color: 'from-amber-500 to-orange-600',
    accent: '#f59e0b',
    description: 'Direct founder outreach and high-growth startup applications with custom notes.',
    tokenType: 'Session Cookie',
    cookieName: '_wellfound',
    cookieDomain: 'wellfound.com',
    siteUrl: 'https://wellfound.com',
    steps: [
      { text: 'Go to', link: 'https://wellfound.com', linkText: 'wellfound.com' },
      { text: 'Log in to your account' },
      { text: 'Press', key: 'F12', text2: 'to open DevTools' },
      { text: 'Go to', tab: 'Application', text2: '→ Cookies → wellfound.com' },
      { text: 'Find cookie named', code: '_wellfound', text2: 'and copy its value' },
    ],
    note: 'Wellfound uses DataDome bot protection. The session is validated structurally + via API probe.'
  },
  {
    id: 'indeed',
    name: 'Indeed',
    category: 'Global General Jobs',
    logo: '🌐',
    color: 'from-blue-500 to-indigo-600',
    accent: '#6366f1',
    description: 'Direct integration with Indeed Apply for rapid submission across thousands of postings.',
    tokenType: 'Session Cookie',
    cookieName: 'CTK',
    cookieDomain: 'indeed.com',
    siteUrl: 'https://www.indeed.com',
    steps: [
      { text: 'Go to', link: 'https://www.indeed.com', linkText: 'indeed.com' },
      { text: 'Log in to your account' },
      { text: 'Press', key: 'F12', text2: 'to open DevTools' },
      { text: 'Go to', tab: 'Application', text2: '→ Cookies → indeed.com' },
      { text: 'Find cookie named', code: 'CTK', text2: 'and copy its value' },
    ],
    note: 'The CTK cookie is an alphanumeric session identifier used for Indeed Apply authentication.'
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    category: 'Company Ratings & Jobs',
    logo: '🟢',
    color: 'from-emerald-500 to-teal-600',
    accent: '#10b981',
    description: 'Sync application queue and ratings filter for high-trust company applications.',
    tokenType: 'Session Cookie',
    cookieName: 'JSESSIONID',
    cookieDomain: 'glassdoor.com',
    siteUrl: 'https://www.glassdoor.com',
    steps: [
      { text: 'Go to', link: 'https://www.glassdoor.com', linkText: 'glassdoor.com' },
      { text: 'Log in to your account' },
      { text: 'Press', key: 'F12', text2: 'to open DevTools' },
      { text: 'Go to', tab: 'Application', text2: '→ Cookies → glassdoor.com' },
      { text: 'Find cookie named', code: 'JSESSIONID', text2: 'and copy its value' },
    ],
    note: 'Your JSESSIONID is a server-side session identifier used for authenticated Glassdoor requests.'
  }
];

const INITIAL_PLATFORMS = PLATFORMS.map(p => ({ ...p, status: 'disconnected', lastSync: 'Never', applicationsCount: 0 }));

// ─── Helpers ────────────────────────────────────────────────────────────────

function decodeJwtExpiry(token) {
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return null;
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

function isJwtFormat(token) {
  return token.trim().split('.').length === 3;
}

function formatExpiry(date) {
  if (!date) return null;
  const now = new Date();
  const diff = date - now;
  if (diff < 0) return { label: 'Expired', color: 'text-coral', isExpired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { label: `Expires in ${days}d ${hours}h`, color: 'text-emerald-400', isExpired: false };
  if (hours > 0) return { label: `Expires in ${hours}h`, color: 'text-yellow-400', isExpired: false };
  return { label: 'Expires soon', color: 'text-yellow-400', isExpired: false };
}

// ─── Verification status badge ───────────────────────────────────────────────

function VerifyBadge({ state, method, username, expiresAt }) {
  if (state === 'idle') return null;
  if (state === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs text-sky-400 mt-2 p-2.5 bg-sky-500/10 border border-sky-500/20 rounded">
        <RefreshCw size={12} className="animate-spin shrink-0" />
        <span>Verifying token with platform server…</span>
      </div>
    );
  }
  if (state === 'success') {
    const exp = expiresAt ? formatExpiry(new Date(expiresAt)) : null;
    return (
      <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded space-y-1">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>Token verified {method === 'live_api' ? 'via live API' : 'structurally'}</span>
        </div>
        {username && <p className="text-[11px] text-slate-300 pl-5">Authenticated as: <strong className="text-white">{username}</strong></p>}
        {exp && <p className={`text-[11px] pl-5 ${exp.color}`}>{exp.label}</p>}
        {exp?.isExpired && <p className="text-[11px] pl-5 text-coral font-medium">⚠ This token is expired — please re-copy a fresh token.</p>}
      </div>
    );
  }
  if (state === 'error') return null; // error shown in the main apiError block
  return null;
}

// ─── Connect Modal ───────────────────────────────────────────────────────────

function ConnectModal({ platform, onClose, onSuccess }) {
  const [authEmail, setAuthEmail] = useState(platform.accountEmail || '');
  const [tokenValue, setTokenValue] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [verifyState, setVerifyState] = useState('idle'); // idle | checking | success | error
  const [verifyData, setVerifyData] = useState(null);
  const [apiError, setApiError] = useState('');
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef(null);

  // ── Live debounced verification as user types ──────────────────────────────
  useEffect(() => {
    if (!tokenValue || tokenValue.length < 8) {
      setVerifyState('idle');
      setVerifyData(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setVerifyState('checking');
      setApiError('');
      try {
        const result = await request({
          method: 'post',
          url: '/platforms/verify',
          data: { platform: platform.id, token: tokenValue }
        });
        setVerifyData(result);
        setVerifyState('success');
      } catch (err) {
        setVerifyState('error');
        setApiError(err.response?.data?.error?.message || 'Token verification failed.');
        setVerifyData(null);
      }
    }, 700);

    return () => clearTimeout(debounceRef.current);
  }, [tokenValue, platform.id]);

  // ── JWT expiry preview (client-side, instant) ──────────────────────────────
  const jwtExpiry = platform.id === 'unstop' && isJwtFormat(tokenValue)
    ? decodeJwtExpiry(tokenValue)
    : null;
  const expiryInfo = jwtExpiry ? formatExpiry(jwtExpiry) : null;

  const submitConnection = async (e) => {
    e.preventDefault();
    if (verifyState === 'error') return;

    setConnecting(true);
    setApiError('');
    try {
      await request({
        method: 'post',
        url: '/platforms/connect',
        data: { platform: platform.id, accountEmail: authEmail, token: tokenValue }
      });
      onSuccess();
      onClose();
    } catch (err) {
      setApiError(err.response?.data?.error?.message || 'Failed to connect platform. Please check your token and try again.');
    } finally {
      setConnecting(false);
    }
  };

  const copyName = () => {
    navigator.clipboard.writeText(platform.cookieName).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="panel max-w-lg w-full p-6 relative my-4">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">{platform.logo}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Connect {platform.name}</h3>
            <p className="text-xs text-slate-400">{platform.tokenType} authentication</p>
          </div>
        </div>

        {/* Step-by-step guide */}
        <div className="mb-5 p-4 bg-surface/60 border border-line rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-aqua uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={11} />
              How to get your {platform.name} token
            </p>
            <a
              href={platform.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Open site <ExternalLink size={10} />
            </a>
          </div>
          <ol className="space-y-1.5">
            {platform.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                <span className="shrink-0 w-4 h-4 rounded-full bg-aqua/10 border border-aqua/30 text-aqua text-[9px] flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                <span>
                  {step.text}{' '}
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-aqua underline hover:no-underline">
                      {step.linkText}
                    </a>
                  )}
                  {step.key && <kbd className="mx-1 bg-ink px-1.5 py-0.5 rounded text-white font-mono text-[10px]">{step.key}</kbd>}
                  {step.tab && <span className="mx-1 text-white font-medium">{step.tab}</span>}
                  {step.text2 && <span>{step.text2}</span>}
                  {step.code && (
                    <button
                      onClick={copyName}
                      className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-ink border border-aqua/30 rounded font-mono text-[10px] text-aqua hover:border-aqua/60 transition-colors"
                    >
                      {step.code}
                      {copied ? <Check size={8} className="text-emerald-400" /> : <Copy size={8} />}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {platform.note && (
            <p className="mt-3 text-[10px] text-slate-500 border-t border-line/60 pt-2.5 leading-relaxed">
              ℹ {platform.note}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={submitConnection} className="space-y-4">
          {/* Error */}
          {apiError && (
            <div className="p-3 bg-coral/10 border border-coral/30 rounded text-xs text-coral flex items-start gap-2">
              <WifiOff size={13} className="shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">
              Your {platform.name} account email
            </label>
            <input
              required
              type="email"
              className="input text-xs"
              placeholder={`e.g. you@email.com`}
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
            />
          </div>

          {/* Token */}
          <div>
            <label className="block text-xs text-slate-300 mb-1.5 flex items-center gap-1.5">
              <code className="text-aqua text-[11px] font-mono bg-aqua/10 px-1.5 py-0.5 rounded">{platform.cookieName}</code>
              cookie value
              <Lock size={10} className="text-slate-500 ml-0.5" />
            </label>
            <div className="relative">
              <input
                required
                type={showToken ? 'text' : 'password'}
                className="input text-xs pr-10 font-mono"
                placeholder={`Paste your ${platform.cookieName} value here…`}
                value={tokenValue}
                onChange={e => { setTokenValue(e.target.value); setApiError(''); }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* JWT instant expiry preview for Unstop */}
            {expiryInfo && (
              <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${expiryInfo.color}`}>
                <Clock size={10} />
                <span>Token {expiryInfo.isExpired ? 'expired' : 'valid'} · {expiryInfo.label}</span>
              </div>
            )}

            {/* Live verification badge */}
            <VerifyBadge
              state={verifyState}
              method={verifyData?.method}
              username={verifyData?.username}
              expiresAt={verifyData?.expiresAt}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="button-quiet text-xs py-2 px-4">
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting || verifyState === 'checking' || verifyState === 'error' || !tokenValue}
              className="button-primary text-xs py-2 px-5 disabled:opacity-50 flex items-center gap-1.5"
            >
              {connecting ? (
                <><RefreshCw size={12} className="animate-spin" /> Saving…</>
              ) : verifyState === 'checking' ? (
                <><RefreshCw size={12} className="animate-spin" /> Verifying…</>
              ) : verifyState === 'success' ? (
                <><Wifi size={12} className="text-emerald-400" /> Authorize & Save</>
              ) : (
                <>Authorize Platform <ChevronRight size={12} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ConnectPlatforms() {
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [autoApplyActive, setAutoApplyActive] = useState(true);
  const [maxAppsPerDay, setMaxAppsPerDay] = useState(25);
  const [targetTitles, setTargetTitles] = useState('Full Stack Developer, Data Analyst, Software Engineer');
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null);

  const fetchConnections = async () => {
    setLoading(true);
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
            lastSync: found.lastSyncAt ? new Date(found.lastSyncAt).toLocaleDateString('en-IN') : 'Never'
          };
        }
        return { ...p, status: 'disconnected', accountEmail: undefined };
      }));
    } catch (err) {
      console.error('Failed to fetch platform connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConnections(); }, []);

  const handleDisconnect = async (platformId) => {
    setDisconnecting(platformId);
    try {
      await request({ method: 'delete', url: `/platforms/${platformId}` });
      await fetchConnections();
    } catch (err) {
      console.error(`Failed to disconnect ${platformId}:`, err);
    } finally {
      setDisconnecting(null);
    }
  };

  const saveSettings = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const connectedCount = platforms.filter(p => p.status === 'connected').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Integrations & Auto-Apply</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Connect Job Platforms</h1>
          <p className="mt-1 text-sm text-slate-400">
            Link your job board profiles to enable automated multi-platform resume applications.
            Tokens are verified live before saving.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {connectedCount > 0 && (
            <span className="text-[11px] text-slate-400 font-mono bg-surface px-2.5 py-1 rounded border border-line">
              {connectedCount}/{platforms.length} connected
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            autoApplyActive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${autoApplyActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
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

      {/* Platform Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe size={18} className="text-aqua" /> Supported Job Platforms
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="panel p-5 h-44 animate-pulse bg-surface/50" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => {
              const isConnected = platform.status === 'connected';
              const isDisconnecting = disconnecting === platform.id;
              return (
                <div
                  key={platform.id}
                  className="panel p-5 flex flex-col justify-between hover:border-slate-600 transition-all relative overflow-hidden group"
                >
                  {/* Top stripe accent */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${platform.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{platform.logo}</span>
                        <div>
                          <h3 className="font-semibold text-white text-sm leading-tight">{platform.name}</h3>
                          <p className="text-[10px] text-slate-500">{platform.category}</p>
                        </div>
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          <CheckCircle2 size={10} /> Connected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-surface px-2 py-0.5 rounded border border-line shrink-0">
                          Not Connected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{platform.description}</p>

                    {/* Connected info */}
                    {isConnected && platform.accountEmail && (
                      <div className="mb-3 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded text-[10px] text-slate-400 truncate">
                        <span className="text-emerald-400">●</span> {platform.accountEmail}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
                    <div className="text-slate-500 font-mono text-[10px]">
                      {isConnected
                        ? `${platform.applicationsCount} applied · sync ${platform.lastSync}`
                        : `Cookie: ${platform.cookieName}`}
                    </div>
                    {isConnected ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveModal(platform)}
                          className="text-slate-400 hover:text-aqua transition-colors text-[11px]"
                        >
                          Re-auth
                        </button>
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={isDisconnecting}
                          className="text-slate-400 hover:text-coral transition-colors text-[11px] disabled:opacity-50"
                        >
                          {isDisconnecting ? 'Removing…' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveModal(platform)}
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
        )}
      </div>

      {/* Auto-Apply Rules */}
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
            <CheckCircle2 size={15} /> Preferences saved. Multi-platform bot updated!
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
                type="range" min="5" max="100" step="5"
                value={maxAppsPerDay}
                onChange={e => setMaxAppsPerDay(Number(e.target.value))}
                className="w-full accent-aqua bg-surface"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>5 / day</span><span>50 / day</span><span>100 / day</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-line">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)}
                className="rounded border-line bg-surface text-aqua focus:ring-0" />
              Prioritize Remote & Hybrid roles only
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input type="checkbox" defaultChecked className="rounded border-line bg-surface text-aqua focus:ring-0" />
              Auto-tailor resume keywords before each application
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="button-primary text-xs py-2 px-5">
              Save Application Rules
            </button>
          </div>
        </form>
      </div>

      {/* Security Banner */}
      <div className="panel p-5 bg-surface/40 flex items-start gap-4">
        <Shield size={22} className="text-aqua shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-white">Encrypted Credential Vault + Live Verification</h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Every token is verified live against the platform's API before being saved. Tokens are then encrypted
            using AES-256-GCM and never stored in plaintext. Credentials are only decrypted locally during headless
            application runs and are never shared with third parties.
          </p>
        </div>
      </div>

      {/* Application Activity Log */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap size={18} className="text-aqua" /> Auto-Apply Activity Tracker
            </h2>
            <p className="text-xs text-slate-400">Live submission log of multi-platform automated resume applications.</p>
          </div>
          <button onClick={fetchConnections} className="button-quiet text-xs py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Log
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No automated applications submitted yet.
            {connectedCount > 0
              ? ' Click Start Auto-Apply Bot to begin.'
              : ' Connect a platform first to start applying.'}
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
                      {app.job?.title || app.targetUrl || 'Auto-Applied Role'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        app.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        app.status === 'applying'  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse' :
                        app.status === 'failed'    ? 'bg-coral/10 text-coral border border-coral/20' :
                                                     'bg-slate-800 text-slate-400'
                      }`}>
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(app.createdAt).toLocaleString('en-IN')}
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
        <ConnectModal
          platform={activeModal}
          onClose={() => setActiveModal(null)}
          onSuccess={fetchConnections}
        />
      )}
    </div>
  );
}
