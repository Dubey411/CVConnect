import { useState } from 'react';
import { Check, ChevronDown, Copy, Download, X, Eye, FileEdit } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { resolveChange } from '../store';

const display = (v) => Array.isArray(v) ? v.join('\n• ') : v;

// Helper to extract dates from raw text lines
const extractDate = (text) => {
  const match = text.match(/(?:\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*Present|[A-Za-z]+\s+\d{4}\s*-\s*(?:Present|\d{4})|Expected\s+\d{4}|\d+\s+Month\s+Internship|Personal\s+Project)/i);
  return match ? match[0] : null;
};

// Helper to parse flat experience/projects arrays into structured blocks
const parseExperience = (lines) => {
  const blocks = [];
  let currentBlock = null;

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    const isRole = cleanLine.toLowerCase().startsWith('role:');
    const isStack = cleanLine.toLowerCase().includes('stack:') || cleanLine.toLowerCase().startsWith('tools and stack:');
    const isBullet = !isRole && !isStack && (
      cleanLine.match(/^(completed|engineered|collaborated|architected|led|designed|developed|built|managed|implemented|optimized|monitored|applied|generated|owned|assisted|helped|created|worked|delivered)\b/i) ||
      cleanLine.length > 85 ||
      (currentBlock && currentBlock.bullets.length > 0)
    );

    if (!isBullet && !isRole && !isStack) {
      if (!currentBlock || currentBlock.bullets.length > 0) {
        const date = extractDate(cleanLine);
        const titleWithoutDate = date ? cleanLine.replace(date, '').replace(/[-–]$/, '').trim() : cleanLine;
        currentBlock = {
          title: titleWithoutDate,
          date: date || '',
          role: '',
          stack: '',
          bullets: []
        };
        blocks.push(currentBlock);
      } else {
        const date = extractDate(cleanLine);
        if (date) currentBlock.date = date;
        const cleanPart = date ? cleanLine.replace(date, '').trim() : cleanLine;
        if (cleanPart) {
          currentBlock.title += ' - ' + cleanPart;
        }
      }
    } else if (isRole) {
      currentBlock.role = cleanLine;
    } else if (isStack) {
      currentBlock.stack = cleanLine;
    } else {
      if (currentBlock) {
        currentBlock.bullets.push(cleanLine);
      } else {
        currentBlock = { title: 'Experience', date: '', role: '', stack: '', bullets: [cleanLine] };
        blocks.push(currentBlock);
      }
    }
  });

  return blocks;
};

// Helper to parse flat education details
const parseEducationAndCerts = (lines) => {
  const eduBlocks = [];
  let certsLine = '';
  let currentBlock = null;

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    if (cleanLine.toUpperCase().includes('CERTIFICATIONS') || cleanLine.toUpperCase().includes('AWARDS')) {
      return;
    }
    
    if (cleanLine.includes(' | ') || cleanLine.toLowerCase().startsWith('ai and ml') || cleanLine.toLowerCase().startsWith('advanced frontend') || cleanLine.toLowerCase().startsWith('backend architecture')) {
      certsLine = cleanLine;
      return;
    }

    const isDegree = cleanLine.toLowerCase().includes('bachelor') || 
                     cleanLine.toLowerCase().includes('b.e.') || 
                     cleanLine.toLowerCase().includes('hsc') || 
                     cleanLine.toLowerCase().includes('ssc') ||
                     cleanLine.toLowerCase().includes('degree') ||
                     cleanLine.toLowerCase().includes('science stream');

    if (!isDegree) {
      const date = extractDate(cleanLine);
      const instWithoutDate = date ? cleanLine.replace(date, '').trim() : cleanLine;
      currentBlock = {
        institution: instWithoutDate,
        date: date || '',
        degree: ''
      };
      eduBlocks.push(currentBlock);
    } else {
      const date = extractDate(cleanLine);
      const degWithoutDate = date ? cleanLine.replace(date, '').trim() : cleanLine;
      if (currentBlock) {
        if (date) currentBlock.date = date;
        currentBlock.degree += (currentBlock.degree ? ', ' : '') + degWithoutDate;
      } else {
        currentBlock = { institution: 'Education', date: date || '', degree: degWithoutDate };
        eduBlocks.push(currentBlock);
      }
    }
  });

  return { eduBlocks, certsLine };
};

// Helper to parse flat skills into categories
const parseSkills = (skills) => {
  const categories = [];
  let currentCategory = null;

  skills.forEach(skill => {
    const cleanSkill = skill.trim();
    if (!cleanSkill) return;

    if (cleanSkill.includes(':')) {
      const parts = cleanSkill.split(':');
      const catName = parts[0].trim();
      const firstSkill = parts.slice(1).join(':').trim();
      
      currentCategory = {
        name: catName,
        items: [firstSkill]
      };
      categories.push(currentCategory);
    } else {
      if (currentCategory) {
        currentCategory.items.push(cleanSkill);
      } else {
        currentCategory = {
          name: 'Core Skills',
          items: [cleanSkill]
        };
        categories.push(currentCategory);
      }
    }
  });

  return categories;
};

// Simple link parser
const extractLinks = (text) => {
  if (!text) return {};
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || '';
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)?.[0] || 'https://linkedin.com';
  const github = text.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i)?.[0] || 'https://github.com';
  const portfolio = text.match(/https?:\/\/(?:[a-zA-Z0-9_-]+\.)?vercel\.app\b|https?:\/\/[a-zA-Z0-9_-]+\.github\.io\b/i)?.[0] || '';

  return { email, phone, linkedin, github, portfolio };
};

export default function Editor({ rewrite }) {
  const dispatch = useDispatch();
  const accepted = useSelector(s => s.workspace.accepted);
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'preview'
  const [selectedTemplate, setSelectedTemplate] = useState('calibri'); // 'calibri' | 'modern' | 'tech'
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
      projects: getSection('projects') || [],
      sourceText: original.sourceText || ''
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
  const links = extractLinks(resumeData.sourceText);

  // Parsed sections for structure layout
  const parsedExp = parseExperience(resumeData.experience || []);
  const parsedProj = parseExperience(resumeData.projects || []);
  const { eduBlocks, certsLine } = parseEducationAndCerts(resumeData.education || []);
  const parsedSkills = parseSkills(resumeData.skills || []);

  return (
    <section className="panel overflow-hidden">
      {/* Inline Calibri style definitions */}
      <style>{`
        .calibri-resume {
          font-family: Calibri, Arial, sans-serif;
          font-size: 9.8pt;
          line-height: 1.24;
          color: #000;
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          padding: 8mm 12mm;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .calibri-resume header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 7px;
        }
        .calibri-resume h1 {
            font-size: 24pt;
            font-weight: 700;
            text-transform: uppercase;
            margin: 0 0 3px 0;
            letter-spacing: 0.5px;
            color: #000;
            line-height: 1.1;
        }
        .calibri-resume .contact-row {
            font-size: 8.8pt;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            gap: 0;
            color: #222;
            line-height: 1.25;
        }
        .calibri-resume a {
            color: #000;
            text-decoration: underline;
            text-underline-offset: 1px;
            font-weight: 600;
        }
        .calibri-resume section { margin-bottom: 8px; }
        .calibri-resume h2 {
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            margin: 10px 0 5px 0;
            padding-bottom: 2px;
            color: #000;
        }
        .calibri-resume p { margin: 0; text-align: left; color: #000; }
        .calibri-resume .summary-text { max-width: 98%; }
        .calibri-resume .skills-container { font-size: 9.2pt; margin-bottom: 2px; }
        .calibri-resume .skill-item { margin-bottom: 3px; color: #000; }
        .calibri-resume .skill-head { font-weight: 700; }
        .calibri-resume .job-block { margin-bottom: 6px; }
        .calibri-resume .job-header {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
            font-size: 10.1pt;
            margin-bottom: 2px;
            color: #000;
        }
        .calibri-resume .job-title { flex: 1; }
        .calibri-resume .job-date { white-space: nowrap; text-align: right; }
        .calibri-resume .job-sub {
            font-style: italic;
            font-weight: 600;
            font-size: 9.4pt;
            margin-bottom: 1px;
            color: #000;
        }
        .calibri-resume .stack-line {
            font-size: 8.8pt;
            color: #444;
            margin-bottom: 1px;
        }
        .calibri-resume .cert-line { font-size: 8.8pt; line-height: 1.2; color: #000; }
        .calibri-resume ul { margin: 0; padding-left: 13px; list-style-type: disc; }
        .calibri-resume li { margin-bottom: 2px; text-align: left; color: #000; }
      `}</style>

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
                onClick={() => setSelectedTemplate('calibri')}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition ${
                  selectedTemplate === 'calibri' ? 'bg-aqua/20 text-aqua font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Calibri Professional
              </button>
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
        <div className="p-6 bg-slate-950/60 overflow-y-auto max-h-[750px] flex justify-center no-print">
          <div className="w-full max-w-[220mm]">
            <p className="text-center text-xs text-slate-400 mb-4">
              Here is your resume compiled with accepted edits. Click <strong>Export &gt; Print or Save as PDF</strong> to print.
            </p>
            
            {/* The actual printable component */}
            <div 
              id="resume-printable-area"
              className={`printable-resume bg-white text-slate-800 p-8 md:p-12 shadow-2xl rounded-sm border border-slate-200 min-h-[1050px] ${
                selectedTemplate === 'calibri' ? 'calibri-resume' : ''
              }`}
            >
              {/* Calibri Professional Template (Exact user template style made dynamic) */}
              {selectedTemplate === 'calibri' && (
                <div className="calibri-resume">
                  <header>
                    <h1>{resumeData.contact?.name || 'Resume'}</h1>
                    <div className="contact-row">
                      {resumeData.contact?.location && <span>{resumeData.contact.location}</span>}
                      {resumeData.contact?.location && (links.email || resumeData.contact?.email) && <span>&nbsp; | &nbsp;</span>}
                      
                      {(links.email || resumeData.contact?.email) && (
                        <a href={`mailto:${links.email || resumeData.contact.email}`}>{links.email || resumeData.contact.email}</a>
                      )}
                      
                      {(links.email || resumeData.contact?.email) && (links.phone || resumeData.contact?.phone) && <span>&nbsp; | &nbsp;</span>}
                      
                      {(links.phone || resumeData.contact?.phone) && (
                        <a href={`tel:${links.phone || resumeData.contact.phone}`}>{links.phone || resumeData.contact.phone}</a>
                      )}

                      {links.linkedin && <span>&nbsp; | &nbsp;</span>}
                      {links.linkedin && (
                        <a href={links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                      )}

                      {links.github && <span>&nbsp; | &nbsp;</span>}
                      {links.github && (
                        <a href={links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
                      )}

                      {links.portfolio && <span>&nbsp; | &nbsp;</span>}
                      {links.portfolio && (
                        <a href={links.portfolio} target="_blank" rel="noopener noreferrer">Portfolio</a>
                      )}
                    </div>
                  </header>

                  {resumeData.summary && (
                    <section>
                      <h2>Professional Summary</h2>
                      <p className="summary-text">{resumeData.summary}</p>
                    </section>
                  )}

                  {parsedSkills && parsedSkills.length > 0 && (
                    <section>
                      <h2>Technical Skills</h2>
                      <div className="skills-container">
                        {parsedSkills.map((cat, i) => (
                          <div key={i} className="skill-item">
                            <span className="skill-head">{cat.name}:</span> {cat.items.join(', ')}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {parsedExp && parsedExp.length > 0 && (
                    <section>
                      <h2>Experience</h2>
                      {parsedExp.map((job, i) => (
                        <div key={i} className="job-block">
                          <div className="job-header">
                            <span className="job-title">{job.title}</span>
                            <span className="job-date">{job.date}</span>
                          </div>
                          {job.role && <div className="job-sub">{job.role}</div>}
                          {job.stack && <div className="stack-line">{job.stack}</div>}
                          <ul>
                            {job.bullets.map((bullet, j) => {
                              const firstWord = bullet.match(/^\s*([A-Za-z\-]+)\b/)?.[1] || '';
                              const restOfBullet = bullet.substring(firstWord.length);
                              return (
                                <li key={j}>
                                  {firstWord ? <b>{firstWord}</b> : ''}{restOfBullet}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </section>
                  )}

                  {parsedProj && parsedProj.length > 0 && (
                    <section>
                      <h2>Projects</h2>
                      {parsedProj.map((proj, i) => (
                        <div key={i} className="job-block">
                          <div className="job-header">
                            <span className="job-title">{proj.title}</span>
                            <span className="job-date">{proj.date}</span>
                          </div>
                          {proj.role && <div className="job-sub">{proj.role}</div>}
                          {proj.stack && <div className="stack-line">{proj.stack}</div>}
                          <ul>
                            {proj.bullets.map((bullet, j) => {
                              const firstWord = bullet.match(/^\s*([A-Za-z\-]+)\b/)?.[1] || '';
                              const restOfBullet = bullet.substring(firstWord.length);
                              return (
                                <li key={j}>
                                  {firstWord ? <b>{firstWord}</b> : ''}{restOfBullet}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </section>
                  )}

                  {eduBlocks && eduBlocks.length > 0 && (
                    <section>
                      <h2>Education</h2>
                      {eduBlocks.map((edu, i) => (
                        <div key={i} className="job-block" style={{ marginBottom: i === eduBlocks.length - 1 ? '0' : '2px' }}>
                          <div className="job-header">
                            <span className="job-title">{edu.institution}</span>
                            <span className="job-date">{edu.date}</span>
                          </div>
                          {edu.degree && <div>{edu.degree}</div>}
                        </div>
                      ))}
                    </section>
                  )}

                  {certsLine && (
                    <section>
                      <h2>Certifications and Awards</h2>
                      <div className="cert-line">
                        {certsLine.split(' | ').map((cert, i) => {
                          // Bold the first part if structured
                          const cleanCert = cert.trim();
                          const parts = cleanCert.match(/^([A-Za-z0-9\s]+)\(([^)]+)\)$/);
                          if (parts) {
                            return (
                              <span key={i}>
                                {i > 0 && ' | '}
                                <b>{parts[1].trim()}</b> ({parts[2].trim()})
                              </span>
                            );
                          }
                          return (
                            <span key={i}>
                              {i > 0 && ' | '}
                              {cleanCert}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}

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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable copy that is only visible to the printer */}
      <div className="hidden print:block printable-resume bg-white text-slate-800 p-12 min-h-[1050px]">
        {/* Exact Calibri Template Layout for Print */}
        {selectedTemplate === 'calibri' && (
          <div className="calibri-resume" style={{ padding: 0 }}>
            <header>
              <h1>{resumeData.contact?.name || 'Resume'}</h1>
              <div className="contact-row">
                {resumeData.contact?.location && <span>{resumeData.contact.location}</span>}
                {resumeData.contact?.location && (links.email || resumeData.contact?.email) && <span>&nbsp; | &nbsp;</span>}
                {(links.email || resumeData.contact?.email) && (
                  <a href={`mailto:${links.email || resumeData.contact.email}`}>{links.email || resumeData.contact.email}</a>
                )}
                {(links.email || resumeData.contact?.email) && (links.phone || resumeData.contact?.phone) && <span>&nbsp; | &nbsp;</span>}
                {(links.phone || resumeData.contact?.phone) && (
                  <a href={`tel:${links.phone || resumeData.contact.phone}`}>{links.phone || resumeData.contact.phone}</a>
                )}
                {links.linkedin && <span>&nbsp; | &nbsp;</span>}
                {links.linkedin && <a href={links.linkedin}>{links.linkedin}</a>}
                {links.github && <span>&nbsp; | &nbsp;</span>}
                {links.github && <a href={links.github}>{links.github}</a>}
                {links.portfolio && <span>&nbsp; | &nbsp;</span>}
                {links.portfolio && <a href={links.portfolio}>{links.portfolio}</a>}
              </div>
            </header>

            {resumeData.summary && (
              <section>
                <h2>Professional Summary</h2>
                <p className="summary-text">{resumeData.summary}</p>
              </section>
            )}

            {parsedSkills && parsedSkills.length > 0 && (
              <section>
                <h2>Technical Skills</h2>
                <div className="skills-container">
                  {parsedSkills.map((cat, i) => (
                    <div key={i} className="skill-item">
                      <span className="skill-head">{cat.name}:</span> {cat.items.join(', ')}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {parsedExp && parsedExp.length > 0 && (
              <section>
                <h2>Experience</h2>
                {parsedExp.map((job, i) => (
                  <div key={i} className="job-block">
                    <div className="job-header">
                      <span className="job-title">{job.title}</span>
                      <span className="job-date">{job.date}</span>
                    </div>
                    {job.role && <div className="job-sub">{job.role}</div>}
                    {job.stack && <div className="stack-line">{job.stack}</div>}
                    <ul>
                      {job.bullets.map((bullet, j) => {
                        const firstWord = bullet.match(/^\s*([A-Za-z\-]+)\b/)?.[1] || '';
                        const restOfBullet = bullet.substring(firstWord.length);
                        return (
                          <li key={j}>
                            {firstWord ? <b>{firstWord}</b> : ''}{restOfBullet}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {parsedProj && parsedProj.length > 0 && (
              <section>
                <h2>Projects</h2>
                {parsedProj.map((proj, i) => (
                  <div key={i} className="job-block">
                    <div className="job-header">
                      <span className="job-title">{proj.title}</span>
                      <span className="job-date">{proj.date}</span>
                    </div>
                    {proj.role && <div className="job-sub">{proj.role}</div>}
                    {proj.stack && <div className="stack-line">{proj.stack}</div>}
                    <ul>
                      {proj.bullets.map((bullet, j) => {
                        const firstWord = bullet.match(/^\s*([A-Za-z\-]+)\b/)?.[1] || '';
                        const restOfBullet = bullet.substring(firstWord.length);
                        return (
                          <li key={j}>
                            {firstWord ? <b>{firstWord}</b> : ''}{restOfBullet}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {eduBlocks && eduBlocks.length > 0 && (
              <section>
                <h2>Education</h2>
                {eduBlocks.map((edu, i) => (
                  <div key={i} className="job-block" style={{ marginBottom: i === eduBlocks.length - 1 ? '0' : '2px' }}>
                    <div className="job-header">
                      <span className="job-title">{edu.institution}</span>
                      <span className="job-date">{edu.date}</span>
                    </div>
                    {edu.degree && <div>{edu.degree}</div>}
                  </div>
                ))}
              </section>
            )}

            {certsLine && (
              <section>
                <h2>Certifications and Awards</h2>
                <div className="cert-line">
                  {certsLine.split(' | ').map((cert, i) => {
                    const cleanCert = cert.trim();
                    const parts = cleanCert.match(/^([A-Za-z0-9\s]+)\(([^)]+)\)$/);
                    if (parts) {
                      return (
                        <span key={i}>
                          {i > 0 && ' | '}
                          <b>{parts[1].trim()}</b> ({parts[2].trim()})
                        </span>
                      );
                    }
                    return (
                      <span key={i}>
                        {i > 0 && ' | '}
                        {cleanCert}
                      </span>
                    );
                  })}
                </div>
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
