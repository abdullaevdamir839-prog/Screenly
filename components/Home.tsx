'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, AudioLines, Check, ChevronRight, CircleHelp,
  Compass, Copy, Headphones, LockKeyhole, LogOut, MessageSquareText,
  MonitorPlay, Plus, Radio, ShieldCheck, Sparkles, Users, VideoOff,
} from 'lucide-react';

type Props = { authorized: boolean; nextPath: string };

const features = [
  { icon: MonitorPlay, title: 'Всё начинается с экрана', description: 'Покажи игру, проект или интересную находку. Камера не нужна.', color: 'indigo' },
  { icon: Headphones, title: 'Общение в реальном времени', description: 'Разговаривайте в голосе и обсуждайте происходящее без задержек.', color: 'mint' },
  { icon: MessageSquareText, title: 'Чат всегда под рукой', description: 'Скидывайте сообщения, пока смотрите трансляцию.', color: 'peach' },
];

export default function Home({ authorized, nextPath }: Props) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);

  async function logIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch('/api/alpha-login', {method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({code:passcode})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не получилось войти');
      router.push((nextPath.startsWith('/room/') || nextPath==='/community') && !nextPath.startsWith('//') ? nextPath : '/');
      router.refresh();
    } catch(err) { setError(err instanceof Error ? err.message : 'Ошибка подключения'); }
    finally { setBusy(false); }
  }

  async function createRoom() {
    setRoomBusy(true); setError('');
    try {
      const res = await fetch('/api/rooms', {method:'POST'});
      const data = await res.json();
      if(!res.ok || !data.path) throw new Error(data.error || 'Не удалось создать комнату');
      router.push(data.path);
    } catch(err) { setError(err instanceof Error ? err.message : 'Ошибка создания комнаты'); }
    finally { setRoomBusy(false); }
  }

  async function logout() {
    try { await fetch('/api/logout', {method:'POST'}); window.location.assign('/'); }
    catch { setError('Не удалось завершить сессию'); }
  }

  return <div className="landing-page">
    <header className="site-header shell">
      <a className="brand" href="/" aria-label="Screenly — главная"><span className="brand-mark"><MonitorPlay size={21} strokeWidth={2.8}/></span><span>screenly<span className="brand-dot">.</span></span></a>
      <nav className="header-links" aria-label="Навигация"><a href="#how">Как это работает</a><a href="#features">Возможности</a>{authorized&&<a href="/community">Сообщество</a>}</nav>
      <div className="header-actions"><span className="pill-alpha"><span className="tiny-dot"/> CLOSED ALPHA</span>{authorized && <button className="icon-text" onClick={logout}><LogOut size={17}/><span>Выйти</span></button>}</div>
    </header>

    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15}/> НОВЫЙ СПОСОБ БЫТЬ ВМЕСТЕ</div>
          <h1>Покажи свой мир.<br/><span>Найди своих людей.</span></h1>
          <p>Место, где знакомятся через то, чем увлечены. Делись экраном, общайся голосом и проводи время вместе — без веб-камеры.</p>
          <div className="hero-actions">
            {authorized ? <button className="btn btn-primary" onClick={createRoom} disabled={roomBusy}><Plus size={19}/>{roomBusy ? 'Создаём комнату…' : 'Создать комнату'}<ArrowRight size={18}/></button> : <a className="btn btn-primary" href="#access">Получить доступ <ArrowRight size={18}/></a>}
            <a className="btn btn-subtle" href="#how">Как это работает <ChevronRight size={17}/></a>
          </div>
          <div className="hero-fine"><ShieldCheck size={17}/><span>Приватные комнаты • только приглашённые тестировщики</span></div>
          {error && <p className="error-text" role="alert">{error}</p>}
        </div>
        <div className="hero-art" aria-label="Пример интерфейса комнаты Screenly">
          <div className="art-glow art-glow-one"/><div className="art-glow art-glow-two"/>
          <div className="mock-window">
            <div className="mock-topline"><span className="mock-dots"><i/><i/><i/></span><span className="mock-url">screenly.app / room / 024</span><span className="mock-lock"><LockKeyhole size={12}/></span></div>
            <div className="mock-inner">
              <div className="mock-side"><div className="mock-side-brand">s<span>.</span></div><div className="mock-side-ico active"><MonitorPlay size={17}/></div><div className="mock-side-ico"><Users size={17}/></div><div className="mock-side-ico"><MessageSquareText size={17}/></div></div>
              <div className="mock-main"><div className="mock-room-header"><span>Смотрим, что нового ✨</span><span className="mock-live"><span/>LIVE</span></div>
                <div className="mock-stream"><div className="mock-stream-toolbar"><span>●</span><span>Здесь демонстрация экрана</span><span>⌘</span></div><div className="mock-content"><div className="mock-logo-circle"><MonitorPlay size={28}/></div><div className="mock-content-title">Твой экран — твоя история</div><div className="mock-content-sub">Поделись тем, что тебя вдохновляет</div><div className="mock-fake-progress"><span/></div></div></div>
                <div className="mock-bottom"><span className="mock-avatar a1">М</span><span className="mock-avatar a2">Д</span><span className="mock-avatar a3">А</span><span className="mock-online">3 человека в комнате</span><div className="mock-controls"><Headphones size={15}/><MonitorPlay size={15}/></div></div>
              </div>
            </div>
          </div>
          <div className="floating-card"><span className="floating-icon"><AudioLines size={19}/></span><span><strong>Голос подключён</strong><small>Вы слышите друг друга</small></span><span className="floating-wave">▂▅▃▆▃</span></div>
          <div className="floating-sticker"><span>✦</span> Знакомьтесь по интересам</div>
        </div>
      </section>

      <section id="how" className="steps-band"><div className="shell steps-content"><div><span className="section-kicker">ПРОСТО И ПОНЯТНО</span><h2>Три шага — и вы вместе</h2></div><div className="steps-grid"><div><span className="step-count">01</span><strong>Создай комнату</strong><small>Приватная ссылка для своих</small></div><div><span className="step-count">02</span><strong>Пригласи друга</strong><small>Поделись ссылкой и кодом тестера</small></div><div><span className="step-count">03</span><strong>Говорите и делитесь</strong><small>Микрофон, экран и чат</small></div></div></div></section>

      <section id="features" className="shell features-section"><div className="section-heading"><span className="section-kicker">ВОЗМОЖНОСТИ</span><h2>Общение, в котором <em>есть что показать.</em></h2><p>Никаких сложных настроек — только то, что помогает оставаться на связи.</p></div>
      <div className="feature-cards">{features.map(({icon:Icon,title,description,color})=><article className="feature-card" key={title}><div className={`feature-icon ${color}`}><Icon size={23}/></div><h3>{title}</h3><p>{description}</p><span>Screenly 1.2 <Check size={14}/></span></article>)}</div></section>

      <section id="access" className="shell access-section">
        <div className="access-decor"><span className="access-graphic"><LockKeyhole size={38}/></span><span className="access-orbit one"/><span className="access-orbit two"/></div>
        <div className="access-copy"><span className="section-kicker">SCREENLY CREATOR HUB 1.2</span><h2>{authorized ? 'Твой первый эфир начинается здесь.' : 'Добро пожаловать в закрытую альфу.'}</h2><p>{authorized ? 'Создай приватную комнату и позови второго тестировщика. Голос, чат и демонстрация экрана уже готовы для подключения к LiveKit.' : 'Сейчас Screenly открыт только для приглашённых тестировщиков. Введи полученный от разработчика код доступа.'}</p></div>
        <div className="access-form-card">{authorized ? <><a className="btn btn-subtle btn-full" href="/community">Открыть сообщество <ArrowRight size={18}/></a><div className="logged-indicator"><ShieldCheck size={18}/> Доступ подтверждён</div><button onClick={createRoom} disabled={roomBusy} className="btn btn-primary btn-full"><Plus size={18}/>{roomBusy?'Создаём…':'Создать приватную комнату'}<ArrowUpRight size={17}/></button></> : <form onSubmit={logIn}><label htmlFor="access-code">Код приглашённого тестировщика</label><div className="access-field"><LockKeyhole size={18}/><input id="access-code" type="password" autoComplete="off" value={passcode} onChange={e=>setPasscode(e.target.value)} placeholder="Введите код доступа" minLength={12} required/></div><button type="submit" disabled={busy} className="btn btn-primary btn-full">{busy?'Проверяем…':'Войти в альфу'}<ArrowRight size={18}/></button></form>}
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="access-note"><CircleHelp size={16}/> <a href="/community">Мастерские, профили, друзья и каталог комнат — в сообществе</a></div>
        </div>
      </section>
    </main>
    <footer className="site-footer shell"><div className="brand footer-brand"><span className="brand-mark"><MonitorPlay size={17}/></span><span>screenly<span className="brand-dot">.</span></span></div><p>Screenly 1.2 • закрытый тест • без записи трансляций</p><div className="footer-social"><span><LockKeyhole size={15}/> Privacy first</span></div></footer>
  </div>;
}
