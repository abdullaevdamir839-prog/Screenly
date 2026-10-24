import { readFileSync } from 'node:fs';
import path from 'node:path';
import { databasePool, blank, normalizeData } from '../lib/store.mjs';
const index = process.argv.indexOf('--file');
if (!process.env.DATABASE_URL || index < 0 || !process.argv[index+1]) {
 console.error('Использование: node scripts/db-import.mjs --file <path_to_screenly.json> --confirm-empty');process.exit(1);
}
if (!process.argv.includes('--confirm-empty')) {console.error('Добавь --confirm-empty после резервного копирования.');process.exit(1);}
const src = path.resolve(process.argv[index+1]);
let pool,client,started=false;
try {
 const data=normalizeData(JSON.parse(readFileSync(src,'utf8')));
 if (!Array.isArray(data.users)) throw new Error('Нет пользователей');
 pool=await databasePool(); client=await pool.connect();
 await client.query('BEGIN');started=true;
 const rows=await client.query('SELECT data FROM screenly_state WHERE id=1 FOR UPDATE');
 if(rows.rowCount!==1) throw new Error('Выполни сначала npm run db:init');
 const existing=normalizeData(rows.rows[0].data);
 const isEmpty=Object.keys(blank()).filter(k=>k!=='version').every(k=>existing[k].length===0);
 if(!isEmpty) throw new Error('База уже содержит данные — перенос отменён, ничего не перезаписано');
 await client.query('UPDATE screenly_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1',[JSON.stringify(data)]);
 await client.query('COMMIT');started=false;
 console.log(`OK: импортировано ${data.users.length} аккаунтов и другие записи. Не публикуй исходный JSON.`);
} catch (error){
 if(started) await client.query('ROLLBACK').catch(()=>{});
 console.error('Импорт отменён:',error.message);process.exitCode=1;
} finally {client?.release();if(pool)await pool.end();}
