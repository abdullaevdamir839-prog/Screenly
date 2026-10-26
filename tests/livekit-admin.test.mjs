import test from 'node:test';
import assert from 'node:assert/strict';
import {livekitApiUrl} from '../lib/livekit-admin.mjs';

test('server API endpoint is derived from a secure LiveKit socket host',()=>{
 assert.equal(livekitApiUrl('wss://sample.livekit.cloud'),'https://sample.livekit.cloud');
 assert.throws(()=>livekitApiUrl('ws://sample.livekit.cloud'),/Неверный/);
 assert.throws(()=>livekitApiUrl('wss://user:pass@sample.livekit.cloud'),/Неверный/);
 assert.throws(()=>livekitApiUrl('wss://sample.livekit.cloud?token=x'),/Неверный/);
});
