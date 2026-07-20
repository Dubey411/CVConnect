import { useState } from 'react';
import { Check, ChevronDown, Copy, Download, X, Eye, FileEdit } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { resolveChange } from '../store';

const display = (v) => Array.isArray(v) ? v.join('\n• ') : v;

export default function Editor({ rewrite }) {
  const dispatch = useDispatch();
  const accepted = useSelector(s => s.workspace.accepted);
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'preview'
  const [selectedTemplate, setSelectedTemplate] = useState('modern'); // 'modern' | 'tech' | 'classic'
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!rewrite) {
    return (
      <div className="panel grid min-h-80 place-items-center p-6 text-center">
        <div>
          <p className="eyebrow">Review studio</p>
          <p className="mt-3 text-lg font-semibold">Your changes will appear here.</p>
          <p className="mt-1 text-sm text-slate-400">Every suggestion remains editable and under your control.</p>
        </div>
      </div>
    );
  }

  // Compile final resume based on accepted/rejected changes
  const compileResume = () => {
    const original = rewrite.resume?.original || {};
    const optimized = rewrite.optimized || {};

    const getSection = (key) => {
      if (accepted[key] === false) {
        return original[key];
      }
      return optimized[key] !== undefined ? optimized[key] : original[key];
    };

    return {
      contact: getSection('contact') || original.contact || {},
      summary: getSection('summary'),
      skills: getSection('skills') || [],
      experience: getSection('experience') || [],
      education: getSection('education') || [],
      projects: getSection('projects') || []
    };
  };

  const getFormattedText = (resObj) => {
    const lines = [];
    const contact = resObj.contact || {};
    
    if (contact.name) lines.push(contact.name.toUpperCase());
    
    const contactDetails = [contact.email, contact.phone, contact.location].filter(Boolean).join(' | ');
    if (contactDetails) lines.push(contactDetails);
    
    lines.push('');
    
    if (resObj.summary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push('====================');
      lines.push(resObj.summary);
      lines.push('');
    }
    
    if (resObj.skills && resObj.skills.length > 0) {
      lines.push('SKILLS');
      lines.push('======');
      lines.push(resObj.skills.join(', '));
      lines.push('');
    }
    
    if (resObj.experience && resObj.experience.length > 0) {
      lines.push('PROFESSIONAL EXPERIENCE');
      lines.push('=======================');
      resObj.experience.forEach(exp => {
        lines.push(`• ${exp}`);
      });
      lines.push('');
    }
    
    if (resObj.projects && resObj.projects.length > 0) {
      lines.push('PROJECTS');
      lines.push('========');
      resObj.projects.forEach(proj => {
        lines.push(`• ${proj}`);
      });
      lines.push('');
    }
    
    if (resObj.education && resObj.education.length > 0) {
      lines.push('EDUCATION');
      lines.push('=========');
      resObj.education.forEach(edu => {
        lines.push(`• ${edu}`);
      });
      lines.push('');
    }
    
    return lines.join('\n');
  };

  const handleCopy = () => {
    const compiled = compileResume();
    const txt = getFormattedText(compiled);
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const compiled = compileResume();
    const txt = getFormattedText(compiled);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compiled.contact?.name || 'resume'}_optimized.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setShowDropdown(false);
  };

  const handleDownloadJson = () => {
    const compiled = compileResume();
    const blob = new Blob([JSON.stringify(compiled, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compiled.contact?.name || 'resume'}_optimized.json`;
    link.click();
    URL.revokeObjectURL(url);
    setShowDropdown(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const resumeData = compileResume();

  return (
    <section className="panel overflow-hidden">
      {/* Tab Navigation and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-line bg-black/10 no-print">
        <div className="flex bg-slate-900/60 p-1 rounded border border-line">
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === 'review' 
                ? 'bg-aqua text-ink shadow-sm' 
                : 'text-slate-400 hover:text-mist'
            }`}
          >
            <FileEdit size={13} />
            Review edits
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === 'preview' 
                ? 'bg-aqua text-ink shadow-sm' 
                : 'text-slate-400 hover:text-mist'
            }`}
          >
            <Eye size={13} />
            Resume template
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded border border-line mr-2">
              <button
                onClick={() => setSelectedTemplate('modern')}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition ${
                  selectedTemplate === 'modern' ? 'bg-aqua/20 text-aqua font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Minimal
              </button>
              <button
                onClick={() => setSelectedTemplate('tech')}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition ${
                  selectedTemplate === 'tech' ? 'bg-aqua/20 text-aqua font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tech
              </button>
              <button
                onClick={() => setSelectedTemplate('classic')}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition ${
                  selectedTemplate === 'classic' ? 'bg-aqua/20 text-aqua font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Serif
              </button>
            </div>
          )}

          <button onClick={handleCopy} className="button-quiet text-xs flex items-center gap-1 py-1.5 px-3">
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)} 
              className="button-primary text-xs flex items-center gap-1 py-1.5 px-3"
            >
              <Download size={13} />
              Export <ChevronDown size={13} />
            </button>
            
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-sm bg-slate-950 border border-slate-700 shadow-xl z-20 overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={handlePrint}
                      className="block w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      Print or Save as PDF
                    </button>
                    <button
                      onClick={handleDownloadTxt}
                      className="block w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors border-t border-slate-800"
                    >
                      Download as TXT
                    </button>
                    <button
                      onClick={handleDownloadJson}
                      className="block w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      Download as JSON
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* TAB 1: Edit & Review Studio */}
      {activeTab === 'review' && (
        <div className="grid border-b border-line lg:grid-cols-2 no-print">
          <div className="border-b border-line bg-black/10 p-5 lg:border-b-0 lg:border-r">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">Original</p>
            {rewrite.changes.map(change => (
              <article key={change.id} className="mb-5 last:mb-0">
                <h3 className="mb-1 text-xs font-semibold capitalize text-slate-300">{change.section}</h3>
                <p className="whitespace-pre-line text-sm leading-6 text-slate-400">{display(change.before) || '—'}</p>
              </article>
            ))}
          </div>
          
          <div className="p-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-aqua">Optimised draft</p>
            {rewrite.changes.map(change => (
              <article 
                key={change.id} 
                className={`mb-5 border-l-2 pl-3 ${accepted[change.id] === false ? 'border-coral/40 opacity-50' : 'border-aqua/70'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="mb-1 text-xs font-semibold capitalize text-mist">{change.section}</h3>
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{display(change.after) || '—'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button 
                      aria-label={`Accept ${change.section}`} 
                      onClick={() => dispatch(resolveChange({ id: change.id, accept: true }))} 
                      className={`grid h-7 w-7 place-items-center border ${accepted[change.id] === true ? 'border-aqua bg-aqua text-ink' : 'border-line text-aqua'}`}
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      aria-label={`Reject ${change.section}`} 
                      onClick={() => dispatch(resolveChange({ id: change.id, accept: false }))} 
                      className={`grid h-7 w-7 place-items-center border ${accepted[change.id] === false ? 'border-coral bg-coral text-ink' : 'border-line text-coral'}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Resume Template Preview */}
      {activeTab === 'preview' && (
        <div className="p-6 bg-slate-950/60 overflow-y-auto max-h-[700px] flex justify-center no-print">
          <div className="w-full max-w-3xl">
            <p className="text-center text-xs text-slate-400 mb-4">
              Here is your resume compiled with accepted edits. Click <strong>Export &gt; Print or Save as PDF</strong> to print.
            </p>
            
            {/* The actual printable component */}
            <div 
              id="resume-printable-area"
              className={`printable-resume bg-white text-slate-800 p-8 md:p-12 shadow-2xl rounded-sm border border-slate-200 min-h-[1050px] ${
                selectedTemplate === 'classic' ? 'font-serif' : 'font-sans'
              }`}
            >
              {/* Modern Minimalist Template */}
              {selectedTemplate === 'modern' && (
                <div>
                  <header className="border-b-2 border-slate-800 pb-4 mb-6">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{resumeData.contact?.name || 'Resume'}</h1>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
                      {resumeData.contact?.email && <span>{resumeData.contact.email}</span>}
                      {resumeData.contact?.phone && <span>• {resumeData.contact.phone}</span>}
                      {resumeData.contact?.location && <span>• {resumeData.contact.location}</span>}
                    </div>
                  </header>

                  {resumeData.summary && (
                    <section className="mb-6">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Professional Summary</h2>
                      <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">{resumeData.summary}</p>
                    </section>
                  )}

                  {resumeData.skills && resumeData.skills.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Core Competencies</h2>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {resumeData.skills.map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] rounded-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {resumeData.experience && resumeData.experience.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Professional Experience</h2>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                        {resumeData.experience.map((bullet, i) => (
                          <li key={i} className="leading-relaxed">{bullet}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {resumeData.projects && resumeData.projects.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Key Projects</h2>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                        {resumeData.projects.map((proj, i) => (
                          <li key={i} className="leading-relaxed">{proj}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {resumeData.education && resumeData.education.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Education</h2>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                        {resumeData.education.map((edu, i) => (
                          <li key={i} className="leading-relaxed">{edu}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {/* Tech Slate Template */}
              {selectedTemplate === 'tech' && (
                <div className="grid grid-cols-[1fr_2.2fr] gap-6">
                  {/* Left Column (Metadata) */}
                  <div className="border-r border-slate-200 pr-6">
                    <h1 className="text-2xl font-bold text-slate-950 leading-none mb-1">{resumeData.contact?.name || 'Resume'}</h1>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-6">Candidate</p>

                    <div className="space-y-4 text-[11px] text-slate-600">
                      <div>
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-1">Contact</h4>
                        {resumeData.contact?.email && <p className="truncate">{resumeData.contact.email}</p>}
                        {resumeData.contact?.phone && <p>{resumeData.contact.phone}</p>}
                        {resumeData.contact?.location && <p>{resumeData.contact.location}</p>}
                      </div>

                      {resumeData.skills && resumeData.skills.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-2">Technical Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {resumeData.skills.map((skill, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] rounded-sm font-mono">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {resumeData.education && resumeData.education.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-1.5">Education</h4>
                          <ul className="space-y-1.5">
                            {resumeData.education.map((edu, i) => (
                              <li key={i} className="leading-tight text-[10px]">{edu}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Content) */}
                  <div className="space-y-6">
                    {resumeData.summary && (
                      <section>
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 pb-0.5 border-b-2 border-slate-900">Summary</h2>
                        <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">{resumeData.summary}</p>
                      </section>
                    )}

                    {resumeData.experience && resumeData.experience.length > 0 && (
                      <section>
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-0.5 border-b-2 border-slate-900">Professional Experience</h2>
                        <ul className="list-none space-y-3 text-xs text-slate-700">
                          {resumeData.experience.map((bullet, i) => (
                            <li key={i} className="flex gap-2 items-start leading-relaxed">
                              <span className="text-slate-900 font-bold mt-0.5">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {resumeData.projects && resumeData.projects.length > 0 && (
                      <section>
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-0.5 border-b-2 border-slate-900">Key Projects</h2>
                        <ul className="list-none space-y-3 text-xs text-slate-700">
                          {resumeData.projects.map((proj, i) => (
                            <li key={i} className="flex gap-2 items-start leading-relaxed">
                              <span className="text-slate-900 font-bold mt-0.5">•</span>
                              <span>{proj}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                </div>
              )}

              {/* Classic Serif Template */}
              {selectedTemplate === 'classic' && (
                <div className="font-serif">
                  <header className="text-center mb-6">
                    <h1 className="text-3xl font-normal text-slate-900 tracking-wide">{resumeData.contact?.name || 'Resume'}</h1>
                    <div className="flex justify-center flex-wrap gap-2 text-xs text-slate-600 mt-2 font-sans">
                      {resumeData.contact?.email && <span>{resumeData.contact.email}</span>}
                      {resumeData.contact?.phone && <span>| {resumeData.contact.phone}</span>}
                      {resumeData.contact?.location && <span>| {resumeData.contact.location}</span>}
                    </div>
                  </header>

                  {resumeData.summary && (
                    <section className="mb-6">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-2 pb-0.5 border-b border-slate-300">Professional Objective</h2>
                      <p className="text-xs leading-relaxed text-slate-800 text-justify whitespace-pre-line indent-8">{resumeData.summary}</p>
                    </section>
                  )}

                  {resumeData.skills && resumeData.skills.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-2 pb-0.5 border-b border-slate-300">Technical Qualifications</h2>
                      <p className="text-xs text-slate-800 leading-relaxed text-center italic">
                        {resumeData.skills.join(' • ')}
                      </p>
                    </section>
                  )}

                  {resumeData.experience && resumeData.experience.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-3 pb-0.5 border-b border-slate-300">Work Experience History</h2>
                      <ul className="list-disc pl-6 space-y-2 text-xs text-slate-800 text-justify">
                        {resumeData.experience.map((bullet, i) => (
                          <li key={i} className="leading-relaxed">{bullet}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {resumeData.projects && resumeData.projects.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-3 pb-0.5 border-b border-slate-300">Key Achievements & Projects</h2>
                      <ul className="list-disc pl-6 space-y-2 text-xs text-slate-800 text-justify">
                        {resumeData.projects.map((proj, i) => (
                          <li key={i} className="leading-relaxed">{proj}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {resumeData.education && resumeData.education.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-2 pb-0.5 border-b border-slate-300">Education Details</h2>
                      <ul className="list-disc pl-6 space-y-1 text-xs text-slate-800">
                        {resumeData.education.map((edu, i) => (
                          <li key={i} className="leading-relaxed">{edu}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable copy that is only visible to the printer */}
      <div className="hidden print:block printable-resume bg-white text-slate-800 p-12 min-h-[1050px]">
        {/* Modern Minimalist Printable */}
        {selectedTemplate === 'modern' && (
          <div>
            <header className="border-b-2 border-slate-800 pb-4 mb-6">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{resumeData.contact?.name || 'Resume'}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
                {resumeData.contact?.email && <span>{resumeData.contact.email}</span>}
                {resumeData.contact?.phone && <span>• {resumeData.contact.phone}</span>}
                {resumeData.contact?.location && <span>• {resumeData.contact.location}</span>}
              </div>
            </header>
            {resumeData.summary && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Professional Summary</h2>
                <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">{resumeData.summary}</p>
              </section>
            )}
            {resumeData.skills && resumeData.skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Core Competencies</h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  {resumeData.skills.map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] rounded-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {resumeData.experience && resumeData.experience.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Professional Experience</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                  {resumeData.experience.map((bullet, i) => (
                    <li key={i} className="leading-relaxed">{bullet}</li>
                  ))}
                </ul>
              </section>
            )}
            {resumeData.projects && resumeData.projects.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Key Projects</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                  {resumeData.projects.map((proj, i) => (
                    <li key={i} className="leading-relaxed">{proj}</li>
                  ))}
                </ul>
              </section>
            )}
            {resumeData.education && resumeData.education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Education</h2>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  {resumeData.education.map((edu, i) => (
                    <li key={i} className="leading-relaxed">{edu}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* Tech Slate Printable */}
        {selectedTemplate === 'tech' && (
          <div className="grid grid-cols-[1fr_2.2fr] gap-6">
            <div className="border-r border-slate-200 pr-6">
              <h1 className="text-2xl font-bold text-slate-955 mb-1">{resumeData.contact?.name || 'Resume'}</h1>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-6">Candidate</p>
              <div className="space-y-4 text-[11px] text-slate-600">
                <div>
                  <h4 className="font-bold text-slate-905 uppercase tracking-wider text-[9px] mb-1">Contact</h4>
                  {resumeData.contact?.email && <p className="truncate">{resumeData.contact.email}</p>}
                  {resumeData.contact?.phone && <p>{resumeData.contact.phone}</p>}
                  {resumeData.contact?.location && <p>{resumeData.contact.location}</p>}
                </div>
                {resumeData.skills && resumeData.skills.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-905 uppercase tracking-wider text-[9px] mb-2">Technical Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {resumeData.skills.map((skill, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] rounded-sm font-mono">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {resumeData.education && resumeData.education.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-905 uppercase tracking-wider text-[9px] mb-1.5">Education</h4>
                    <ul className="space-y-1.5">
                      {resumeData.education.map((edu, i) => (
                        <li key={i} className="leading-tight text-[10px]">{edu}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              {resumeData.summary && (
                <section>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 pb-0.5 border-b-2 border-slate-900">Summary</h2>
                  <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">{resumeData.summary}</p>
                </section>
              )}
              {resumeData.experience && resumeData.experience.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-0.5 border-b-2 border-slate-900">Professional Experience</h2>
                  <ul className="list-none space-y-3 text-xs text-slate-700">
                    {resumeData.experience.map((bullet, i) => (
                      <li key={i} className="flex gap-2 items-start leading-relaxed">
                        <span className="text-slate-900 font-bold mt-0.5">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {resumeData.projects && resumeData.projects.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-0.5 border-b-2 border-slate-900">Key Projects</h2>
                  <ul className="list-none space-y-3 text-xs text-slate-700">
                    {resumeData.projects.map((proj, i) => (
                      <li key={i} className="flex gap-2 items-start leading-relaxed">
                        <span className="text-slate-900 font-bold mt-0.5">•</span>
                        <span>{proj}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Classic Serif Printable */}
        {selectedTemplate === 'classic' && (
          <div className="font-serif">
            <header className="text-center mb-6">
              <h1 className="text-3xl font-normal text-slate-900 tracking-wide">{resumeData.contact?.name || 'Resume'}</h1>
              <div className="flex justify-center flex-wrap gap-2 text-xs text-slate-600 mt-2 font-sans">
                {resumeData.contact?.email && <span>{resumeData.contact.email}</span>}
                {resumeData.contact?.phone && <span>| {resumeData.contact.phone}</span>}
                {resumeData.contact?.location && <span>| {resumeData.contact.location}</span>}
              </div>
            </header>
            {resumeData.summary && (
              <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-2 pb-0.5 border-b border-slate-300">Professional Objective</h2>
                <p className="text-xs leading-relaxed text-slate-800 text-justify whitespace-pre-line indent-8">{resumeData.summary}</p>
              </section>
            )}
            {resumeData.skills && resumeData.skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-2 pb-0.5 border-b border-slate-300">Technical Qualifications</h2>
                <p className="text-xs text-slate-800 leading-relaxed text-center italic">
                  {resumeData.skills.join(' • ')}
                </p>
              </section>
            )}
            {resumeData.experience && resumeData.experience.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-3 pb-0.5 border-b border-slate-300">Work Experience History</h2>
                <ul className="list-disc pl-6 space-y-2 text-xs text-slate-800 text-justify">
                  {resumeData.experience.map((bullet, i) => (
                    <li key={i} className="leading-relaxed">{bullet}</li>
                  ))}
                </ul>
              </section>
            )}
            {resumeData.projects && resumeData.projects.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-3 pb-0.5 border-b border-slate-300">Key Achievements & Projects</h2>
                <ul className="list-disc pl-6 space-y-2 text-xs text-slate-800 text-justify">
                  {resumeData.projects.map((proj, i) => (
                    <li key={i} className="leading-relaxed">{proj}</li>
                  ))}
                </ul>
              </section>
            )}
            {resumeData.education && resumeData.education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center mb-2 pb-0.5 border-b border-slate-300">Education Details</h2>
                <ul className="list-disc pl-6 space-y-1 text-xs text-slate-800">
                  {resumeData.education.map((edu, i) => (
                    <li key={i} className="leading-relaxed">{edu}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <p className="p-4 text-xs leading-5 text-slate-500 no-print">
        CVConnect only recommends wording that is supported by your source resume. Verify every claim before export.
      </p>
    </section>
  );
}
