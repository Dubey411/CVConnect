import { Router } from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { cached } from '../lib/cache.js';
import { ResumeParser } from '../services/resumeParser.js';
import { SkillMatcher } from '../services/skillMatcher.js';
import { ResumeRewriter } from '../services/resumeRewriter.js';
import { analyzeText } from '../services/mlClient.js';
import { authenticate } from '../middleware/auth.js';
import { storeResumeSource } from '../lib/storage.js';
import { encryptToken, verifyPlatformToken } from '../lib/vault.js';
import { JobScraper } from '../services/jobScraper.js';
import { BotRunner } from '../services/botRunner.js';
import {
  launchLoginSession,
  validateSession,
  deleteSession,
  getSessions,
  getSupportedPlatforms,
} from '../services/sessionManager.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, files: 1 }, (req, file, cb) => (/pdf|word|officedocument/.test(file.mimetype) ? cb(null, true) : cb(Object.assign(new Error('Only PDF and DOCX resumes are supported.'), { status: 415 }))));
const validate = (req, res, next) => { const e = validationResult(req); return e.isEmpty() ? next() : res.status(422).json({ error: { code: 'VALIDATION_ERROR', details: e.array() } }); };
const ownedResume = async (id, userId) => { const resume = await prisma.resume.findFirst({ where: { id, userId }, include: { job: true } }); if (!resume) { const err = new Error('Resume not found.'); err.status = 404; throw err; } return resume; };
router.use(authenticate);
router.get('/applications', async (req, res, next) => { try { const applications = await prisma.jobApplication.findMany({ where: { userId: req.user.sub }, orderBy: { createdAt: 'desc' }, take: 50, include: { job: { select: { title: true, company: true } } } }); res.json({ applications }); } catch (e) { next(e); } });
router.post('/applications/apply', [body('platform').trim().isString(), body('resumeId').isString(), body('jobId').optional().isString(), body('targetUrl').optional().isString()], validate, async (req, res, next) => { try { const { platform, resumeId, jobId, targetUrl } = req.body;
  if (!targetUrl) return res.status(400).json({ error: { code: 'URL_REQUIRED', message: 'No target URL provided. Add a job URL before triggering auto-apply.' } });
  // Check browser session first, then fall back to token connection
  const [browserSession, tokenConnection] = await Promise.all([
    prisma.browserSession.findUnique({ where: { userId_platform: { userId: req.user.sub, platform } } }),
    prisma.platformConnection.findUnique({ where: { userId_platform: { userId: req.user.sub, platform } } }),
  ]);
  const hasSession = browserSession?.status === 'connected';
  const hasToken   = tokenConnection?.status === 'connected';
  if (!hasSession && !hasToken) return res.status(400).json({ error: { code: 'PLATFORM_NOT_CONNECTED', message: `Please connect your ${platform} account in Accounts or Connect Platforms first.` } });
  const application = await prisma.jobApplication.create({ data: { userId: req.user.sub, jobId: jobId || null, platform, targetUrl, status: 'pending' } });
  const io = req.app.get('io');
  new BotRunner(io).runApplication({ userId: req.user.sub, applicationId: application.id, jobId, platform, resumeId, targetUrl, useBrowserSession: hasSession }).catch(err => console.error('[BotRunner Async Error]:', err.message));
  res.status(202).json({ application, message: `Automated application to ${platform} initiated.` }); } catch (e) { next(e); } });
router.post('/jobs/scrape', [body('url').trim().isURL()], validate, async (req, res, next) => { try { const jobData = await new JobScraper().scrape(req.body.url); res.json({ job: jobData }); } catch (e) { if (e.code === 'SITE_PROTECTED' || e.status === 400) { return res.status(400).json({ error: { code: e.code || 'JOB_SCRAPE_FAILED', message: e.message, guessedTitle: e.guessedTitle || '', guessedCompany: e.guessedCompany || '', isProtected: Boolean(e.code === 'SITE_PROTECTED') } }); } next(e); } });
router.post('/resumes/upload', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Choose a resume to upload.' } });
    const category = req.body.category || 'General';
    const title = req.body.title || req.file.originalname || 'Resume.pdf';
    req.app.get('io')?.to(req.user.sub).emit('resume:progress', { stage: 'parsing', percent: 35 });
    const [original, sourceUrl] = await Promise.all([new ResumeParser().parse(req.file), storeResumeSource(req.file, req.user.sub)]);
    const resume = await prisma.resume.create({ data: { userId: req.user.sub, category, title, original, sourceUrl, status: 'completed' } });
    req.app.get('io')?.to(req.user.sub).emit('resume:progress', { resumeId: resume.id, stage: 'complete', percent: 100 });
    res.status(201).json({ resume });
  } catch (e) { next(e); }
});

router.patch('/resumes/:id/category', [param('id').isString(), body('category').isString(), body('title').optional().isString()], validate, async (req, res, next) => {
  try {
    const resume = await ownedResume(req.params.id, req.user.sub);
    const updated = await prisma.resume.update({
      where: { id: resume.id },
      data: {
        category: req.body.category,
        ...(req.body.title && { title: req.body.title })
      }
    });
    res.json({ resume: updated, message: `Resume category updated to ${req.body.category}.` });
  } catch (e) { next(e); }
});

router.get('/resumes', async (req, res, next) => { try { const page = Math.max(1, Number(req.query.page) || 1); const take = Math.min(20, Math.max(1, Number(req.query.limit) || 20)); const category = req.query.category ? String(req.query.category) : undefined; const where = { userId: req.user.sub, ...(category && { category }) }; const [items, total] = await prisma.$transaction([prisma.resume.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * take, take, include: { job: { select: { title: true, company: true } } } }), prisma.resume.count({ where })]); res.json({ items, pagination: { page, limit: take, total, pages: Math.ceil(total / take) } }); } catch (e) { next(e); } });
router.get('/resumes/:id', [param('id').isString()], validate, async (req, res, next) => { try { res.json({ resume: await ownedResume(req.params.id, req.user.sub) }); } catch (e) { next(e); } });
router.delete('/resumes/:id', [param('id').isString()], validate, async (req, res, next) => { try { const resume = await ownedResume(req.params.id, req.user.sub); await prisma.resume.delete({ where: { id: resume.id } }); res.json({ success: true, id: resume.id, message: 'Resume deleted successfully.' }); } catch (e) { next(e); } });
router.post('/jobs/analyze', [body('title').trim().isLength({ min: 2, max: 140 }), body('description').trim().isLength({ min: 20, max: 50000 }), body('company').optional().trim().isLength({ max: 140 })], validate, async (req, res, next) => { try { const { title, description, company } = req.body; const nlp = await cached(`job:${Buffer.from(description).toString('base64').slice(0, 80)}`, 86400, () => analyzeText(description)); const requirements = { responsibilities: description.split(/[.!?]\s/).filter(s => /responsib|experience|build|lead|deliver/i.test(s)).slice(0, 8), mustHave: nlp.skills.slice(0, Math.ceil(nlp.skills.length * .65)), niceToHave: nlp.skills.slice(Math.ceil(nlp.skills.length * .65)) }; const job = await prisma.job.create({ data: { userId: req.user.sub, title, company, description, skills: nlp.skills, requirements } }); res.status(201).json({ job }); } catch (e) { next(e); } });
router.post('/resumes/:id/match', [param('id').isString(), body('jobId').isString()], validate, async (req, res, next) => { try { const [resume, job] = await Promise.all([ownedResume(req.params.id, req.user.sub), prisma.job.findFirst({ where: { id: req.body.jobId, userId: req.user.sub } })]); if (!job) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Job description not found.' } }); const analysis = await cached(`match:${resume.id}:${job.id}`, 3600, () => new SkillMatcher().match(resume.original, job)); const saved = await prisma.resume.update({ where: { id: resume.id }, data: { jobId: job.id, matchScore: analysis.score, atsScore: analysis.atsScore, analysis, skillGap: analysis.missingSkills } }); res.json({ resume: saved, analysis }); } catch (e) { next(e); } });
router.post('/resumes/:id/rewrite', [param('id').isString(), body('jobId').isString()], validate, async (req, res, next) => { try { const resume = await ownedResume(req.params.id, req.user.sub); const job = await prisma.job.findFirst({ where: { id: req.body.jobId, userId: req.user.sub } }); if (!job) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Job description not found.' } }); req.app.get('io')?.to(req.user.sub).emit('resume:progress', { resumeId: resume.id, stage: 'rewriting', percent: 45 }); const rewrite = await new ResumeRewriter().rewrite(resume.original, job); const saved = await prisma.resume.update({ where: { id: resume.id }, data: { optimized: { ...rewrite.optimized, changes: rewrite.changes, provider: rewrite.provider } } }); req.app.get('io')?.to(req.user.sub).emit('resume:progress', { resumeId: resume.id, stage: 'complete', percent: 100 }); res.json({ resume: saved, ...rewrite }); } catch (e) { next(e); } });
router.get('/users/me', async (req, res, next) => { try { const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, email: true, name: true, createdAt: true } }); res.json({ user }); } catch (e) { next(e); } });
router.put('/users/me', [body('name').trim().isLength({ min: 2, max: 80 })], validate, async (req, res, next) => { try { const user = await prisma.user.update({ where: { id: req.user.sub }, data: { name: req.body.name }, select: { id: true, email: true, name: true } }); res.json({ user }); } catch (e) { next(e); } });
router.get('/platforms', async (req, res, next) => {
  try {
    const connections = await prisma.platformConnection.findMany({
      where: { userId: req.user.sub },
      select: {
        id: true,
        platform: true,
        accountEmail: true,
        status: true,
        applicationsCount: true,
        tokenExpiresAt: true,
        lastSyncAt: true,
        createdAt: true
      }
    });
    res.json({ connections });
  } catch (e) {
    next(e);
  }
});

// GET /platforms/health - returns session health, JWT expiry countdown & stale warnings
router.get('/platforms/health', async (req, res, next) => {
  try {
    const connections = await prisma.platformConnection.findMany({
      where: { userId: req.user.sub },
      select: {
        id: true,
        platform: true,
        accountEmail: true,
        status: true,
        tokenExpiresAt: true,
        lastSyncAt: true,
        updatedAt: true
      }
    });

    const now = new Date();
    const health = connections.map(conn => {
      let healthStatus = 'healthy';
      let daysRemaining = null;
      let message = 'Session active and healthy';

      if (conn.status === 'expired') {
        healthStatus = 'expired';
        message = 'Session has expired. Re-authentication required.';
      } else if (conn.tokenExpiresAt) {
        const expDate = new Date(conn.tokenExpiresAt);
        const diffMs = expDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (diffMs <= 0) {
          healthStatus = 'expired';
          message = 'JWT token has expired. Please log in and re-copy token.';
        } else if (daysRemaining <= 3) {
          healthStatus = 'expiring_soon';
          message = `Token expires in ${daysRemaining} day(s). Re-authentication recommended soon.`;
        } else {
          healthStatus = 'healthy';
          message = `Token valid for ${daysRemaining} days.`;
        }
      } else {
        // Cookie-based platforms without explicit JWT expiry
        const daysSinceSync = Math.floor((now.getTime() - new Date(conn.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceSync > 30) {
          healthStatus = 'likely_expired';
          message = 'No activity in over 30 days. Cookie may have expired on platform.';
        } else if (daysSinceSync > 7) {
          healthStatus = 'stale_warning';
          message = `Last synced ${daysSinceSync} days ago. Ensure you remain logged in on web.`;
        }
      }

      return {
        id: conn.id,
        platform: conn.platform,
        accountEmail: conn.accountEmail,
        status: conn.status,
        healthStatus,
        tokenExpiresAt: conn.tokenExpiresAt,
        daysRemaining,
        lastSyncAt: conn.lastSyncAt,
        message
      };
    });

    res.json({ health });
  } catch (e) {
    next(e);
  }
});

// Lightweight token probe — verifies without persisting (used for live feedback in Connect modal)
router.post('/platforms/verify', [body('platform').trim().isString().isLength({ min: 2, max: 40 }), body('token').trim().isLength({ min: 4, max: 5000 })], validate, async (req, res, next) => {
  try {
    const { platform, token } = req.body;
    const result = await verifyPlatformToken(platform, token);
    res.json({
      valid: true,
      method: result.method,
      username: result.username || null,
      expiresAt: result.expiresAt || null
    });
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ error: { code: 'TOKEN_INVALID', message: e.message } });
    next(e);
  }
});

router.post('/platforms/connect', [body('platform').trim().isString().isLength({ min: 2, max: 40 }), body('accountEmail').trim().isEmail(), body('token').trim().isLength({ min: 4, max: 5000 })], validate, async (req, res, next) => {
  try {
    const { platform, accountEmail, token } = req.body;
    const verifyResult = await verifyPlatformToken(platform, token);
    const { encryptedToken, iv, authTag } = encryptToken(token);
    const tokenExpiresAt = verifyResult.expiresAt ? new Date(verifyResult.expiresAt) : null;

    const connection = await prisma.platformConnection.upsert({
      where: { userId_platform: { userId: req.user.sub, platform } },
      update: { accountEmail, encryptedToken, iv, authTag, status: 'connected', tokenExpiresAt, lastSyncAt: new Date() },
      create: { userId: req.user.sub, platform, accountEmail, encryptedToken, iv, authTag, status: 'connected', tokenExpiresAt },
      select: { id: true, platform: true, accountEmail: true, status: true, applicationsCount: true, tokenExpiresAt: true, lastSyncAt: true }
    });

    res.json({
      connection,
      message: `${platform} connected securely.`,
      verification: {
        method: verifyResult.method,
        username: verifyResult.username || null,
        expiresAt: verifyResult.expiresAt || null
      }
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/platforms/:platform', [param('platform').isString()], validate, async (req, res, next) => {
  try {
    await prisma.platformConnection.deleteMany({ where: { userId: req.user.sub, platform: req.params.platform } });
    res.json({ success: true, message: `Disconnected ${req.params.platform}.` });
  } catch (e) {
    next(e);
  }
});

// ─── Browser Session Routes (/sessions/*) ────────────────────────────────────

// GET /sessions — list all persistent browser sessions for the user
router.get('/sessions', async (req, res, next) => {
  try {
    const [sessions, platforms] = await Promise.all([
      getSessions(req.user.sub),
      Promise.resolve(getSupportedPlatforms()),
    ]);
    res.json({ sessions, supportedPlatforms: platforms });
  } catch (e) { next(e); }
});

// POST /sessions/:platform/launch — start non-headless login flow
router.post('/sessions/:platform/launch', [param('platform').isString().isLength({ min: 2, max: 40 })], validate, async (req, res, next) => {
  try {
    const { platform } = req.params;
    const io = req.app.get('io');
    // Respond immediately; login flow is async (user must interact with browser)
    res.status(202).json({ message: `Opening ${platform} login window. Watch the browser that appears on your screen.` });
    // Run login in background — emits session:status events via WebSocket
    launchLoginSession(req.user.sub, platform, io)
      .catch(err => {
        console.error(`[SessionManager] Login failed for ${platform}:`, err.message);
        io?.to(req.user.sub).emit('session:status', { platform, status: 'failed', message: err.message });
      });
  } catch (e) { next(e); }
});

// POST /sessions/:platform/validate — headless check of existing session
router.post('/sessions/:platform/validate', [param('platform').isString()], validate, async (req, res, next) => {
  try {
    const result = await validateSession(req.user.sub, req.params.platform, req.app.get('io'));
    res.json(result);
  } catch (e) { next(e); }
});

// DELETE /sessions/:platform — disconnect and delete profile
router.delete('/sessions/:platform', [param('platform').isString()], validate, async (req, res, next) => {
  try {
    await deleteSession(req.user.sub, req.params.platform);
    res.json({ success: true, message: `${req.params.platform} session disconnected.` });
  } catch (e) { next(e); }
});

// ─── Automation & Application Controls (/automation/*) ───────────────────────

// GET /automation/rules — fetch daily limits, target roles, and today's application metrics
router.get('/automation/rules', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const platforms = ['unstop', 'wellfound', 'linkedin', 'internshala', 'indeed', 'glassdoor', 'naukri'];

    const [rules, todayApps, totalApps] = await Promise.all([
      prisma.automationRule.findMany({ where: { userId } }),
      prisma.jobApplication.groupBy({
        by: ['platform'],
        where: { userId, createdAt: { gte: startOfToday } },
        _count: { id: true },
      }),
      prisma.jobApplication.groupBy({
        by: ['platform'],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    const rulesMap = Object.fromEntries(rules.map(r => [r.platform, r]));
    const todayMap = Object.fromEntries(todayApps.map(a => [a.platform, a._count.id]));
    const totalMap = Object.fromEntries(totalApps.map(a => [a.platform, a._count.id]));

    const platformRules = platforms.map(platform => ({
      platform,
      dailyLimit: rulesMap[platform]?.dailyLimit ?? 25,
      targetRole: rulesMap[platform]?.targetRole ?? 'Data Engineer',
      resumeId:   rulesMap[platform]?.resumeId ?? null,
      isEnabled:  rulesMap[platform]?.isEnabled ?? true,
      appliedToday: todayMap[platform] || 0,
      totalApplied: totalMap[platform] || 0,
    }));

    const totalTodayCount = Object.values(todayMap).reduce((a, b) => a + b, 0);
    const overallTotalCount = Object.values(totalMap).reduce((a, b) => a + b, 0);

    res.json({
      platformRules,
      summary: {
        totalToday: totalTodayCount,
        overallTotal: overallTotalCount,
      },
    });
  } catch (e) { next(e); }
});

// PUT /automation/rules/:platform — update daily limit, role, assigned resume & status
router.put('/automation/rules/:platform', [
  param('platform').isString(),
  body('dailyLimit').optional().isInt({ min: 1, max: 500 }),
  body('targetRole').optional().trim().isString().isLength({ min: 2, max: 100 }),
  body('resumeId').optional({ nullable: true }).isString(),
  body('isEnabled').optional().isBoolean(),
], validate, async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { dailyLimit, targetRole, resumeId, isEnabled } = req.body;

    const rule = await prisma.automationRule.upsert({
      where: { userId_platform: { userId: req.user.sub, platform } },
      update: {
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(targetRole !== undefined && { targetRole }),
        ...(resumeId !== undefined && { resumeId }),
        ...(isEnabled !== undefined && { isEnabled }),
      },
      create: {
        userId: req.user.sub,
        platform,
        dailyLimit: dailyLimit ?? 25,
        targetRole: targetRole ?? 'Data Engineer',
        resumeId: resumeId ?? null,
        isEnabled: isEnabled ?? true,
      },
    });

    res.json({ rule, message: `Automation settings updated for ${platform}.` });
  } catch (e) { next(e); }
});

export default router;
