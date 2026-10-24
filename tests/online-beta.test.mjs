import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { blank, normalizeData, withDatabase } from '../lib/store.mjs';

test('empty schema includes all legacy Screenly collections',()=>{
 const empty=blank();
 for(const key of ['users','sessions','rooms','friends','messages','projects','projectComments','reports','matchQueue']) assert.ok(Array.isArray(empty[key]));
});
test('old JSON data loads without losing its preserved information',()=>{
 const old={version:1,users:[{id:'original-user',username:'test'}],messages:[{id:'keep'}]};
 const parsed=normalizeData(old);
 assert.equal(parsed.users[0].id,'original-user');
 assert.equal(parsed.messages.length,1);
 assert.deepEqual(parsed.projectComments,[]);
 assert.equal('projectComments' in old,false);
});
test('malformed JSON state is rejected',()=>{
 assert.throws(()=>normalizeData([]),/Неверный формат/);
 assert.throws(()=>normalizeData(null),/Неверный формат/);
});
test('local mode wrapper preserves the existing synchronous business API',async()=>{
 assert.equal(await withDatabase(()=>({test:'ok'}),{write:true}).then(x=>x.test),'ok');
});
test('online routes must use database wrapper for mutations and reads',()=>{
 for(const file of ['app/api/v1/[...parts]/route.ts','app/api/rooms/route.ts','app/api/token/route.ts','app/room/[id]/page.tsx']){
  assert.match(readFileSync(path.resolve(file),'utf8'),/withDatabase\(/,file);
 }
});
test('hosting configuration does not contain real secrets',()=>{
 const env=readFileSync('.env.example','utf8');
 const manifest=readFileSync('render.yaml','utf8');
 assert.doesNotMatch(manifest,/postgres(?:ql)?:\/\/\S+@/);
 assert.match(env,/DATABASE_URL/);
});
