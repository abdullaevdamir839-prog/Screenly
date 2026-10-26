'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreatorHub from './CreatorHub';
import ProjectGallery from './ProjectGallery';
import { CATEGORIES, GOALS, getCategory, getGoal } from '@/lib/creator-categories.mjs';
import {
 ArrowRight, Bell, Check, ChevronRight, Compass, DoorOpen, Eye, FileWarning,
 Headphones, Heart, Link2, LoaderCircle, LockKeyhole, LogOut, MessageCircle,
 MessageSquareText, MonitorPlay, Plus, Search, Send, Settings, Shield, ShieldCheck,
 Shuffle, Sparkles, UserMinus, UserPlus, UserRound, Users, X, Zap, Trash2
} from 'lucide-react';

type User={id:string;username:string;displayName:string;bio:string;ageBand:string;adultVerified:boolean;role:string;interests:string[];language:string;avatarColor:string;createdAt:number};
type FriendRequest={id:string;from:User;to:User;status:string};
type RoomInvite={id:string;at:number;roomTitle:string;from:User;url:string};
type Room={id:string;title:string;topic:string;description?:string;category?:string;goal?:string;projectTitle?:string;projectUrl?:string;learningPlan?:string;visibility?:string;url:string;owner?:User};
type ChatMessage={id:string;from:string;to:string;text:string;at:number};
const tabs=[['discover','Творчество',Sparkles],['projects','Галерея работ',Heart],['rooms','Комнаты',MonitorPlay],['roulette','Рулетка',Shuffle],['friends','Друзья',Users],['invites','Уведомления',Bell],['messages','Сообщения',MessageCircle],['profile','Мой профиль',UserRound],['safety','Безопасность',Shield]] as const;
const formatDate=(n:number)=>new Date(n).toLocaleString('ru-RU',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
async function api(path:string,body?:any){
 const res=await fetch('/api/v1/'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json().catch(()=>({error:'Сервер вернул неожиданный ответ'}));
 if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
 return data;
}
function Avatar({u,size=38}:{u?:User|null;size?:number}){return <span className="social-avatar" style={{background:u?.avatarColor||'#7776ed',width:size,height:size,fontSize:size/2.6}}>{u?.displayName?.slice(0,1).toUpperCase()||'?'}</span>;}
function ErrorMessage({error}:{error:string}){return error?<p className="social-error" role="alert">{error}</p>:null;}

export default function Community(){
 const router=useRouter();
 const [me,setMe]=useState<User|null|undefined>(undefined);
 const [tab,setTab]=useState('discover');
 const [authMode,setAuthMode]=useState<'register'|'login'>('register');
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [username,setUsername]=useState('');const [displayName,setDisplayName]=useState('');const [ageBand,setAgeBand]=useState('13-17');const [agree,setAgree]=useState(false);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [rooms,setRooms]=useState<Room[]>([]),[mine,setMine]=useState<Room[]>([]);
 const [roomTitle,setRoomTitle]=useState('Моя мастерская'),[roomCategory,setRoomCategory]=useState('vibe-coding'),[roomGoal,setRoomGoal]=useState('showcase'),[roomDescription,setRoomDescription]=useState('');
 const [projectTitle,setProjectTitle]=useState(''),[projectUrl,setProjectUrl]=useState(''),[learningPlan,setLearningPlan]=useState('');
 const [roomPublic,setRoomPublic]=useState(false);
 const [friends,setFriends]=useState<User[]>([]),[incoming,setIncoming]=useState<FriendRequest[]>([]),[outgoing,setOutgoing]=useState<FriendRequest[]>([]),[blocked,setBlocked]=useState<User[]>([]);
 const [invites,setInvites]=useState<RoomInvite[]>([]),[inviteFriend,setInviteFriend]=useState<Record<string,string>>({});
 const [search,setSearch]=useState(''),[searchResults,setSearchResults]=useState<User[]>([]);
 const [threads,setThreads]=useState<{peer:User;last?:{text:string;at:number}}[]>([]),[peer,setPeer]=useState<User|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]),[text,setText]=useState('');
 const [profileName,setProfileName]=useState(''),[profileBio,setProfileBio]=useState(''),[profileLanguage,setProfileLanguage]=useState('ru'),[profileInterests,setProfileInterests]=useState('');
 const [match,setMatch]=useState<{status:string;path?:string}>({status:'idle'}),[matchCategory,setMatchCategory]=useState('all');
 const [reports,setReports]=useState<any[]>([]),[deleteConfirm,setDeleteConfirm]=useState('');
 async function syncMe(){const v=await api('me');setMe(v.user);if(v.user){setProfileName(v.user.displayName);setProfileBio(v.user.bio||'');setProfileLanguage(v.user.language||'ru');setProfileInterests((v.user.interests||[]).join(', '));}}
 useEffect(()=>{syncMe().catch(e=>setError(e.message));},[]);
 async function load(section=tab){
  if(!me)return;
  try {
   if(section==='rooms'){const data=await api('rooms');setRooms(data.rooms);setMine(data.mine);}
   if(section==='friends' || section==='safety'){const data=await api('friends');setFriends(data.friends);setIncoming(data.incoming);setOutgoing(data.outgoing);setBlocked(data.blocked);}
   if(section==='invites'){setInvites((await api('invites')).invites);}
   if(section==='messages'){const data=await api('threads');setThreads(data.threads);}
   if(section==='roulette'){setMatch(await api('match'));}
   if(section==='admin'){setReports((await api('moderation')).reports);}
  }catch(e){setError((e as Error).message);}
 }
 useEffect(()=>{if(me)void load(tab);},[tab,me?.id]);
 useEffect(()=>{if(!me)return;const update=()=>{api('invites').then(v=>setInvites(v.invites)).catch(()=>{});api('friends').then(v=>{setFriends(v.friends);setIncoming(v.incoming);}).catch(()=>{});};update();const timer=setInterval(update,20000);return ()=>clearInterval(timer);},[me?.id]);
 useEffect(()=>{if(tab!=='roulette'||match.status!=='waiting'||!me)return;
  const timer=setInterval(()=>{api('match').then(v=>{setMatch(v);if(v.status==='matched'&&v.path)router.push(v.path);}).catch(e=>setError(e.message));},2800);
  return ()=>clearInterval(timer);},[tab,match.status,me?.id]);
 useEffect(()=>{if(tab!=='messages'||!peer)return;
  const loadMessages=()=>api('messages?peer='+encodeURIComponent(peer.id)).then(v=>setMessages(v.messages)).catch(()=>{});
  void loadMessages();const timer=setInterval(loadMessages,3500);return ()=>clearInterval(timer);
 },[tab,peer?.id]);
 async function action(fn:()=>Promise<unknown>,after?:()=>Promise<unknown>|void){setBusy(true);setError('');setNotice('');try{await fn();await after?.();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function authenticate(event:React.FormEvent){event.preventDefault();await action(async()=>{
  await api(authMode==='register'?'register':'login',authMode==='register'?{email,password,username,displayName,ageBand,agree}:{email,password});
  await syncMe();setPassword('');setNotice('Добро пожаловать в Screenly!');
 });}
 async function signOut(){await action(async()=>{await api('logout',{});setMe(null);setPeer(null);});}
 async function makeRoom(){await action(async()=>{const v=await api('rooms/create',{title:roomTitle,category:roomCategory,goal:roomGoal,description:roomDescription,projectTitle,projectUrl,learningPlan,visibility:roomPublic?'public':'private'});router.push(v.path);});}
 async function findPeople(){await action(async()=>{const v=await api('profiles/search?q='+encodeURIComponent(search));setSearchResults(v.users);});}
 async function sendDM(event:React.FormEvent){event.preventDefault();if(!peer||!text.trim())return;
  const message=text;setText('');await action(async()=>{await api('message',{peerId:peer.id,text:message});const v=await api('messages?peer='+peer.id);setMessages(v.messages);});}
 async function saveProfile(event:React.FormEvent){event.preventDefault();await action(async()=>{await api('profile',{displayName:profileName,bio:profileBio,language:profileLanguage,interests:profileInterests.split(',').map(x=>x.trim()).filter(Boolean)});await syncMe();setNotice('Профиль сохранён');});}
 const discoveryEnabled=!!me && ['13-17','18+'].includes(me.ageBand);
 if(me===undefined)return <div className="social-loading"><LoaderCircle className="spin"/> Загружаем Screenly…</div>;
 return <div className="social-page">
  <header className="social-header"><a href="/" className="brand"><span className="brand-mark"><MonitorPlay size={20}/></span>screenly<span className="brand-dot">.</span></a>
   <div className="social-head-center"><span className="mini-dot"/> PRIVATE RELEASE · 2.0</div>
   <div className="social-head-right"><a href="/">Главная</a>{me?<><Avatar u={me} size={32}/><strong>{me.displayName}</strong><button onClick={signOut} title="Выйти"><LogOut size={17}/></button></>:<span>Гостевой доступ</span>}</div>
  </header>
  {!me ? <main className="social-auth-wrap">
   <div className="social-auth-copy"><span className="social-overline"><Sparkles size={14}/> ДОБРО ПОЖАЛОВАТЬ</span><h1>Люди, с которыми <em>есть что показать.</em></h1><p>Войти в приватную комнату можно и гостем. Аккаунт нужен для друзей, переписок и собственного профиля.</p>
    <a href="/" className="social-secondary-link"><MonitorPlay size={18}/> Продолжить как гость — создать комнату</a>
    <p className="small-privacy"><ShieldCheck size={17}/> В закрытом тесте функции доступны обеим возрастным группам, но подбор и открытые комнаты между ними разделены.</p>
   </div>
   <form onSubmit={authenticate} className="social-auth-card">
    <div className="social-segment"><button type="button" className={authMode==='register'?'active':''} onClick={()=>setAuthMode('register')}>Регистрация</button><button type="button" className={authMode==='login'?'active':''} onClick={()=>setAuthMode('login')}>Войти</button></div>
    {authMode==='register'&&<><label>Никнейм<input minLength={3} maxLength={20} required value={username} onChange={e=>setUsername(e.target.value)} placeholder="nickname_123"/></label>
     <label>Отображаемое имя<input minLength={2} maxLength={28} required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Как к тебе обращаться"/></label></>}
    <label>Почта<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    <label>Пароль<input type="password" required minLength={authMode==='register'?12:1} autoComplete={authMode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={authMode==='register'?'Минимум 12 символов':'Твой пароль'}/></label>
    {authMode==='register'&&<><label>Возрастная группа<select value={ageBand} onChange={e=>setAgeBand(e.target.value)}><option value="18+">18 лет и старше</option><option value="13-17">13–17 лет</option></select></label>
     <label className="social-check"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/> Согласен с правилами закрытого тестирования. Возрастная категория пока не считается проверенной.</label></>}
    <button type="submit" className="social-primary" disabled={busy}>{busy?'Проверяем…':authMode==='register'?'Создать аккаунт':'Войти'} <ArrowRight size={17}/></button>
    <ErrorMessage error={error}/>
   </form></main> : <div className="social-layout">
   <aside className="social-nav"><div className="social-user-card"><Avatar u={me} size={45}/><div><strong>{me.displayName}</strong><small>@{me.username}</small></div></div>
    <p className="social-nav-label">ПРОСТРАНСТВО</p>
    {tabs.map(([key,label,Icon])=><button key={key} className={tab===key?'active':''} onClick={()=>{setTab(key);setError('');setNotice('');}}><Icon size={18}/>{label}{key==='friends'&&incoming.length>0&&<span className="social-count">{incoming.length}</span>}{key==='invites'&&invites.length>0&&<span className="social-count">{invites.length}</span>}</button>)}
    {['admin','moderator'].includes(me.role)&&<button className={tab==='admin'?'active':''} onClick={()=>setTab('admin')}><FileWarning size={18}/> Модерация</button>}
    <div className="social-nav-bottom"><ShieldCheck size={16}/> Закрытая версия. Никакой записи звонков.</div>
   </aside>
   <main className="social-main">
    <div className="social-pagehead"><div><span className="social-overline"><span className="mini-dot"/> SCREENLY 2.0</span><h1>{({discover:'Мастерские и проекты',projects:'Галерея работ',rooms:'Трансляции и комнаты',roulette:'Случайная встреча',friends:'Твои люди',invites:'Уведомления',messages:'Сообщения',profile:'Мой профиль',safety:'Конфиденциальность',admin:'Центр модерации'} as any)[tab]}</h1><p>{({discover:'Показывай работы, учись и создавай вместе с другими.',projects:'Портфолио, разборы и настоящая обратная связь.',rooms:'Собери друзей, показывай экран и общайся.',roulette:'Поиск собеседника по интересам с защитой участников.',friends:'Люди, с которыми хочется остаться на связи.',invites:'Приглашения друзей в мастерские и эфиры.',messages:'Личная переписка без лишнего шума.',profile:'Покажи, чем ты увлекаешься.',safety:'Управляй доступом и своими данными.',admin:'Рассмотрение жалоб и защита сообщества.'} as any)[tab]}</p></div>
     <div className="social-pagehead-tag"><ShieldCheck size={16}/>{me.ageBand==='13-17'?'13+ · тестовый режим':'18+ · тестовый режим'}</div></div>
    {error&&<div className="social-error" role="alert">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
    {notice&&<div className="social-notice"><Check size={16}/>{notice}</div>}
    {tab==='discover'&&<CreatorHub onCreate={(chosen)=>{setRoomCategory(chosen);setRoomTitle(chosen==='vibe-coding'?'Создаём проект вместе':'Моя мастерская');setTab('rooms');setError('');}}/>}
    {tab==='projects'&&<ProjectGallery myId={me.id} onWorkshop={p=>{setRoomCategory(p.category);setRoomTitle('Разбираем: '+p.title.slice(0,48));setRoomGoal('feedback');setRoomDescription(p.description.slice(0,180));setProjectTitle(p.title);setProjectUrl(p.url);setLearningPlan('Разбираем проект, обсуждаем идеи и отвечаем на вопросы.');setTab('rooms');setError('');}}/>}
    {tab==='rooms'&&<div className="social-columns"><div className="social-stack">
      <section className="social-panel"><div className="social-panel-head"><div><h2>Создать комнату</h2><p>Приглашай друзей. Экран включается только с твоего разрешения.</p></div><span className="social-icon-square"><Plus size={20}/></span></div>
       <div className="social-form-grid"><label>Название<input maxLength={60} value={roomTitle} onChange={e=>setRoomTitle(e.target.value)}/></label><label>Категория<select value={roomCategory} onChange={e=>setRoomCategory(e.target.value)}>{CATEGORIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
       <label>Формат встречи<select value={roomGoal} onChange={e=>setRoomGoal(e.target.value)}>{GOALS.map(x=><option key={x.id} value={x.id}>{x.label} — {x.desc}</option>)}</select></label>
       <label>Описание эфира<input maxLength={180} value={roomDescription} onChange={e=>setRoomDescription(e.target.value)} placeholder="Что планируешь показать или объяснить?"/></label>
       <label>Название проекта (необязательно)<input maxLength={80} value={projectTitle} onChange={e=>setProjectTitle(e.target.value)} placeholder="Например, мой сайт-портфолио"/></label>
       <label>План занятия / вопросы для разбора<textarea rows={3} maxLength={320} value={learningPlan} onChange={e=>setLearningPlan(e.target.value)} placeholder="1. Показываю проект; 2. Обсуждаем идеи; 3. Отвечаю на вопросы"/></label>
       <label>Ссылка на проект (необязательно)<input type="url" maxLength={350} value={projectUrl} onChange={e=>setProjectUrl(e.target.value)} placeholder="https://github.com/…"/></label>
       <label className="social-check"><input type="checkbox" checked={roomPublic} onChange={e=>setRoomPublic(e.target.checked)} /> Публичная комната (видна только своей возрастной группе)</label>
       <button className="social-primary" onClick={makeRoom} disabled={busy}>Создать комнату <ArrowRight size={17}/></button>
      </section>
      <section className="social-panel"><div className="social-panel-head"><h2>Мои комнаты</h2><button className="social-text-btn" onClick={()=>load('rooms')}>Обновить</button></div>
       {mine.length?mine.map(r=><div className="social-list-row room-invite-row" key={r.id}><span className="social-row-ico"><MonitorPlay size={17}/></span><div><strong>{r.title}</strong><small>{getCategory(r.category)?.label||r.topic} · {getGoal(r.goal)?.label||'Общение'} · {r.visibility==='public'?'Открытая':'По приглашению'}</small></div><a href={r.url} className="social-small-primary">Открыть <ArrowRight size={15}/></a><button title="Закрыть комнату" onClick={()=>{if(window.confirm('Закрыть комнату для новых подключений?'))void action(()=>api('rooms/close',{roomId:r.id}),()=>load('rooms'));}}><X size={16}/></button>{friends.length>0&&<div className="room-invite-controls"><select aria-label="Кого пригласить" value={inviteFriend[r.id]||''} onChange={e=>setInviteFriend(prev=>({...prev,[r.id]:e.target.value}))}><option value="">Выбери друга</option>{friends.map(f=><option value={f.id} key={f.id}>{f.displayName}</option>)}</select><button disabled={busy||!inviteFriend[r.id]} onClick={()=>action(()=>api('rooms/invite',{roomId:r.id,friendId:inviteFriend[r.id]}),()=>setNotice('Приглашение отправлено'))}><Send size={15}/> Пригласить</button></div>}</div>):<p className="social-empty">Пока нет созданных комнат. Создай первую!</p>}
      </section></div>
      <section className="social-panel social-catalog"><div className="social-panel-head"><div><h2>Каталог эфиров</h2><p>Публичные комнаты участников твоей возрастной группы.</p></div><Compass size={21}/></div>
      {discoveryEnabled?rooms.length?rooms.map(r=><div className="social-roomcard" key={r.id}><div className="social-roompreview"><MonitorPlay size={26}/><span>{getCategory(r.category)?.label||r.topic} / {getGoal(r.goal)?.label||'Общение'}</span></div><div className="social-roomcard-bottom"><strong>{r.title}</strong><small>{r.projectTitle?`Проект: ${r.projectTitle} · `:''}{r.description||'Совместная трансляция и общение'}</small><div><Avatar u={r.owner} size={26}/><span>{r.owner?.displayName}</span><a href={r.url}>Войти <ArrowRight size={15}/></a></div></div></div>):<div className="social-empty-illustration"><MonitorPlay size={34}/><strong>Сейчас нет публичных эфиров</strong><p>Они появятся, когда кто-нибудь из твоей возрастной группы создаст публичную комнату.</p></div>:
      <div className="social-empty-illustration"><LockKeyhole size={34}/><strong>Каталог временно закрыт</strong><p>Чтобы видеть доступные комнаты, войди в зарегистрированный аккаунт. Приватные комнаты работают по приглашению.</p></div>}
      </section></div>}
    {tab==='invites'&&<section className="social-panel"><div className="social-panel-head"><div><h2>Приглашения в комнаты</h2><p>Приглашения приходят от друзей твоей возрастной группы. Список обновляется автоматически.</p></div><button className="social-text-btn" onClick={()=>load('invites')}>Обновить</button></div>{invites.length?invites.map(i=><div className="social-list-row" key={i.id}><Avatar u={i.from}/><div><strong>{i.from.displayName} приглашает в «{i.roomTitle}»</strong><small>{formatDate(i.at)}</small></div><a className="social-small-primary" href={i.url}>Войти <ArrowRight size={15}/></a><button title="Отклонить" onClick={()=>action(()=>api('invites/dismiss',{inviteId:i.id}),()=>load('invites'))}><X size={16}/></button></div>):<p className="social-empty">Новых приглашений пока нет.</p>}</section>}
    {tab==='roulette'&&<section className="social-panel social-match-panel"><span className="social-big-icon"><Shuffle size={36}/></span><h2>Найти собеседника</h2><p>Выбирай тему и находи собеседника из своей возрастной группы. Можно обсуждать идеи, показывать работы и учиться вместе.</p>
     {discoveryEnabled?<><label className="social-match-filter">Тема знакомства<select value={matchCategory} disabled={match.status==='waiting'} onChange={e=>setMatchCategory(e.target.value)}><option value="all">Любая тема</option>{CATEGORIES.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select></label><div className="social-match-status"><span className="mini-dot"/> {match.status==='waiting'?'Ищем человека…':match.status==='matched'?'Собеседник найден':'Можно начать поиск'}</div>
      {match.status==='waiting'?<button className="social-secondary" onClick={()=>action(async()=>{await api('match/cancel',{});setMatch({status:'idle'});})}>Отменить поиск</button>:<button className="social-primary" disabled={busy} onClick={()=>action(async()=>{const m=await api('match/join',{category:matchCategory});setMatch(m);if(m.path)router.push(m.path);})}>Найти человека <ArrowRight size={18}/></button>}</>:
      <div className="social-gate"><ShieldCheck size={21}/><strong>Безопасность важнее случайных подключений</strong><p>Подбор происходит только внутри указанной возрастной группы. Возраст пока не проверяется документами — не публикуйте сервис для незнакомых людей.</p></div>}
    </section>}
    {tab==='friends'&&<div className="social-columns"><div className="social-stack"><section className="social-panel"><h2>Найти по никнейму</h2><div className="social-inline-form"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&findPeople()} placeholder="Введите ник (от двух символов)"/><button onClick={findPeople} disabled={busy}><Search size={18}/></button></div>
      {searchResults.map(u=><div className="social-list-row" key={u.id}><Avatar u={u}/><div><strong>{u.displayName}</strong><small>@{u.username}</small></div><button className="social-small-primary" disabled={busy} onClick={()=>action(()=>api('friend/request',{username:u.username}),()=>load('friends'))}><UserPlus size={15}/> Добавить</button></div>)}
     </section><section className="social-panel"><h2>Мои друзья ({friends.length})</h2>{friends.length?friends.map(u=><div className="social-list-row" key={u.id}><Avatar u={u}/><div><strong>{u.displayName}</strong><small>@{u.username}</small></div><button title="Написать" onClick={()=>{setPeer(u);setTab('messages');}}><MessageCircle size={18}/></button><button title="Удалить из друзей" onClick={()=>action(()=>api('friend/remove',{targetId:u.id}),()=>load('friends'))}><UserMinus size={18}/></button><button title="Заблокировать пользователя" onClick={()=>{if(window.confirm(`Заблокировать ${u.displayName}?`))void action(()=>api('block',{targetId:u.id}),()=>load('friends'));}}><Shield size={18}/></button></div>):<p className="social-empty">Здесь будут люди, которых ты добавишь в друзья.</p>}</section></div>
     <div className="social-stack"><section className="social-panel"><h2>Входящие заявки ({incoming.length})</h2>{incoming.length?incoming.map(r=><div className="social-list-row" key={r.id}><Avatar u={r.from}/><div><strong>{r.from?.displayName}</strong><small>@{r.from?.username}</small></div><button onClick={()=>action(()=>api('friend/respond',{requestId:r.id,accept:true}),()=>load('friends'))}><Check size={18}/></button><button onClick={()=>action(()=>api('friend/respond',{requestId:r.id,accept:false}),()=>load('friends'))}><X size={18}/></button></div>):<p className="social-empty">Нет новых заявок.</p>}</section>
     <section className="social-panel"><h2>Отправленные заявки ({outgoing.length})</h2>{outgoing.map(r=><div key={r.id} className="social-list-row"><Avatar u={r.to}/><div><strong>{r.to?.displayName}</strong><small>Ожидаем ответа</small></div></div>)}{!outgoing.length&&<p className="social-empty">Пока ничего.</p>}</section></div></div>}
    {tab==='messages'&&<div className="social-panel social-chat-layout"><div className="social-thread-list"><h2>Переписки</h2>{threads.length?threads.map(t=><button key={t.peer.id} className={peer?.id===t.peer.id?'active':''} onClick={()=>setPeer(t.peer)}><Avatar u={t.peer}/><span><strong>{t.peer.displayName}</strong><small>{t.last?.text||'Начни переписку'}</small></span></button>):<p className="social-empty">Добавь друга, чтобы начать переписку.</p>}</div>
     <div className="social-chat-body">{peer?<><div className="social-chat-title"><Avatar u={peer}/><strong>{peer.displayName}</strong><span>@{peer.username}</span></div><div className="social-chat-scroll">{messages.map(m=><div className={`social-message ${m.from===me.id?'mine':''}`} key={m.id}><div>{m.text}<small>{formatDate(m.at)}</small></div></div>)}{!messages.length&&<div className="social-chat-hint">Сообщения видят только участники переписки.</div>}</div><form onSubmit={sendDM} className="social-inline-form social-chat-compose"><input value={text} maxLength={1200} onChange={e=>setText(e.target.value)} placeholder="Напиши сообщение…"/><button disabled={busy||!text.trim()}><Send size={18}/></button></form></>:
      <div className="social-empty-illustration"><MessageSquareText size={35}/><strong>Выбери диалог</strong><p>Все личные сообщения доступны только между друзьями.</p></div>}</div></div>}
    {tab==='profile'&&<div className="social-columns"><section className="social-panel"><div className="social-profile-hero"><Avatar u={me} size={72}/><div><h2>{me.displayName}</h2><p>@{me.username}</p><span>{me.role==='admin'?'Администратор':'Участник'} · {me.ageBand}</span></div></div><form onSubmit={saveProfile}><label>Отображаемое имя<input required minLength={2} maxLength={28} value={profileName} onChange={e=>setProfileName(e.target.value)}/></label><label>О себе<textarea maxLength={240} rows={4} value={profileBio} onChange={e=>setProfileBio(e.target.value)} placeholder="Чем ты увлекаешься?"/></label><label>Интересы через запятую (макс. 6)<input value={profileInterests} onChange={e=>setProfileInterests(e.target.value)} placeholder="Игры, дизайн, музыка"/></label><label>Язык<select value={profileLanguage} onChange={e=>setProfileLanguage(e.target.value)}><option value="ru">Русский</option><option value="en">English</option></select></label><button type="submit" className="social-primary" disabled={busy}>Сохранить профиль <Check size={17}/></button></form></section>
     <section className="social-panel"><h2>Статус профиля</h2><div className="social-status-line"><span>Аккаунт</span><strong>Активен</strong></div><div className="social-status-line"><span>Возрастная группа</span><strong>{me.ageBand}</strong></div><div className="social-status-line"><span>Режим знакомств</span><strong>Внутри своей возрастной группы</strong></div><div className="social-status-line"><span>Дата регистрации</span><strong>{formatDate(me.createdAt)}</strong></div><p className="small-privacy"><ShieldCheck size={18}/> Возрастная группа указана при регистрации и пока не подтверждена. Рулетка и открытые комнаты разделены между группами 13–17 и 18+. До публичного запуска понадобится надёжная защита несовершеннолетних.</p></section></div>}
    {tab==='safety'&&<div className="social-columns"><section className="social-panel"><h2>Заблокированные пользователи</h2>{blocked.length?blocked.map(u=><div className="social-list-row" key={u.id}><Avatar u={u}/><div><strong>{u.displayName}</strong><small>@{u.username}</small></div><button className="social-small-primary" onClick={()=>action(()=>api('block',{targetId:u.id,unblock:true}),()=>load('friends'))}>Разблокировать</button></div>):<p className="social-empty">Список пуст.</p>}<button className="social-secondary" onClick={()=>load('friends')}>Обновить список</button></section>
     <section className="social-panel"><h2>Удалить аккаунт</h2><p className="social-copy">Профиль будет отключён, переписки и дружеские связи удалены. Это действие нельзя отменить.</p><label>Напиши свой ник для подтверждения<input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} placeholder={me.username}/></label><button className="social-danger" disabled={busy||deleteConfirm!==me.username} onClick={()=>action(async()=>{await api('account/delete',{confirm:deleteConfirm});setMe(null);})}><Trash2 size={16}/> Удалить мой аккаунт</button></section></div>}
    {tab==='admin'&&<section className="social-panel"><h2>Жалобы пользователей</h2><p className="social-copy">Жалобы требуют ручной проверки. При блокировке аккаунта активные сеансы теряют возможность получить новые токены.</p>{reports.length?reports.map(r=><div className="social-report-row" key={r.id}><div><strong>{r.category} · {r.target||r.targetId}</strong><small>От: {r.reporter} · {formatDate(r.at)} · {r.status}{r.projectId?` · проект ${r.projectId.slice(0,8)}`:''}</small><p>{r.reason}</p></div>{r.status==='open'&&<div><button onClick={()=>action(()=>api('moderation/resolve',{reportId:r.id,decision:'dismiss'}),()=>load('admin'))}>Отклонить</button><button className="social-danger" onClick={()=>action(()=>api('moderation/resolve',{reportId:r.id,decision:'disable'}),()=>load('admin'))}>Заблокировать</button></div>}</div>):<p className="social-empty">Нерассмотренных жалоб нет.</p>}</section>}
   </main>
  </div>}
 </div>;
}
