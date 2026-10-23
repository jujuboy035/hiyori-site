'use client';

import { useState } from 'react';
import ModalFrame from '@/components/modal-frame';

export default function AddTodoDialog({onClose,onAdded}:{onClose:()=>void,onAdded:(result:any)=>void}) {
  const [title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <ModalFrame><section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-todo-title">
    <button type="button" className="close" disabled={busy} aria-label="閉じる" onClick={onClose}>×</button>
    <span className="eyebrow">ANOTHER LITTLE WISH</span>
    <h2 id="add-todo-title">一緒にやりたいことを追加</h2>
    <p>行ってみたい場所や、やってみたいことを自由に。</p>
    <form onSubmit={async e=>{
      e.preventDefault();if(!title.trim())return;setBusy(true);setError('');
      try{
        const response=await fetch('/api/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim()})});
        const result:any=await response.json();
        if(!response.ok)throw Error(result.error||'追加できませんでした。もう一度試してね。');
        onAdded(result);onClose();
      }catch(e:any){setError(e.message)}finally{setBusy(false)}
    }}>
      <label>なにをしたい？<input required maxLength={80} disabled={busy} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：ふたりで富士山の朝日を見る"/></label>
      <small>{title.length} / 80文字</small>
      {error&&<p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy||!title.trim()}>{busy?'追加しています…':'リストに追加する ✿'}</button>
    </form>
  </section></ModalFrame>;
}
