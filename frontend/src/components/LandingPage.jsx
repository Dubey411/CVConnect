import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Cpu, Layers, FileText, CheckCircle } from 'lucide-react';

export default function LandingPage({ onGetStarted, onSignIn }) {
  const features = [
    {
      icon: Cpu,
      title: "ATS Readiness Scoring",
      desc: "Instant multidimensional analysis of your resume fit against any job description, scoring skills, domain alignment, and experience."
    },
    {
      icon: Sparkles,
      title: "Local ML Rewriter Fallback",
      desc: "Our dual-engine architecture automatically falls back to an offline scikit-learn NLP model if LLM services are offline or exhausted."
    },
    {
      icon: Shield,
      title: "Truth-Preserving Tailoring",
      desc: "Zero hallucinations. The platform checks your raw parsed resume text and only adds skills that you actually possess."
    },
    {
      icon: Layers,
      title: "Premium Calibri Layout",
      desc: "Direct export of A4 print-ready Calibri templates styled to look clean, polished, and executive-grade on the page."
    }
  ];

  return (
    <div className="min-h-screen bg-ink text-slate-100 selection:bg-aqua selection:text-ink relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-aqua/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-line/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-white">
          <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain rounded" />
          CVConnect
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onSignIn} 
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={onGetStarted} 
            className="button-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            Get Started
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <p className="eyebrow inline-block px-3 py-1 bg-aqua/10 rounded-full text-[9px] tracking-widest font-mono">
            Next‑Gen Resume Workspace / v1.0
          </p>
          <h1 className="text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white max-w-xl">
            Give your best evidence a <span className="text-aqua">clearer voice.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-lg">
            Bring a resume and a role. Analyze match intelligence using custom ML, optimize bullet points with action‑verbs, and export print‑ready Calibri PDFs.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={onGetStarted} 
              className="button-primary text-sm py-3 px-6 flex items-center gap-2"
            >
              Analyze Your Resume
              <ArrowRight size={15} />
            </button>
            <button 
              onClick={onSignIn} 
              className="button-quiet text-sm py-3 px-6"
            >
              Sign In to Dashboard
            </button>
          </div>
          <div className="flex items-center gap-6 pt-6 border-t border-line/30 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-aqua" />
              100% Free Tier Available
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-aqua" />
              Calibri Print-Ready
            </div>
          </div>
        </motion.div>

        {/* Interactive Mockup Container */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative lg:ml-6"
        >
          <div className="absolute inset-0 bg-aqua/5 blur-[50px] pointer-events-none rounded-2xl" />
          <div className="panel bg-surface/90 border border-line p-6 rounded-xl shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-line/50 pb-4 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-aqua/80" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">CVConnect Dashboard</span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-950/60 p-3.5 rounded border border-line/40">
                  <span className="text-[9px] font-mono text-slate-500 block mb-1">01 / CANDIDATE</span>
                  <span className="text-xs font-semibold text-white">Shubham Dubey</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Computer Engineer</span>
                </div>
                <div className="flex-1 bg-slate-950/60 p-3.5 rounded border border-line/40">
                  <span className="text-[9px] font-mono text-slate-500 block mb-1">02 / ROLE</span>
                  <span className="text-xs font-semibold text-aqua">Data Analyst Intern</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Nova Technology</span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded border border-line/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300 font-semibold">Match score</span>
                  <span className="text-xs font-mono text-aqua font-bold">88%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-aqua h-full rounded-full" style={{ width: '88%' }} />
                </div>
              </div>

              <div className="border border-line/40 rounded overflow-hidden">
                <div className="grid grid-cols-2 bg-slate-950/80 text-[10px] font-mono border-b border-line/40 p-2 text-slate-500">
                  <span>ORIGINAL</span>
                  <span className="text-aqua">OPTIMISED DRAFT</span>
                </div>
                <div className="grid grid-cols-2 p-3 text-[10px] bg-slate-950/30 gap-3 leading-relaxed min-h-[70px]">
                  <span className="text-slate-500">responsible for building data pipelines...</span>
                  <span className="text-slate-200"><b>Engineered</b> automated data pipelines linking user inputs...</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Grid */}
      <section className="border-t border-line/40 bg-black/10 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
            <p className="eyebrow">Powerful capabilities</p>
            <h2 className="text-3xl font-bold tracking-tight text-white">Built for precise tailoring.</h2>
            <p className="text-slate-400 text-sm">
              We skip the fluff. CVConnect helps you align your resume to a role using smart NLP algorithms.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, i) => (
              <div 
                key={i} 
                className="panel bg-surface/50 border border-line/50 p-6 rounded-lg hover:border-aqua/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-sm bg-slate-950 flex items-center justify-center border border-line mb-4 group-hover:border-aqua/50 transition-colors">
                  <feat.icon className="text-aqua w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line/40 py-10 relative z-10 text-center text-xs text-slate-500 bg-ink">
        <p className="font-mono uppercase tracking-widest text-[9px] mb-2 text-slate-600">CVConnect / v1.0</p>
        <p>&copy; {new Date().getFullYear()} CVConnect. Truth‑first resume optimization.</p>
      </footer>
    </div>
  );
}
