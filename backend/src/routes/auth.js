import axios from 'axios';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
const router = Router();
const validate = (req, res, next) => {
  const e = validationResult(req);
  if (e.isEmpty()) return next();
  const first = e.array()[0];
  let msg = 'Invalid input. Please check your information.';
  if (first?.path === 'password') msg = 'Password must be at least 6 characters.';
  else if (first?.path === 'email') msg = 'Please enter a valid email address.';
  else if (first?.path === 'name') msg = 'Please enter your name (at least 2 characters).';
  else if (first?.msg && first.msg !== 'Invalid value') msg = `${first.path}: ${first.msg}`;
  return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: msg, details: e.array() } });
};
const JWT_SECRET = process.env.JWT_SECRET || 'cvconnect_jwt_secret_render_production_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cvconnect_refresh_secret_render_production_key_2026';

const sign = (user) => ({
  accessToken: jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  ),
  refreshToken: jwt.sign(
    { sub: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  )
});
router.post('/register', [body('email').isEmail().normalizeEmail(), body('name').trim().isLength({ min: 2, max: 80 }), body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be at least 6 characters')], validate, async (req, res, next) => { try { const exists = await prisma.user.findUnique({ where: { email: req.body.email } }); if (exists) return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account already uses this email.' } }); const user = await prisma.user.create({ data: { email: req.body.email, name: req.body.name, password: await bcrypt.hash(req.body.password, 12) } }); const tokens = sign(user); await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } }); res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens }); } catch (e) {
    console.error('[AUTH_REGISTER_ERROR]:', e);
    return res.status(500).json({ error: { code: 'REGISTRATION_FAILED', message: e.message || 'Registration failed.' } });
  } });
router.post('/login', [body('email').isEmail().normalizeEmail(), body('password').isString()], validate, async (req, res, next) => { try { const user = await prisma.user.findUnique({ where: { email: req.body.email } }); if (!user?.password || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } }); const tokens = sign(user); await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } }); res.json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens }); } catch (e) {
    console.error('[AUTH_REGISTER_ERROR]:', e);
    return res.status(500).json({ error: { code: 'REGISTRATION_FAILED', message: e.message || 'Registration failed.' } });
  } });
router.post('/refresh', [body('refreshToken').isString()], validate, async (req, res, next) => { try { const data = jwt.verify(req.body.refreshToken, JWT_REFRESH_SECRET); const user = await prisma.user.findFirst({ where: { id: data.sub, refreshToken: req.body.refreshToken } }); if (!user) throw new Error('Invalid refresh token'); const tokens = sign(user); await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } }); res.json(tokens); } catch { res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Please sign in again.' } }); } });
router.post('/google', [body('credential').isString().notEmpty()], validate, async (req, res) => {
  try {
    const { credential } = req.body;

    let googleUser;
    // Development / mock fallback
    if (credential === 'demo-google-credential' || credential.startsWith('mock-')) {
      googleUser = {
        email: 'google_user@gmail.com',
        name: 'Google User',
        email_verified: true
      };
    } else {
      const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, { timeout: 8000 });
      const payload = googleRes.data;

      if (!payload.email) {
        return res.status(400).json({ error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Could not retrieve email from Google.' } });
      }

      googleUser = {
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        email_verified: payload.email_verified === 'true' || payload.email_verified === true
      };
    }

    if (!googleUser.email_verified) {
      return res.status(400).json({ error: { code: 'EMAIL_UNVERIFIED', message: 'Your Google email is not verified.' } });
    }

    let user = await prisma.user.findUnique({ where: { email: googleUser.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name
        }
      });
    }

    const tokens = sign(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens
    });
  } catch (err) {
    console.error('[AUTH_GOOGLE_ERROR]:', err.response?.data || err.message);
    const msg = err.response?.data?.error_description || 'Unable to authenticate with Google. Please try again.';
    return res.status(401).json({ error: { code: 'GOOGLE_AUTH_FAILED', message: msg } });
  }
});

export default router;
