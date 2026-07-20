import { analyzeText, similarity } from './mlClient.js';
const tokenize = (s) => s.toLowerCase().match(/[a-z][a-z+#. -]{1,}/g) || [];
const density = (text, phrases) => !phrases.length ? 1 : Math.min(1, phrases.filter(p => text.toLowerCase().includes(p.toLowerCase())).length / phrases.length);
export class SkillMatcher {
  async match(resume, job) {
    const [resumeNlp, jobNlp, semantic] = await Promise.all([analyzeText(resume.sourceText || JSON.stringify(resume)), analyzeText(job.description), similarity(resume.sourceText || JSON.stringify(resume), job.description)]);
    const resumeSkills = [...new Set([...(resume.skills || []), ...(resumeNlp.skills || [])].map(s => s.toLowerCase()))];
    const jobSkills = [...new Set([...(job.skills || []), ...(jobNlp.skills || [])].map(s => s.toLowerCase()))];
    const matchedSkills = jobSkills.filter(s => resumeSkills.some(r => r.includes(s) || s.includes(r)));
    const missingSkills = jobSkills.filter(s => !matchedSkills.includes(s));
    const experienceText = (resume.experience || []).join(' ');
    const responsibilities = job.requirements?.responsibilities || tokenize(job.description).filter(x => x.length > 8).slice(0, 12);
    const components = {
      skills: jobSkills.length ? matchedSkills.length / jobSkills.length : 0.7,
      experience: Math.min(1, semantic * 1.15),
      keywords: density(`${resume.summary || ''} ${experienceText}`, jobSkills),
      domain: semantic,
      education: /bachelor|master|degree|university|college/i.test((resume.education || []).join(' ')) ? 0.8 : 0.45
    };
    const score = Math.round(100 * (components.skills * .35 + components.experience * .25 + components.keywords * .15 + components.domain * .15 + components.education * .10));
    const atsScore = Math.min(100, Math.round(score * .78 + (resume.contact?.email ? 10 : 0) + (resume.experience?.length ? 8 : 0) + (resume.skills?.length ? 6 : 0)));
    return { score, atsScore, components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Math.round(value * 100)])), matchedSkills, missingSkills, responsibilities, recommendations: missingSkills.slice(0, 6).map(skill => ({ skill, priority: ['javascript','react','python','sql'].includes(skill) ? 'high' : 'medium', resource: `Build evidence of ${skill} through a focused course or portfolio project.` })) };
  }
}
