import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { isAuthorized } from '@/lib/server';
import { sameOrigin, limited } from '@/lib/security.mjs';
import { USER_COOKIE, accountCookieOptions, findAccount, deleteSession } from '@/lib/accounts.mjs';
import { withDatabase, publicUser } from '@/lib/store.mjs';
import * as a from '@/lib/actions.mjs';
import * as gallery from '@/lib/projects.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function reply(data: unknown, status=200){const r=NextResponse.json(data,{status});r.headers.set('Cache-Control','private, no-store');return r;}
async function currentUser(){const ck=await cookies();return findAccount(ck.get(USER_COOKIE)?.value);}
function needUser(user:any){if(!user)throw Object.assign(new Error('Нужен аккаунт'),{status:401});return user;}
function needAdmin(user:any){if(!user||!['admin','moderator'].includes(user.role))throw Object.assign(new Error('Нет прав'),{status:403});return user;}
function parseError(error:unknown){const e=error as Error & {status?:number};return reply({error:e.message||'Ошибка запроса'},e.status||500);}
async function guard(request:NextRequest, post=false){
 if(post&&!sameOrigin(request))throw Object.assign(new Error('Недопустимый источник запроса'),{status:403});
 if(!await isAuthorized())throw Object.assign(new Error('Сначала войди по коду тестировщика'),{status:401});
 const size=Number(request.headers.get('content-length')||'0');
 if(size>16000)throw Object.assign(new Error('Слишком большой запрос'),{status:413});
 const addr=request.headers.get('x-real-ip')||'local';
 if(limited(`v1:${post?'p':'g'}:${addr}`,post?100:500,60_000))throw Object.assign(new Error('Слишком много запросов'),{status:429});
}
async function bodyOf(req:NextRequest){
 try {return await req.json() as Record<string,any>;}catch {throw Object.assign(new Error('Неверный JSON'),{status:400});}
}
export async function GET(req:NextRequest,{params}:{params:Promise<{parts:string[]}>}){
 try {
 return await withDatabase(async () => {
 await guard(req);const path=(await params).parts.join('/');const user=await currentUser();const q=new URL(req.url).searchParams;
 switch(path){
  case 'me': return reply({user:user?publicUser(user):null,guest:!user});
  case 'profile':return reply({profile:a.getProfile(q.get('username'),needUser(user).id)});
  case 'profiles/search':return reply({users:a.searchProfiles(q.get('q'),needUser(user).id)});
  case 'friends':return reply(a.friendsList(needUser(user).id));
  case 'threads':return reply({threads:a.listThreads(needUser(user).id)});
  case 'messages':return reply(a.readMessages(needUser(user).id,q.get('peer')));
  case 'rooms':return reply({rooms:a.listRooms(needUser(user).id),mine:a.myRooms(user.id)});
  case 'match':return reply(a.matchStatus(needUser(user).id));
  case 'projects':return reply({projects:gallery.listProjects(needUser(user).id,q.get('category')||'all',q.get('q')||'')});
  case 'projects/feedback':return reply(gallery.listFeedback(needUser(user).id,q.get('id')));
  case 'moderation':return reply({reports:a.moderationList(needAdmin(user))});
  default:return reply({error:'Неизвестный маршрут'},404);
 }
 }, {write:false});
 } catch(error){return parseError(error);}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{parts:string[]}>}){
 try {
 return await withDatabase(async () => {
 await guard(req,true);const path=(await params).parts.join('/');const b=await bodyOf(req);const user=await currentUser();let out:any;
 switch(path){
  case 'register':{
   if(limited('register:local',8,3600000))return reply({error:'Регистрация временно ограничена'},429);
   out=a.register(b);const res=reply({ok:true,user:out.user});res.cookies.set(USER_COOKIE,out.token,accountCookieOptions());return res;
  }
  case 'login':{
   if(limited('user-login:local',15,600000))return reply({error:'Слишком много попыток'},429);
   out=a.login(b);const res=reply({ok:true,user:out.user});res.cookies.set(USER_COOKIE,out.token,accountCookieOptions());return res;
  }
  case 'logout':{
   const token=(await cookies()).get(USER_COOKIE)?.value;deleteSession(token);
   const res=reply({ok:true});res.cookies.set(USER_COOKIE,'',{...accountCookieOptions(),maxAge:0});return res;
  }
  case 'profile':return reply({user:a.editProfile(needUser(user).id,b)});
  case 'friend/request':return reply(a.requestFriend(needUser(user).id,b.username));
  case 'friend/respond':return reply(a.respondFriend(needUser(user).id,b.requestId,b.accept===true));
  case 'friend/remove':return reply(a.removeFriend(needUser(user).id,b.targetId));
  case 'block':return reply(a.blockAccount(needUser(user).id,b.targetId,b.unblock===true));
  case 'message':{
   if(limited(`msg:${needUser(user).id}`,40,60_000))return reply({error:'Слишком часто'},429);
   return reply({message:a.sendMessage(user.id,b.peerId,b.text)});
  }
  case 'rooms/create':{
   const uid=user?.id || `guest:${randomUUID()}`;
   return reply(a.createRoom(uid,b,!user));
  }
  case 'rooms/close':return reply(a.closeRoom(needUser(user).id,b.roomId,user.role==='admin'));
  case 'match/join':return reply(a.joinMatch(needUser(user).id,b.category||'all'));
  case 'match/cancel':return reply(a.cancelMatch(needUser(user).id));
  case 'projects/create':{
   if(limited(`project-create:${needUser(user).id}`,6,3600000))return reply({error:'Слишком много новых проектов'},429);
   return reply(gallery.createProject(user.id,b));
  }
  case 'projects/update':return reply(gallery.updateProject(needUser(user).id,b.projectId,b));
  case 'projects/delete':return reply(gallery.deleteProject(needUser(user).id,b.projectId));
  case 'projects/feedback':{
   if(limited(`project-feedback:${needUser(user).id}`,10,60000))return reply({error:'Слишком много комментариев'},429);
   return reply(gallery.postFeedback(user.id,b.projectId,b));
  }
  case 'projects/feedback/delete':return reply(gallery.deleteFeedback(needUser(user).id,b.commentId));
  case 'report':{
   if(limited(`report:${needUser(user).id}`,12,3600000))return reply({error:'Слишком много жалоб'},429);
   return reply(a.reportUser(user.id,b));
  }
  case 'moderation/resolve':return reply(a.resolveReport(needAdmin(user),b.reportId,b.decision));
  case 'account/delete':{
   needUser(user);
   if(b.confirm!==user.username) return reply({error:'Введи свой ник для подтверждения удаления'},400);
   out=a.deleteAccount(user.id);const res=reply(out);res.cookies.set(USER_COOKIE,'',{...accountCookieOptions(),maxAge:0});return res;
  }
  default:return reply({error:'Неизвестный маршрут'},404);
 }
 }, {write:true});
 }catch(error){return parseError(error);}
}
