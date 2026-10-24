import { notFound, redirect } from 'next/navigation';
import { ROOM_ID_PATTERN, safeReturnPath, validInvite } from '@/lib/security.mjs';
import { isAuthorized } from '@/lib/server';
import { readData, withDatabase } from '@/lib/store.mjs';
import RoomClient from '@/components/RoomClient';
export const dynamic='force-dynamic';
export default async function RoomPage({ params,searchParams }:{params:Promise<{id:string}>;searchParams:Promise<{invite?:string}>}){
 return await withDatabase(async () => {
 const {id}=await params;const {invite}=await searchParams;
 if(!ROOM_ID_PATTERN.test(id)||!validInvite(id,invite,process.env.ROOM_SIGNING_SECRET||''))notFound();
 const found=readData().rooms.find(r=>r.id===id&&r.status==='open');if(!found)notFound();
 if(!await isAuthorized())redirect(`/?next=${encodeURIComponent(safeReturnPath(`/room/${id}?invite=${invite}`))}`);
 return <RoomClient roomId={id} invite={invite!} details={{title:found.title,category:found.category||'talk',goal:found.goal||'hangout',projectTitle:found.projectTitle||'',projectUrl:found.projectUrl||'',learningPlan:found.learningPlan||'',description:found.description||'',visibility:found.visibility}}/>;
 }, {write:false});
}
