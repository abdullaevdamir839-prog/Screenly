'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {RoomEvent, type Room} from 'livekit-client';
import {applyStroke,undoStroke,COLLAB_TOPIC,encodeCollabPacket,parseCollabPacket,MAX_PACKET_BYTES} from '@/lib/collaboration.mjs';

export type InkStroke={key:string;id:string;sender:string;points:number[][]};
export type RemoteCursor={sender:string;stream:string;x:number;y:number;updated:number;visible:boolean};
export type CollabTool='off'|'pointer'|'draw';
const CURSOR_INTERVAL=65;
const DRAW_INTERVAL=28;

export function useRoomCollaboration(room:Room, activeScreenOwners:string[]) {
  const [permissions,setPermissions]=useState<Record<string,boolean>>({});
  const permissionsRef=useRef(permissions);
  const [strokes,setStrokes]=useState<Record<string,InkStroke[]>>({});
  const strokesRef=useRef(strokes);
  const [cursors,setCursors]=useState<Record<string,RemoteCursor>>({});
  const [tool,setTool]=useState<CollabTool>('off');
  const ownersRef=useRef(new Set(activeScreenOwners));
  const cursorSentAt=useRef(0);
  const strokeSentAt=useRef(0);
  const incomingSentAt=useRef(new Map<string,number>());

  useEffect(()=>{
    ownersRef.current=new Set(activeScreenOwners);
    // Revoke stale annotation permissions when a screen stops broadcasting.
    setPermissions(prev=>{
      const next=Object.fromEntries(Object.entries(prev).filter(([stream])=>ownersRef.current.has(stream)));
      permissionsRef.current=next;
      return next;
    });
    setCursors(prev=>Object.fromEntries(Object.entries(prev).filter(([,cursor])=>ownersRef.current.has(cursor.stream))));
  },[activeScreenOwners.join('|')]);
  const updatePermissions=useCallback((recipe:(p:Record<string,boolean>)=>Record<string,boolean>)=>{
    setPermissions(prev=>{const next=recipe(prev);permissionsRef.current=next;return next;});
  },[]);
  const updateStrokes=useCallback((recipe:(p:Record<string,InkStroke[]>)=>Record<string,InkStroke[]>)=>{
    setStrokes(prev=>{const next=recipe(prev);strokesRef.current=next;return next;});
  },[]);
  const dispatch=useCallback(async(data:Record<string,unknown>,reliable:boolean,destinationIdentities?:string[])=>{
    const packet=encodeCollabPacket(data);
    if(packet.byteLength>MAX_PACKET_BYTES) return;
    await room.localParticipant.publishData(packet,{reliable,topic:COLLAB_TOPIC,...(destinationIdentities?{destinationIdentities}:{})});
  },[room]);

  const clearLocalStream=useCallback((stream:string)=>{
    updateStrokes(prev=>({...prev,[stream]:[]}));
    setCursors(prev=>Object.fromEntries(Object.entries(prev).filter(([,v])=>v.stream!==stream)));
  },[updateStrokes]);

  useEffect(()=>{
    const receive=(payload:Uint8Array,participant?:{identity:string},_kind?:unknown,topic?:string)=>{
      if(topic!==COLLAB_TOPIC || !participant?.identity) return;
      const packet:any=parseCollabPacket(payload,participant.identity);
      if(!packet) return;
      if(packet.type==='hello') {
        const self=room.localParticipant.identity;
        if(permissionsRef.current[self] && ownersRef.current.has(self)) {
          void dispatch({type:'permission',stream:self,enabled:true},true,[packet.sender]).catch(()=>{});
          const last=(strokesRef.current[self]||[]).slice(-3).map(s=>({id:s.id,sender:s.sender,points:s.points.slice(-9)}));
          if(last.length) void dispatch({type:'snapshot',stream:self,strokes:last},true,[packet.sender]).catch(()=>{});
        }
        return;
      }
      if(packet.type==='permission') {
        if(!ownersRef.current.has(packet.stream)) return;
        updatePermissions(prev=>({...prev,[packet.stream]:packet.enabled}));
        if(!packet.enabled) clearLocalStream(packet.stream);
        return;
      }
      if(packet.type==='clear') {
        if(ownersRef.current.has(packet.stream)) clearLocalStream(packet.stream);
        return;
      }
      if(!ownersRef.current.has(packet.stream)||!permissionsRef.current[packet.stream]) return;
      if(packet.type==='cursor') {
        const key=`${packet.stream}:${packet.sender}`;
        const now=Date.now();
        const last=incomingSentAt.current.get(key)||0;
        if(packet.visible && now-last<25) return;
        incomingSentAt.current.set(key,now);
        setCursors(prev=>({...prev,[key]:{sender:packet.sender,stream:packet.stream,x:packet.x,y:packet.y,updated:now,visible:packet.visible}}));
      } else if(packet.type==='stroke') {
        updateStrokes(prev=>({...prev,[packet.stream]:applyStroke(prev[packet.stream],packet)}));
      } else if(packet.type==='undo') {
        updateStrokes(prev=>({...prev,[packet.stream]:undoStroke(prev[packet.stream],packet.sender,packet.id)}));
      } else if(packet.type==='snapshot') {
        updateStrokes(prev=>{
          const prior=prev[packet.stream]||[];
          const map=new Map(prior.map(s=>[s.key,s]));
          for(const s of packet.strokes) {const key=`${s.sender}:${s.id}`;if(!map.has(key))map.set(key,{...s,key});}
          return {...prev,[packet.stream]:[...map.values()].slice(-60)};
        });
      }
    };
    const disconnected=(p:{identity:string})=>{
      updatePermissions(prev=>{const next={...prev};delete next[p.identity];return next;});
      setCursors(prev=>Object.fromEntries(Object.entries(prev).filter(([,v])=>v.sender!==p.identity && v.stream!==p.identity)));
    };
    const sayHello=()=>{void dispatch({type:'hello'},true).catch(()=>{});};
    const newPeer=(p:{identity:string})=>{
      const me=room.localParticipant.identity;
      if(permissionsRef.current[me] && ownersRef.current.has(me))
        void dispatch({type:'permission',stream:me,enabled:true},true,[p.identity]).catch(()=>{});
    };
    room.on(RoomEvent.DataReceived,receive);
    room.on(RoomEvent.ParticipantDisconnected,disconnected);
    room.on(RoomEvent.ParticipantConnected,newPeer);
    room.on(RoomEvent.Connected,sayHello);
    sayHello();
    return ()=>{room.off(RoomEvent.DataReceived,receive);room.off(RoomEvent.ParticipantDisconnected,disconnected);room.off(RoomEvent.ParticipantConnected,newPeer);room.off(RoomEvent.Connected,sayHello);};
  },[room,dispatch,updatePermissions,updateStrokes,clearLocalStream]);

  useEffect(()=>{
    const id=window.setInterval(()=>setCursors(prev=>{
      const now=Date.now();
      const keep=Object.fromEntries(Object.entries(prev).filter(([,v])=>v.visible&&now-v.updated<1900));
      return Object.keys(keep).length===Object.keys(prev).length?prev:keep;
    }),500);
    return ()=>clearInterval(id);
  },[]);

  const allowAnnotations=useCallback((enabled:boolean)=>{
    const self=room.localParticipant.identity;
    if(enabled && !ownersRef.current.has(self))return;
    updatePermissions(prev=>({...prev,[self]:enabled}));
    if(!enabled) clearLocalStream(self);
    void dispatch({type:'permission',stream:self,enabled},true).catch(()=>{});
    if(!enabled)void dispatch({type:'clear',stream:self},true).catch(()=>{});
  },[room,dispatch,updatePermissions,clearLocalStream]);
  const publishCursor=useCallback((stream:string,x:number,y:number,visible=true)=>{
    if(!ownersRef.current.has(stream)||!permissionsRef.current[stream])return;
    const now=Date.now();
    if(visible&&now-cursorSentAt.current<CURSOR_INTERVAL)return;
    cursorSentAt.current=now;
    void dispatch({type:'cursor',stream,x,y,visible},false).catch(()=>{});
  },[dispatch]);
  const publishStroke=useCallback((stream:string,id:string,phase:'start'|'move'|'end',x:number,y:number)=>{
    if(!ownersRef.current.has(stream)||!permissionsRef.current[stream])return;
    const now=Date.now();
    if(phase==='move'&&now-strokeSentAt.current<DRAW_INTERVAL)return;
    strokeSentAt.current=now;
    updateStrokes(prev=>({...prev,[stream]:applyStroke(prev[stream],{sender:room.localParticipant.identity,id,phase,x,y})}));
    void dispatch({type:'stroke',stream,id,phase,x,y},phase!=='move').catch(()=>{});
  },[dispatch,room,updateStrokes]);
  const clearDrawing=useCallback((stream:string)=>{
    if(room.localParticipant.identity!==stream)return;
    clearLocalStream(stream);
    void dispatch({type:'clear',stream},true).catch(()=>{});
  },[room,dispatch,clearLocalStream]);
  const undoMyStroke=useCallback((stream:string)=>{
    if(!ownersRef.current.has(stream)||!permissionsRef.current[stream])return;
    const sender=room.localParticipant.identity;
    const own=[...(strokesRef.current[stream]||[])].reverse().find(s=>s.sender===sender);
    if(!own)return;
    updateStrokes(prev=>({...prev,[stream]:undoStroke(prev[stream],sender,own.id)}));
    void dispatch({type:'undo',stream,id:own.id},true).catch(()=>{});
  },[room,dispatch,updateStrokes]);
  return {permissions,strokes,cursors,tool,setTool,allowAnnotations,publishCursor,publishStroke,clearDrawing,undoMyStroke};
}
