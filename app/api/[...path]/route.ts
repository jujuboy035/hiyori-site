import { env } from 'cloudflare:workers';
import { defaultTodoTitles, isCustomTodoId } from '@/lib/todo-items';
import { checkinKey, checkinNames, tokyoDay } from '@/lib/checkins';
import { isDateDay, getDateDay } from '@/lib/dates';
import { isOutingId } from '@/lib/outings';
import { visibleAlbumRecords } from '@/lib/album';
import {getQuestionItems,answerKey,questionViews} from '@/lib/questions';
export const dynamic='force-dynamic';
const json=(v:any,status=200,headers:any={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
async function undoTodoCompletion(db:any,rawId:unknown,name:string,expectedPhotoId?:unknown){
 const value=String(rawId??''),id=isCustomTodoId(value)?value:/^(0|[1-9]\d*)$/.test(value)?Number(value):-1;
 if(typeof id==='number'&&(!Number.isInteger(id)||id<0||id>=defaultTodoTitles.length))return json({error:'項目が見つかりません。'},400);
 const key='todo:'+id,stored=await db.prepare('SELECT value FROM records WHERE id=?').bind(key).first();
 if(!stored)return json({error:'記録が見つかりません。'},404);
 const previous=JSON.parse(stored.value);
 if(previous.done&&typeof expectedPhotoId==='string'&&previous.photoId!==expectedPhotoId)return json({error:'記録が更新されています。開き直してから、もう一度試してね。'},409);
 if(!previous.done&&!previous.photoId)return json({id:key,record:previous,removedPhotoIds:[]});
 const now=new Date().toISOString(),record={...previous,done:false,cancelledAt:now,cancelledBy:name};
 delete record.photoId;
 const statements=[db.prepare('UPDATE records SET value=? WHERE id=? AND value=?').bind(JSON.stringify(record),key,stored.value)];
 const removedPhotoIds:string[]=[];
 if(typeof previous.photoId==='string'){
  const photoKey='photo:'+previous.photoId,photoRow=await db.prepare('SELECT value FROM records WHERE id=?').bind(photoKey).first();
  const photo=photoRow?JSON.parse(photoRow.value):null;
  if(photo&&String(photo.todoId)===String(id)){
   statements.push(db.prepare('UPDATE records SET value=? WHERE id=? AND value=?').bind(JSON.stringify({...photo,cancelled:true,cancelledAt:now}),photoKey,photoRow.value));
   removedPhotoIds.push(previous.photoId);
  }
 }
 const results=await db.batch(statements);
 if(results[0]?.meta?.changes===0)return json({error:'記録が更新されています。開き直してから、もう一度試してね。'},409);
 return json({id:key,record,removedPhotoIds});
}
async function handle(req:Request){
 const e=env as any, path=new URL(req.url).pathname.split('/').filter(Boolean).slice(1), db=e.DB;
 const token=(req.headers.get('cookie')||'').match(/futari_session=([^;]+)/)?.[1];
 const sessionEpoch=typeof e.SESSION_EPOCH==='string'?e.SESSION_EPOCH:'';
 const user=sessionEpoch&&token?.startsWith(sessionEpoch+'.')?await db.prepare('SELECT name FROM sessions WHERE id=? AND expires>?').bind(token,Date.now()).first():null;
 if(path[0]==='login' && req.method==='POST'){
  const b=await req.json() as any;
  const expected=b.name==='Aさん'?e.ACCOUNT_A_PIN:b.name==='Bさん'?e.ACCOUNT_B_PIN:null;
  if(!sessionEpoch)return json({error:'ログインの準備中です。少し待ってから試してね。'},503);
  if(!expected || typeof b.pin!=='string'||!/^\d{8}$/.test(b.pin)||b.pin!==expected){await new Promise(r=>setTimeout(r,700));return json({error:'パスワードが違うみたい。もう一度試してね。'},401)}
  const id=sessionEpoch+'.'+crypto.randomUUID()+crypto.randomUUID();await db.prepare('INSERT INTO sessions(id,name,expires) VALUES(?,?,?)').bind(id,b.name,Date.now()+2592000000).run();
  return json({name:b.name},200,{'Set-Cookie':`futari_session=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`});
 }
 if(!user)return json({error:'ログインしてね'},401);
 if(req.method!=='GET' && req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Forbidden'},403);
 if(path[0]==='logout'){await db.prepare('DELETE FROM sessions WHERE id=?').bind(token).run();return json({ok:true},200,{'Set-Cookie':'futari_session=; Path=/; Max-Age=0; Secure; HttpOnly'})}
 if(path[0]==='me')return json(user);
 if(path[0]==='questions'){
  if(!checkinNames.includes(user.name))return json({error:'アカウントを確認してね。'},403);
  const readQuestions=async()=>{const rows=await db.prepare("SELECT id,value FROM records WHERE id LIKE 'question-%'").all();return Object.fromEntries(rows.results.map((r:any)=>[r.id,JSON.parse(r.value)]))};
  if(req.method==='POST'){
   const body=await req.json() as any;
   if(body.action==='create'){
    const text=typeof body.text==='string'?body.text.trim():'';
    if(!text||text.length>180)return json({error:'質問を1〜180文字で書いてね。'},400);
    const id='custom-'+crypto.randomUUID(),record={id,text,by:user.name,createdAt:new Date().toISOString()};
    await db.prepare('INSERT INTO records(id,value) VALUES(?,?)').bind('question-item:'+id,JSON.stringify(record)).run();
    return json({questions:questionViews(await readQuestions(),user.name),createdId:id},201);
   }
   const records=await readQuestions();
   if(!getQuestionItems(records).some(q=>q.id===body.id)||typeof body.answer!=='string'||!body.answer.trim()||body.answer.trim().length>1000)return json({error:'質問を確認して、答えを1〜1000文字で書いてね。'},400);
   const record={name:user.name,answer:body.answer.trim(),createdAt:new Date().toISOString()};
   const result=await db.prepare('INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(answerKey(body.id,user.name),JSON.stringify(record)).run();
   if(result.meta?.changes===0)return json({error:'この質問には回答済みです。ページを更新してね。'},409);
  }else if(req.method!=='GET')return json({error:'Method not allowed'},405);
  return json({questions:questionViews(await readQuestions(),user.name)});
 }
 if(path[0]==='undo-todo'&&req.method==='POST'){
  const body=await req.json() as any;
  return undoTodoCompletion(db,body.id,user.name,body.photoId);
 }
 if(path[0]==='outings' && req.method==='POST'){
  const body=await req.json() as any;
  const title=typeof body.title==='string'?body.title.trim():'',place=typeof body.place==='string'?body.place.trim():'',note=typeof body.note==='string'?body.note.trim():'';
  if(!isDateDay(body.day)||body.day>tokyoDay()||!title||title.length>80||place.length>100||note.length>600)return json({error:'今日までの日付、80文字以内の内容、100文字以内の場所、600文字以内のメモで記録してね。'},400);
  if((body.place!==undefined&&typeof body.place!=='string')||(body.note!==undefined&&typeof body.note!=='string'))return json({error:'場所とメモを確認してね。'},400);
  let id:string,previous:any=null,planValue:string|null=null;
  if(body.id!==undefined){
   if(!isOutingId(body.id)||body.archivePlan)return json({error:'記録を確認してね。'},400);
   id=body.id;
   const stored=await db.prepare('SELECT value FROM records WHERE id=?').bind(id).first();
   if(!stored)return json({error:'記録が見つかりません。'},404);
   previous=JSON.parse(stored.value);
  }else if(body.archivePlan===true){
   if(!getDateDay(body.sourcePlan))return json({error:'移す予定を確認してね。'},400);
   const bytes=new TextEncoder().encode(JSON.stringify(body.sourcePlan));
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   id='outing:plan:'+hash;
   const existing=await db.prepare('SELECT value FROM records WHERE id=?').bind(id).first();
   if(existing)return json({id,record:JSON.parse(existing.value),clearedPlan:false});
   const current=await db.prepare('SELECT value FROM records WHERE id=?').bind('date').first();
   if(!current||JSON.stringify(JSON.parse(current.value))!==JSON.stringify(body.sourcePlan))return json({error:'予定が更新されています。ページを開き直してから、もう一度試してね。'},409);
   planValue=current.value;
  }else id='outing:'+crypto.randomUUID();
  const now=new Date().toISOString(),record={day:body.day,title,place,note,by:previous?.by||user.name,createdAt:previous?.createdAt||now,...(previous?{updatedAt:now,updatedBy:user.name}:{})};
  const statements=[db.prepare(body.archivePlan?'INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING':'INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(id,JSON.stringify(record))];
  if(planValue!==null)statements.push(db.prepare('DELETE FROM records WHERE id=? AND value=?').bind('date',planValue));
  const results=await db.batch(statements);
  const stored=await db.prepare('SELECT value FROM records WHERE id=?').bind(id).first();
  return json({id,record:JSON.parse(stored.value),clearedPlan:planValue!==null&&results[1]?.meta?.changes>0,sourcePlan:body.sourcePlan});
 }
 if(path[0]==='checkin' && req.method==='POST'){
  if(!checkinNames.includes(user.name))return json({error:'アカウントを確認してね。'},403);
  const body=await req.json() as any;
  if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>120))return json({error:'ひとことは120文字以内で書いてね。'},400);
  const date=tokyoDay(),id=checkinKey(date,user.name),record={date,name:user.name,note:(body.note||'').trim(),createdAt:new Date().toISOString()};
  await db.prepare('INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(id,JSON.stringify(record)).run();
  const stored=await db.prepare('SELECT value FROM records WHERE id=?').bind(id).first();
  return json({id,record:JSON.parse(stored.value)});
 }
 if(path[0]==='image' && path[1]){const o=await e.BUCKET.get(path[1]);return o?new Response(o.body,{headers:{'Content-Type':o.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=3600'}}):new Response('',{status:404})}
 if(path[0]==='todos' && req.method==='POST'){
  const body=await req.json() as any;
  const title=typeof body.title==='string'?body.title.trim():'';
  if(!title||title.length>80)return json({error:'やりたいことを80文字以内で書いてね。'},400);
  const id='custom-'+crypto.randomUUID(),item={id,title,createdAt:new Date().toISOString(),by:user.name};
  await db.prepare('INSERT INTO records(id,value) VALUES(?,?)').bind('todo-item:'+id,JSON.stringify(item)).run();
  return json({item},201);
 }
 if(path[0]==='todos' && req.method==='DELETE'){
  const body=await req.json() as any,rawId=String(body.id??'');
  let id:number|string;
  if(isCustomTodoId(rawId)){
   const item=await db.prepare('SELECT value FROM records WHERE id=?').bind('todo-item:'+rawId).first();
   if(!item)return json({error:'項目が見つかりません。'},404);
   id=rawId;
  }else{
   id=Number(rawId);
   if(!/^(0|[1-9]\d*)$/.test(rawId)||!Number.isInteger(id)||id<0||id>=defaultTodoTitles.length)return json({error:'項目が見つかりません。'},400);
  }
  const stored=await db.prepare('SELECT value FROM records WHERE id=?').bind('todo:'+id).first();
  if(stored&&JSON.parse(stored.value)?.done)return json({error:'できたことは記録として残しておこう。削除できるのは、これからの予定だけです。'},409);
  const key='todo-hidden:'+id,record={deletedAt:new Date().toISOString(),by:user.name};
  await db.prepare('INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(record)).run();
  return json({key,record});
 }
 if(path[0]==='complete-todo' && req.method==='POST'){
  const form=await req.formData(),rawId=String(form.get('id')??''),file=form.get('file'),date=String(form.get('date')??'');
  let id:number|string,title:string;
  if(isCustomTodoId(rawId)){
   const stored=await db.prepare('SELECT value FROM records WHERE id=?').bind('todo-item:'+rawId).first();
   const item=stored?JSON.parse(stored.value):null;
   if(item?.id!==rawId||typeof item.title!=='string'||!item.title.trim())return json({error:'項目が見つかりません。'},404);
   id=rawId;title=item.title;
  }else{
   id=Number(rawId);
   if(!/^(0|[1-9]\d*)$/.test(rawId)||!Number.isInteger(id)||id<0||id>=defaultTodoTitles.length)return json({error:'項目が見つかりません。'},400);
   title=defaultTodoTitles[id];
  }
  if(await db.prepare('SELECT value FROM records WHERE id=?').bind('todo-hidden:'+id).first())return json({error:'この予定はリストから削除されています。'},404);
  if(!(file instanceof File)||file.size===0||file.size>10*1024*1024||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return json({error:'思い出の写真が必要です。10MB以下のJPEG・PNG・WebP・GIFを選んでね。'},400);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!title||title.length>100)return json({error:'日付と項目を確認してね。'},400);
  const photoId=crypto.randomUUID(), record={done:true,date,by:user.name,photoId}, photo={caption:title,date,by:user.name,todoId:id};
  await e.BUCKET.put(photoId,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
  try{
   await db.batch([
    db.prepare('INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('todo:'+id,JSON.stringify(record)),
    db.prepare('INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('photo:'+photoId,JSON.stringify(photo))
   ]);
  }catch(error){await e.BUCKET.delete(photoId);throw error}
  return json({todoId:id,record,photoId,photo});
 }
 if(path[0]==='records'){
  if(req.method==='GET'){const rows=await db.prepare('SELECT id,value FROM records').all();return json(visibleAlbumRecords(Object.fromEntries(rows.results.filter((r:any)=>!r.id.startsWith('question-answer:')&&!r.id.startsWith('question-item:')).map((r:any)=>[r.id,JSON.parse(r.value)]))))}
  const b=await req.json() as any;if(typeof b.id!=='string'||b.id.length>100)return json({error:'Invalid'},400);
  if(b.id.startsWith('question-answer:')||b.id.startsWith('question-item:'))return json({error:'質問のページから回答してね。'},403);
  if(b.id.startsWith('checkin:'))return json({error:'チェックインは今日のページから残してね。'},400);
  if(b.id.startsWith('outing:'))return json({error:'おでかけの記録ページから編集してね。'},400);
  if(req.method==='DELETE'){
   if(b.id.startsWith('photo:')){
    const stored=await db.prepare('SELECT value FROM records WHERE id=?').bind(b.id).first();
    const photo=stored?JSON.parse(stored.value):null;
    if(Number.isInteger(photo?.todoId)||isCustomTodoId(photo?.todoId)){
     const linked=await db.prepare('SELECT value FROM records WHERE id=?').bind('todo:'+photo.todoId).first();
     const todo=linked?JSON.parse(linked.value):null;
     if(todo?.done&&todo.photoId===b.id.slice(6))return json({error:'この写真は「できた！」の思い出です。先に完了を取り消してね。'},400);
    }
    await e.BUCKET.delete(b.id.slice(6));
   }
   await db.prepare('DELETE FROM records WHERE id=?').bind(b.id).run()
  }
  else {
   if(b.id.startsWith('todo:')&&b.value?.done)return json({error:'写真を添えて「できた！」を残してね。'},400);
   if(b.id.startsWith('todo:')&&b.value?.done===false)return undoTodoCompletion(db,b.id.slice(5),user.name,b.value.photoId);
   await db.prepare('INSERT INTO records(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(b.id,JSON.stringify(b.value)).run();
  }return json({ok:true});
 }
 return json({error:'Not found'},404);
}
export const GET=handle;export const POST=handle;export const DELETE=handle;
