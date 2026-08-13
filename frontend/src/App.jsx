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
      setError(err.response?.data?.error?.message || 'Unable to continue. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      {/* Visual panel */}
      <section className="relative hidden overflow-hidden bg-surface p-10 lg:block">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#3be0c5 1px, transparent 1px)', backgroundSize: '25px 25px' }}/>
        <div className="relative flex h-full max-w-xl flex-col justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aqua/10 text-aqua font-bold text-base border border-aqua/30">
              CV
            </div>
            CVConnect
          </div>

          <div className="space-y-6">
            <span className="eyebrow">Enterprise-grade application automation</span>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white font-sans">
              Tailor every resume. <br />
              <span className="text-aqua">Tailor every resume.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              Upload your resume, paste a job description, and let AI tailor your resume to what the JD requires — with an ATS score, keyword gap analysis, and a print-ready PDF in under 5 seconds.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span>✓ DeepSeek V3 AI</span>
            <span>•</span>
            <span>✓ ATS Keyword Analysis</span>
            <span>•</span>
            <span>✓ Print-Ready PDF</span>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-ink">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="button-quiet text-xs py-1.5 px-3 flex items-center gap-1.5">
            <ArrowLeft size={14}/> Back
          </button>
        </div>

        <motion.form key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onSubmit={submit} className="mx-auto w-full max-w-sm my-auto space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'login' ? 'Sign in to access your Resume Builder and Job Match dashboard.' : 'Get started — tailor your resume to any job description in under 60 seconds.'}
            </p>
          </div>

          {mode === 'register' && (
            <label className="block text-xs text-slate-400">
              Full name
              <input required type="text" className="input mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Shubham Dubey"/>
            </label>
          )}

          <label className="block text-xs text-slate-400">
            Email address
            <input required type="email" className="input mt-1.5" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username"/>
          </label>

          <label className="mt-4 block text-xs text-slate-400">
            Password
            <input required minLength="6" type="password" className="input mt-1.5" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
          </label>

          {error && <p role="alert" className="mt-4 border-l-2 border-coral bg-coral/10 p-3 text-xs text-coral">{error}</p>}
          
          <button disabled={busy} className="button-primary mt-6 w-full disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ChevronRight size={15}/>
          </button>
          
          <p className="mt-6 text-center text-xs text-slate-400">
            {mode === 'login' ? 'New to CVConnect?' : 'Already have an account?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-semibold text-aqua">{mode === 'login' ? 'Create one' : 'Sign in'}</button>
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

  useEffect(() => {
    dispatch(fetchLatestResume());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('cvconnect_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:5000');
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
      let currentResume = resume;
      if (!currentResume) {
        const latest = await dispatch(fetchLatestResume());
        currentResume = latest.payload;
      }
      if (currentResume?.id) {
        await dispatch(matchResume({ resumeId: currentResume.id, jobId: action.payload.job.id }));
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
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-ink/95 px-5 backdrop-blur md:px-8">
        <button onClick={() => setSidebar(!sidebar)} className="button-quiet p-2 md:hidden" aria-label="Toggle navigation">
          {sidebar ? <X size={18}/> : <Menu size={18}/>}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aqua/10 text-aqua font-bold text-lg border border-aqua/30">
            CV
          </div>
          <span className="font-semibold tracking-tight text-white">CVConnect</span>
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
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-line bg-surface/95 p-5 transition-transform duration-200 ease-in-out md:static md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 ${sidebar ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col justify-between">
            <nav className="space-y-1">
              {nav.map(([label, Icon, tabKey]) => (
                <button
                  key={tabKey}
                  onClick={() => { setActiveTab(tabKey); setSidebar(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    activeTab === tabKey ? 'bg-aqua/10 text-aqua border border-aqua/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="rounded-lg border border-line bg-black/20 p-3 text-xs text-slate-400">
              <p className="font-semibold text-white">System Status</p>
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
                  <h1 className="text-2xl font-bold text-white tracking-tight">Resume Builder &amp; Job Match</h1>
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
