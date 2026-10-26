/** Read bounded JSON without trusting Content-Length (it may be absent). */
export async function boundedJson(request, maxBytes = 16_384) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError('Invalid body limit');
  const declared = request.headers.get('content-length');
  if (declared !== null && Number(declared) > maxBytes) throw Object.assign(new Error('Слишком большой запрос'), {status:413});
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('Ожидался JSON'), {status:400});
  const parts=[];
  let total=0;
  try {
    while (true) {
      const {value,done}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes)throw Object.assign(new Error('Слишком большой запрос'), {status:413});
      parts.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(total);
  let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  let value;
  try {value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch {throw Object.assign(new Error('Неверный формат JSON'),{status:400});}
  if(!value || typeof value!=='object' || Array.isArray(value))throw Object.assign(new Error('Ожидался JSON-объект'),{status:400});
  return value;
}
