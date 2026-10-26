'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Monitor, ShieldCheck } from 'lucide-react';

type Props = { children: ReactNode; mobileUserAgent: boolean };

/** UX availability gate, not an authentication or security boundary. */
export default function DesktopGate({children,mobileUserAgent}:Props) {
  const [mobile,setMobile]=useState(mobileUserAgent);
  useEffect(()=>{
    const check=()=>{
      const ua=navigator.userAgent;
      const phoneOrTablet=/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
      const tabletInDesktopMode=navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
      setMobile(phoneOrTablet||tabletInDesktopMode);
    };
    check();
  },[]);
  if(mobile)return <DesktopNotice/>;
  return <><div className="desktop-app">{children}</div><div className="desktop-mobile-notice"><DesktopNotice/></div></>;
}

function DesktopNotice(){return <main className="desktop-only-screen">
  <div className="desktop-only-card"><div className="desktop-only-brand">screenly<span>.</span></div><div className="desktop-only-icon"><Monitor size={42} strokeWidth={1.5}/></div><span className="desktop-only-kicker">DESKTOP EXPERIENCE</span>
  <h1>Screenly создан для большого экрана.</h1>
  <p>Сейчас совместные мастерские и демонстрации доступны только на компьютерах и ноутбуках.</p>
  <div className="desktop-only-foot"><ShieldCheck size={17}/> Мобильная версия появится позже</div></div>
</main>;}
