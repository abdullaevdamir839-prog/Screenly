import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCollabPacket,encodeCollabPacket,applyStroke,undoStroke,MAX_STROKES_PER_STREAM,MAX_POINTS_PER_STROKE} from '../lib/collaboration.mjs';
const parse=(data,sender='owner')=>parseCollabPacket(encodeCollabPacket(data),sender);
test('valid owner permission and revoke events',()=>{
  assert.equal(parse({type:'permission',stream:'owner',enabled:true}).enabled,true);
  assert.equal(parse({type:'permission',stream:'owner',enabled:false}).enabled,false);
  assert.equal(parse({type:'permission',stream:'owner',enabled:true},'intruder'),null);
});
test('only owner can clear a screen',()=>{
  assert.equal(parse({type:'clear',stream:'owner'}).type,'clear');
  assert.equal(parse({type:'clear',stream:'owner'},'intruder'),null);
});
test('remote point payload never accepts bad coordinates or script injection',()=>{
  assert.equal(parse({type:'cursor',stream:'owner',x:0.5,y:0.8},'peer').type,'cursor');
  assert.equal(parse({type:'cursor',stream:'owner',x:Infinity,y:.5}),null);
  assert.equal(parse({type:'cursor',stream:'owner',x:1.1,y:.5}),null);
  assert.equal(parse({type:'stroke',stream:'owner',id:'<script>',phase:'start',x:.5,y:.5},'peer'),null);
  assert.equal(parse({type:'stroke',stream:'owner',id:'abc',phase:'start',x:.5,y:.5},'peer').sender,'peer');
});
test('oversized packets rejected',()=>{
  const raw=encodeCollabPacket({type:'cursor',stream:'owner',x:.5,y:.5,extra:'x'.repeat(1200)});
  assert.equal(parseCollabPacket(raw,'owner'),null);
});
test('drawing points bounded and duplicates ignored',()=>{
  let strokes=applyStroke([],{sender:'a',id:'1',phase:'start',x:.1,y:.2});
  strokes=applyStroke(strokes,{sender:'a',id:'1',phase:'move',x:.2,y:.3});
  strokes=applyStroke(strokes,{sender:'a',id:'1',phase:'move',x:.2,y:.3});
  assert.equal(strokes[0].points.length,2);
  for(let i=0;i<300;i++) strokes=applyStroke(strokes,{sender:'a',id:'1',phase:'move',x:i/300,y:.3});
  assert.ok(strokes[0].points.length <=MAX_POINTS_PER_STROKE);
  for(let i=0;i<90;i++) strokes=applyStroke(strokes,{sender:'a',id:`s${i}`,phase:'start',x:.1,y:.1});
  assert.equal(strokes.length,MAX_STROKES_PER_STREAM);
});
test('owner snapshot is capped and cannot inject strokes',()=>{
  const good=parse({type:'snapshot',stream:'owner',strokes:[{id:'a',sender:'peer',points:[[.2,.3]]}]});
  assert.equal(good.strokes[0].sender,'peer');
  assert.equal(parse({type:'snapshot',stream:'owner',strokes:[{id:'a',sender:'peer',points:[[5,0]]}]}),null);
  assert.equal(parse({type:'snapshot',stream:'owner',strokes:[]},'peer'),null);
});
test('hello is independent of screen state',()=>assert.equal(parse({type:'hello'},'someone').type,'hello'));
test('undo removes only the exact author stroke, never another participant drawing',()=>{
 const first={sender:'alice',id:'one',key:'alice:one',points:[[.2,.2]]};
 const second={sender:'bob',id:'one',key:'bob:one',points:[[.5,.5]]};
 assert.deepEqual(undoStroke([first,second],'alice','one'),[second]);
 assert.deepEqual(undoStroke([first,second],'alice','missing'),[first,second]);
 const packet=parse({type:'undo',stream:'owner',id:'one'},'alice');
 assert.equal(packet.sender,'alice');
 assert.equal(parse({type:'undo',stream:'owner',id:'<bad>'},'alice'),null);
});
