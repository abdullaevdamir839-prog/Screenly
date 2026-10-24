import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const INVITE_PATTERN = /^(\d{10,13})\.([a-f0-9]{64})$/;
const SESSION_PATTERN = /^(\d{10,13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/;

function hmac(message, secret) {
  return createHmac('sha256', secret).update(message).digest('hex');
}

function safeHexCompare(a, b) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export function validateConfig(env) {
  const fields = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'ALPHA_ACCESS_CODE', 'ALPHA_SESSION_SECRET', 'ROOM_SIGNING_SECRET'];
  const missing = fields.filter(key => !env[key] || String(env[key]).includes('REPLACE_') || String(env[key]).includes('YOUR_'));
  if (missing.length) throw new Error(`Заполните .env.local: ${missing.join(', ')}`);
  if (!/^wss:\/\//.test(env.LIVEKIT_URL)) throw new Error('LIVEKIT_URL должен начинаться с wss://');
  if (env.ALPHA_ACCESS_CODE.length < 12 || env.ALPHA_SESSION_SECRET.length < 32 || env.ROOM_SIGNING_SECRET.length < 32) {
    throw new Error('ALPHA_ACCESS_CODE >= 12 символов, остальные секреты >= 32 символов');
  }
  if (env.ALPHA_SESSION_SECRET === env.ROOM_SIGNING_SECRET) throw new Error('Секреты сессий и комнат должны отличаться');
  return true;
}

export function checkAlphaCode(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || candidate.length > 512) return false;
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function createSession(secret, now = Date.now()) {
  const exp = now + 12 * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString('hex');
  const payload = `${exp}.${nonce}`;
  return `${payload}.${hmac(`screenly-session:${payload}`, secret)}`;
}

export function validSession(value, secret, now = Date.now()) {
  if (typeof value !== 'string' || typeof secret !== 'string') return false;
  const match = SESSION_PATTERN.exec(value);
  if (!match) return false;
  const exp = Number(match[1]);
  if (!Number.isSafeInteger(exp) || exp <= now || exp > now + 12 * 60 * 60 * 1000) return false;
  const body = `${match[1]}.${match[2]}`;
  return safeHexCompare(match[3], hmac(`screenly-session:${body}`, secret));
}

export function newRoomId() {
  return randomBytes(12).toString('base64url');
}

export function createInvite(roomId, secret, now = Date.now()) {
  if (!ROOM_ID_PATTERN.test(roomId)) throw new Error('Invalid room id');
  const exp = now + 24 * 60 * 60 * 1000;
  return `${exp}.${hmac(`screenly-invite:${roomId}:${exp}`, secret)}`;
}

export function validInvite(roomId, invite, secret, now = Date.now()) {
  if (typeof roomId !== 'string' || !ROOM_ID_PATTERN.test(roomId) || typeof invite !== 'string' || typeof secret !== 'string') return false;
  const match = INVITE_PATTERN.exec(invite);
  if (!match) return false;
  const exp = Number(match[1]);
  if (!Number.isSafeInteger(exp) || exp <= now || exp > now + 24 * 60 * 60 * 1000) return false;
  return safeHexCompare(match[2], hmac(`screenly-invite:${roomId}:${exp}`, secret));
}

// Single-process rate limiting for CLOSED local development only.
// Must be replaced with a shared datastore before any public deployment.
const buckets = new Map();
export function limited(key, max = 10, windowMs = 60_000, now = Date.now()) {
  if (buckets.size > 3000) buckets.clear();
  const value = buckets.get(key);
  if (!value || now - value.windowStart > windowMs) {
    buckets.set(key, { windowStart: now, hits: 1 });
    return false;
  }
  value.hits += 1;
  return value.hits > max;
}

export function sameOrigin(req) {
  if (process.env.NODE_ENV === 'production' && (!process.env.SITE_ORIGIN || !process.env.SITE_ORIGIN.startsWith('https://'))) return false;
  const origin = req.headers.get('origin');
  const expected = process.env.SITE_ORIGIN || new URL(req.url).origin;
  return !!origin && origin === expected;
}

export function safeReturnPath(path) {
  if (typeof path !== 'string' || path.length > 300 || !(path.startsWith('/room/') || path==='/community') || path.startsWith('//') || /[\\\r\n]/.test(path)) return '/';
  return path;
}
