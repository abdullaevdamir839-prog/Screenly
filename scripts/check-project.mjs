import fs from 'node:fs';
import path from 'node:path';
const here = process.cwd();
const required = [
  'package.json', '.env.example', 'render.yaml', 'ДЕПЛОЙ_НА_RENDER_WINDOWS.md', 'scripts/db-init.mjs', 'scripts/db-import.mjs', 'scripts/start-hosted.mjs', 'app/api/health/route.ts', 'tests/online-beta.test.mjs', 'app/page.tsx', 'app/room/[id]/page.tsx',
  'app/api/alpha-login/route.ts', 'app/api/rooms/route.ts',
  'app/api/token/route.ts', 'components/RoomClient.tsx', 'components/CollabScreenTile.tsx', 'components/useRoomCollaboration.ts', 'lib/collaboration.mjs', 'tests/collaboration.test.mjs',
  'components/Home.tsx', 'components/Community.tsx', 'components/CreatorHub.tsx', 'components/ProjectGallery.tsx', 'lib/projects.mjs', 'tests/projects.test.mjs', 'lib/creator-categories.mjs', 'tests/creator.test.mjs', 'lib/security.mjs', 'lib/actions.mjs', 'lib/accounts.mjs', 'lib/store.mjs', 'app/community/page.tsx', 'app/api/v1/[...parts]/route.ts', 'tests/social.test.mjs', 'README.md'
];
const missing = required.filter(file => !fs.existsSync(path.join(here,file)));
if (missing.length) { console.error('Missing:', missing); process.exit(1); }
console.log(`OK: ${required.length} required files present.`);
