import { useState } from 'react';
import { Check, ChevronDown, Copy, Download, X, Eye, FileEdit } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { resolveChange } from '../store';

const display = (v) => {
  if (!v) return '';
  if (Array.isArray(v)) {
    return v.map(item => typeof item === 'string' ? item : (typeof item === 'object' ? JSON.stringify(item) : String(item))).join('\n• ');
  }
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
};

// Helper to flatten strings, arrays, or LLM-returned structured objects into string lines
const flattenLines = (input) => {
  if (!input) return [];
  if (typeof input === 'string') return [input];
  if (Array.isArray(input)) {
    return input.flatMap(item => flattenLines(item));
  }
  if (typeof input === 'object') {
    const lines = [];
    const title = input.title || input.name || input.institution || input.company;
    const company = input.company || input.organization;
    if (title || company) {
      const headerParts = [title, company].filter(Boolean);
      lines.push(headerParts.join(' | '));
    }
    const duration = input.duration || input.date || input.dates;
    if (duration) {
      lines.push(String(duration));
    }
    if (input.degree) {
      lines.push(String(input.degree));
    }
    if (input.role) {
      const r = String(input.role);
      lines.push(r.toLowerCase().startsWith('role:') ? r : `Role: ${r}`);
    }
    if (input.stack || input.tools) {
      const s = String(input.stack || input.tools);
      lines.push(s.toLowerCase().includes('stack:') ? s : `Tech Stack: ${s}`);
    }
    const bullets = input.responsibilities || input.bullets || input.details || input.description || input.items;
    if (bullets) {
      if (Array.isArray(bullets)) {
        bullets.forEach(b => {
          if (typeof b === 'string') lines.push(b);
          else if (b) lines.push(typeof b === 'object' ? JSON.stringify(b) : String(b));
        });
      } else if (typeof bullets === 'string') {
        lines.push(bullets);
      }
    }
    if (lines.length === 0) {
      Object.values(input).forEach(val => {
        if (typeof val === 'string') lines.push(val);
        else if (Array.isArray(val)) val.forEach(v => typeof v === 'string' && lines.push(v));
      });
    }
    return lines;
  }
  return [String(input)];
};

// Helper to extract dates from raw text lines
const extractDate = (text) => {
  if (typeof text !== 'string') return null;
  const match = text.match(/(?:\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*Present|[A-Za-z]+\s+\d{4}\s*-\s*(?:Present|\d{4})|Expected\s+\d{4}|\d+\s+Month\s+Internship|Personal\s+Project)/i);
  return match ? match[0] : null;
};

// Helper to parse flat experience/projects arrays into structured blocks
const parseExperience = (rawLines) => {
  const lines = flattenLines(rawLines);
  const blocks = [];
  let currentBlock = null;

  lines.forEach(line => {
    const cleanLine = typeof line === 'string' ? line.trim() : String(line).trim();
    if (!cleanLine) return;

    const lower = cleanLine.toLowerCase();
    const isRole = lower.startsWith('role:');
    const isStack = lower.includes('stack:') || lower.startsWith('tools and stack:') || lower.startsWith('tech stack:');
    
    // Bullet check: starts with action verb or bullet symbol
    const isBulletAction = cleanLine.match(/^(?:[•\-\*]\s*)?(completed|engineered|collaborated|architected|led|designed|developed|built|managed|implemented|optimized|monitored|applied|generated|owned|assisted|helped|created|worked|delivered|reduced|integrated|drove|spearheaded)\b/i);

    if (isRole) {
      if (currentBlock) currentBlock.role = cleanLine;
    } else if (isStack) {
      if (currentBlock) currentBlock.stack = cleanLine;
    } else if (isBulletAction || (currentBlock && cleanLine.startsWith('•'))) {
      const bulletText = cleanLine.replace(/^[•\-\*]\s*/, '').trim();
      if (currentBlock) {
        currentBlock.bullets.push(bulletText);
      } else {
        currentBlock = { title: 'Project / Experience', date: '', role: '', stack: '', bullets: [bulletText] };
        blocks.push(currentBlock);
      }
    } else {
      // New Block (Project Title or Company Title)
      const date = extractDate(cleanLine);
      let titlePart = date ? cleanLine.replace(date, '').replace(/\s*\|\s*$/, '').replace(/\s*[-–]\s*$/, '').trim() : cleanLine;
      titlePart = titlePart.replace(/\|\s*\.$/, '').replace(/\|\s*$/, '').trim();

      currentBlock = {
        title: titlePart,
        date: date || '',
        role: '',
        stack: '',
        bullets: []
      };
      blocks.push(currentBlock);
    }
  });

  return blocks;
};

// Helper to parse flat education details and separate certifications
const parseEducationAndCerts = (rawEduLines, rawCertLines = []) => {
  const eduLines = flattenLines(rawEduLines);
  const certLinesFromProps = flattenLines(rawCertLines);
  
  const eduBlocks = [];
  const certsList = [];

  let currentEdu = null;
  eduLines.forEach(line => {
    const cleanLine = typeof line === 'string' ? line.trim() : String(line).trim();
    if (!cleanLine) return;

    const lower = cleanLine.toLowerCase();

    if (lower.startsWith('ai and ml') || lower.startsWith('advanced frontend') || lower.startsWith('backend architecture') || lower.includes('freecodecamp') || lower.includes('odin project')) {
      certsList.push(cleanLine);
      return;
    }

    const isDegreeOrCoursework = lower.includes('bachelor') || lower.includes('b.e.') || lower.includes('hsc') || lower.includes('ssc') || lower.includes('degree') || lower.includes('relevant coursework') || lower.includes('science stream');

    if (!isDegreeOrCoursework) {
      const date = extractDate(cleanLine);
      const instName = date ? cleanLine.replace(date, '').replace(/\s*\|\s*$/, '').trim() : cleanLine;
      currentEdu = {
        institution: instName,
        date: date || '',
        degree: '',
        details: []
      };
      eduBlocks.push(currentEdu);
    } else {
      const date = extractDate(cleanLine);
      const cleanDegree = date ? cleanLine.replace(date, '').trim() : cleanLine;
      if (currentEdu) {
        if (date && !currentEdu.date) currentEdu.date = date;
        currentEdu.details.push(cleanDegree);
      } else {
        currentEdu = {
          institution: 'Education',
          date: date || '',
          degree: cleanDegree,
          details: [cleanDegree]
        };
        eduBlocks.push(currentEdu);
      }
    }
  });

  const allCerts = [...certLinesFromProps, ...certsList];
  const certsLine = allCerts.length > 0 ? allCerts.join(' | ') : '';

  return { eduBlocks, certsLine };
};

// Helper to parse flat skills into categories
const parseSkills = (rawSkills) => {
  const skills = flattenLines(rawSkills);
  const categories = [];

  skills.forEach(skill => {
    const cleanSkill = typeof skill === 'string' ? skill.trim() : String(skill).trim();
    if (!cleanSkill) return;

    const bulletCleaned = cleanSkill.replace(/^[•\-\*]\s*/, '').trim();
    if (!bulletCleaned) return;

    if (bulletCleaned.includes(':')) {
      const parts = bulletCleaned.split(':');
      const catName = parts[0].trim();
      const rawItems = parts.slice(1).join(':').trim();
      const items = rawItems ? rawItems.split(/[,;|]/).map(s => s.trim()).filter(Boolean) : [];
      
      categories.push({
        name: catName,
        items
      });
    } else {
      const items = bulletCleaned.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      if (categories.length > 0) {
        categories[categories.length - 1].items.push(...items);
      } else {
        categories.push({
          name: 'Core Skills',
          items
        });
      }
    }
  });

  return categories.filter(cat => cat.items.length > 0 || cat.name);
};

// Helper to render text containing Live Demo, GitHub, or URLs as clickable anchor links
const renderWithHyperlinks = (text, embeddedLinks = []) => {
  if (!text) return null;
  const str = String(text);

  const parts = str.split(/(\bLive Demo\b|\bGitHub\b|https?:\/\/[^\s|]+)/i);
  if (parts.length === 1) return str;

  return parts.map((part, idx) => {
    const lower = part.toLowerCase();
    if (lower === 'live demo') {
      const demoUrl = embeddedLinks.find(l => !/github\.com/i.test(l) && !/linkedin\.com/i.test(l) && !/mailto:/i.test(l)) || '#';
      return (
        <a key={idx} href={demoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          Live Demo
        </a>
      );
    }
    if (lower === 'github') {
      const ghUrl = embeddedLinks.find(l => /github\.com/i.test(l)) || 'https://github.com';
      return (
        <a key={idx} href={ghUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          GitHub
        </a>
      );
    }
    if (part.match(/^https?:\/\//i)) {
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          {part}
        </a>
      );
    }
    return part;
  });
};

// Simple link parser
const extractLinks = (text) => {
  if (!text) return {};
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || '';
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)?.[0] || '';
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i)?.[0] || '';
  const portfolio = text.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?vercel\.app\b|(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?github\.io\b/i)?.[0] || '';

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
          <p className="eyebrow">Studio Offline</p>
          <h2 className="mt-2 text-xl font-semibold text-white">No draft loaded</h2>
          <p className="mt-2 max-w-sm text-xs text-slate-400">
            Upload your source resume and analyze a target job description to open the Tailoring Studio.
          </p>
        </div>
      </div>
    );
  }

  // Compile final resume based on accepted/rejected changes
  const compileResume = () => {
    const original = rewrite.resume?.original || {};
    const optimized = rewrite.optimized || {};

    const getSection = (key) => {
      const changeEntry = (rewrite.changes || []).find(c => c.section === key || c.id === key);
      const changeId = changeEntry ? changeEntry.id : key;

      // Only include optimized content if explicitly accepted by user (accept === true)
      if (accepted[changeId] === true || accepted[key] === true) {
        return optimized[key] !== undefined ? optimized[key] : original[key];
      }

      // If rejected (false) or unreviewed (undefined), remain 100% original!
      return original[key];
    };

    return {
      contact: getSection('contact') || original.contact || {},
      summary: getSection('summary'),
      skills: getSection('skills') || [],
      experience: getSection('experience') || [],
      education: getSection('education') || [],
      projects: getSection('projects') || [],
      certifications: getSection('certifications') || original.certifications || [],
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
      lines.push(flattenLines(resObj.skills).join(', '));
      lines.push('');
    }
    
    if (resObj.experience && resObj.experience.length > 0) {
      lines.push('PROFESSIONAL EXPERIENCE');
      lines.push('=======================');
      flattenLines(resObj.experience).forEach(exp => {
        lines.push(`• ${exp}`);
      });
      lines.push('');
    }
    
    if (resObj.projects && resObj.projects.length > 0) {
      lines.push('PROJECTS');
      lines.push('========');
      flattenLines(resObj.projects).forEach(proj => {
        lines.push(`• ${proj}`);
      });
      lines.push('');
    }
    
    if (resObj.education && resObj.education.length > 0) {
      lines.push('EDUCATION');
      lines.push('=========');
      flattenLines(resObj.education).forEach(edu => {
        lines.push(`• ${edu}`);
      });
      lines.push('');
    }
    
    if (resObj.certifications && resObj.certifications.length > 0) {
      lines.push('CERTIFICATIONS AND AWARDS');
      lines.push('========================');
      flattenLines(resObj.certifications).forEach(cert => {
        lines.push(`• ${cert}`);
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
  const rawLinks = extractLinks(resumeData.sourceText);
  const contactObj = typeof resumeData.contact === 'object' ? resumeData.contact : {};
  
  const rawLoc = contactObj.location || rawLinks.location || 'Mumbai, Maharashtra';
  const cleanLoc = rawLoc.split('|')[0].replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, '').replace(/(?:\+?\d[\d\s().-]{7,}\d)/, '').trim();

  const links = {
    name: contactObj.name || 'SHUBHAM DUBEY',
    email: contactObj.email || rawLinks.email,
    phone: contactObj.phone || rawLinks.phone,
    location: cleanLoc,
    linkedin: contactObj.linkedin || rawLinks.linkedin,
    github: contactObj.github || rawLinks.github,
    portfolio: contactObj.portfolio || rawLinks.portfolio,
  };

  // Parsed sections for structure layout
  const parsedExp = parseExperience(resumeData.experience || []);
  const parsedProj = parseExperience(resumeData.projects || []);
  const { eduBlocks, certsLine: fallbackCertsLine } = parseEducationAndCerts(resumeData.education || []);
  const certsFromData = flattenLines(resumeData.certifications || []);
  const certsLine = certsFromData.length > 0 ? certsFromData.join(' | ') : fallbackCertsLine;
  const parsedSkills = parseSkills(resumeData.skills || []);

  return (
    <section className="panel overflow-hidden">
      {/* Inline Calibri style definitions & Print Optimization */}
      <style>{`
        @media print {
          @page {
            margin: 8mm 10mm;
            size: A4 portrait;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .no-print, header, nav, aside {
            display: none !important;
          }
        }
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
        <div className="no-print">
          <div className="bg-slate-900/80 p-4 border-b border-line text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
            <p>
              <strong className="text-aqua">Step 1:</strong> Select <span className="text-aqua font-semibold">✓ Yes (Accept)</span> to include an AI update, or <span className="text-coral font-semibold">✗ No (Keep Original)</span> to keep your original content. Sections without accepted changes remain <strong>100% untouched</strong> in your final resume.
            </p>
            <button
              onClick={() => setActiveTab('preview')}
              className="button-primary text-xs py-1.5 px-4 flex items-center gap-1.5 shrink-0"
            >
              <Eye size={13} />
              Generate Final Resume Template ({Object.values(accepted).filter(Boolean).length} Accepted)
            </button>
          </div>

          <div className="grid border-b border-line lg:grid-cols-2">
            <div className="border-b border-line bg-black/10 p-5 lg:border-b-0 lg:border-r">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">Original (Unchanged Baseline)</p>
              {rewrite.changes.map(change => (
                <article key={change.id} className="mb-5 last:mb-0">
                  <h3 className="mb-1 text-xs font-semibold capitalize text-slate-300">{change.section}</h3>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-400">{display(change.before) || '—'}</p>
                </article>
              ))}
            </div>
            
            <div className="p-5">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-aqua">Optimised AI Draft</p>
              {rewrite.changes.map(change => {
                const isAccepted = accepted[change.id] === true || accepted[change.section] === true;
                const isRejected = accepted[change.id] === false || accepted[change.section] === false;

                return (
                  <article 
                    key={change.id} 
                    className={`mb-5 border-l-2 pl-3 transition-all ${
                      isAccepted ? 'border-aqua bg-aqua/5 p-3 rounded-r' : isRejected ? 'border-coral/40 opacity-60' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xs font-semibold capitalize text-mist">{change.section}</h3>
                          {isAccepted && (
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-aqua/20 text-aqua">
                              ✓ Accepted (In Final Resume)
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-coral/20 text-coral">
                              ✗ Rejected (Keeping Original)
                            </span>
                          )}
                          {!isAccepted && !isRejected && (
                            <span className="text-[10px] font-mono text-slate-500">
                              (Original retained until accepted)
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{display(change.after) || '—'}</p>
                      </div>

                      <div className="flex shrink-0 gap-1.5">
                        <button 
                          aria-label={`Accept ${change.section}`} 
                          onClick={() => dispatch(resolveChange({ id: change.id, accept: true }))} 
                          title="Accept AI Change (Include in Final Resume)"
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition ${
                            isAccepted ? 'border-aqua bg-aqua text-ink font-semibold' : 'border-line text-slate-300 hover:border-aqua hover:text-aqua'
                          }`}
                        >
                          <Check size={14} /> Yes
                        </button>
                        <button 
                          aria-label={`Reject ${change.section}`} 
                          onClick={() => dispatch(resolveChange({ id: change.id, accept: false }))} 
                          title="Reject AI Change (Keep Original Content)"
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition ${
                            isRejected ? 'border-coral bg-coral text-ink font-semibold' : 'border-line text-slate-300 hover:border-coral hover:text-coral'
                          }`}
                        >
                          <X size={14} /> No
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              <div className="mt-6 pt-4 border-t border-line flex justify-end">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="button-primary text-xs py-2 px-5 flex items-center gap-2"
                >
                  <Eye size={14} />
                  Generate & View Final Resume Template
                </button>
              </div>
            </div>
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
                    <h1>{links.name || resumeData.contact?.name || 'SHUBHAM DUBEY'}</h1>
                    <div className="contact-row">
                      {(links.location || resumeData.contact?.location) && <span>{links.location || resumeData.contact.location}</span>}
                      {(links.location || resumeData.contact?.location) && links.email && <span>&nbsp; | &nbsp;</span>}
                      
                      {links.email && (
                        <a href={`mailto:${links.email}`}>{links.email}</a>
                      )}
                      
                      {links.email && links.phone && <span>&nbsp; | &nbsp;</span>}
                      
                      {links.phone && (
                        <a href={`tel:${links.phone}`}>{links.phone}</a>
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
                            <span className="job-title">{renderWithHyperlinks(proj.title, resumeData.contact?.links)}</span>
                            <span className="job-date">{proj.date}</span>
                          </div>
                          {proj.role && <div className="job-sub">{renderWithHyperlinks(proj.role, resumeData.contact?.links)}</div>}
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
                        <div key={i} className="job-block" style={{ marginBottom: i === eduBlocks.length - 1 ? '0' : '4px' }}>
                          <div className="job-header">
                            <span className="job-title">{edu.institution}</span>
                            <span className="job-date">{edu.date}</span>
                          </div>
                          {edu.details && edu.details.map((detail, dIdx) => (
                            <div key={dIdx} className={detail.toLowerCase().includes('coursework') ? 'stack-line' : 'job-sub'}>
                              {detail}
                            </div>
                          ))}
                          {(!edu.details || edu.details.length === 0) && edu.degree && <div className="job-sub">{edu.degree}</div>}
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
              <h1>{links.name || resumeData.contact?.name || 'SHUBHAM DUBEY'}</h1>
              <div className="contact-row">
                {(links.location || resumeData.contact?.location) && <span>{links.location || resumeData.contact.location}</span>}
                {(links.location || resumeData.contact?.location) && links.email && <span>&nbsp; | &nbsp;</span>}
                {links.email && (
                  <a href={`mailto:${links.email}`}>{links.email}</a>
                )}
                {links.email && links.phone && <span>&nbsp; | &nbsp;</span>}
                {links.phone && (
                  <a href={`tel:${links.phone}`}>{links.phone}</a>
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
                      <span className="job-title">{renderWithHyperlinks(proj.title, resumeData.contact?.links)}</span>
                      <span className="job-date">{proj.date}</span>
                    </div>
                    {proj.role && <div className="job-sub">{renderWithHyperlinks(proj.role, resumeData.contact?.links)}</div>}
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
                  <div key={i} className="job-block" style={{ marginBottom: i === eduBlocks.length - 1 ? '0' : '4px' }}>
                    <div className="job-header">
                      <span className="job-title">{edu.institution}</span>
                      <span className="job-date">{edu.date}</span>
                    </div>
                    {edu.details && edu.details.map((detail, dIdx) => (
                      <div key={dIdx} className={detail.toLowerCase().includes('coursework') ? 'stack-line' : 'job-sub'}>
                        {detail}
                      </div>
                    ))}
                    {(!edu.details || edu.details.length === 0) && edu.degree && <div className="job-sub">{edu.degree}</div>}
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
