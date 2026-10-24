import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CATEGORIES} from '../lib/creator-categories.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const items=JSON.parse(fs.readFileSync(path.join(root,'assets/illustrations.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'lib/category-assets.json'),'utf8'));
test('Every Creator Hub category has a bundled original illustration',()=>{
 assert.equal(CATEGORIES.length,12);
 assert.equal(items.length,13);
 assert.deepEqual(new Set(items.map(x=>x.id)),new Set([...CATEGORIES.map(c=>c.id),'all']));
 assert.equal(new Set(items.map(x=>x.filename)).size,items.length);
 assert.deepEqual(new Set(Object.keys(manifest)),new Set(items.map(x=>x.id)));
 for(const item of items){
   assert.equal(manifest[item.id],`/category-art/${item.filename}`);
   assert.match(item.filename,/^[a-z0-9-]+\.svg$/);
   const src=fs.readFileSync(path.join(root,'public/category-art',item.filename),'utf8');
   assert.match(src,/^<svg[\s>]/);
   assert.doesNotMatch(src,/<script|<iframe|<foreignObject|javascript:/i);
   assert.ok(src.length>1000);
 }
});
