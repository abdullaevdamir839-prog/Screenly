import { databasePool, blank } from '../lib/store.mjs';
if (!process.env.DATABASE_URL) {console.error('DATABASE_URL отсутствует. База не изменена.'); process.exit(1);}
try {
 const pool = await databasePool();
 await pool.query(`CREATE TABLE IF NOT EXISTS screenly_state (
   id SMALLINT PRIMARY KEY CHECK (id=1),
   data JSONB NOT NULL,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
 await pool.query('INSERT INTO screenly_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING',[JSON.stringify(blank())]);
 console.log('OK: схема PostgreSQL готова; существующие данные не перезаписаны.');
 await pool.end();
} catch (error) {console.error('Ошибка инициализации PostgreSQL:',error.message);process.exitCode=1;}
