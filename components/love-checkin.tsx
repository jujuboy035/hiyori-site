'use client';

import { useEffect, useState } from 'react';
import { checkinKey, checkinNames, getCheckins, tokyoDay } from '@/lib/checkins';

export default function LoveCheckin({user,data,onSaved}:{user:string,data:Record<string,any>,onSaved:(result:any)=>void}) {
  const [now,setNow]=useState(()=>new Date());
  const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[limit,setLimit]=useState(14);
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(id)},[]);
  const today=tokyoDay(now),history=getCheckins(data),mine=history.find(x=>x.date===today&&x.name===user);
  const todayRecords=history.filter(x=>x.date===today),bothToday=todayRecords.length===2;
  const days=[...new Set(history.map(x=>x.date))];
  const mineCount=history.filter(x=>x.name===user).length;
  const togetherCount=days.filter(date=>history.filter(x=>x.date===date).length===2).length;

  async function checkIn() {
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:note.trim()})});
      const result:any=await response.json();
      if(!response.ok)throw Error(result.error||'保存できませんでした。もう一度試してね。');
      onSaved(result);setNow(new Date());setNote('');
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <section className="page-section love-page">
    <span className="eyebrow">A LITTLE HELLO</span>
    <h1>今日、ふと<br/>思い出した。</h1>
    <p>ちょっと話したいこと、見つけたときに。</p>
    <div className="love-postcard">
      <time className="love-today" dateTime={today}>{now.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'long'})}</time>
      <div className={'love-illustration'+(mine?' is-stamped':'')} aria-hidden="true"><span>🐻</span><span className="love-big-heart">☀</span><span>🐰</span></div>
      <h2>{bothToday?'今日は、ふたりとも。':mine?'今日のひとこと、残したよ。':'ふと思い出したら、気軽に。'}</h2>
      <p>{bothToday?'なんだか、タイミングが一緒だったね。':mine?'面白いことや、ちょっとした近況でも。':'ひとことなくても、タップするだけで。'}</p>
      {!mine&&<label className="love-note-label">ひとこと添える <small>（任意）</small><textarea rows={2} maxLength={120} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="このお店、なんか好きそうだなと思った。"/></label>}
      <button type="button" className={'primary love-checkin-button'+(mine?' is-checked':'')} disabled={busy||!!mine} onClick={()=>{void checkIn()}}>{busy?'記録しています…':mine?'✓ 今日のチェックイン済み':'☀ 今日、ちょっと思い出した'}</button>
      <small className="love-once">日本時間で、ひとり1日1回。</small>
      {error&&<p role="alert" className="error">{error}</p>}
      <p role="status" className="sr-only">{mine?'今日のチェックインを記録しました。':''}</p>
    </div>

    <div className="section-heading"><div><span className="eyebrow">TODAY'S LITTLE HELLOS</span><h2>今日のチェックイン</h2></div></div>
    <div className="love-today-grid">{checkinNames.map((name,i)=>{
      const record=data[checkinKey(today,name)];
      return <article key={name} className={'love-person'+(record?' has-heart':'')}><span className="love-avatar" aria-hidden="true">{i?'🐰':'🐻'}</span><h3>{name}</h3><span className="love-person-status">{record?'☀ チェックイン済み':'○ まだこれから'}</span>{record?.note&&<p className="love-person-note">{record.note}</p>}</article>
    })}</div>

    <div className="love-stats"><div><strong>{mineCount}</strong><span>チェックインした日</span></div><span className="love-stats-heart" aria-hidden="true">✿</span><div><strong>{togetherCount}</strong><span>同じ日にチェックイン</span></div></div>
    <div className="section-heading"><div><span className="eyebrow">LITTLE NOTES</span><h2>ひとことの記録</h2></div></div>
    {days.length===0?<div className="love-history-empty"><span aria-hidden="true">✿</span><p>何か見て、ふと思い出したら。<br/>気軽にひとこと残してみよう。</p></div>:<div className="love-history">{days.slice(0,limit).map(date=><article key={date} className="love-history-day"><time dateTime={date}>{date.replaceAll('-','.')} {date===today&&<small>今日</small>}</time><div>{checkinNames.map((name,i)=>{
      const record=data[checkinKey(date,name)];
      return <div key={name} className={'love-history-person'+(record?' recorded':'')}><span aria-hidden="true">{i?'🐰':'🐻'}</span><div><b>{name}</b><p>{record?(record.note||'今日、ちょっと思い出した。'):'この日のチェックインはありません'}</p></div><span className="history-heart" aria-label={record?'チェックイン済み':'記録なし'}>{record?'☀':'○'}</span></div>
    })}</div></article>)}</div>}
    {days.length>limit&&<button className="love-load-more" onClick={()=>setLimit(limit+14)}>もっと前の記録を見る ↓</button>}
  </section>;
}
