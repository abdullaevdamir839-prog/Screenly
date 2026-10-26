import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/store.mjs';
import { randomUUID } from 'node:crypto';
import { limited, sameOrigin } from '@/lib/security.mjs';
import { isAuthorized, requireSettings } from '@/lib/server';
import { cookies } from 'next/headers';
import { USER_COOKIE, findAccount } from '@/lib/accounts.mjs';
import { createRoom } from '@/lib/actions.mjs';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try {
 return await withDatabase(async () => {
  if(!sameOrigin(req))return NextResponse.json({error:'Запрещено'},{status:403});
  if(!await isAuthorized())return NextResponse.json({error:'Нужен код тестировщика'},{status:401});
  if(limited('guest-room:local',20,3600000))return NextResponse.json({error:'Лимит комнат'},{status:429});
  requireSettings();const user=findAccount((await cookies()).get(USER_COOKIE)?.value);
  const out=createRoom(user?.id || `guest:${randomUUID()}`,{title:'Ваше пространство'},!user);
  return NextResponse.json(out,{headers:{'Cache-Control':'no-store'}});
 }, {write:true});
 }catch(error){const e=error as Error & {status?:number};const status=(e.status??0)>=400&&(e.status??0)<500?e.status!:503;if(status===503)console.error('[screenly:rooms] Request failed:',e);return NextResponse.json({error:status===503?'Сервер временно недоступен':e.message||'Ошибка комнаты'},{status});}
}
