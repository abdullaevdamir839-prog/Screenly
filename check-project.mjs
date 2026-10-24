// Screenly 1.0 - local single-process persistence. Do NOT use with multiple app replicas.
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

const file = path.resolve(process.env.SCREENLY_DATA_PATH || path.join(process.cwd(), 'data', 'screenly.json'));
export const blank = () => ({ version: 1, users: [], sessions: [], requests: [], friends: [], blocks: [], messages: [], rooms: [], reports: [], matchQueue: [], moderation: [], projects: [], projectComments: [] });
// In hosted mode, a request receives a consistent JSONB snapshot from PostgreSQL.
// Every mutation happens inside SELECT ... FOR UPDATE and commits atomically.
// This transitional model targets a small, invite-only beta, NOT large-scale traffic.
const context = new AsyncLocalStorage();
let poolPromise;
const hosted = () => !!process.env.DATABASE_URL;
export async function databasePool() {
  if (!hosted()) throw new Error('DATABASE_URL не задан');
  if (!poolPromise) poolPromise = import('pg').then(({ default: pg }) => new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }));
  return poolPromise;
}
function init() {
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) { writeFileSync(file, JSON.stringify(blank(), null, 2), { flag: 'wx', mode: 0o600 }); }
}
export function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Неверный формат базы Screenly');
  const template = blank();
  const db = structuredClone(raw);
  for (const key of Object.keys(template)) if (!Array.isArray(db[key]) && key !== 'version') db[key] = [];
  if (!Number.isInteger(db.version)) db.version = 1;
  return db;
}
export function readData() {
  if (hosted()) {
    const tx = context.getStore();
    if (!tx) throw new Error('Чтение PostgreSQL вне withDatabase: проверь маршрут API');
    return tx.db;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Нужен DATABASE_URL для запуска онлайн-беты');
  init();
  return normalizeData(JSON.parse(readFileSync(file, 'utf8')));
}
export function transact(fn) {
  if (hosted()) {
    const tx = context.getStore();
    if (!tx || !tx.write) throw new Error('Запись PostgreSQL вне транзакции withDatabase(write=true)');
    const result = fn(tx.db);
    tx.dirty = true;
    return result;
  }
  const db = readData();
  const result = fn(db);
  const scratch = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(scratch, JSON.stringify(db, null, 2), { mode: 0o600 });
  renameSync(scratch, file);
  return result;
}
export async function withDatabase(fn, { write = false } = {}) {
  if (!hosted()) {
    if (process.env.NODE_ENV === 'production') throw new Error('Онлайн-запуск требует DATABASE_URL');
    return await fn();
  }
  if (context.getStore()) throw new Error('Вложенные сессии базы не поддерживаются');
  const pool = await databasePool();
  const client = await pool.connect();
  let begun = false;
  try {
    if (write) {
      await client.query('BEGIN'); begun = true;
      await client.query("SET LOCAL lock_timeout = '10s'");
    }
    const response = await client.query(`SELECT data FROM screenly_state WHERE id = 1 ${write ? 'FOR UPDATE' : ''}`);
    if (response.rowCount !== 1) throw new Error('База не инициализирована: выполните npm run db:init');
    const tx = { db: normalizeData(response.rows[0].data), write, dirty: false };
    const result = await context.run(tx, fn);
    if (tx.dirty) {
      await client.query('UPDATE screenly_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1', [JSON.stringify(tx.db)]);
    }
    if (begun) await client.query('COMMIT');
    return result;
  } catch (error) {
    if (begun) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
export function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.displayName, bio: u.bio || '', interests: u.interests || [], language: u.language || 'ru', avatarColor: u.avatarColor || '#6965e8', role: u.role || 'member', adultVerified: !!u.adultVerified, ageBand: u.ageBand, createdAt: u.createdAt };
}
export function isBlocked(db, a, b) {
  return db.blocks.some(x => (x.by === a && x.target === b) || (x.by === b && x.target === a));
}
export function areFriends(db, a, b) {
  return db.friends.some(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
}
export function canMessage(db, sender, recipient) {
  return sender.id !== recipient.id && !isBlocked(db,sender.id,recipient.id) && areFriends(db,sender.id,recipient.id);
}
export function areEligibleForMatch(db, a, b) {
  return !!a && !!b && a.id !== b.id && !a.disabled && !b.disabled && ['13-17','18+'].includes(a.ageBand) && a.ageBand === b.ageBand && !isBlocked(db,a.id,b.id);
}
