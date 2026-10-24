import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
const dir=mkdtempSync(path.join(os.tmpdir(),'screenly-tests-'));
process.env.SCREENLY_DATA_PATH=path.join(dir,'screenly.json');
process.env.ROOM_SIGNING_SECRET='test-secret-for-room-signing-strong-enough-123456789';
const a=await import('../lib/actions.mjs');
const {readData,transact}=await import('../lib/store.mjs');
const {findAccount,deleteSession,passwordValid}=await import('../lib/accounts.mjs');
const {validInvite}=await import('../lib/security.mjs');
const pw='totally-testing-safe-passphrase-123';
const sign=(email,username,ageBand='18+')=>a.register({email,username,displayName:username,password:pw,ageBand,agree:true});
const first=sign('a@example.com','alpha_123');
const second=sign('b@example.com','beta_123');
const minor=sign('c@example.com','minor_123','13-17');
const minor2=sign('d@example.com','minor_two','13-17');

test('registrations persist; password is hashed and session can be looked up',()=>{
 assert.equal(readData().users.length,4);
 assert.ok(!JSON.stringify(readData()).includes(pw));
 assert.equal(passwordValid(pw,readData().users[0]),true);
 assert.equal(findAccount(first.token).username,'alpha_123');
 assert.throws(()=>sign('a@example.com','another'),/заняты/);
});
test('profile edits are reflected in search',()=>{
 const out=a.editProfile(first.user.id,{displayName:'Alpha Pro',bio:'Люблю дизайн',interests:['games','design'],language:'ru'});
 assert.equal(out.bio,'Люблю дизайн');
 assert.equal(a.searchProfiles('alpha',second.user.id)[0].displayName,'Alpha Pro');
});
test('friends require acceptance, direct messages require friendship',()=>{
 assert.throws(()=>a.sendMessage(first.user.id,second.user.id,'hi'),/только друзьям/);
 a.requestFriend(first.user.id,'beta_123');
 const request=a.friendsList(second.user.id).incoming[0];
 assert.equal(request.from.username,'alpha_123');
 a.respondFriend(second.user.id,request.id,true);
 assert.equal(a.friendsList(first.user.id).friends.length,1);
 a.sendMessage(first.user.id,second.user.id,'Проверка личных сообщений');
 assert.equal(a.readMessages(second.user.id,first.user.id).messages[0].text,'Проверка личных сообщений');
});
test('blocked friends cannot message each other',()=>{
 a.blockAccount(first.user.id,second.user.id);
 assert.throws(()=>a.sendMessage(second.user.id,first.user.id,'hi'),/только друзьям/);
 assert.equal(a.friendsList(second.user.id).friends.length,0);
 a.blockAccount(first.user.id,second.user.id,true);
});
test('13-17 and 18+ have public room access without administrative approval in private test',()=>{
 const junior=a.createRoom(minor.user.id,{visibility:'public',title:'13+ эфир'});
 const adult=a.createRoom(first.user.id,{visibility:'public',title:'18+ эфир'});
 assert.ok(junior.id && adult.id);
 assert.ok(a.listRooms(minor2.user.id).some(r=>r.id===junior.id));
 assert.ok(a.listRooms(second.user.id).some(r=>r.id===adult.id));
 assert.ok(!a.listRooms(second.user.id).some(r=>r.id===junior.id));
 assert.ok(!a.listRooms(minor2.user.id).some(r=>r.id===adult.id));
 assert.throws(()=>a.requestFriend(minor.user.id,'alpha_123'),/несовершеннолетними/);
});
test('profile lookup does not expose minors to adult requests or blocked users',()=>{
 assert.throws(()=>a.getProfile('minor_123',second.user.id),/недоступен/);
 assert.equal(a.getProfile('minor_123',minor2.user.id).username,'minor_123');
 a.blockAccount(minor.user.id,minor2.user.id);
 assert.throws(()=>a.getProfile('minor_123',minor2.user.id),/недоступен/);
 a.blockAccount(minor.user.id,minor2.user.id,true);
});
test('13-17 users can add friends and exchange messages within age band',()=>{
 a.requestFriend(minor.user.id,'minor_two');
 const request=a.friendsList(minor2.user.id).incoming[0];
 a.respondFriend(minor2.user.id,request.id,true);
 a.sendMessage(minor.user.id,minor2.user.id,'Привет из тестовой комнаты!');
 assert.equal(a.readMessages(minor2.user.id,minor.user.id).messages.at(-1).text,'Привет из тестовой комнаты!');
});
test('user cannot forge a matchmaking room or arbitrary access list',()=>{
 const result=a.createRoom(first.user.id,{mode:'match',allowed:[minor.user.id],visibility:'private'});
 const stored=readData().rooms.find(r=>r.id===result.id);
 assert.equal(stored.mode,'normal');
 assert.deepEqual(stored.allowed,[]);
});
test('private room invite is signed and checked',()=>{
 const created=a.createRoom(first.user.id,{title:'Наша комната'});
 const id=created.id;
 const url=new URL(created.path,'http://localhost:3000');
 const invite=url.searchParams.get('invite');
 assert.equal(validInvite(id,invite,process.env.ROOM_SIGNING_SECRET),true);
 assert.equal(a.roomAccess(id,invite,readData().users.find(u=>u.id===first.user.id)).title,'Наша комната');
 assert.throws(()=>a.roomAccess(id,invite+'bad',null),/недействительно/);
 assert.throws(()=>a.roomAccess(id,invite,readData().users.find(u=>u.id===minor.user.id)),/Возрастные группы/);
});
test('matching works for both age groups but never mixes them',()=>{
 assert.equal(a.joinMatch(first.user.id).status,'waiting');
 assert.equal(a.joinMatch(minor.user.id).status,'waiting');
 const paired=a.joinMatch(second.user.id);
 assert.equal(paired.status,'matched');
 const url=new URL(paired.path,'http://localhost:3000');const id=url.pathname.split('/').pop();const invite=url.searchParams.get('invite');
 assert.equal(a.roomAccess(id,invite,readData().users.find(x=>x.id===first.user.id)).mode,'match');
 assert.throws(()=>a.roomAccess(id,invite,readData().users.find(x=>x.id===minor.user.id)),/Нет доступа/);
 assert.equal(a.matchStatus(first.user.id).status,'matched');
 const matchedMinors=a.joinMatch(minor2.user.id);
 assert.equal(matchedMinors.status,'matched');
 const juvenileUrl=new URL(matchedMinors.path,'http://localhost:3000');
 const juvenileId=juvenileUrl.pathname.split('/').pop(), juvenileInvite=juvenileUrl.searchParams.get('invite');
 assert.equal(a.roomAccess(juvenileId,juvenileInvite,readData().users.find(x=>x.id===minor.user.id)).mode,'match');
 assert.throws(()=>a.roomAccess(juvenileId,juvenileInvite,readData().users.find(x=>x.id===first.user.id)),/Нет доступа/);
 a.blockAccount(minor.user.id,minor2.user.id);
 assert.throws(()=>a.roomAccess(juvenileId,juvenileInvite,readData().users.find(x=>x.id===minor.user.id)),/недоступен/);
 a.blockAccount(minor.user.id,minor2.user.id,true);
});
test('public catalogue only displays matching age band and respects blocks',()=>{
 a.createRoom(first.user.id,{title:'Публичный тест',visibility:'public'});
 assert.ok(a.listRooms(minor.user.id).every(r=>r.owner.ageBand==='13-17'));
 assert.ok(a.listRooms(second.user.id).some(r=>r.title==='Публичный тест'));
 a.blockAccount(second.user.id,first.user.id);
 assert.ok(!a.listRooms(second.user.id).some(r=>r.title==='Публичный тест'));
 a.blockAccount(second.user.id,first.user.id,true);
});
test('report moderation requires role; disabled user loses access',()=>{
 a.reportUser(second.user.id,{targetId:first.user.id,category:'spam',reason:'Много нежелательных сообщений'});
 a.reportUser(second.user.id,{targetId:'guest:11111111-1111-4111-8111-111111111111',roomId:'test-room',category:'other',reason:'Проблемное поведение гостя'});
 assert.throws(()=>a.moderationList(readData().users.find(x=>x.id===minor.user.id)),/Нет прав/);
 transact(db=>{db.users.find(u=>u.id===minor.user.id).role='admin';});
 const report=a.moderationList(readData().users.find(u=>u.id===minor.user.id)).find(r=>r.targetId===first.user.id);
 a.resolveReport(readData().users.find(u=>u.id===minor.user.id),report.id,'disable');
 assert.equal(findAccount(first.token),null);
});
test('session revocation and account deletion remove user data',()=>{
 deleteSession(second.token);assert.equal(findAccount(second.token),null);
 a.deleteAccount(second.user.id);
 assert.equal(readData().users.find(u=>u.id===second.user.id).disabled,true);
});
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
