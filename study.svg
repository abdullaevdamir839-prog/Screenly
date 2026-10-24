/** Wire protocol for ephemeral collaboration events in LiveKit rooms. No persistence. */
export const COLLAB_TOPIC = 'screenly.collab.v1';
export const MAX_PACKET_BYTES = 1100;
export const MAX_STROKES_PER_STREAM = 60;
export const MAX_POINTS_PER_STROKE = 180;
const idPattern = /^[a-zA-Z0-9_-]{1,64}$/;
const number = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const object = o => o && typeof o === 'object' && !Array.isArray(o);

export function parseCollabPacket(raw, participantIdentity) {
  if (typeof participantIdentity !== 'string' || !participantIdentity || !raw || raw.byteLength > MAX_PACKET_BYTES) return null;
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(raw)); } catch { return null; }
  if (!object(data) || data.version !== 1 || typeof data.type !== 'string') return null;
  if (data.type === 'hello') return {type:'hello', sender:participantIdentity};
  if (typeof data.stream !== 'string' || data.stream.length > 160 || !data.stream) return null;
  const stream = data.stream;
  if (data.type === 'permission' && participantIdentity === stream && typeof data.enabled === 'boolean') {
    return {type:'permission',stream, sender:participantIdentity,enabled:data.enabled};
  }
  if (data.type === 'clear' && participantIdentity === stream) return {type:'clear',stream,sender:participantIdentity};
  if (data.type === 'cursor' && number(data.x) && number(data.y)) {
    return {type:'cursor',stream,sender:participantIdentity,x:data.x,y:data.y,visible:data.visible !== false};
  }
  if (data.type === 'stroke' && typeof data.id === 'string' && idPattern.test(data.id) && ['start','move','end'].includes(data.phase) && number(data.x) && number(data.y)) {
    return {type:'stroke',stream,sender:participantIdentity,id:data.id,phase:data.phase,x:data.x,y:data.y};
  }
  // Snapshots only come from the owner of a screen; validate every value.
  if (data.type === 'snapshot' && participantIdentity === stream && Array.isArray(data.strokes) && data.strokes.length <= 12) {
    const strokes = [];
    for (const stroke of data.strokes) {
      if (!object(stroke) || typeof stroke.id !== 'string' || !idPattern.test(stroke.id) || typeof stroke.sender !== 'string' || stroke.sender.length > 160 || !Array.isArray(stroke.points) || stroke.points.length < 1 || stroke.points.length > 35 || !stroke.points.every(p=>Array.isArray(p)&&p.length===2&&number(p[0])&&number(p[1]))) return null;
      strokes.push({id:stroke.id,sender:stroke.sender,points:stroke.points});
    }
    return {type:'snapshot',sender:participantIdentity,stream,strokes};
  }
  return null;
}

export const limitPoint = value => Math.min(1,Math.max(0,Math.round(value*10000)/10000));
export function applyStroke(prev, event) {
  const list = [...(prev || [])];
  const fullId = `${event.sender}:${event.id}`;
  const index = list.findIndex(s=>s.key===fullId);
  if (event.phase === 'start') {
    if (index !== -1) return list;
    list.push({key:fullId,id:event.id,sender:event.sender,points:[[event.x,event.y]]});
    return list.slice(-MAX_STROKES_PER_STREAM);
  }
  if (index < 0) return list;
  const current = list[index];
  if (current.points.length >= MAX_POINTS_PER_STROKE) return list;
  const last = current.points.at(-1);
  if (last && last[0]===event.x && last[1]===event.y) return list;
  list[index]={...current,points:[...current.points,[event.x,event.y]]};
  return list;
}

export function encodeCollabPacket(data) {
  return new TextEncoder().encode(JSON.stringify({version:1,...data}));
}
