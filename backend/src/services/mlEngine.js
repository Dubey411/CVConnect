/**
 * mlEngine.js — Native in-process ML and NLP intelligence for CVConnect.
 * Consolidated from standalone Python ml-service for zero-cold-start deployment.
 */

// ─── Skill Taxonomy ──────────────────────────────────────────────────────────
export const SKILLS = {
  engineering: [
    'javascript', 'typescript', 'react', 'redux', 'node.js', 'express',
    'python', 'java', 'c++', 'sql', 'postgresql', 'mysql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'graphql',
    'rest api', 'git', 'ci/cd', 'flask', 'django', 'fastapi', 'spring boot',
    'angular', 'vue.js', 'next.js', 'redis', 'elasticsearch', 'rabbitmq',
    'kafka', 'microservices', 'linux', 'bash', 'rust', 'go', 'kotlin', 'swift'
  ],
  data: [
    'machine learning', 'deep learning', 'nlp', 'pandas', 'numpy',
    'tableau', 'power bi', 'excel', 'statistics', 'data analysis',
    'tensorflow', 'pytorch', 'scikit-learn', 'spark', 'hadoop', 'data pipeline',
    'etl', 'data warehouse', 'looker', 'dbt', 'a/b testing', 'feature engineering'
  ],
  design: [
    'figma', 'adobe xd', 'sketch', 'illustrator', 'photoshop', 'indesign',
    'after effects', 'blender', 'canva', 'ui design', 'ux design', 'wireframing',
    'prototyping', 'user research', 'accessibility', 'typography'
  ],
  product: [
    'product management', 'agile', 'scrum', 'roadmap', 'stakeholder management',
    'communication', 'leadership', 'jira', 'confluence', 'okr', 'kpi',
    'product strategy', 'go-to-market', 'customer discovery', 'sprint planning'
  ],
  marketing: [
    'seo', 'social media marketing', 'content writing', 'digital marketing',
    'email marketing', 'google analytics', 'facebook ads', 'copywriting',
    'brand management', 'marketing strategy', 'ms-office', 'excel'
  ]
};

export const ALL_SKILLS = Array.from(new Set(Object.values(SKILLS).flat()));

// ─── Action Verbs Taxonomy ───────────────────────────────────────────────────
export const ACTION_VERBS = {
  engineering: [
    'Architected', 'Engineered', 'Developed', 'Implemented', 'Deployed',
    'Optimised', 'Refactored', 'Integrated', 'Automated', 'Containerised',
    'Designed', 'Built', 'Migrated', 'Scaled', 'Streamlined'
  ],
  data: [
    'Analysed', 'Modelled', 'Processed', 'Visualised', 'Trained',
    'Evaluated', 'Extracted', 'Transformed', 'Predicted', 'Curated',
    'Benchmarked', 'Tuned', 'Validated', 'Aggregated', 'Deployed'
  ],
  design: [
    'Designed', 'Prototyped', 'Wireframed', 'Researched', 'Iterated',
    'Collaborated', 'Illustrated', 'Visualised', 'Produced', 'Crafted'
  ],
  product: [
    'Led', 'Defined', 'Prioritised', 'Shipped', 'Coordinated',
    'Aligned', 'Researched', 'Launched', 'Managed', 'Improved'
  ],
  marketing: [
    'Grew', 'Managed', 'Executed', 'Launched', 'Drove', 'Optimised',
    'Tracked', 'Analysed', 'Coordinated', 'Created'
  ],
  default: [
    'Delivered', 'Contributed', 'Enhanced', 'Created',
    'Maintained', 'Improved', 'Enabled', 'Supported'
  ]
};

export const WEAK_OPENERS = /^\s*(responsible for|helped|assisted|worked on|contributed to|was involved in|participated in|tasked with|duties included)\b/i;

// ─── Text Normalisation and Lexical Matchers ─────────────────────────────────
export function normText(text) {
  if (!text || typeof text !== 'string') return ' ';
  return ' ' + text.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ') + ' ';
}

export function lexSkills(text) {
  const h = normText(text);
  const found = new Set();
  for (const s of ALL_SKILLS) {
    const sClean = s.replace(/\./g, '').replace(/-/g, '');
    if (h.includes(` ${s} `) || h.includes(` ${sClean} `)) {
      found.add(s);
    }
  }
  return Array.from(found).sort();
}

export function tokens(text) {
  if (!text || typeof text !== 'string') return new Set();
  const matches = text.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) || [];
  return new Set(matches);
}

export function tfidfSimilarity(textA, textB) {
  const one = tokens(textA);
  const two = tokens(textB);
  if (one.size === 0 || two.size === 0) return 0.0;
  let intersection = 0;
  for (const t of one) {
    if (two.has(t)) intersection++;
  }
  const score = intersection / Math.sqrt(one.size * two.size);
  return Math.round(score * 10000) / 10000;
}

export function inferDomainFromText(text) {
  const t = (text || '').toLowerCase();
  let bestDomain = 'engineering';
  let bestScore = 0;
  for (const [domain, keywords] of Object.entries(SKILLS)) {
    let score = 0;
    for (const kw of keywords) {
      if (t.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }
  return bestDomain;
}

export function strengthenBullet(bullet, domain = 'engineering') {
  if (!bullet || typeof bullet !== 'string') return bullet;
  let b = bullet.trim().replace(WEAK_OPENERS, '').trim().replace(/\.+$/, '');
  if (!b) return bullet;

  const alreadyStrong = /^(built|led|made|ran|drove|designed|wrote|created|grew|spearheaded|won|taught|launched|managed|researched|analysed|analyzed|coordinated|produced|shipped|[A-Z][a-z]+ed)\b/i;
  if (alreadyStrong.test(b)) {
    return b + '.';
  }

  const verbs = ACTION_VERBS[domain] || ACTION_VERBS.default;
  const hash = b.slice(0, 10).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const verb = verbs[hash % verbs.length];
  const remainder = b.length > 1 ? b[0].toLowerCase() + b.slice(1) : b.toLowerCase();
  return `${verb} ${remainder}.`;
}

export function gapFillSkills(resumeSkills = [], jobSkills = [], sourceText = '') {
  const src = (sourceText || '').toLowerCase();
  const resSet = new Set(resumeSkills.map(s => String(s).toLowerCase()));
  const newSkills = [];

  for (const js of jobSkills) {
    const s = String(js).toLowerCase();
    if (!resSet.has(s)) {
      const sNoDot = s.replace(/\./g, '');
      if (src.includes(s) || src.includes(sNoDot)) {
        newSkills.push(js);
      }
    }
  }
  return Array.from(new Set([...resumeSkills, ...newSkills]));
}

export function tailorSummary(summary, job = {}, domain = 'engineering', gap = []) {
  const title = job.title || 'the target position';
  let s = summary || 'Results-driven professional with a track record of delivering quality technical work.';
  if (s.toLowerCase().includes(title.toLowerCase())) return s;

  let tail = ` Applying this experience to ${title}`;
  if (gap.length > 0) {
    tail += `, with particular alignment to ${gap.slice(0, 3).join(', ')}`;
  }
  return s.replace(/\.+$/, '') + tail + '.';
}

export function predictSkillGap(title = '', domain = 'engineering', resumeSkills = []) {
  const candidateSkills = SKILLS[domain] || SKILLS.engineering;
  const existing = new Set(resumeSkills.map(s => String(s).toLowerCase()));
  return candidateSkills.filter(s => !existing.has(s.toLowerCase())).slice(0, 15);
}

// ─── Complete Resume Rewrite Engine ──────────────────────────────────────────
export function mlRewriteEngine(resume = {}, job = {}) {
  const resumeSkills = resume.skills || [];
  const jobSkills = (job.skills || []).map(s => String(s).toLowerCase());
  const sourceText = resume.sourceText || '';
  const jobTitle = job.title || '';

  // 1. Domain classification
  let jobSkillsText = jobSkills.join(' ');
  if (!jobSkillsText) {
    jobSkillsText = lexSkills(job.description || '').join(' ');
  }
  const combinedText = `${jobTitle} ${jobSkillsText}`;
  const domain = inferDomainFromText(combinedText);

  // 2. Predict skill gap
  const datasetGap = predictSkillGap(jobTitle, domain, resumeSkills);
  const allTargetSkills = Array.from(new Set([...jobSkills, ...datasetGap]));

  // 3. Truth-preserving gap fill
  const optimizedSkills = gapFillSkills(resumeSkills, allTargetSkills, sourceText);

  // 4. Strengthen experience bullets
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const MONTHS = new Set(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']);
  const BULLET_STARTERS = /^(completed|engineered|collaborated|architected|led|designed|developed|built|managed|implemented|optimized|monitored|applied|generated|owned|assisted|helped|created|worked|delivered|analysed|modelled|processed|visualised|trained|evaluated|extracted|transformed|predicted|curated|benchmarked|tuned|validated|aggregated|deployed|contributed|supported|enhanced|maintained|reviewed|established|improved|enabled|reduced|increased|launched|spearheaded|drove|streamlined|automated|integrated|coordinated|conducted|produced|performed)\b/i;

  function isBullet(line) {
    if (typeof line !== 'string') return false;
    const s = line.trim();
    const lower = s.toLowerCase();
    if (s.length < 30) return false;
    if (s.includes('|') || s.includes('@')) return false;
    if (lower.startsWith('role:') || lower.startsWith('tech stack:') || lower.startsWith('tools')) return false;
    const words = lower.split(/\s+/);
    if (words.some(w => MONTHS.has(w))) return false;
    if (/\b\d{4}\b/.test(lower) || /\b\d+\s*month/.test(lower)) return false;
    return BULLET_STARTERS.test(s) || s.length > 60;
  }

  const optimizedExperience = experience.map(b => (isBullet(b) ? strengthenBullet(b, domain) : b));

  // 5. Tailor summary
  const existingSet = new Set(resumeSkills.map(s => String(s).toLowerCase()));
  const skillGapList = allTargetSkills.filter(s => !existingSet.has(s.toLowerCase()));
  const optimizedSummary = tailorSummary(resume.summary || '', job, domain, skillGapList);

  const optimized = {
    ...resume,
    summary: optimizedSummary,
    skills: optimizedSkills,
    experience: optimizedExperience
  };

  // 6. Diff changes
  const changes = [];
  for (const key of ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']) {
    const before = resume[key] || '';
    const after = optimized[key] || '';
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.append ? changes.append({ id: key, section: key, before, after, status: 'pending' }) : changes.push({ id: key, section: key, before, after, status: 'pending' });
    }
  }

  return {
    optimized,
    changes,
    provider: 'in-process-ml-v2',
    domain,
    skill_gap: skillGapList.slice(0, 10),
    dataset_skills_added: datasetGap.filter(s => !existingSet.has(s.toLowerCase()) && optimizedSkills.map(x => String(x).toLowerCase()).includes(s.toLowerCase()))
  };
}

export function analyzeText(text) {
  const skills = lexSkills(text || '');
  const entities = skills.map(s => {
    const grp = Object.entries(SKILLS).find(([, list]) => list.includes(s));
    return { text: s, label: grp ? grp[0] : 'other' };
  });
  return { skills, entities, embedding: [], model: 'in-process-ml-v2' };
}
