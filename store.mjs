'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Brush, Code2, Compass, ExternalLink, Film, Gamepad2, GraduationCap, Lightbulb, MonitorPlay, Music2, Palette, Plus, RefreshCw, Search, Sparkles, Users, WandSparkles, Box, MessageCircle } from 'lucide-react';
import { CATEGORIES, GOALS, filterRooms, getCategory, getGoal } from '@/lib/creator-categories.mjs';
import categoryAssets from '@/lib/category-assets.json';

type Room = { id:string; title:string; topic:string; category?:string; goal?:string; description?:string; projectTitle?:string; projectUrl?:string; learningPlan?:string; url:string; owner?:{displayName:string; username:string}; };
const icons:Record<string,any> = {'vibe-coding':WandSparkles,design:Palette,drawing:Brush,programming:Code2,'game-dev':Gamepad2,'3d':Box,video:Film,music:Music2,study:GraduationCap,gaming:Gamepad2,talk:MessageCircle,projects:Lightbulb};
const ideas:Record<string,string[]>={
 'vibe-coding':['Собираем сайт за один эфир','Разбираем интерфейс, созданный с ИИ','Делаем полезный мини-сервис'],
 design:['Ревью макета в Figma','Создаём айдентику бренда','Разбираем портфолио'],
 drawing:['Рисуем персонажей вместе','Учимся светотени','Показываем скетчи'],
 programming:['Разбор кода в прямом эфире','Делаем веб-приложение вместе','Учимся находить ошибки'],
 'game-dev':['Разработка игры в Roblox Studio','Делаем прототип на Godot','Показываем игровые механики'],
 '3d':['Создаём сцену в Blender','Учимся моделированию','Ревью 3D-работ'],
 video:['Монтируем ролик в прямом эфире','Разбираем цветокоррекцию','Делаем заставку'],
 music:['Создаём бит вместе','Разбираем аранжировку','Показываем музыкальные проекты'],
 study:['Решаем задачи вместе','Объясняем сложную тему','Готовимся к экзаменам'],
 gaming:['Показываем интересные игры','Учимся игровым механикам','Делимся советами'],
 talk:['Обсуждаем новые проекты','Ищем единомышленников','Знакомимся и делимся идеями'],
 projects:['Покажи свой стартап','Разберём прототип вместе','Презентация портфолио'],
};
type CategoryArtKey = keyof typeof categoryAssets;
function CategoryArtwork({id,Icon}:{id:string,Icon:any}){
 const src=Object.prototype.hasOwnProperty.call(categoryAssets,id)
  ? (categoryAssets as Record<string,string>)[id] : undefined;
 const [failed,setFailed]=useState(false);
 return <span className="hub-category-visual" aria-hidden="true">
  {src&&!failed ? <img src={src} alt="" loading="lazy" onError={()=>setFailed(true)}/> :
   <span className="hub-category-fallback"><span className="hub-category-halo"/><Icon size={66} strokeWidth={1.25}/><span className="hub-category-seal"/></span>}
 </span>;
}
export default function CreatorHub({onCreate}:{onCreate:(category:string)=>void}){
 const [rooms,setRooms]=useState<Room[]>([]),[category,setCategory]=useState('all'),[goal,setGoal]=useState('all'),[query,setQuery]=useState('');
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  setError('');try{
   const res=await fetch('/api/v1/rooms',{cache:'no-store'});
   const data=await res.json();if(!res.ok)throw new Error(data.error||'Не удалось загрузить комнаты');
   setRooms(data.rooms||[]);
  }catch(e){setError(e instanceof Error?e.message:'Ошибка загрузки');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();const interval=setInterval(()=>void refresh(),30000);return()=>clearInterval(interval);},[refresh]);
 const visible=useMemo(()=>filterRooms(rooms,{category,goal,query}),[rooms,category,goal,query]);
 const selected=getCategory(category);
 const activeIdeas=ideas[category]||['Покажите, над чем работаете','Проведите мини-урок','Разберите проект с друзьями'];
 return <div className="hub">
  <section className="hub-hero"><div><span className="hub-kicker"><Sparkles size={15}/> ТВОРЧЕСТВО И ОБУЧЕНИЕ</span><h2>Показывай, как <em>ты создаёшь.</em></h2><p>Транслируй экран, получай советы, объясняй другим и находи людей для совместных проектов.</p><button className="hub-button" onClick={()=>onCreate(category==='all'?'vibe-coding':category)}><Plus size={17}/> Создать мастерскую <ArrowRight size={16}/></button></div><div className="hub-art" aria-hidden="true"><div className="hub-art-window"><div className="hub-art-bar"><span/><span/><span/></div><div className="hub-art-code"><i/><i/><i/><i/></div></div><div className="hub-art-badge"><MonitorPlay size={20}/> LIVE</div></div></section>
  <section className="hub-section"><div className="hub-section-title"><div><h2>Выбери направление</h2><p>У каждого сообщества — свои мастерские и проекты.</p></div></div><div className="hub-categories"><button className={`hub-category ${category==='all'?'selected':''}`} onClick={()=>setCategory('all')}><CategoryArtwork id="all" Icon={Compass}/><span className="hub-category-description"><strong>Все направления</strong><small>Открыть для себя новое</small></span></button>{CATEGORIES.map(cat=>{const Icon=icons[cat.id]||Lightbulb;return <button key={cat.id} className={`hub-category ${category===cat.id?'selected':''}`} onClick={()=>setCategory(cat.id)}><CategoryArtwork id={cat.id} Icon={Icon}/><span className="hub-category-description"><strong>{cat.label}</strong><small>{cat.desc}</small></span></button>})}</div></section>
  <section className="hub-section"><div className="hub-section-title"><div><h2>{selected ? selected.label : 'Мастерские в эфире'}</h2><p>Разборы работ, мини-уроки и совместные проекты. Каталог показывает комнаты твоей возрастной группы.</p></div><button className="hub-refresh" onClick={()=>void refresh()} aria-label="Обновить каталог"><RefreshCw size={16}/></button></div>
   <div className="hub-filters"><label className="hub-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по названию или проекту…" maxLength={80}/></label><select aria-label="Формат мастерской" value={goal} onChange={e=>setGoal(e.target.value)}><option value="all">Все форматы</option>{GOALS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
   {error&&<p className="hub-error" role="alert">{error}</p>}
   {loading?<div className="hub-empty">Загружаем эфиры…</div>:visible.length?<div className="hub-room-grid">{visible.map(r=><article className="hub-room" key={r.id}><div className="hub-room-preview"><MonitorPlay size={29}/><span>{getCategory(r.category)?.label||r.topic||'Общение'}</span></div><div className="hub-room-content"><span className="hub-goal">{getGoal(r.goal)?.label||'Просто общаемся'}</span><h3>{r.title}</h3><p>{r.projectTitle?`Проект: ${r.projectTitle}`:(r.description||'Совместный эфир с демонстрацией экрана')}</p>{r.learningPlan&&<div className="hub-lesson"><BookOpen size={14}/><span>{r.learningPlan}</span></div>}<div className="hub-room-footer"><span>Автор: {r.owner?.displayName||'Участник'}</span><a href={r.url}>Смотреть <ArrowRight size={15}/></a></div>{r.projectUrl&&<a className="hub-project-url" href={r.projectUrl} target="_blank" rel="nofollow noopener noreferrer">Ссылка на проект <ExternalLink size={13}/></a>}</div></article>)}</div>:<div className="hub-empty"><MonitorPlay size={30}/><h3>Пока нет подходящих эфиров</h3><p>Ты можешь первым провести мастерскую или показать свой проект.</p><button className="hub-button" onClick={()=>onCreate(category==='all'?'vibe-coding':category)}><Plus size={15}/> Создать эфир</button></div>}
  </section>
  <section className="hub-section hub-ideas"><div className="hub-section-title"><div><h2>С чего начать?</h2><p>Идеи для твоей первой мастерской.</p></div></div><div className="hub-idea-grid">{activeIdeas.map((idea,i)=><button key={idea} onClick={()=>onCreate(category==='all'?'vibe-coding':category)}><span>0{i+1}</span><strong>{idea}</strong><ArrowRight size={17}/></button>)}</div></section>
  <p className="hub-warning"><Users size={16}/> Закрытый тест Screenly. Демонстрация включается только с разрешения пользователя; не показывай пароли, документы и личные данные.</p>
 </div>;
}
