import { Router } from 'express';
import {
  analyzeText,
  tfidfSimilarity,
  inferDomainFromText,
  mlRewriteEngine,
  predictSkillGap,
  ALL_SKILLS
} from '../services/mlEngine.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cvconnect-ml-in-process',
    engine: 'in-process-ml-v2',
    totalSkillsIndexed: ALL_SKILLS.length
  });
});

router.post('/analyze', (req, res) => {
  const text = req.body?.text || '';
  const result = analyzeText(text);
  res.json(result);
});

router.post('/similarity', (req, res) => {
  const first = req.body?.first || '';
  const second = req.body?.second || '';
  const score = tfidfSimilarity(first, second);
  res.json({ score });
});

router.post('/classify', (req, res) => {
  const text = req.body?.text || '';
  const domain = inferDomainFromText(text);
  res.json({ domain });
});

router.post('/rewrite', (req, res) => {
  const resume = req.body?.resume || {};
  const job = req.body?.job || {};
  const result = mlRewriteEngine(resume, job);
  res.json(result);
});

router.post('/skill-gap', (req, res) => {
  const title = req.body?.title || '';
  const domain = req.body?.domain || 'engineering';
  const resumeSkills = req.body?.resumeSkills || [];
  const gap = predictSkillGap(title, domain, resumeSkills);
  res.json({ gap });
});

export default router;
