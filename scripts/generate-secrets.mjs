import { randomBytes } from 'node:crypto';
console.log('\nСкопируйте ДВЕ РАЗНЫЕ строки в .env.local:\n');
console.log(`ALPHA_SESSION_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`ROOM_SIGNING_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`\nКод для ALPHA_ACCESS_CODE (передавать только тестировщикам):\n${randomBytes(18).toString('base64url')}\n`);
