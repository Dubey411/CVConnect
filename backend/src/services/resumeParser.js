import pdf from 'pdf-parse';
import mammoth from 'mammoth';
const clean = (s = '') => s.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
const splitLines = (text) => text.split('\n').map(clean).filter(Boolean);
const ALL_HEADERS = 'technical skills|skills|core competencies|work experience|professional experience|experience|work history|projects|selected projects|education|academic background|certifications|certification|awards|certifications and awards';

const section = (text, names, until = ALL_HEADERS) => {
  const header = names.join('|');
  const untilList = until.split('|').filter(h => !names.some(n => n.toLowerCase() === h.toLowerCase())).join('|');
  const re = new RegExp(`(?:^|\\n)\\s*(?:${header})\\s*[:\\n]?([\\s\\S]*?)(?=\\n\\s*(?:${untilList})\\s*[:\\n]|$|\\n\\s*[A-Z\\s]{4,25}\\n)`, 'i');
  return clean(text.match(re)?.[1] || '');
};

export function extractPdfLinks(pdfBuffer) {
  if (!pdfBuffer) return [];
  const bufferStr = pdfBuffer.toString('latin1');
  const links = [];
  const uriRegex = /\/URI\s*\(([^)]+)\)|\/URI\s*<([^>]+)>/g;
  let match;
  while ((match = uriRegex.exec(bufferStr)) !== null) {
    let url = match[1] || match[2];
    if (url) {
      if (match[2]) {
        try { url = Buffer.from(url, 'hex').toString('utf8'); } catch {}
      }
      links.push(url.trim());
    }
  }
  return [...new Set(links)];
}

export class ResumeParser {
  async textFromFile(file) {
    if (file.mimetype === 'application/pdf') return (await pdf(file.buffer)).text;
    if (/wordprocessingml|msword/.test(file.mimetype)) return (await mammoth.extractRawText({ buffer: file.buffer })).value;
    const err = new Error('Upload a PDF or DOCX file.'); err.status = 415; throw err;
  }
  async parse(file) {
    const text = await this.textFromFile(file); 
    const lines = splitLines(text);
    const embeddedLinks = file.mimetype === 'application/pdf' ? extractPdfLinks(file.buffer) : [];

    const email = embeddedLinks.find(l => /mailto:/i.test(l))?.replace(/^mailto:/i, '') || text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
    const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || '';
    
    const rawLoc = lines.find(l => /(?:india|usa|uk|remote|mumbai|maharashtra|delhi|bangalore)/i.test(l)) || '';
    const location = clean(rawLoc.split('|')[0].replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, '').replace(/(?:\+?\d[\d\s().-]{7,}\d)/, ''));

    const linkedin = embeddedLinks.find(l => /linkedin\.com\/in\//i.test(l)) || text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)?.[0] || '';
    const github = embeddedLinks.find(l => /github\.com\/[a-zA-Z0-9_-]+/i.test(l) && !/github\.io/i.test(l)) || text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i)?.[0] || '';
    const portfolio = embeddedLinks.find(l => /vercel\.app|github\.io|\.dev|\.me/i.test(l)) || text.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?vercel\.app\b|(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?github\.io\b/i)?.[0] || '';

    const skillsRaw = section(text, ['technical skills', 'skills', 'core competencies']);
    
    // Preserve skills section line-by-line exactly as structured in the user's resume
    const parseSkillsLines = (raw) => {
      if (!raw) return [];
      return raw.split(/\n+/).map(clean).filter(Boolean);
    };

    const toBullets = (value) => value.split(/\n|•|(?<!\d)\s[-–]\s/).map(clean).filter(Boolean);

    return {
      contact: { name: lines[0] || '', email, phone, location, linkedin, github, portfolio, links: embeddedLinks },
      summary: section(text, ['summary', 'profile', 'professional summary', 'objective']),
      skills: parseSkillsLines(skillsRaw),
      experience: toBullets(section(text, ['work experience', 'experience', 'employment', 'work history'])),
      education: toBullets(section(text, ['education', 'academic background'])),
      projects: toBullets(section(text, ['projects', 'selected projects'])),
      certifications: toBullets(section(text, ['certifications', 'certification', 'awards', 'certifications and awards'])),
      sourceText: text, 
      confidence: Math.min(0.96, 0.5 + (email ? 0.12 : 0) + (skillsRaw ? 0.16 : 0) + (text.length > 400 ? 0.18 : 0))
    };
  }
}
