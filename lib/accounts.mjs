import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { readData, transact, publicUser } from './store.mjs';
const MAX_SESSION = 7*24*60*60*1000;
export const USER_COOKIE='screenly_user';
export const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernameRegex=/^[a-zA-Z0-9_]{3,20}$/;
export const normalizeEmail = v => String(v || '').trim().toLowerCase();
export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return {salt,hash:scryptSync(password,salt,64).toString('hex')};
}
export function passwordValid(password,user) {
  if(typeof password !== 'string' || password.length > 1024 || !user || !user.passwordHash) return false;
  const candidate=Buffer.from(passwordHash(password,user.passwordSalt).hash,'hex');
  const expected=Buffer.from(user.passwordHash,'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate,expected);
}
export function newSession(userId) {
  const token=randomBytes(32).toString('base64url');
  const tokenHash=createHash('sha256').update(token).digest('hex');
  transact(db=>{
    db.sessions=db.sessions.filter(x=>x.expiresAt > Date.now()).slice(-20000);
    db.sessions.push({ id:tokenHash,userId,expiresAt:Date.now()+MAX_SESSION });
  });
  return token;
}
export function findAccount(token) {
  if(!token || typeof token !== 'string' || token.length > 150) return null;
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const db=readData();
  const session=db.sessions.find(s=>s.id===tokenHash && s.expiresAt>Date.now());
  const user=session && db.users.find(u=>u.id===session.userId && !u.disabled);
  return user || null;
}
export function deleteSession(token) {
  if(!token || typeof token !== 'string') return;
  const hash=createHash('sha256').update(token).digest('hex');
  transact(db=>{db.sessions=db.sessions.filter(x=>x.id!==hash);});
}
export const accountCookieOptions = () => ({ httpOnly:true, sameSite:'strict', secure:process.env.NODE_ENV==='production', path:'/', maxAge:MAX_SESSION/1000 });
