'use client';

import { useEffect, useState } from 'react';
import type { TodoId } from '@/lib/todo-items';
import ModalFrame from '@/components/modal-frame';

type Props = {
  id: TodoId;
  title: string;
  record: any;
  onClose: () => void;
  onSaved: (result: any) => void;
  onUndo: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function TodoCompletionDialog({ id, title, record, onClose, onSaved, onUndo, onDelete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const complete = !!record?.done && !!record?.photoId;
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);


  return <ModalFrame><section className="modal" role="dialog" aria-modal="true" aria-labelledby="todo-dialog-title">
    <button type="button" className="close" aria-label="閉じる" disabled={busy} onClick={onClose}>×</button>
    <span className="eyebrow">{complete ? 'OUR LITTLE MEMORY' : 'A NEW LITTLE MEMORY'}</span>
    <h2 id="todo-dialog-title">{title}</h2>
    {complete ? <>
      <img className="full-photo" src={'/api/image/' + record.photoId} alt={title + 'の思い出'}/>
      <p>{record.date}　✿ できた！</p>
      <p className="todo-undo-note">完了を取り消すと、このカードの写真も表示されなくなります。</p>
      <button type="button" className="delete" disabled={busy} onClick={async () => {
        setBusy(true); setError('');
        try { await onUndo(); onClose(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
      }}>完了を取り消す</button>
    </> : <form onSubmit={async e => {
      e.preventDefault();
      if (!file) { setError('思い出の写真を1枚選んでね。'); return; }
      const body = new FormData(e.currentTarget);
      body.set('file', file); body.set('id', String(id)); body.set('title', title);
      setBusy(true); setError('');
      try {
        const response = await fetch('/api/complete-todo', { method: 'POST', body });
        const result: any = await response.json();
        if (!response.ok) throw Error(result.error || '保存できませんでした。もう一度試してね。');
        onSaved(result); onClose();
      } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    }}>
      <p>写真を1枚添えて、楽しかったことを残そう。<br/>写真は、このカードからいつでも見られるよ。</p>
      <label>思い出の写真（必須）<input required disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => {
        const selected = e.target.files?.[0] ?? null;
        if (selected && (selected.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(selected.type))) {
          setFile(null); e.target.value = ''; setError('10MB以下のJPEG・PNG・WebP・GIFを選んでね。');
        } else { setFile(selected); setError(''); }
      }}/></label>
      <small>JPEG・PNG・WebP・GIF ／ 10MBまで</small>
      {preview && <img className="completion-preview" src={preview} alt="選んだ思い出の写真"/>}
      <label>できた日<input required disabled={busy} name="date" type="date" defaultValue={record?.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })}/></label>
      <button className="primary" disabled={busy || !file}>{busy ? '写真と思い出を保存中…' : '写真を添えて「できた！」 ✿'}</button>
    </form>}
    {!record?.done && <button type="button" className="delete todo-delete-button" disabled={busy} onClick={async()=>{
      setBusy(true);setError('');
      try{await onDelete();onClose()}catch(e:any){setError(e.message)}finally{setBusy(false)}
    }}>この予定をリストから削除</button>}
    {error && <p role="alert" className="error">{error}</p>}
  </section></ModalFrame>;
}
