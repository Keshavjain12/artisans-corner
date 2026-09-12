import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/',
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res, token) {
  const expiresAt = jwt.decode(token)?.exp;
  const maxAge = expiresAt ? Math.max(0, expiresAt * 1000 - Date.now()) : WEEK_MS;
  res.cookie('token', token, { ...cookieOptions(), maxAge });
}

export function clearAuthCookie(res) {
  res.clearCookie('token', cookieOptions());
}
