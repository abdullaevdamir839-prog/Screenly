import { cookies } from 'next/headers';
import { validSession, validateConfig } from './security.mjs';

export const SESSION_COOKIE = 'screenly_alpha';

export function requireSettings() {
  validateConfig(process.env);
  return {
    livekitUrl: process.env.LIVEKIT_URL!,
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
    alphaCode: process.env.ALPHA_ACCESS_CODE!,
    sessionSecret: process.env.ALPHA_SESSION_SECRET!,
    roomSecret: process.env.ROOM_SIGNING_SECRET!,
  };
}

export async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  const secret = process.env.ALPHA_SESSION_SECRET;
  return !!value && !!secret && validSession(value, secret);
}
