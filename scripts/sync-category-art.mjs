import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const items=JSON.parse(fs.readFileSync(path.join(root,'assets/illustrations.json'),'utf8'));
const dir=path.join(root,'public/category-art');
const manifest={};
for(const {id,filename} of items){
 const p=path.join(dir,filename);
 if(!fs.existsSync(p))throw new Error(`Отсутствует иллюстрация: ${filename}`);
 const raw=fs.readFileSync(p,'utf8');
 const suspicious=/<\s*(?:script|foreignObject|iframe)\b|\bon\w+\s*=|javascript\s*:|<\s*image\b[^>]*href\s*=\s*['"]?https?:/i;
 if(!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(raw)||suspicious.test(raw)||raw.length>500_000)
    throw new Error(`Неподходящий SVG: ${filename}`);
 manifest[id]=`/category-art/${filename}`;
}
fs.writeFileSync(path.join(root,'lib/category-assets.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Готово: ${Object.keys(manifest).length}/${items.length} иллюстраций подключены.`);
