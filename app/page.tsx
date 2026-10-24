import Home from '@/components/Home';
import { isAuthorized } from '@/lib/server';

export default async function Page({searchParams}: {searchParams: Promise<{next?: string}>}) {
  const params = await searchParams;
  return <Home authorized={await isAuthorized()} nextPath={params.next || '/'} />;
}
