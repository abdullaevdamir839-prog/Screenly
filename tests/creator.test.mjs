import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
const dir=mkdtempSync(path.join(os.tmpdir(),'screenly-creator-'));
process.env.SCREENLY_DATA_PATH=path.join(dir,'screenly.json');
process.env.ROOM_SIGNING_SECRET='a-different-long-signing-secret-for-tests-123456';
const a=await import('../lib/actions.mjs');
const {readData}=await import('../lib/store.mjs');
const {CATEGORIES,GOALS,filterRooms,normalizeProjectLink}=await import('../lib/creator-categories.mjs');
const createUser=(username,ageBand='18+')=>a.register({username,email:`${username}@test.example`,password:'only-for-automated-test-12345',displayName:username,agree:true,ageBand});
const adult1=createUser('designer_1'),adult2=createUser('designer_2'),minor=createUser('learner_1','13-17');
test('creator categories are unique, nonempty, and contain requested areas',()=>{
 assert.equal(new Set(CATEGORIES.map(x=>x.id)).size,CATEGORIES.length);
 for(const name of ['vibe-coding','design','drawing','programming','game-dev','study','projects'])assert.ok(CATEGORIES.some(x=>x.id===name));
 assert.ok(GOALS.some(x=>x.id==='teach')&&GOALS.some(x=>x.id==='learn'));
});
test('creator workshop is persisted with validated metadata',()=>{
 const room=a.createRoom(adult1.user.id,{visibility:'public',title:'Разбираем сайт',category:'vibe-coding',goal:'teach',projectTitle:'Веб-портфолио',projectUrl:'https://example.org/demo',learningPlan:'Сначала показываем макет, потом код'});
 const dbRoom=readData().rooms.find(r=>r.id===room.id);
 assert.equal(dbRoom.category,'vibe-coding');assert.equal(dbRoom.goal,'teach');
 assert.equal(dbRoom.projectTitle,'Веб-портфолио');
 const listed=a.listRooms(adult2.user.id).find(x=>x.id===room.id);
 assert.equal(listed.learningPlan,'Сначала показываем макет, потом код');
 assert.equal(listed.projectUrl,'https://example.org/demo');
 assert.equal(a.listRooms(minor.user.id).some(x=>x.id===room.id),false);
});
test('category, goal and project link cannot be forged',()=>{
 assert.throws(()=>a.createRoom(adult1.user.id,{category:'ADMIN',goal:'teach'}),/категория/);
 assert.throws(()=>a.createRoom(adult1.user.id,{category:'design',goal:'bad'}),/цель/);
 for(const link of ['javascript:alert(1)','http://example.org','https://user:pw@example.org','https://localhost/','file:///etc/passwd']){
  assert.throws(()=>a.createRoom(adult1.user.id,{category:'design',goal:'showcase',projectUrl:link}),/Ссылка/);
 }
 assert.equal(normalizeProjectLink(''), '');
});
test('old room creation request remains compatible',()=>{
 const room=a.createRoom(adult2.user.id,{topic:'Музыка',title:'Старый клиент'});
 assert.equal(readData().rooms.find(x=>x.id===room.id).category,'music');
 assert.equal(readData().rooms.find(x=>x.id===room.id).goal,'hangout');
});
test('public workshops can be filtered by interests and format',()=>{
 const rooms=a.listRooms(adult2.user.id);
 assert.equal(filterRooms(rooms,{category:'vibe-coding',goal:'teach'}).length,1);
 assert.equal(filterRooms(rooms,{category:'vibe-coding',goal:'feedback'}).length,0);
 assert.equal(filterRooms(rooms,{query:'портфолио'}).length,1);
});
test('topic matchmaking only matches a compatible topic in the same age band',()=>{
 const wait=a.joinMatch(adult1.user.id,'design');assert.equal(wait.status,'waiting');
 const other=a.joinMatch(adult2.user.id,'vibe-coding');assert.equal(other.status,'waiting');
 const minorWait=a.joinMatch(minor.user.id,'design');assert.equal(minorWait.status,'waiting');
 // Topic change requires cancelling the previous queue entry.
 a.cancelMatch(adult2.user.id);
 const match=a.joinMatch(adult2.user.id,'design');assert.equal(match.status,'matched');
 const matchRoomId=new URL(match.path,'http://localhost:3000').pathname.split('/').pop();
 assert.equal(readData().rooms.find(x=>x.id===matchRoomId).category,'design');
 assert.throws(()=>a.joinMatch(minor.user.id,'hacker'),/категория/);
});
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
