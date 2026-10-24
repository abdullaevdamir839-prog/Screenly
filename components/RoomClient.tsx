'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCategory, getGoal } from '@/lib/creator-categories.mjs';
import { LiveKitRoom, RoomAudioRenderer, StartAudio, TrackToggle, useChat, useParticipants, useRoomContext, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  ArrowLeft, ArrowRight, Check, Clipboard, Headphones, Info, Link2, LockKeyhole,
  MessageCircle, Mic, MonitorPlay, MoreHorizontal, Send, ShieldCheck, Users, VideoOff, X, BookOpen, ExternalLink, MousePointer2, Pencil, LayoutGrid, Focus, Eraser, Lock, Unlock,
} from 'lucide-react';

import CollabScreenTile from './CollabScreenTile';
import {useRoomCollaboration} from './useRoomCollaboration';

type RoomDetails = {title:string; category:string; goal:string; projectTitle:string;projectUrl:string;learningPlan:string;description:string;visibility:string};
type Props = { roomId: string; invite: string; details: RoomDetails };
type Credentials = { token: string; serverUrl: string };

function formatName(text: string) {
  return text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 28);
}

export default function RoomClient({roomId,invite,details}:Props) {
  const router=useRouter();
  const [name,setName]=useState('');
  const [creds,setCreds]=useState<Credentials|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [linkCopied,setLinkCopied]=useState(false);

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const response=await fetch('/api/token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({roomId,invite,name:formatName(name)})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Не удалось подключиться');
      setCreds({token:data.token,serverUrl:data.serverUrl});
    } catch(err) { setError(err instanceof Error ? err.message : 'Ошибка подключения'); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setLinkCopied(true); window.setTimeout(()=>setLinkCopied(false),2000); }
    catch { setError('Не получилось скопировать ссылку. Скопируйте адрес из браузера.'); }
  }

  return <div className="room-page">
    <header className="room-header shell"><a href="/" className="brand"><span className="brand-mark"><MonitorPlay size={20}/></span><span>screenly<span className="brand-dot">.</span></span></a>
      <div className="room-header-center"><span className="private-badge"><LockKeyhole size={14}/> {details.visibility==='public'?'Публичная комната':'По приглашению'}</span><span className="room-id-text">#{roomId.slice(0,6)}</span></div>
      <button type="button" className="btn btn-quiet btn-small" onClick={copyLink}>{linkCopied?<Check size={17}/>:<Link2 size={17}/>}<span>{linkCopied?'Ссылка скопирована':'Пригласить'}</span></button>
    </header>
    {!creds ? <main className="room-prejoin shell"><div className="prejoin-panel"><span className="prejoin-illustration"><Headphones size={37}/></span><span className="section-kicker">ГОТОВО К ОБЩЕНИЮ</span><h1>{details.title}</h1><p>{getCategory(details.category)?.label||'Общение'} · {getGoal(details.goal)?.label||'Общение'}. {details.description||'Показывайте проекты и общайтесь голосом.'}</p>{(details.projectTitle||details.learningPlan)&&<div className="room-learning-card"><strong><BookOpen size={16}/> План мастерской</strong>{details.projectTitle&&<p><b>Проект:</b> {details.projectTitle}</p>}{details.learningPlan&&<p>{details.learningPlan}</p>}</div>}
        <form onSubmit={join} className="prejoin-form"><label htmlFor="display-name">Как тебя называть?</label><input id="display-name" autoFocus maxLength={28} minLength={2} placeholder="Например, Alex" required value={name} onChange={e=>setName(e.target.value)}/>
          <div className="prejoin-info"><ShieldCheck size={18}/><span>Камера не используется. Микрофон и экран изначально выключены.</span></div>
          <button className="btn btn-primary btn-full" type="submit" disabled={busy || formatName(name).length < 2}>{busy?'Подключение…':'Войти в комнату'}<ArrowRight size={19}/></button>
        </form>
        {error && <div className="room-error" role="alert">{error}</div>}
        <button className="subtle-link" onClick={()=>router.push('/')}><ArrowLeft size={15}/> На главную</button>
      </div><div className="prejoin-side"><div className="prejoin-side-icon"><MonitorPlay size={32}/></div><h2>Твой экран, твои правила</h2><ul><li><Check size={16}/> Разрешение на показ запрашивает браузер</li><li><Check size={16}/> Можно выбрать отдельное окно или вкладку</li><li><Check size={16}/> Остановить трансляцию можно в любой момент</li></ul><div className="alpha-note"><LockKeyhole size={17}/> Для входа другому тестировщику также потребуется код закрытой альфы.</div></div></main> :
      <LiveKitRoom token={creds.token} serverUrl={creds.serverUrl} connect={true} audio={false} video={false} screen={false}
        onDisconnected={()=>{setCreds(null);setError('Соединение завершено. При необходимости войдите снова.');}}
        onError={err=>setError(err.message)}>
        <RoomAudioRenderer/><StartAudio label="Разрешить воспроизведение звука"/>
        <RoomExperience details={details} onLeave={()=>{setCreds(null);router.push('/');}}/>
      </LiveKitRoom>}
    {error && creds && <div className="toast-error" role="alert">{error}</div>}
    </div>;
}

function RoomExperience({onLeave,details}:{onLeave:()=>void;details:RoomDetails}) {
  const room=useRoomContext();
  const participants=useParticipants();
  const tracks=useTracks([Track.Source.ScreenShare]);
  const {chatMessages,send,isSending}=useChat();
  const [chatInput,setChatInput]=useState('');
  const [showChat,setShowChat]=useState(true);
  const [screenOn,setScreenOn]=useState(false);
  const [screenLayout,setScreenLayout]=useState<'focus'|'grid'>('focus');
  const [micOn,setMicOn]=useState(false);
  const [error,setError]=useState('');
  const [activeTrack,setActiveTrack]=useState<string|null>(null);
  const [reportTarget,setReportTarget]=useState<{id:string;name:string}|null>(null);
  const [reportReason,setReportReason]=useState('');
  const [reportCategory,setReportCategory]=useState('harassment');
  const [reportState,setReportState]=useState('');
  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'});},[chatMessages.length]);
  const selected=tracks.find(t=>t.publication.trackSid===activeTrack) || tracks.find(t=>t.participant.identity!==room.localParticipant.identity) || tracks[0];
  const streamOwners=tracks.map(t=>t.participant.identity);
  const collaboration=useRoomCollaboration(room,streamOwners);
  const owner=room.localParticipant.identity;
  const ownScreen=tracks.some(t=>t.participant.identity===owner);
  const canCollaborate=streamOwners.some(id=>collaboration.permissions[id]);
  const visibleTracks=screenLayout==='grid'?tracks.slice(0,4):(selected?[selected]:[]);
  const names=Object.fromEntries(participants.map(p=>[p.identity,p.name||'Участник']));

  async function submitChat(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text=chatInput.trim().slice(0,500);
    if(!text||isSending) return;
    try { await send(text);setChatInput(''); } catch { setError('Сообщение не отправлено.'); }
  }

  async function submitReport(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!reportTarget)return;
    setReportState('');
    try { const res=await fetch('/api/v1/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:reportTarget.id,roomId:room.name.replace(/^screenly-/,''),category:reportCategory,reason:reportReason})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка отправки');
      setReportState('Жалоба отправлена модераторам.');setReportTarget(null);setReportReason('');
    }catch(e){setReportState((e as Error).message);}
  }
  async function blockAndLeave(identity:string,name:string) {
    const accountId=identity.match(/^([a-f0-9-]{36})\.[a-f0-9-]{36}$/)?.[1];
    if(!accountId) return;
    if(!window.confirm(`Заблокировать пользователя ${name} и выйти из комнаты?`))return;
    try {
      const res=await fetch('/api/v1/block', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:accountId})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Не удалось заблокировать');
      leave();
    }catch(e){setError(e instanceof Error?e.message:'Ошибка блокировки');}
  }
  function leave() { void room.disconnect(); onLeave(); }

  return <main className="room-shell shell">
    <div className="room-top"><div><span className="section-kicker">{getCategory(details.category)?.label||'КОМНАТА'} · {getGoal(details.goal)?.label||'Общение'}</span><h1>{details.title}</h1><p>{details.description||'Показывайте идеи, создавайте проекты и учитесь вместе.'}</p></div><div className="room-online"><span className="pulse-dot"/> На связи <strong>{participants.length}</strong></div></div>
    {(details.learningPlan||details.projectTitle||details.projectUrl)&&<div className="room-learning-inline"><BookOpen size={19}/><div><strong>{details.projectTitle||'Мастерская'}</strong>{details.learningPlan&&<p>{details.learningPlan}</p>}</div>{details.projectUrl&&<a href={details.projectUrl} target="_blank" rel="nofollow noreferrer noopener">Открыть проект <ExternalLink size={15}/></a>}</div>}
    <div className="room-grid">
      <section className="stage-column">
        <div className="stage-card collab-stage"><div className="stage-toolbar"><span className="stage-label"><span className="stage-live-dot"/>{selected?'СОВМЕСТНАЯ ДЕМОНСТРАЦИЯ':'ОЖИДАНИЕ ТРАНСЛЯЦИИ'}</span><span className="stage-owner">{screenLayout==='grid'?'До 4 экранов одновременно':selected?(selected.participant.name||'Гость'):'Комната защищена'}</span></div>
          {visibleTracks.length ? <div className={`collab-screen-grid ${screenLayout==='grid'?'collab-screen-grid-multi':''}`}>
            {visibleTracks.map(t=><CollabScreenTile key={t.publication.trackSid} trackRef={t} owner={t.participant.identity} currentUser={owner} names={names}
              strokes={collaboration.strokes[t.participant.identity]||[]} cursors={Object.values(collaboration.cursors).filter(c=>c.stream===t.participant.identity)}
              allow={Boolean(collaboration.permissions[t.participant.identity])} tool={collaboration.tool}
              onCursor={collaboration.publishCursor} onStroke={collaboration.publishStroke} compact={screenLayout==='grid'} />)}
          </div>:<div className="stage-video"><div className="stage-empty"><div className="stage-empty-icon"><MonitorPlay size={44} strokeWidth={1.55}/></div><h2>Здесь появится экран</h2><p>Нажмите «Показать экран», выберите окно или вкладку в браузере и начните трансляцию.</p><span className="stage-caption"><ShieldCheck size={15}/> Ваш экран не включается автоматически</span></div></div>}
        </div>
        <div className="collab-mode-bar">
          <span>Режим просмотра</span>
          <div className="collab-mode-buttons"><button type="button" className={screenLayout==='focus'?'active':''} onClick={()=>setScreenLayout('focus')}><Focus size={15}/> Один экран</button><button type="button" className={screenLayout==='grid'?'active':''} onClick={()=>setScreenLayout('grid')}><LayoutGrid size={15}/> Плитки {tracks.length>1?`(${Math.min(4,tracks.length)})`:''}</button></div>
        </div>
        {screenLayout==='focus'&&tracks.length>1 && <div className="streams-picker"><span>Активные экраны:</span>{tracks.map(t=><button key={t.publication.trackSid} onClick={()=>setActiveTrack(t.publication.trackSid)} className={selected?.publication.trackSid===t.publication.trackSid?'chosen':''}>{t.participant.name||'Гость'}</button>)}</div>}
        <div className="collab-toolbar" aria-label="Инструменты совместной работы"><div className="collab-toolbar-head"><strong>Совместная работа</strong><small>Рисунки и курсоры не сохраняются</small></div>
          <div className="collab-toolbar-actions"><button type="button" className={collaboration.tool==='off'?'active':''} onClick={()=>collaboration.setTool('off')}><Lock size={15}/> Просмотр</button>
            <button type="button" disabled={!canCollaborate} className={collaboration.tool==='pointer'?'active':''} onClick={()=>collaboration.setTool('pointer')}><MousePointer2 size={15}/> Указка</button>
            <button type="button" disabled={!canCollaborate} className={collaboration.tool==='draw'?'active':''} onClick={()=>collaboration.setTool('draw')}><Pencil size={15}/> Рисовать</button>
            {ownScreen&&<button type="button" className={`collab-owner-toggle ${collaboration.permissions[owner]?'active':''}`} onClick={()=>collaboration.allowAnnotations(!collaboration.permissions[owner])}>{collaboration.permissions[owner]?<Unlock size={15}/>:<Lock size={15}/>} {collaboration.permissions[owner]?'Запретить пометки':'Разрешить пометки'}</button>}
            {ownScreen&&<button type="button" className="collab-clear" onClick={()=>collaboration.clearDrawing(owner)}><Eraser size={15}/> Очистить мой экран</button>}
          </div><p>Каждый ведущий разрешает пометки только на своём экране. Участники могут показывать свои экраны одновременно.</p>
        </div>
        <div className="room-controls">
          <div className="room-controls-primary">
            <TrackToggle source={Track.Source.Microphone} initialState={false} onChange={(on)=>setMicOn(on)} className={`room-control ${micOn?'enabled':''}`} showIcon={false}><Mic size={19}/><span>{micOn?'Микрофон включён':'Включить микрофон'}</span></TrackToggle>
            <TrackToggle source={Track.Source.ScreenShare} initialState={false} onChange={(on)=>{setScreenOn(on);if(!on)collaboration.allowAnnotations(false);}} className={`room-control ${screenOn?'sharing':''}`} showIcon={false}><MonitorPlay size={19}/><span>{screenOn?'Остановить показ':'Показать экран'}</span></TrackToggle>
          </div>
          <div className="room-controls-right"><button className="room-control icon-only hide-desktop" onClick={()=>setShowChat(v=>!v)} aria-label="Показать или скрыть чат"><MessageCircle size={20}/></button><button className="leave-control" onClick={leave}><VideoOff size={18}/><span>Выйти</span></button></div>
        </div>
        {error && <div className="room-error" role="alert">{error}</div>}
        <div className="room-safety"><Info size={17}/><span>Демонстрация доступна только после вашего разрешения. Не показывайте пароли, личные переписки и платёжные данные.</span></div>
      </section>
      <aside className={`room-sidebar ${showChat?'open':''}`}>
        <div className="sidebar-tabbar"><div className="sidebar-tab active"><MessageCircle size={18}/> Чат</div><div className="sidebar-people"><Users size={16}/>{participants.length}</div></div>
        <div className="sidebar-messages" ref={scrollRef}><div className="welcome-message"><span className="welcome-bubble"><SparkleMark/></span><h3>Добро пожаловать!</h3><p>Обсуждайте всё, что происходит на экране. Сообщения не сохраняются после выхода.</p></div>
          {chatMessages.map((message,index)=><div className="chat-row" key={`${message.timestamp}-${index}`}><div className="chat-avatar">{(message.from?.name||'?').slice(0,1).toUpperCase()}</div><div className="chat-body"><strong>{message.from?.name||'Гость'}</strong><p>{message.message}</p></div></div>)}
        </div>
        <form className="chat-compose" onSubmit={submitChat}><label className="visually-hidden" htmlFor="chat-message">Сообщение</label><input id="chat-message" placeholder="Напишите сообщение…" maxLength={500} value={chatInput} onChange={e=>setChatInput(e.target.value)}/><button type="submit" disabled={!chatInput.trim()||isSending} aria-label="Отправить сообщение"><Send size={19}/></button></form>
      </aside>
    </div>
    <div className="members-list"><span className="members-label">УЧАСТНИКИ</span><div className="members-row">{participants.map((p,index)=><div className="member-chip" key={p.identity}><span className={`member-avatar tone-${index%4}`}>{(p.name||'?').slice(0,1).toUpperCase()}</span><span>{p.name||'Гость'}</span>{p.identity===room.localParticipant.identity?<small>вы</small>:<><button className="report-mini" onClick={()=>setReportTarget({id:p.identity.includes('.')?p.identity.split('.')[0]:`guest:${p.identity}`,name:p.name||'Участник'})} title="Пожаловаться на пользователя">Пожаловаться</button>{/^[a-f0-9-]{36}\.[a-f0-9-]{36}$/.test(p.identity)&&<button className="report-mini" onClick={()=>void blockAndLeave(p.identity,p.name||'Участник')} title="Заблокировать пользователя и покинуть комнату">Заблокировать</button>}</>}</div>)}</div>
    {reportState&&<p className="room-safety" role="status">{reportState}</p>}
    {reportTarget&&<form className="room-report-form" onSubmit={submitReport}><strong>Жалоба на {reportTarget.name}</strong><select value={reportCategory} onChange={e=>setReportCategory(e.target.value)}><option value="harassment">Оскорбления и травля</option><option value="inappropriate">Недопустимая трансляция</option><option value="spam">Спам</option><option value="minor_safety">Безопасность несовершеннолетних</option><option value="other">Другое</option></select><textarea required minLength={8} maxLength={700} value={reportReason} onChange={e=>setReportReason(e.target.value)} placeholder="Опиши, что произошло"/><div><button type="button" onClick={()=>setReportTarget(null)}>Отмена</button><button type="submit">Отправить жалобу</button></div></form>}
    </div>
  </main>;
}

function SparkleMark() { return <MonitorPlay size={19}/>; }
