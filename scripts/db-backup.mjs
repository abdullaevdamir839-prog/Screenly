// Manual encrypted-storage-ready database export. Never commit or share the output.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { databasePool, normalizeData } from '../lib/store.mjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL отсутствует. Экспорт не выполнялся.');
  process.exit(1);
}
const backupDir=path.join(process.cwd(),'backups');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const destination=path.join(backupDir,`screenly-${stamp}.json`);
let pool;
try {
  pool=await databasePool();
  const result=await pool.query('SELECT data FROM screenly_state WHERE id=1');
  if(result.rowCount!==1)throw new Error('База ещё не инициализирована');
  const state=normalizeData(result.rows[0].data);
  mkdirSync(backupDir,{recursive:true,mode:0o700});
  writeFileSync(destination,JSON.stringify(state,null,2),{mode:0o600,flag:'wx'});
  console.log(`Резервная копия создана: ${destination}`);
  console.log('ВНИМАНИЕ: файл содержит персональные данные. Храни его в защищённом месте и не отправляй в GitHub.');
} catch(e) {console.error('Резервное копирование не выполнено:',e.message);process.exitCode=1;}
finally {if(pool)await pool.end();}
