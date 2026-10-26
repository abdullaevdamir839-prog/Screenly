import { RoomServiceClient } from 'livekit-server-sdk';

export function livekitApiUrl(websocketUrl) {
  if(typeof websocketUrl!=='string')throw new Error('LIVEKIT_URL отсутствует');
  const parsed=new URL(websocketUrl);
  if(parsed.protocol!=='wss:' || parsed.username || parsed.password || parsed.search || parsed.hash)throw new Error('Неверный LIVEKIT_URL');
  parsed.protocol='https:';
  return parsed.origin;
}

/** Close active LiveKit transport after the DB room was closed authoritatively. */
export async function disconnectClosedRoom(id,env=process.env) {
  const host=livekitApiUrl(env.LIVEKIT_URL);
  if(!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET)throw new Error('LiveKit credentials missing');
  const rooms=new RoomServiceClient(host,env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET);
  try {await rooms.deleteRoom(`screenly-${id}`);}
  catch(e) {
    // There may have been no LiveKit room yet (never joined).
    if(e?.status===404 || e?.code==='not_found')return;
    throw e;
  }
}
