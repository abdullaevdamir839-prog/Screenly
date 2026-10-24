'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronLeft, ExternalLink, Flag, Lightbulb, MessageCircle, MessageSquarePlus, MonitorPlay, Pencil, Plus, RefreshCw, Search, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import { CATEGORIES, getCategory } from '@/lib/creator-categories.mjs';
import assets from '@/lib/category-assets.json';

type Author={id:string;username:string;displayName:string};
type Project={id:string;title:string;description:string;category:string;url:string;feedbackWanted:boolean;createdAt:number;owner:Author;mine:boolean;commentCount:number};
type Feedback={id:string;kind:'tip'|'question'|'support';text:string;at:number;author:Author;mine:boolean};
type FormData={title:string;description:string;category:string;url:string;feedbackWanted:boolean};
const empty:FormData={title:'',description:'',category:'vibe-coding',url:'',feedbackWanted:true};
const kinds=[{id:'tip',label:'Совет'},{id:'question',label:'Вопрос'},{id:'support',label:'Поддержка'}] as const;
async function call(path:string,data?:unknown){
 const resp=await fetch('/api/v1/'+path,data===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await resp.json().catch(()=>({error:'Некорректный ответ сервера'}));
 if(!resp.ok)throw new Error(result.error||`Ошибка HTTP ${resp.status}`);
 return result;
}
function Art({category}:{category:string}){
 const src=(assets as Record<string,string>)[category];
 return <div className="gallery-art">{src?<img src={src} alt="" loading="lazy"/>:<MonitorPlay size={48}/>}</div>;
}
export default function ProjectGallery({myId,onWorkshop}:{myId:string;onWorkshop:(p:Project)=>void}){
 const [projects,setProjects]=useState<Project[]>([]),[category,setCategory]=useState('all'),[query,setQuery]=useState('');
 const [mode,setMode]=useState<'list'|'form'|'detail'>('list'),[editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<FormData>(empty);
 const [selectedId,setSelectedId]=useState<string|null>(null),[comments,setComments]=useState<Feedback[]>([]),[kind,setKind]=useState<'tip'|'question'|'support'>('tip'),[message,setMessage]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const selected=projects.find(p=>p.id===selectedId)||null;
 const update=useCallback(async()=>{
  try{const data=await call('projects');setProjects(data.projects||[]);setError('');}catch(e){setError((e as Error).message)}finally{setLoading(false)}
 },[]);
 useEffect(()=>{void update();},[update]);
 const visible=useMemo(()=>projects.filter(p=>(category==='all'||p.category===category)&&[p.title,p.description,p.owner.displayName].some(s=>s.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))),[projects,category,query]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false)}}
 function startCreate(){setForm({...empty,category:category==='all'?'vibe-coding':category});setEditing(null);setMode('form');setError('');setNotice('')}
 function startEdit(p:Project){setForm({title:p.title,description:p.description,category:p.category,url:p.url,feedbackWanted:p.feedbackWanted});setEditing(p.id);setMode('form');setError('');}
 async function save(e:React.FormEvent){e.preventDefault();await run(async()=>{
  await call(editing?'projects/update':'projects/create',{...form,projectId:editing});await update();setMode('list');setNotice(editing?'Работа обновлена':'Работа опубликована');
 });}
 async function show(p:Project){setSelectedId(p.id);setMode('detail');setMessage('');setError('');await loadFeedback(p.id)}
 async function loadFeedback(id:string){try{const data=await call('projects/feedback?id='+encodeURIComponent(id));setComments(data.comments||[]);}catch(e){setError((e as Error).message);}}
 async function send(e:React.FormEvent){e.preventDefault();if(!selected||!message.trim())return;await run(async()=>{await call('projects/feedback',{projectId:selected.id,text:message,kind});setMessage('');await loadFeedback(selected.id);await update()})}
 async function removeProject(p:Project){if(!window.confirm(`Удалить работу «${p.title}» со всеми отзывами?`))return;await run(async()=>{await call('projects/delete',{projectId:p.id});setMode('list');setSelectedId(null);await update();setNotice('Работа удалена');})}
 async function removeComment(comment:Feedback){if(!window.confirm('Удалить отзыв?'))return;await run(async()=>{await call('projects/feedback/delete',{commentId:comment.id});if(selected)await loadFeedback(selected.id);await update()})}
 async function report(p:Project){const details=window.prompt('Кратко опиши нарушение (не менее 8 символов):');if(details===null)return;await run(async()=>{await call('report',{targetId:p.owner.id,projectId:p.id,category:'other',reason:details});setNotice('Жалоба отправлена модератору');})}
 const ago=(at:number)=>new Date(at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
 return <section className="gallery-root">
  <div className="gallery-hero"><div><span className="gallery-kicker">SCREENLY · ГАЛЕРЕЯ РАБОТ</span><h2>Создавай. Показывай. <em>Развивайся.</em></h2><p>Публикуй проекты, смотри работы сообщества и получай конструктивную обратную связь. Галерея доступна участникам твоей заявленной возрастной группы.</p><button className="gallery-dark-btn" onClick={startCreate}><Plus size={17}/> Опубликовать работу</button></div><div className="gallery-hero-art" aria-hidden="true"><div className="gallery-hero-page"><div className="gallery-hero-window"><span/><span/><span/></div><div className="gallery-hero-bars"><i/><i/><i/></div><Lightbulb size={43} strokeWidth={1.5}/></div></div></div>
  {error&&<div className="gallery-error" role="alert">{error}<button aria-label="Закрыть ошибку" onClick={()=>setError('')}><X size={15}/></button></div>}
  {notice&&<div className="gallery-success"><Check size={16}/>{notice}</div>}
  {mode==='form'?<section className="gallery-editor"><button className="gallery-back" onClick={()=>setMode(editing?'detail':'list')}><ChevronLeft size={17}/> Назад</button><h3>{editing?'Редактировать работу':'Новая работа'}</h3><p>Опиши, что ты создал и чему хочешь научиться. Не размещай личные данные.</p><form onSubmit={save}>
   <label>Название проекта<input required minLength={3} maxLength={90} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Например, портфолио с ИИ"/></label>
   <label>Направление<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <label>О проекте<textarea required minLength={15} maxLength={1000} rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Что ты сделал, как это работает и что хочешь улучшить?"/></label>
   <label>Ссылка на работу (необязательно)<input type="url" maxLength={350} value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://..."/></label>
   <label className="gallery-checkbox"><input type="checkbox" checked={form.feedbackWanted} onChange={e=>setForm({...form,feedbackWanted:e.target.checked})}/> Разрешить советы, вопросы и отзывы</label>
   <div className="gallery-actions"><button className="gallery-dark-btn" disabled={busy} type="submit"><Check size={16}/> {editing?'Сохранить изменения':'Опубликовать работу'}</button><button type="button" className="gallery-outline-btn" onClick={()=>setMode('list')}>Отмена</button></div>
  </form></section>:
  mode==='detail'&&selected?<section className="gallery-detail"><button className="gallery-back" onClick={()=>{setMode('list');setSelectedId(null)}}><ChevronLeft size={17}/> Все работы</button>
   <div className="gallery-detail-layout"><div><Art category={selected.category}/><div className="gallery-detail-info"><span className="gallery-type">{getCategory(selected.category)?.label}</span><h2>{selected.title}</h2><p>{selected.description}</p><div className="gallery-muted">@{selected.owner.username} · {ago(selected.createdAt)}</div><div className="gallery-actions">{selected.url&&<a className="gallery-outline-btn" href={selected.url} target="_blank" rel="noopener noreferrer nofollow">Открыть проект <ExternalLink size={16}/></a>}<button className="gallery-outline-btn" onClick={()=>onWorkshop(selected)}><MonitorPlay size={16}/> Обсудить в эфире</button>{selected.mine?<><button className="gallery-outline-btn" onClick={()=>startEdit(selected)}><Pencil size={16}/> Изменить</button><button className="gallery-danger-btn" onClick={()=>void removeProject(selected)}><Trash2 size={16}/> Удалить</button></>:<button className="gallery-outline-btn" onClick={()=>void report(selected)}><Flag size={15}/> Жалоба</button>}</div></div></div>
   <div className="gallery-feedback"><div className="gallery-feedback-head"><h3><MessageCircle size={20}/> Разборы и отзывы</h3><span>{comments.length}</span></div>{!selected.feedbackWanted?<p className="gallery-muted">Автор не принимает отзывы к этой работе.</p>:<>{comments.map(c=><article key={c.id} className="gallery-comment"><div className="gallery-comment-head"><strong>@{c.author.username}</strong><span>{kinds.find(k=>k.id===c.kind)?.label} · {ago(c.at)}</span>{(c.mine||selected.mine)&&<button title="Удалить отзыв" onClick={()=>void removeComment(c)}><Trash2 size={14}/></button>}</div><p>{c.text}</p></article>)}{!comments.length&&<p className="gallery-muted">Отзывов пока нет. Можно начать обсуждение.</p>}{!selected.mine&&<form onSubmit={send} className="gallery-feedback-form"><label>Тип отзыва<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>{kinds.map(k=><option key={k.id} value={k.id}>{k.label}</option>)}</select></label><label>Твой отзыв<textarea rows={4} minLength={8} maxLength={700} required value={message} onChange={e=>setMessage(e.target.value)} placeholder="Напиши конкретный совет или вопрос без перехода на личности."/></label><button disabled={busy||message.trim().length<8} className="gallery-dark-btn"><Send size={16}/> Отправить</button></form>}</>}</div></div>
  </section>:
  <><div className="gallery-toolbar"><div><h3>Работы сообщества <span>{visible.length}</span></h3><p>Постоянная галерея проектов — даже когда автор не в эфире.</p></div><button onClick={()=>void update()} className="gallery-outline-btn"><RefreshCw size={16}/> Обновить</button></div>
   <div className="gallery-filters"><label><Search size={18}/><input maxLength={80} placeholder="Поиск по проектам и авторам" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Категория работ" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Все направления</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
   {loading?<div className="gallery-empty">Загружаем работы…</div>:visible.length?<div className="gallery-grid">{visible.map(p=><article key={p.id} className="gallery-card"><button className="gallery-card-art" onClick={()=>void show(p)} aria-label={`Открыть проект ${p.title}`}><Art category={p.category}/></button><div className="gallery-card-body"><span className="gallery-type">{getCategory(p.category)?.label}</span><h3>{p.title}</h3><p>{p.description}</p><div className="gallery-card-meta"><span>@{p.owner.username} · {ago(p.createdAt)}</span><span><MessageCircle size={14}/> {p.commentCount}</span></div><button className="gallery-card-link" onClick={()=>void show(p)}>Посмотреть и обсудить <ArrowRight size={16}/></button></div></article>)}</div>:<div className="gallery-empty"><BookOpen size={33}/><h3>Работ пока нет</h3><p>Добавь свой первый проект — сайт, рисунок, игру или что угодно из категорий Screenly.</p><button className="gallery-dark-btn" onClick={startCreate}><MessageSquarePlus size={17}/> Опубликовать работу</button></div>}
  </>}
  <p className="gallery-safety"><ShieldCheck size={17}/> Закрытый тест: возрастная категория указана пользователем, но не подтверждена. Не раскрывай адреса, контакты, пароли и другие личные данные в проектах и отзывах.</p>
 </section>;
}
