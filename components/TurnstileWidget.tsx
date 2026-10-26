'use client';
import {useEffect, useRef, useState} from 'react';
import Script from 'next/script';

type TurnstileAPI = {render:(element:HTMLElement, options:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void};
declare global {interface Window {turnstile?:TurnstileAPI}}

export default function TurnstileWidget({sitekey,onToken,resetKey}:{sitekey:string;onToken:(token:string)=>void;resetKey:number}) {
 const [loaded,setLoaded]=useState(false);
 const node=useRef<HTMLDivElement>(null);
 const widget=useRef<string|null>(null);
 const tokenHandler=useRef(onToken);
 tokenHandler.current=onToken;
 useEffect(()=>{
  if(!loaded || !node.current || !window.turnstile || widget.current)return;
  const id=window.turnstile.render(node.current,{sitekey,theme:'light',appearance:'interaction-only',action:'register',callback:(token:string)=>tokenHandler.current(token),'expired-callback':()=>tokenHandler.current(''),'error-callback':()=>tokenHandler.current('')});
  widget.current=id;
  return ()=>{if(widget.current!==null){window.turnstile?.remove(widget.current);widget.current=null;}tokenHandler.current('');};
 },[loaded,sitekey]);
 useEffect(()=>{if(resetKey>0 && widget.current!==null){window.turnstile?.reset(widget.current);tokenHandler.current('');}},[resetKey]);
 return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={()=>setLoaded(true)}/><div ref={node} className="screenly-turnstile" aria-label="Проверка на человека"/></>;
}
