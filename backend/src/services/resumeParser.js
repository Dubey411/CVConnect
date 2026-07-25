import pdf from 'pdf-parse';
import mammoth from 'mammoth';
const clean = (s = '') => s.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
const splitLines = (text) => text.split('\n').map(clean).filter(Boolean);
const section = (text, names, until = 'experience|education|projects|skills|certifications') => {
  const header = names.join('|'); const re = new RegExp(`(?:^|\\n)\\s*(?:${header})\\s*[:\\n]([\\s\\S]*?)(?=\\n\\s*(?:${until})\\s*[:\\n]|$)`, 'i');
  return clean(text.match(re)?.[1] || '');
};
export class ResumeParser {
  async textFromFile(file) {
    if (file.mimetype === 'application/pdf') return (await pdf(file.buffer)).text;
    if (/wordprocessingml|msword/.test(file.mimetype)) return (await mammoth.extractRawText({ buffer: file.buffer })).value;
    const err = new Error('Upload a PDF or DOCX file.'); err.status = 415; throw err;
  }
  async parse(file) {
    const text = await this.textFromFile(file); const lines = splitLines(text);
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
    const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || '';
    const skillsRaw = section(text, ['skills', 'technical skills', 'core competencies']);
    const toBullets = (value) => value.split(/\n|•|(?<!\d)\s[-–]\s/).map(clean).filter(Boolean);
    return {
      contact: { name: lines[0] || '', email, phone, location: lines.find(l => /(?:india|usa|uk|remote|mumbai|maharashtra|delhi|bangalore)/i.test(l)) || '' },
      summary: section(text, ['summary', 'profile', 'professional summary', 'objective'], 'experience|work history|education|projects|skills|certifications') || lines.slice(1, 4).join(' '),
      skills: skillsRaw.split(/[,;|\n]/).map(clean).filter(Boolean),
      experience: toBullets(section(text, ['experience', 'work experience', 'employment', 'work history'], 'education|projects|skills|certifications')),
      education: toBullets(section(text, ['education', 'academic background'], 'projects|skills|certifications')),
      projects: toBullets(section(text, ['projects', 'selected projects'], 'education|skills|certifications')),
      certifications: toBullets(section(text, ['certifications', 'certification', 'awards', 'certifications and awards'], 'experience|work history|education|projects|skills')),
      sourceText: text, confidence: Math.min(0.96, 0.5 + (email ? 0.12 : 0) + (skillsRaw ? 0.16 : 0) + (text.length > 400 ? 0.18 : 0))
    };
  }
}
