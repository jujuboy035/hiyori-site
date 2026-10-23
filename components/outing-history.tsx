'use client';

import { useState } from 'react';
import ModalFrame from '@/components/modal-frame';
import { getDateDay } from '@/lib/dates';
import { tokyoDay } from '@/lib/checkins';
import { getOutings } from '@/lib/outings';
import type {OutingEntry} from '@/lib/outings';

type Draft={id?:string;day:string;title:string;place:string;note:string;sourcePlan?:any};

export default function OutingHistory({data,onSaved}:{data:Record<string,any>;onSaved:(result:any)=>void}) {
  const [draft,setDraft]=useState<Draft|null>(null),[limit,setLimit]=useState(3);
  const entries=getOutings(data),plan=data.date,planDay=getDateDay(plan),today=tokyoDay();
  function add(){setDraft({day:today,title:'',place:'',note:''})}
  function fromPlan(){setDraft({day:planDay,title:plan.title||'',place:plan.place||'',note:'',sourcePlan:plan})}
  function edit(entry:OutingEntry){setDraft({id:entry.id,day:entry.day,title:entry.title,place:entry.place||'',note:entry.note||''})}
  return <section className="outing-history" aria-labelledby="outing-history-title">
    {planDay&&planDay<=today&&<button type="button" className="outing-finish-plan" onClick={fromPlan}>✎ このおでかけを、記録に残す</button>}
    <div className="section-heading"><div><span className="eyebrow">OUTING NOTES</span><h2 id="outing-history-title">おでかけの記録</h2></div><button type="button" onClick={add}>＋ 記録を追加</button></div>
    {entries.length===0?<button type="button" className="outing-empty" onClick={add}><span aria-hidden="true">✎</span><b>楽しかった日を、ひとつずつ。</b><small>日付や行った場所、ちょっとしたメモを残そう。</small></button>:<>
      <p className="outing-count">これまでに {entries.length} 回のおでかけ。</p>
      <div className="outing-timeline">{entries.slice(0,limit).map(entry=><article className="outing-entry" key={entry.id}>
        <div className="outing-entry-top"><time dateTime={entry.day}>{new Date(entry.day+'T00:00:00+09:00').toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'short',day:'numeric',weekday:'short'})}</time><button type="button" aria-label={entry.title+'の記録を編集'} onClick={()=>edit(entry)}>✎ 編集</button></div>
        <h3>{entry.title}</h3>{entry.place&&<p className="outing-place">⌖ {entry.place}</p>}{entry.note&&<p className="outing-note">{entry.note}</p>}<small className="outing-by">{entry.by} が記録</small>
      </article>)}</div>
      {entries.length>limit&&<button type="button" className="outing-more" onClick={()=>setLimit(limit+10)}>もっと前の記録を見る ↓</button>}
    </>}
    {draft&&<OutingDialog draft={draft} onClose={()=>setDraft(null)} onSaved={onSaved}/>}
  </section>;
}

function OutingDialog({draft,onClose,onSaved}:{draft:Draft;onClose:()=>void;onSaved:(result:any)=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <ModalFrame><section className="modal outing-dialog" role="dialog" aria-modal="true" aria-labelledby="outing-dialog-title">
    <button type="button" className="close" aria-label="閉じる" disabled={busy} onClick={onClose}>×</button>
    <span className="eyebrow">A DAY TO REMEMBER</span><h2 id="outing-dialog-title">{draft.id?'おでかけの記録を編集':'おでかけの記録を残す'}</h2>
    <p>{draft.sourcePlan?'保存すると、この予定は「次のおでかけ」から記録に移るよ。':'行った場所や、覚えておきたいことを気軽に。'}</p>
    <form onSubmit={async e=>{
      e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setError('');
      try{
        const body={id:draft.id,day:form.get('day'),title:form.get('title'),place:form.get('place'),note:form.get('note'),archivePlan:!!draft.sourcePlan,sourcePlan:draft.sourcePlan};
        const response=await fetch('/api/outings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const result:any=await response.json();if(!response.ok)throw Error(result.error||'保存できませんでした。もう一度試してね。');
        onSaved(result);onClose();
      }catch(e:any){setError(e.message)}finally{setBusy(false)}
    }}>
      <label>日付（日本時間）<input required disabled={busy} name="day" type="date" max={tokyoDay()} defaultValue={draft.day}/></label>
      <label>なにをした？<input required disabled={busy} name="title" maxLength={80} defaultValue={draft.title} placeholder="カフェと、のんびり散歩"/></label>
      <label>場所 <small>（任意）</small><input disabled={busy} name="place" maxLength={100} defaultValue={draft.place} placeholder="お店や、おでかけした場所"/></label>
      <label>ひとことメモ <small>（任意）</small><textarea disabled={busy} name="note" rows={4} maxLength={600} defaultValue={draft.note} placeholder="楽しかったこと、また行きたい場所など。"/></label>
      {error&&<p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?'保存しています…':'記録を保存する ✿'}</button>
    </form>
  </section></ModalFrame>;
}
