import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyTurnstile} from '../lib/turnstile.mjs';

const options={secret:'test-secret',sitekey:'test-sitekey',hostname:'screenly-dfar.onrender.com'};
test('unconfigured local environments keep registration available',async()=>{
 assert.equal(await verifyTurnstile(undefined,{secret:'',sitekey:''}),true);
 assert.equal(await verifyTurnstile('anything',{secret:'',sitekey:'configured'}),false);
});
test('reject missing or malformed Turnstile tokens without calling Cloudflare',async()=>{
 const fetcher=()=>{throw new Error('must not call');};
 for(const token of [undefined,'','x'.repeat(2049),{}])assert.equal(await verifyTurnstile(token,{...options,fetcher}),false);
});
test('accept only verified hostname and registration action',async()=>{
 let called=false;
 const fetcher=async(url,req)=>{
  called=true;
  assert.match(url,/siteverify$/);
  assert.equal(req.body.get('secret'),'test-secret');
  assert.equal(req.body.get('response'),'valid-token');
  return {ok:true,json:async()=>({success:true,hostname:options.hostname,action:'register'})};
 };
 assert.equal(await verifyTurnstile('valid-token',{...options,fetcher}),true);
 assert.equal(called,true);
 const fake=(result)=>async()=>({ok:true,json:async()=>result});
 assert.equal(await verifyTurnstile('x',{...options,fetcher:fake({success:true,hostname:'evil.example',action:'register'})}),false);
 assert.equal(await verifyTurnstile('x',{...options,fetcher:fake({success:true,hostname:options.hostname,action:'login'})}),false);
 assert.equal(await verifyTurnstile('x',{...options,fetcher:fake({success:false,hostname:options.hostname})}),false);
 assert.equal(await verifyTurnstile('x',{...options,fetcher:async()=>{throw Error('offline');}}),false);
});
