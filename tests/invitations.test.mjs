import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir=mkdtempSync(path.join(os.tmpdir(),'screenly-invites-test-'));
process.env.SCREENLY_DATA_PATH=path.join(dir,'screenly.json');
process.env.ROOM_SIGNING_SECRET='local-tests-only-not-a-deployment-secret';
const { blank }=await import('../lib/store.mjs');
const { newRoomId }=await import('../lib/security.mjs');
const { inviteFriendToRoom, listRoomInvites, dismissRoomInvite, closeRoom }=await import('../lib/actions.mjs');
const roomId=newRoomId();

const data=blank();
data.users=[
 {id:'host',displayName:'Host',ageBand:'13-17'},
 {id:'friend',displayName:'Friend',ageBand:'13-17'},
 {id:'stranger',displayName:'Stranger',ageBand:'18+'},
];
data.friends=[{a:'host',b:'friend'}];
data.rooms=[{id:roomId,ownerId:'host',title:'Test workshop',status:'open',visibility:'private'}];
writeFileSync(process.env.SCREENLY_DATA_PATH,JSON.stringify(data));

test('only room host can invite existing compatible friends',()=>{
 assert.throws(()=>inviteFriendToRoom('friend',roomId,'host'),/только создатель/);
 assert.throws(()=>inviteFriendToRoom('host',roomId,'stranger'),/только другу/);
 assert.equal(inviteFriendToRoom('host',roomId,'friend').ok,true);
 assert.throws(()=>inviteFriendToRoom('host',roomId,'friend'),/уже отправлено/);
});
test('only recipient can view and dismiss room invitation',()=>{
 const items=listRoomInvites('friend').invites;
 assert.equal(items.length,1);
 assert.equal(items[0].roomTitle,'Test workshop');
 assert.ok(items[0].url.includes(`/room/${roomId}?invite=`));
 assert.equal(listRoomInvites('stranger').invites.length,0);
 assert.throws(()=>dismissRoomInvite('host',items[0].id),/не найдено/);
 assert.equal(dismissRoomInvite('friend',items[0].id).ok,true);
 assert.equal(listRoomInvites('friend').invites.length,0);
});
test('closing a room also withdraws pending invites',()=>{
 inviteFriendToRoom('host',roomId,'friend');
 closeRoom('host',roomId);
 assert.equal(listRoomInvites('friend').invites.length,0);
});
