import { randomUUID } from 'node:crypto';
import { readData, transact, publicUser, isBlocked, areFriends, canMessage, areEligibleForMatch } from './store.mjs';
import { emailRegex, normalizeEmail, passwordHash, passwordValid, usernameRegex, newSession } from './accounts.mjs';
import { createInvite, newRoomId } from './security.mjs';
import { getCategory, getGoal, validCategory, validGoal, normalizeProjectLink } from './creator-categories.mjs';
const clean = (s,n=120) => typeof s === 'string' ? s.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,n) : '';
const err = (message,status=400) => {const e=new Error(message);e.status=status;throw e;};
const byId=(db,id)=>db.users.find(u=>u.id===id && !u.disabled);
function requireAgeGroup(user){
  if(!user || !['13-17','18+'].includes(user.ageBand)) err('Для участия нужен зарегистрированный аккаунт с указанной возрастной группой.',403);
}
function matchingAgeGroup(owner,viewer){
  return !!owner && !!viewer && owner.ageBand===viewer.ageBand && ['13-17','18+'].includes(owner.ageBand);
}
const max = (x,n) => Array.isArray(x) ? x.slice(0,n) : [];

export function register(body){
  const email=normalizeEmail(body.email); const username=clean(body.username,40).toLowerCase();
  const displayName=clean(body.displayName,28)||username;
  const pw=String(body.password || '');
  if(!emailRegex.test(email)||email.length>160)err('Неверный адрес электронной почты');
  if(!usernameRegex.test(username))err('Ник: 3–20 латинских букв, цифр или _');
  if(displayName.length<2)err('Имя: от 2 символов');
  if(pw.length<12 || pw.length>128)err('Пароль: от 12 до 128 символов');
  if(!['13-17','18+'].includes(body.ageBand))err('Нужно выбрать возрастную группу');
  if(body.agree!==true)err('Подтверди принятие правил закрытого теста');
  const pass=passwordHash(pw);
  const id=transact(db=>{
    if(db.users.some(u=>u.email===email || u.username===username))err('Этот ник или почта уже заняты',409);
    const id=randomUUID();
    db.users.push({id,email,username,displayName, passwordHash:pass.hash,passwordSalt:pass.salt,ageBand:body.ageBand,adultVerified:false,
      role:'member',bio:'',interests:[],language:'ru',avatarColor:'#6965e8',createdAt:Date.now(),disabled:false});
    return id;
  });
  return {user:publicUser(readData().users.find(u=>u.id===id)),token:newSession(id)};
}
export function login(body){
  const email=normalizeEmail(body.email); const pw=String(body.password||'');
  const user=readData().users.find(u=>u.email===email&&!u.disabled);
  // Constant time calculation for nonexistent accounts as far as possible.
  const fake={passwordSalt:'0123456789abcdef0123456789abcdef',passwordHash:'00'.repeat(64)};
  const verified=passwordValid(pw,user||fake);
  if(!user||!verified)err('Неверная почта или пароль',401);
  return {user:publicUser(user),token:newSession(user.id)};
}
export function getProfile(username, viewerId){
  const db=readData(); const viewer=byId(db,viewerId);
  const u=db.users.find(u=>u.username===String(username||'').toLowerCase()&&!u.disabled);
  if(!viewer || !u || u.ageBand!==viewer.ageBand || isBlocked(db,u.id,viewer.id))err('Профиль недоступен',404);
  return publicUser(u);
}
export function editProfile(userId,body){
  return transact(db=>{
    const user=byId(db,userId); if(!user)err('Нет доступа',401);
    const displayName=clean(body.displayName,28),bio=clean(body.bio,240);
    if(displayName.length<2)err('Имя должно быть не короче 2 символов');
    user.displayName=displayName;user.bio=bio;
    user.language=['ru','en'].includes(body.language)?body.language:'ru';
    user.interests=max(body.interests,6).map(s=>clean(s,24)).filter(Boolean);
    return publicUser(user);
  });
}
export function friendsList(id){
 const db=readData(); const ids=db.friends.filter(f=>f.a===id||f.b===id).map(f=>f.a===id?f.b:f.a);
 return {friends:ids.map(x=>byId(db,x)).filter(Boolean).map(publicUser),
  incoming:db.requests.filter(x=>x.to===id&&x.status==='pending'&&byId(db,x.from)).map(x=>({...x,from:publicUser(byId(db,x.from))})),
  outgoing:db.requests.filter(x=>x.from===id&&x.status==='pending'&&byId(db,x.to)).map(x=>({...x,to:publicUser(byId(db,x.to))})),
  blocked:db.blocks.filter(x=>x.by===id).map(x=>byId(db,x.target)).filter(Boolean).map(publicUser)};
}
export function searchProfiles(query,id){
 const q=clean(query,32).toLowerCase(); if(q.length<2)return [];
 const db=readData();const requester=byId(db,id);
 return db.users.filter(u=>!u.disabled && u.id!==id && u.username.includes(q) && u.ageBand===requester?.ageBand && !isBlocked(db,u.id,id)).slice(0,12).map(publicUser);
}
export function requestFriend(id,username){
 return transact(db=>{
  const to=db.users.find(u=>u.username===clean(username,40).toLowerCase()&&!u.disabled);
  if(!to||to.id===id)err('Пользователь не найден',404);
  if(isBlocked(db,id,to.id))err('Контакт недоступен',403);
  if(byId(db,id)?.ageBand !== to.ageBand)err('Контакты между несовершеннолетними и взрослыми в закрытом тесте запрещены',403);
  if(areFriends(db,id,to.id))err('Уже в друзьях',409);
  if(db.requests.some(x=>x.status==='pending'&&x.from===id&&x.to===to.id))err('Заявка уже отправлена',409);
  if(db.requests.some(x=>x.status==='pending'&&x.to===id&&x.from===to.id))err('У тебя уже есть входящая заявка',409);
  db.requests.push({id:randomUUID(),from:id,to:to.id,status:'pending',createdAt:Date.now()}); return {ok:true};
 });
}
export function respondFriend(id,requestId,accept){
 return transact(db=>{
  const req=db.requests.find(x=>x.id===requestId&&x.to===id&&x.status==='pending');
  if(!req)err('Заявка не найдена',404);
  if(isBlocked(db,req.from,req.to))err('Контакт недоступен',403);
  if(byId(db,req.from)?.ageBand!==byId(db,req.to)?.ageBand)err('Контакт недоступен из-за возрастных ограничений',403);
  req.status=accept?'accepted':'declined';
  if(accept&&!areFriends(db,req.from,req.to))db.friends.push({a:req.from,b:req.to,createdAt:Date.now()});
  return {ok:true};
 });
}
export function removeFriend(id,targetId){
 return transact(db=>{db.friends=db.friends.filter(f=>!((f.a===id&&f.b===targetId)||(f.a===targetId&&f.b===id)));return {ok:true};});
}
export function blockAccount(id,targetId, unblock=false){
 return transact(db=>{
  if(id===targetId || !byId(db,targetId))err('Пользователь не найден',404);
  db.blocks=db.blocks.filter(x=>!(x.by===id&&x.target===targetId));
  if(!unblock){db.blocks.push({by:id,target:targetId,at:Date.now()});
   db.friends=db.friends.filter(f=>!((f.a===id&&f.b===targetId)||(f.a===targetId&&f.b===id)));
   db.requests=db.requests.filter(x=>!((x.from===id&&x.to===targetId)||(x.from===targetId&&x.to===id)));}
  return {ok:true};
 });
}
export function listThreads(id){
 const db=readData();const friends=db.friends.filter(f=>f.a===id||f.b===id).map(f=>f.a===id?f.b:f.a);
 return friends.map(x=>{
  const p=byId(db,x);if(!p)return null;
  const last=db.messages.filter(m=>(m.from===id&&m.to===x)||(m.from===x&&m.to===id)).at(-1);
  return {peer:publicUser(p),last:last?{text:last.text,at:last.at,from:last.from}:null};
 }).filter(Boolean).sort((a,b)=>(b.last?.at||0)-(a.last?.at||0));
}
export function readMessages(id,peerId){
 const db=readData(); const peer=byId(db,peerId);if(!peer||!canMessage(db,{id},peer))err('Переписка доступна только друзьям',403);
 return {peer:publicUser(peer),messages:db.messages.filter(m=>(m.from===id&&m.to===peerId)||(m.from===peerId&&m.to===id)).slice(-100)};
}
export function sendMessage(id,peerId,text){
 return transact(db=>{
  const peer=byId(db,peerId);if(!peer||!canMessage(db,{id},peer))err('Переписка доступна только друзьям',403);
  const safe=clean(text,1200);if(!safe)err('Пустое сообщение');
  const m={id:randomUUID(),from:id,to:peerId,text:safe,at:Date.now()};db.messages.push(m);return m;
 });
}
export function listRooms(id){
 const db=readData();const viewer=byId(db,id);
 if(!viewer || !['13-17','18+'].includes(viewer.ageBand))return [];
 return db.rooms.filter(r=>r.visibility==='public'&&r.status==='open'&&matchingAgeGroup(byId(db,r.ownerId),viewer)&&r.ownerId!==id&&!isBlocked(db,r.ownerId,id)).slice(-100).reverse().map(r=>({id:r.id,title:r.title,topic:r.topic,description:r.description,category:r.category||'talk',goal:r.goal||'hangout',projectTitle:r.projectTitle||'',projectUrl:r.projectUrl||'',learningPlan:r.learningPlan||'',createdAt:r.createdAt,owner:publicUser(byId(db,r.ownerId)),url:`/room/${r.id}?invite=${createInvite(r.id,process.env.ROOM_SIGNING_SECRET)}`}));
}
export function myRooms(userId){
 const db=readData();return db.rooms.filter(r=>r.ownerId===userId&&r.status==='open').slice(-30).reverse().map(r=>({id:r.id,title:r.title,topic:r.topic,category:r.category||'talk',goal:r.goal||'hangout',projectTitle:r.projectTitle||'',projectUrl:r.projectUrl||'',learningPlan:r.learningPlan||'',visibility:r.visibility,createdAt:r.createdAt,url:`/room/${r.id}?invite=${createInvite(r.id,process.env.ROOM_SIGNING_SECRET)}`}));
}
export function createRoom(userId,body={},isGuest=false){
 const visibility=body.visibility==='public'?'public':'private';
 return transact(db=>{
  const owner=byId(db,userId);
  if(visibility==='public'){ if(isGuest)err('Для публичной комнаты нужен аккаунт',401);requireAgeGroup(owner); }
  const id=newRoomId();const title=clean(body.title,60)||'Ваше пространство';
  // Older clients may submit `topic`; all creator-hub categories and goals are server-validated.
  const oldTopics={'Игры':'gaming','Творчество':'design','Программирование':'programming','Учёба':'study','Музыка':'music','Общение':'talk'};
  const category=body.category===undefined ? (oldTopics[body.topic]||'talk') : body.category;
  const goal=body.goal===undefined ? 'hangout' : body.goal;
  if(!validCategory(category))err('Неизвестная категория комнаты');
  if(!validGoal(goal))err('Неизвестная цель трансляции');
  const topic=getCategory(category).label,description=clean(body.description,180);
  const projectTitle=clean(body.projectTitle,80);
  const learningPlan=clean(body.learningPlan,320);
  const projectUrl=normalizeProjectLink(body.projectUrl);
  // A user-supplied request must never be able to forge a matchmaking room or allowed-list.
  db.rooms.push({id,ownerId:userId,title,topic,category,goal,projectTitle,projectUrl,learningPlan,description,visibility,status:'open',mode:'normal',ageBand:owner?.ageBand||null,createdAt:Date.now(),banned:[],allowed:[]});
  return {id, path:`/room/${id}?invite=${createInvite(id,process.env.ROOM_SIGNING_SECRET)}`};
 });
}
export function closeRoom(userId,roomId,admin=false){
 return transact(db=>{const r=db.rooms.find(x=>x.id===roomId&&x.status==='open');if(!r)err('Комната не найдена',404);
  if(r.ownerId!==userId&&!admin)err('Нет прав',403);r.status='closed';return {ok:true};});
}
export function roomAccess(roomId,invite,user){
 const db=readData();const r=db.rooms.find(x=>x.id===roomId&&x.status==='open');if(!r)err('Комната не найдена или закрыта',404);
 if(!invite || !process.env.ROOM_SIGNING_SECRET || !validInviteWrapped(roomId,invite))err('Приглашение недействительно',403);
 if(r.banned.includes(user?.id))err('Нет доступа к этой комнате',403);
 if(r.visibility==='public'){
   requireAgeGroup(user);
   const owner=byId(db,r.ownerId);
   if(!matchingAgeGroup(owner,user))err('Комната доступна только пользователям своей возрастной группы',403);
   if(isBlocked(db,r.ownerId,user.id))err('Нет доступа',403);
 }
 if(r.visibility==='private' && r.mode!=='match') {
  const owner=byId(db,r.ownerId);
  if(owner && (!user || owner.ageBand !== user.ageBand))err('Возрастные группы и гостевой доступ к этой комнате несовместимы',403);
  if(!owner && user?.ageBand==='13-17')err('Несовершеннолетние не могут подключаться к гостевым комнатам',403);
  if(owner && user && isBlocked(db,owner.id,user.id))err('Пользователь заблокирован',403);
 }
 if(r.mode==='match'){
   requireAgeGroup(user);
   if(!r.allowed.includes(user.id))err('Нет доступа к этой паре',403);
   const partnerId=r.allowed.find(id=>id!==user.id);
   const partner=byId(db,partnerId);
   if(!matchingAgeGroup(partner,user) || isBlocked(db,user.id,partnerId))err('Контакт недоступен',403);
 }
 return r;
}
function validInviteWrapped(id,invite){return importValidate(id,invite,process.env.ROOM_SIGNING_SECRET);}
// Direct static import below avoids dynamic dependency dispatch.
import { validInvite as importValidate } from './security.mjs';
export function reportUser(id,body){
 const reason=clean(body.reason,700),category=clean(body.category,30),target=clean(body.targetId,100),roomId=clean(body.roomId,50),projectId=clean(body.projectId,60);
 if(!['harassment','inappropriate','spam','minor_safety','other'].includes(category))err('Укажи категорию жалобы');
 if(reason.length<8)err('Опиши проблему хотя бы в 8 символах');
 return transact(db=>{const isGuestTarget=/^guest:[a-f0-9-]{36}$/.test(target);
  if((!isGuestTarget&&!byId(db,target))||id===target)err('Нельзя отправить эту жалобу',400);
  if(projectId){const p=db.projects.find(p=>p.id===projectId);
   const viewer=byId(db,id),owner=byId(db,target);
   if(!p||p.ownerId!==target||!matchingAgeGroup(owner,viewer)||isBlocked(db,id,target))err('Проект недоступен для жалобы',404);}
  const recent=db.reports.filter(r=>r.reporterId===id&&r.at>Date.now()-86400000).length;
  if(recent>=20)err('Дневной лимит жалоб',429);
  const report={id:randomUUID(),reporterId:id,targetId:target,roomId,projectId,category,reason,at:Date.now(),status:'open'};db.reports.push(report);return {ok:true};});
}
export function moderationList(user){
 if(user?.role!=='admin'&&user?.role!=='moderator')err('Нет прав',403);
 const db=readData();return db.reports.slice(-150).reverse().map(r=>({...r,target:db.users.find(u=>u.id===r.targetId)?.username,reporter:db.users.find(u=>u.id===r.reporterId)?.username}));
}
export function resolveReport(admin,reportId,decision){
 if(!['admin','moderator'].includes(admin.role))err('Нет прав',403);
 return transact(db=>{const r=db.reports.find(r=>r.id===reportId);if(!r)err('Не найдено',404);
  r.status=decision==='dismiss'?'dismissed':'actioned';r.handledBy=admin.id;r.handledAt=Date.now();
  if(decision==='disable'){const target=byId(db,r.targetId);if(target){target.disabled=true;db.sessions=db.sessions.filter(s=>s.userId!==target.id);db.rooms.filter(x=>x.ownerId===target.id).forEach(x=>x.status='closed');}}
  db.moderation.push({id:randomUUID(),by:admin.id,target:r.targetId,reportId:r.id,decision,at:Date.now()});return {ok:true};});
}
export function joinMatch(userId, category='all'){
 if(category!=='all' && !validCategory(category))err('Неизвестная категория поиска');
 return transact(db=>{
  const user=byId(db,userId);requireAgeGroup(user);
  const now=Date.now();db.matchQueue=db.matchQueue.filter(q=>q.expiresAt>now);
  const current=db.matchQueue.find(q=>q.userId===userId);
  if(current){return current.roomId?{status:'matched',path:`/room/${current.roomId}?invite=${createInvite(current.roomId,process.env.ROOM_SIGNING_SECRET)}`}:{status:'waiting'};}
  const candidates=db.matchQueue.filter(q=>!q.roomId && q.userId!==userId && areEligibleForMatch(db,user,byId(db,q.userId)) && (category==='all' || (q.category||'all')==='all' || q.category===category));
  candidates.sort((a,b)=>{
    const aUser=byId(db,a.userId),bUser=byId(db,b.userId);
    const score=u=>u.interests?.filter(x=>user.interests?.includes(x)).length||0;
    return score(bUser)-score(aUser) || a.at-b.at;
  });
  const partner=candidates[0];
  if(partner){const rId=newRoomId();
   db.rooms.push({id:rId,ownerId:userId,title:'Случайная встреча',topic:getCategory(category==='all'?partner.category||'talk':category)?.label||'Общение',category:category==='all'?(partner.category==='all'?'talk':partner.category)||'talk':category,goal:'hangout',description:'Закрытая комната для двух тестировщиков своей возрастной группы',visibility:'private',status:'open',mode:'match',ageBand:user.ageBand,createdAt:now,banned:[],allowed:[userId,partner.userId]});
   partner.roomId=rId; partner.expiresAt=now+15*60_000;
   db.matchQueue.push({userId,category,roomId:rId,at:now,expiresAt:now+15*60_000});
   return {status:'matched',path:`/room/${rId}?invite=${createInvite(rId,process.env.ROOM_SIGNING_SECRET)}`};}
  db.matchQueue.push({userId,category,roomId:null,at:now,expiresAt:now+2*60_000});return {status:'waiting'};
 });
}
export function matchStatus(userId){
 const u=readData().matchQueue.find(x=>x.userId===userId&&x.expiresAt>Date.now());
 if(!u)return {status:'idle'};
 return u.roomId?{status:'matched',path:`/room/${u.roomId}?invite=${createInvite(u.roomId,process.env.ROOM_SIGNING_SECRET)}`}:{status:'waiting'};
}
export function cancelMatch(id){return transact(db=>{db.matchQueue=db.matchQueue.filter(x=>x.userId!==id);return {ok:true};});}
export function deleteAccount(id){
 return transact(db=>{
  const user=byId(db,id);if(!user)err('Аккаунт не найден',404);
  user.disabled=true;user.email=`deleted-${user.id}@invalid.local`;user.displayName='Удалённый пользователь';user.username=`deleted_${user.id.slice(0,8)}`;user.bio='';user.interests=[];user.passwordHash='';user.passwordSalt='';
  db.messages=db.messages.filter(m=>m.from!==id && m.to!==id);
  db.requests=db.requests.filter(f=>f.from!==id&&f.to!==id);
  db.friends=db.friends.filter(f=>f.a!==id&&f.b!==id);
  db.sessions=db.sessions.filter(s=>s.userId!==id);
  db.matchQueue=db.matchQueue.filter(q=>q.userId!==id);
  const ownedProjects=db.projects.filter(p=>p.ownerId===id).map(p=>p.id);
  db.projects=db.projects.filter(p=>p.ownerId!==id);
  db.projectComments=db.projectComments.filter(c=>c.authorId!==id && !ownedProjects.includes(c.projectId));
  db.rooms.filter(r=>r.ownerId===id).forEach(r=>r.status='closed');
  return {ok:true};
 });
}
