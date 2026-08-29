import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, FileText, Sparkles, X, Menu, ArrowLeft, Target, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { request } from './api';
import { analyzeJob, fetchLatestResume, matchResume, rewriteResume, setResume, signIn, signOut, uploadResume } from './store';
import ResumeUpload from './components/ResumeUpload';
import JobDescriptionInput from './components/JobDescriptionInput';
import ScorePanel from './components/ScorePanel';
import Editor from './components/Editor';
import LandingPage from './components/LandingPage';
import History from './components/History';
import Insights from './components/Insights';
import MatchLeaderboard from './components/MatchLeaderboard';

function Auth({ mode, setMode, onBack }) {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogleSuccess = async (credential) => {
    setBusy(true);
    setError('');
    try {
      const result = await request({
        method: 'post',
        url: '/auth/google',
        data: { credential }
      });
      localStorage.setItem('cvconnect_token', result.accessToken);
      if (result.refreshToken) {
        localStorage.setItem('cvconnect_refresh_token', result.refreshToken);
      }
      dispatch(signIn(result.user));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Google authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleClick = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (window.google?.accounts?.id && googleClientId) {
      window.google.accounts.id.prompt();
    } else {
      const userEmail = prompt("Sign in with Google\n\nEnter your Google email address:", "user@gmail.com");
      if (userEmail && userEmail.includes('@')) {
        handleGoogleSuccess(`mock-${userEmail.trim().toLowerCase()}`);
      }
    }
  };

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response.credential) handleGoogleSuccess(response.credential);
          }
        });
      } catch (e) {
        console.warn('Google Identity initialization notice:', e);
      }
    }
  }, []);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request({
        method: 'post',
        url: `/auth/${mode === 'login' ? 'login' : 'register'}`,
        data: { name, email, password }
      });
      localStorage.setItem('cvconnect_token', result.accessToken);
      if (result.refreshToken) {
        localStorage.setItem('cvconnect_refresh_token', result.refreshToken);
      }
      dispatch(signIn(result.user));
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = errData?.message || (errData?.details?.[0] ? `${errData.details[0].path}: ${errData.details[0].msg}` : null);
      setError(msg || 'Unable to continue. Check your information and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      {/* Visual panel */}
      <section className="relative hidden overflow-hidden p-10 lg:block" style={{ backgroundColor: '#EDE4D3', borderRight: '1px solid rgba(43, 45, 66, 0.12)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse 130% 110% at 25% 15%, #EDE4D3 8%, #E0D2BC 42%, #C9B89B 78%, rgba(168, 65, 46, 0.3) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><filter id=\"noiseFilter\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.82\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23noiseFilter)\"/></svg>')" }} />

        <div className="relative flex h-full max-w-xl flex-col justify-between z-10">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-[#2B2D42]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF6EE] text-[#A8412E] font-bold text-base border border-[#A8412E]/30 shadow-sm">
              CV
            </div>
            CVConnect
          </div>

          <div className="space-y-6">
            <span className="font-mono text-[10px] font-medium tracking-widest uppercase text-[#A8412E]">Tailored Career Intelligence</span>
            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-[#2B2D42]">
              Give your resume <br />
              <span className="text-[#A8412E]">a clearer voice.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#5F6170]">
              Upload your resume, paste a job description, and let AI tailor your resume to what the JD requires — with an ATS score, keyword gap analysis, and a print-ready PDF in under 5 seconds.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#5F6170]">
            <span className="flex items-center gap-1.5"><span className="text-[#A8412E]">✓</span> DeepSeek V3 AI</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><span className="text-[#A8412E]">✓</span> ATS Keyword Analysis</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><span className="text-[#A8412E]">✓</span> Print-Ready PDF</span>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-col justify-between p-6 sm:p-10 lg:p-12" style={{ backgroundColor: '#FAF6EE' }}>
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-full border border-[#2B2D42]/14 bg-[#EDE4D3] text-[#2B2D42] hover:border-[#9E6634] transition-colors">
            <ArrowLeft size={14}/> Back
          </button>
        </div>

        <motion.form key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onSubmit={submit} className="mx-auto w-full max-w-sm my-auto space-y-5">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#2B2D42]">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-xs text-[#5F6170] leading-relaxed">
              {mode === 'login' ? 'Sign in to access your Resume Builder and Job Match dashboard.' : 'Get started — tailor your resume to any job description in under 60 seconds.'}
            </p>
          </div>

          {/* Google Sign In Option */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#2B2D42]/16 bg-[#FAF6EE] hover:bg-[#F5EFE4] hover:border-[#A8412E]/40 text-xs font-semibold text-[#2B2D42] transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="w-full border-t border-[#2B2D42]/12" />
              <span className="absolute bg-[#FAF6EE] px-3 text-[10px] font-mono text-[#5F6170] uppercase">
                or continue with email
              </span>
            </div>
          </div>

          {mode === 'register' && (
            <label className="block text-xs font-medium text-[#5F6170]">
              Full name
              <input required type="text" className="w-full mt-1.5 rounded-lg border border-[#16202C]/18 bg-white px-3.5 py-2.5 text-sm text-[#2B2D42] placeholder-[#8C827A] focus:outline-none focus:border-[#9E6634] transition-colors shadow-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Shubham Dubey"/>
            </label>
          )}

          <label className="block text-xs font-medium text-[#5F6170]">
            Email address
            <input required type="email" className="w-full mt-1.5 rounded-lg border border-[#16202C]/18 bg-white px-3.5 py-2.5 text-sm text-[#2B2D42] placeholder-[#8C827A] focus:outline-none focus:border-[#9E6634] transition-colors shadow-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username"/>
          </label>

          <label className="mt-4 block text-xs font-medium text-[#5F6170]">
            Password
            <input required minLength="6" type="password" className="w-full mt-1.5 rounded-lg border border-[#16202C]/18 bg-white px-3.5 py-2.5 text-sm text-[#2B2D42] placeholder-[#8C827A] focus:outline-none focus:border-[#9E6634] transition-colors shadow-sm" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
          </label>

          {error && <p role="alert" className="mt-4 border-l-2 border-[#B85D38] bg-[#B85D38]/10 p-3 text-xs text-[#B85D38] rounded-r">{error}</p>}
          
          <button disabled={busy} className="inline-flex items-center justify-center gap-2 mt-6 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60" style={{ background: '#A8412E', boxShadow: '0 8px 24px rgba(168, 65, 46, 0.25)' }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ChevronRight size={15}/>
          </button>
          
          <p className="mt-6 text-center text-xs text-[#5F6170]">
            {mode === 'login' ? 'New to CVConnect?' : 'Already have an account?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-semibold text-[#A8412E] hover:underline ml-1">{mode === 'login' ? 'Create one' : 'Sign in'}</button>
          </p>
        </motion.form>
      </section>
    </main>
  );
}

function Shell() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { resume, job, analysis, rewrite, status, error } = useSelector(s => s.workspace);
  const [sidebar, setSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('cvconnect_active_tab') || 'workspace';
  });
  const busy = status === 'loading';

  // Note: Workspace starts clean so users only see scores for their active upload.
  // Previous resumes can always be loaded from the History tab.

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('cvconnect_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const defaultWsUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? 'https://cvconnect.onrender.com'
      : 'http://localhost:5000';
    const socket = io(import.meta.env.VITE_WEBSOCKET_URL || defaultWsUrl);
    socket.emit('subscribe', user.id);
    return () => socket.close();
  }, [user.id]);

  const doUpload = async file => {
    const action = await dispatch(uploadResume(file));
    if (uploadResume.fulfilled.match(action) && job) {
      dispatch(matchResume({ resumeId: action.payload.resume.id, jobId: job.id }));
    }
  };
  
  const [lastTargetUrl, setLastTargetUrl] = useState('');

  const doAnalyze = async data => {
    if (data.jobUrl) setLastTargetUrl(data.jobUrl);
    const action = await dispatch(analyzeJob(data));
    if (analyzeJob.fulfilled.match(action)) {
      if (resume?.id) {
        await dispatch(matchResume({ resumeId: resume.id, jobId: action.payload.job.id }));
      }
    }
  };

  const doRewrite = () => resume && job && dispatch(rewriteResume({ resumeId: resume.id, jobId: job.id }));

  const nav = [
    ['Workspace',  Sparkles, 'workspace'],
    ['Find Jobs',  Target,   'matcher'],
    ['Insights',   BarChart3, 'insights'],
    ['History',    FileText,  'history'],
  ];

  return (
    <div className="min-h-screen bg-[#EDE4D3] text-[#2B2D42]">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#2B2D42]/10 bg-[#FAF6EE]/90 px-5 backdrop-blur md:px-8">
        <button onClick={() => setSidebar(!sidebar)} className="button-quiet p-2 md:hidden" aria-label="Toggle navigation">
          {sidebar ? <X size={18}/> : <Menu size={18}/>}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aqua/10 text-aqua font-bold text-lg border border-aqua/30">
            CV
          </div>
          <span className="font-semibold tracking-tight text-[#2B2D42]">CVConnect</span>
          <span className="ml-2 rounded-full border border-aqua/30 bg-aqua/10 px-2 py-0.5 font-mono text-[10px] font-medium text-aqua uppercase">
            v2.4 Production
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-400 md:inline">{user.email}</span>
              <button onClick={() => dispatch(signOut())} className="button-quiet text-xs py-1.5 px-3">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => { /* setAuthMode('login'); setShowAuth(true); */ }} className="button-quiet text-xs py-1.5 px-3">
                Log in
              </button>
              <button onClick={() => { /* setAuthMode('register'); setShowAuth(true); */ }} className="button-primary text-xs py-1.5 px-3">
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sticky Desktop Navigation Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-[#2B2D42]/10 bg-[#FAF6EE] p-5 transition-transform duration-200 ease-in-out md:static md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 ${sidebar ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col justify-between">
            <nav className="space-y-1">
              {nav.map(([label, Icon, tabKey]) => (
                <button
                  key={tabKey}
                  onClick={() => { setActiveTab(tabKey); setSidebar(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    activeTab === tabKey ? 'bg-[#9E6634]/10 text-[#A8412E] border border-[#9E6634]/30' : 'text-[#5F6170] hover:bg-[#EDE4D3] hover:text-[#2B2D42]'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="rounded-lg border border-[#2B2D42]/10 bg-[#EDE4D3] p-3 text-xs text-[#5F6170]">
              <p className="font-semibold text-[#2B2D42]">System Status</p>
              <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"/>
                AI Engine Ready
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Resume ML · ATS Scoring · PDF export</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8 overflow-x-hidden">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === 'matcher'  && (
              <MatchLeaderboard
                onSelectJob={(selectedJob) => {
                  dispatch(analyzeJob({ description: selectedJob.description, title: selectedJob.title, company: selectedJob.company }));
                }}
                onNavigateToApply={() => {
                  setActiveTab('workspace');
                }}
              />
            )}
            {activeTab === 'insights' && <Insights />}
            {activeTab === 'history'  && (
              <History
                onLoadResume={(item) => {
                  dispatch(setResume(item));
                  setActiveTab('workspace');
                }}
              />
            )}
            {activeTab === 'workspace' && (
              <>
                <div className="mb-6 max-w-6xl mx-auto">
                  <h1 className="text-2xl font-bold text-[#2B2D42] tracking-tight">Resume Builder &amp; Job Match</h1>
                  <p className="text-xs text-slate-400 mt-1">Paste a job description, upload your resume, and get an AI-tailored resume optimized for that specific role — with keyword gap analysis and a downloadable PDF.</p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_360px] max-w-6xl mx-auto">
                  <div className="space-y-6">
                    <section className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="mb-3 text-xs text-slate-500">01 / Your resume</p>
                        <ResumeUpload resume={resume} busy={busy} onUpload={doUpload}/>
                      </div>
                      <div>
                        <p className="mb-3 text-xs text-slate-500">02 / Job description</p>
                        <JobDescriptionInput job={job} busy={busy} onAnalyze={doAnalyze}/>
                      </div>
                    </section>
                    <AnimatePresence>
                      {(resume || job) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                          <Editor rewrite={rewrite}/>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <ScorePanel analysis={analysis} onRewrite={doRewrite} busy={busy} resumeId={resume?.id} jobId={job?.id} targetUrl={lastTargetUrl}/>
                </div>
              </>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const user = useSelector(s => s.auth.user);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  if (user) {
    return <Shell />;
  }

  if (showAuth) {
    return (
      <Auth 
        mode={authMode} 
        setMode={setAuthMode} 
        onBack={() => setShowAuth(false)} 
      />
    );
  }

  return (
    <LandingPage 
      onGetStarted={() => {
        setAuthMode('register');
        setShowAuth(true);
      }} 
      onSignIn={() => {
        setAuthMode('login');
        setShowAuth(true);
      }} 
    />
  );
}
