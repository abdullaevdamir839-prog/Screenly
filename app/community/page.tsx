import { redirect } from 'next/navigation';
import { isAuthorized } from '@/lib/server';
import Community from '@/components/Community';
export const dynamic='force-dynamic';
export default async function CommunityPage(){if(!await isAuthorized())redirect('/?next=%2Fcommunity');return <Community/>;}
