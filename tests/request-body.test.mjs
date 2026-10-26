import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedJson } from '../lib/request-body.mjs';

const req=(text,headers={})=>new Request('https://screenly.test/api',{method:'POST',headers,body:text});
test('bounded JSON accepts a small object',async()=>{
 assert.deepEqual(await boundedJson(req('{"name":"Damir"}')),{name:'Damir'});
});
test('bounded JSON rejects a missing or spoofed content length and oversized bodies',async()=>{
 await assert.rejects(boundedJson(req(JSON.stringify({text:'a'.repeat(200)})),50),e=>e.status===413);
 await assert.rejects(boundedJson(req('{}',{'content-length':'99999'}),50),e=>e.status===413);
});
test('bounded JSON rejects malformed and non-object values',async()=>{
 await assert.rejects(boundedJson(req('{nope}')),e=>e.status===400);
 await assert.rejects(boundedJson(req('[]')),e=>e.status===400);
 await assert.rejects(boundedJson(req('null')),e=>e.status===400);
});
