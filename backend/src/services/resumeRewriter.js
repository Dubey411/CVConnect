import OpenAI from 'openai';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Fallback: calls the ML service /rewrite endpoint.
 * If the ML service is also unavailable, falls back to the dumb local rewriter.
 */
const mlRewrite = async (resume, job) => {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/rewrite`, { resume, job }, { timeout: 15000 });
    return { ...data, provider: 'ml-lexical-v2' };
  } catch (mlErr) {
    console.warn(`[ResumeRewriter] ML service unavailable (${mlErr?.message}). Using dumb local fallback.`);
    return dumbLocalRewrite(resume, job);
  }
};

/**
 * Last-resort local rewrite — no network required.
 */
const dumbLocalRewrite = (resume, job) => {
  const keywords = (job.skills || []).slice(0, 6).join(', ');
  const summary = `${resume.summary || 'Results-oriented professional'} Tailored for ${job.title}, with demonstrated experience aligned to ${keywords}.`;
  const optimized = {
    ...resume,
    summary,
    skills: [...new Set([
      ...(resume.skills || []),
      ...(job.skills || []).filter(s => (resume.sourceText || '').toLowerCase().includes(s.toLowerCase()))
    ])],
    experience: (resume.experience || []).map(b =>
      typeof b === 'string' && !b.match(/^\s*(led|built|designed|delivered|managed|improved|created)/i)
        ? `Delivered ${b}`
        : b
    )
  };
  const changes = ['summary', 'skills', 'experience', 'projects', 'education']
    .filter(key => JSON.stringify(resume[key] || '') !== JSON.stringify(optimized[key] || ''))
    .map(section => ({ id: section, section, before: resume[section] || '', after: optimized[section] || '', status: 'pending' }));
  return { optimized, changes, provider: 'safe-local-fallback' };
};

export class ResumeRewriter {
  constructor() {
    if (process.env.DEEPSEEK_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'
      });
      this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      this.provider = 'deepseek';
    } else if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      this.provider = 'openai';
    } else {
      this.client = null;
      this.provider = 'ml-lexical-v2';
    }
  }

  async rewrite(resume, job) {
    let result;

    if (this.client) {
      try {
        const prompt = `Return only valid JSON matching the resume object. Improve clarity and ATS relevance for the job. Never invent skills, titles, employers, metrics, qualifications or dates. You may only surface terms supported by the original resume.\nRESUME:${JSON.stringify(resume)}\nJOB:${JSON.stringify({ title: job.title, description: job.description, skills: job.skills })}`;
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a rigorous resume editor. Preserve truth. Return an object with contact, summary, skills, experience, education, projects.' },
            { role: 'user', content: prompt }
          ]
        });
        const optimized = JSON.parse(completion.choices[0].message.content);
        const changes = ['summary', 'skills', 'experience', 'projects', 'education']
          .filter(key => JSON.stringify(resume[key] || '') !== JSON.stringify(optimized[key] || ''))
          .map(section => ({
            id: section, section,
            before: resume[section] || '',
            after: optimized[section] || '',
            status: 'pending'
          }));
        result = { optimized, changes, provider: this.provider };
      } catch (apiErr) {
        console.warn(`[ResumeRewriter] ${this.provider} API error (${apiErr?.status || apiErr?.message}). Falling back to ML service.`);
        result = await mlRewrite(resume, job);
      }
    } else {
      // No LLM configured — use ML service directly
      result = await mlRewrite(resume, job);
    }

    return result;
  }
}
