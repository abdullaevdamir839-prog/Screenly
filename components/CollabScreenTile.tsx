'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {VideoTrack} from '@livekit/components-react';
import {MousePointer2,PenLine,ShieldCheck} from 'lucide-react';
import type {ComponentProps,PointerEvent as ReactPointerEvent} from 'react';
import type {CollabTool,InkStroke,RemoteCursor} from './useRoomCollaboration';

type TrackRef=ComponentProps<typeof VideoTrack>['trackRef'];
type Props={
  trackRef:TrackRef;owner:string;currentUser:string;names:Record<string,string>;
  strokes:InkStroke[];cursors:RemoteCursor[];allow:boolean;tool:CollabTool;
  onCursor:(stream:string,x:number,y:number,visible?:boolean)=>void;
  onStroke:(stream:string,id:string,phase:'start'|'move'|'end',x:number,y:number)=>void;
  compact?:boolean;
};
const INK=['#191919','#505050','#737373','#343434'];
function colorFor(id:string){let n=0;for(const c of id)n=(n*31+c.charCodeAt(0))>>>0;return INK[n%INK.length];}

export default function CollabScreenTile({trackRef,owner,currentUser,names,strokes,cursors,allow,tool,onCursor,onStroke,compact=false}:Props){
  const root=useRef<HTMLDivElement>(null);
  const activeStroke=useRef<string|null>(null);
  const [bounds,setBounds]=useState({left:0,top:0,width:100,height:100});
  const interacting=allow && tool!=='off';

  useEffect(()=>{
    const outer=root.current;
    if(!outer)return;
    const recalc=()=>{
      const video=outer.querySelector('video');
      const w=outer.clientWidth,h=outer.clientHeight;
      const vw=video?.videoWidth || w, vh=video?.videoHeight || h;
      if(!w||!h||!vw||!vh)return;
      const scale=Math.min(w/vw,h/vh);
      const width=vw*scale,height=vh*scale;
      setBounds({left:(w-width)/2,top:(h-height)/2,width,height});
    };
    recalc();
    const video=outer.querySelector('video');
    video?.addEventListener('loadedmetadata',recalc);
    video?.addEventListener('resize',recalc);
    const observer=new ResizeObserver(recalc);
    observer.observe(outer);
    return ()=>{observer.disconnect();video?.removeEventListener('loadedmetadata',recalc);video?.removeEventListener('resize',recalc);};
  },[owner]);

  const coords=useCallback((event:ReactPointerEvent<HTMLDivElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(rect.width,1))),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(rect.height,1)))};
  },[]);
  const move=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(!interacting)return;
    const p=coords(event);
    if(tool==='pointer')onCursor(owner,p.x,p.y,true);
    if(tool==='draw' && activeStroke.current)onStroke(owner,activeStroke.current,'move',p.x,p.y);
  };
  const begin=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(!interacting||tool!=='draw'||event.button!==0)return;
    event.preventDefault();
    const id=(typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID().replace(/-/g,'').slice(0,24):`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`);
    activeStroke.current=id;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p=coords(event);onStroke(owner,id,'start',p.x,p.y);
  };
  const finish=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(activeStroke.current){const p=coords(event);onStroke(owner,activeStroke.current,'end',p.x,p.y);activeStroke.current=null;}
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(()=>{if(!interacting)activeStroke.current=null;},[interacting]);

  return <div className={`collab-tile ${compact?'collab-tile-compact':''}`}>
    <div className="collab-tile-heading"><span><span className="stage-live-dot"/> Экран: {names[owner]||'Участник'}</span><span>{allow?<><PenLine size={13}/> Пометки разрешены</>:<><ShieldCheck size={13}/> Без пометок</>}</span></div>
    <div className="collab-video-area" ref={root}>
      <VideoTrack trackRef={trackRef} className="screen-video" />
      <div className="collab-content-bounds" style={{left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height}}>
        <svg className="collab-ink-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          {strokes.map(s=><polyline key={s.key} points={s.points.map(p=>`${p[0]*1000},${p[1]*1000}`).join(' ')} fill="none" stroke={colorFor(s.sender)} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity=".95"/>)}
        </svg>
        {cursors.filter(c=>c.sender!==currentUser&&c.visible).map(c=><div className="collab-remote-pointer" key={`${owner}:${c.sender}`} style={{left:`${c.x*100}%`,top:`${c.y*100}%`}}><MousePointer2 size={19} fill="#111" color="#fff" strokeWidth={1.6}/><span>{names[c.sender]||'Участник'}</span></div>)}
        <div className={`collab-pointer-layer ${interacting?`collab-tool-${tool}`:'collab-tool-off'}`}
          onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={()=>onCursor(owner,0,0,false)}
          aria-label={interacting?tool==='draw'?'Рисовать поверх демонстрации':'Указывать на экран':'Аннотации выключены'} />
      </div>
    </div>
  </div>;
}
