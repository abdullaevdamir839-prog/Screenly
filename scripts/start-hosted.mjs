import { spawn } from 'node:child_process';
if (!process.env.DATABASE_URL || !process.env.SITE_ORIGIN?.startsWith('https://')) {
 console.error('Для онлайн-беты обязательны DATABASE_URL и SITE_ORIGIN=https://ваш-домен');
 process.exit(1);
}
const port = process.env.PORT || '3000';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '-p', String(port)], {stdio:'inherit',env:process.env});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));
child.on('exit',(code,signal)=>process.exit(code ?? (signal?1:0)));
