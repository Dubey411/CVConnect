import OpenAI from 'openai';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a professional ATS-optimised resume editor.
Rules you MUST follow:
1. Return ONLY valid JSON — no markdown fences, no explanations.
2. The JSON must match the shape: { contact, summary, skills, experience, education, projects, certifications }.
3. skills, experience, education, projects, and certifications MUST be flat arrays of strings (NOT objects). Preserve header lines, dates, and role/stack lines as separate string elements in experience/education/projects arrays.
4. NEVER invent skills, job titles, employers, metrics, dates, or qualifications not in the original.
5. You MAY: rephrase bullets with stronger action verbs, tighten language, reorder skills, update summary to mention the target role.
6. Keep all original factual content — do not remove experience entries, education, project names, or certifications.`;

// ─── ML-service fallback ──────────────────────────────────────────────────────
const mlRewrite = async (resume, job) => {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/rewrite`, { resume, job }, { timeout: 15000 });
    return { ...data, provider: 'ml-lexical-v2' };
  } catch (mlErr) {
    console.warn(`[ResumeRewriter] ML service unavailable (${mlErr?.message}). Using local fallback.`);
    return dumbLocalRewrite(resume, job);
  }
};

// ─── Last-resort local rewrite ────────────────────────────────────────────────
const dumbLocalRewrite = (resume = {}, job = {}) => {
  try {
    const r = typeof resume === 'object' && resume !== null ? resume : {};
    const j = typeof job === 'object' && job !== null ? job : {};
    const keywords = Array.isArray(j.skills) ? j.skills.slice(0, 6).join(', ') : 'key technologies';
    const summary = `${r.summary || 'Results-oriented professional.'} Tailored for ${j.title || 'the target position'}, with demonstrated experience aligned to ${keywords}.`;
    const optimized = {
      ...r,
      summary,
      skills: [...new Set([
        ...(Array.isArray(r.skills) ? r.skills : []),
        ...(Array.isArray(j.skills) ? j.skills.filter(s => (r.sourceText || '').toLowerCase().includes(String(s).toLowerCase())) : [])
      ])],
      experience: (Array.isArray(r.experience) ? r.experience : []).map(b =>
        typeof b === 'string' && !b.match(/^\s*(led|built|designed|delivered|managed|improved|created|developed)/i)
          ? `Delivered ${b}` : b
      )
    };
    const changes = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']
      .filter(key => JSON.stringify(r[key] || '') !== JSON.stringify(optimized[key] || ''))
      .map(section => ({ id: section, section, before: r[section] || '', after: optimized[section] || '', status: 'pending' }));
    return { optimized, changes, provider: 'safe-local-fallback' };
  } catch (err) {
    console.error('[ResumeRewriter] Local fallback error:', err.message);
    return {
      optimized: typeof resume === 'object' && resume !== null ? resume : { summary: 'Professional resume' },
      changes: [],
      provider: 'safe-empty-fallback'
    };
  }
};

// ─── LLM call helper ──────────────────────────────────────────────────────────
const callLLM = async (client, model, resume, job) => {
  const prompt = `Optimise this resume for the target job. Return only the improved JSON object.

RESUME:
${JSON.stringify(resume, null, 2)}

TARGET JOB:
${JSON.stringify({ title: job.title, description: job.description, skills: job.skills }, null, 2)}`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.25,
    max_tokens: 3000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });

  const raw = completion.choices[0].message.content.trim();
  // Strip any accidental markdown fences
  const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(jsonStr);
};

// ─── Diff helper ──────────────────────────────────────────────────────────────
function diffChanges(original, optimized) {
  return ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']
    .filter(key => JSON.stringify(original[key] || '') !== JSON.stringify(optimized[key] || ''))
    .map(section => ({
      id: section,
      section,
      before: original[section] || '',
      after: optimized[section] || '',
      status: 'pending'
    }));
}

// ─── ResumeRewriter ───────────────────────────────────────────────────────────
export class ResumeRewriter {
  constructor() {
    if (process.env.OPENROUTER_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://cvconnect.app',
          'X-Title': 'CVConnect'
        }
      });
      this.model         = process.env.OPENROUTER_MODEL          || 'google/gemini-2.0-flash-exp:free';
      this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
      this.provider = 'openrouter';
      console.log(`[ResumeRewriter] OpenRouter ready — primary: ${this.model} | fallback: ${this.fallbackModel}`);
    } else if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      this.fallbackModel = null;
      this.provider = 'openai';
      console.log(`[ResumeRewriter] OpenAI ready — model: ${this.model}`);
    } else {
      this.client = null;
      this.provider = 'ml-lexical-v2';
      console.log('[ResumeRewriter] No LLM key — using ML service only.');
    }
  }

  async rewrite(resume, job) {
    if (!this.client) return mlRewrite(resume, job);

    // Primary model
    try {
      console.log(`[ResumeRewriter] Calling ${this.provider} primary (${this.model})...`);
      const optimized = await callLLM(this.client, this.model, resume, job);
      return {
        optimized,
        changes: diffChanges(resume, optimized),
        provider: `${this.provider}/${this.model}`
      };
    } catch (primaryErr) {
      console.warn(`[ResumeRewriter] Primary failed: ${primaryErr?.status || primaryErr?.message}`);
    }

    // Fallback model
    if (this.fallbackModel) {
      try {
        console.log(`[ResumeRewriter] Trying fallback (${this.fallbackModel})...`);
        const optimized = await callLLM(this.client, this.fallbackModel, resume, job);
        return {
          optimized,
          changes: diffChanges(resume, optimized),
          provider: `${this.provider}/${this.fallbackModel}`
        };
      } catch (fallbackErr) {
        console.warn(`[ResumeRewriter] Fallback failed: ${fallbackErr?.status || fallbackErr?.message}`);
      }
    }

    // Both LLMs failed — ML service
    return mlRewrite(resume, job);
  }
}
