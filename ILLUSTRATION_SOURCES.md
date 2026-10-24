import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/store.mjs';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { ROOM_ID_PATTERN, limited, sameOrigin } from '@/lib/security.mjs';
import { isAuthorized, requireSettings } from '@/lib/server';
import { USER_COOKIE, findAccount } from '@/lib/accounts.mjs';
import { roomAccess } from '@/lib/actions.mjs';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try {
 return await withDatabase(async () => {
  if(!sameOrigin(req))return NextResponse.json({error:'Недопустимый источник'},{status:403});
  if(!await isAuthorized())return NextResponse.json({error:'Нужен код тестировщика'},{status:401});
  if(limited('livekit-token:local',60,60000))return NextResponse.json({error:'Лимит подключений'},{status:429});
  const cfg=requireSettings();
  const b=await req.json();
  if(typeof b.roomId!=='string'||!ROOM_ID_PATTERN.test(b.roomId))return NextResponse.json({error:'Неверная комната'},{status:400});
  const user=findAccount((await cookies()).get(USER_COOKIE)?.value);
  const room=roomAccess(b.roomId,b.invite,user);
  const name=user?.displayName || (typeof b.name==='string'?b.name.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,28):'');
  if(name.length<2)return NextResponse.json({error:'Укажи имя не короче 2 символов'},{status:400});
  const access=new AccessToken(cfg.apiKey,cfg.apiSecret,{identity: user?`${user.id}.${randomUUID()}`:randomUUID(),name,ttl:'10m'});
  access.addGrant({room:`screenly-${room.id}`,roomJoin:true,canSubscribe:true,canPublish:true,canPublishData:true,canPublishSources:[2,3,4]});
  const res=NextResponse.json({token:await access.toJwt(),serverUrl:cfg.livekitUrl,roomTitle:room.title});
  res.headers.set('Cache-Control','no-store');return res;
 }, {write:false});
 }catch(error){const e=error as Error & {status?:number};return NextResponse.json({error:e.message||'Ошибка подключения'},{status:e.status||503});}
}
