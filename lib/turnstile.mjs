const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, {secret = process.env.TURNSTILE_SECRET_KEY, sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, hostname = new URL(process.env.SITE_ORIGIN || 'http://localhost:3000').hostname, fetcher = fetch} = {}) {
  // Unconfigured local deployments retain the existing closed-alpha behaviour.
  if (!secret && !sitekey) return true;
  if (!secret || !sitekey) return false;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({secret, response: token});
    const response = await fetcher(VERIFY_URL, {method: 'POST', body, signal: AbortSignal.timeout(8000), cache: 'no-store'});
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true && result.hostname === hostname && (result.action === undefined || result.action === 'register');
  } catch {
    return false;
  }
}
