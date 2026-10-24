import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoomId, createInvite, validInvite, createSession, validSession, checkAlphaCode, safeReturnPath, validateConfig, limited} from '../lib/security.mjs';
const key = 'abc'.repeat(22);
const NOW = Date.UTC(2026, 9, 23);
test('random room id has correct format', () => { assert.match(newRoomId(), /^[A-Za-z0-9_-]{16}$/); assert.notEqual(newRoomId(), newRoomId()); });
test('invite is valid only for room it was issued for', () => {
  const a = newRoomId(), b = newRoomId(); const signed = createInvite(a,key,NOW);
  assert.equal(validInvite(a,signed,key,NOW+1),true);
  assert.equal(validInvite(b,signed,key,NOW+1),false);
  assert.equal(validInvite(a,signed,key,NOW+24*60*60*1000+1),false);
  assert.equal(validInvite(a,signed+'f',key,NOW+1),false);
});
test('sessions expire and signatures cannot be forged', () => {
  const session = createSession(key,NOW);
  assert.equal(validSession(session,key,NOW+1),true);
  assert.equal(validSession(session,'other'.repeat(10),NOW+1),false);
  assert.equal(validSession(session,key,NOW+12*60*60*1000+1),false);
});
test('access code comparison', () => {
  assert.equal(checkAlphaCode('hello','hello'),true);
  assert.equal(checkAlphaCode('hello','other'),false);
  assert.equal(checkAlphaCode(null,'hello'),false);
});
test('return path rejects redirects to outside origins', () => {
  assert.equal(safeReturnPath('https://evil.test'),'/');
  assert.equal(safeReturnPath('//evil.test'),'/');
  assert.equal(safeReturnPath('/room/test?invite=hello'),'/room/test?invite=hello');
});
test('config requires secrets and secure LiveKit URL', () => {
  assert.throws(()=>validateConfig({}),/Заполните/);
  const env={LIVEKIT_URL:'wss://example.livekit.cloud', LIVEKIT_API_KEY:'key', LIVEKIT_API_SECRET:'secret', ALPHA_ACCESS_CODE:'testpassphrase1234',ALPHA_SESSION_SECRET:'a'.repeat(64),ROOM_SIGNING_SECRET:'b'.repeat(64)};
  assert.equal(validateConfig(env),true);
  assert.throws(()=>validateConfig({...env,ROOM_SIGNING_SECRET:env.ALPHA_SESSION_SECRET}),/отличаться/);
});
test('basic rate limiter rejects excess', () => {
  assert.equal(limited('test-unique-rate',2,1000,1000),false);
  assert.equal(limited('test-unique-rate',2,1000,1100),false);
  assert.equal(limited('test-unique-rate',2,1000,1200),true);
  assert.equal(limited('test-unique-rate',2,1000,2100),false);
});
