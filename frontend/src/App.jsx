import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Bell, ChevronRight, FileText, LogOut, Menu, Sparkles, X, ArrowLeft, Globe, Sliders } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { request } from './api';
import { analyzeJob, matchResume, rewriteResume, setResume, signIn, signOut, uploadResume } from './store';
import ResumeUpload from './components/ResumeUpload';
import JobDescriptionInput from './components/JobDescriptionInput';
import ScorePanel from './components/ScorePanel';
import Editor from './components/Editor';
import LandingPage from './components/LandingPage';
import History from './components/History';
import Insights from './components/Insights';
import PlatformAccounts from './components/PlatformAccounts';
import AutoApplyControls from './components/AutoApplyControls';

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
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors w-fit">
            <ArrowLeft size={14} />
            Back to Home
          </button>
          <div>
            <p className="eyebrow">Apply with precision</p>
            <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white">Give your best evidence a clearer voice.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Bring a resume and a role. Leave with an honest, tailored draft you can stand behind.</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">Truth-first optimisation / v1.0</p>
        </div>
      </section>

      {/* Auth panel */}
      <section className="flex flex-col justify-center p-6 sm:p-10 relative">
        <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors lg:hidden">
          <ArrowLeft size={14} />
          Back
        </button>

        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-sm mx-auto">
          <div className="mb-10 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain rounded" />
            CVConnect
          </div>
          <p className="eyebrow">Your workspace</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Welcome back.' : 'Start with your best work.'}</h2>
          <p className="mt-2 text-sm text-slate-400">{mode === 'login' ? 'Sign in to continue optimising.' : 'Create a secure CVConnect account.'}</p>
          
          {mode === 'register' && (
            <label className="mt-7 block text-xs text-slate-400">
              Name
              <input required className="input mt-1.5" value={name} onChange={e => setName(e.target.value)} autoComplete="name"/>
            </label>
          )}
          <label className="mt-4 block text-xs text-slate-400">
            Email
            <input required type="email" className="input mt-1.5" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/>
          </label>
          <label className="mt-4 block text-xs text-slate-400">
            Password
            <input required minLength="10" type="password" className="input mt-1.5" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
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
  
  const doAnalyze = async data => {
    const action = await dispatch(analyzeJob(data));
    if (analyzeJob.fulfilled.match(action) && resume) {
      dispatch(matchResume({ resumeId: resume.id, jobId: action.payload.job.id }));
    }
  };

  const doRewrite = () => resume && job && dispatch(rewriteResume({ resumeId: resume.id, jobId: job.id }));

  const nav = [
    ['Workspace', Sparkles, 'workspace'],
    ['Platforms', Globe, 'platforms'],
    ['Auto Apply', Sliders, 'controls'],
    ['Insights', BarChart3, 'insights'],
    ['History', FileText, 'history'],
  ];

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-ink/95 px-5 backdrop-blur md:px-8">
        <button onClick={() => setSidebar(!sidebar)} className="button-quiet p-2 md:hidden" aria-label="Toggle navigation">
          {sidebar ? <X size={18}/> : <Menu size={18}/>}
        </button>
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain rounded" />
          CVConnect
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="hidden text-slate-400 hover:text-aqua sm:block">
            <Bell size={17}/>
          </button>
          <div className="hidden h-7 w-7 place-items-center rounded-full bg-line text-xs font-semibold sm:grid">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <button onClick={() => dispatch(signOut())} className="text-xs text-slate-400 hover:text-coral flex items-center gap-1">
            <LogOut size={16}/>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[200px_1fr]">
        <aside className={`${sidebar ? 'block' : 'hidden'} fixed inset-x-0 top-16 z-10 border-b border-line bg-ink p-4 md:sticky md:top-16 md:block md:h-[calc(100vh-4rem)] md:overflow-y-auto md:border-b-0 md:border-r flex flex-col justify-between`}>
          <nav className="space-y-1">
            {nav.map(([label, Icon, key]) => (
              <button 
                key={key} 
                onClick={() => {
                  setActiveTab(key);
                  setSidebar(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeTab === key ? 'bg-aqua text-ink font-semibold rounded' : 'text-slate-400 hover:bg-white/5 hover:text-mist'
                }`}
              >
                <Icon size={16}/>
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-10 border-t border-line pt-4">
            <p className="px-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">Signed in as</p>
            <p className="mt-2 truncate px-3 text-xs text-slate-300">{user.email}</p>
          </div>
        </aside>

        <main className="min-w-0 px-6 py-8 md:px-10 lg:px-14 flex justify-center">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto">
            {activeTab === 'history' && (
              <History onLoadResume={(item) => {
                dispatch(setResume(item));
                setActiveTab('workspace');
              }} />
            )}

            {activeTab === 'insights' && (
              <Insights />
            )}

            {activeTab === 'platforms' && (
              <PlatformAccounts />
            )}

            {activeTab === 'controls' && (
              <AutoApplyControls />
            )}

            {activeTab === 'workspace' && (
              <>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Workspace / new application</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-white">Make every word count.</h1>
                  </div>
                  <p className="max-w-xs text-sm leading-6 text-slate-400">Upload your source resume, target the role, then decide on each proposed edit.</p>
                </div>

                {error && <div role="alert" className="mb-5 border-l-2 border-coral bg-coral/10 p-3 text-sm text-coral">{error}</div>}

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
                  <div className="space-y-5">
                    <section className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">01 / Source resume</p>
                        <ResumeUpload resume={resume} busy={busy} onUpload={doUpload}/>
                      </div>
                      <div>
                        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">02 / Target position</p>
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
                  <ScorePanel analysis={analysis} onRewrite={doRewrite} busy={busy} resumeId={resume?.id} jobId={job?.id}/>
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
