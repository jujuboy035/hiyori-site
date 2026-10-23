'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import type { PointerEvent, KeyboardEvent } from 'react';
import { completedFirst, moveTodo, normalizeTodoOrder } from '@/lib/todo-order';
import {paginate} from '@/lib/pagination';
import Pagination from '@/components/pagination';
import type { TodoId, TodoItem } from '@/lib/todo-items';

type Props = {
  items: TodoItem[];
  data: Record<string, any>;
  busy: boolean;
  filter?: string;
  focusId?: TodoId|null;
  onToggle: (id: TodoId) => void;
  onReorder: (order: TodoId[]) => Promise<void>;
};
type Drag = { id: TodoId; done: boolean; pointer: number; x: number; y: number; offsetX:number; offsetY:number; order: TodoId[]; original: TodoId[] };
type DragView={id:TodoId;width:number;height:number;left:number;top:number};

export default function TodoGrid({ items, data, busy, onToggle, onReorder, filter = 'yet', focusId }: Props) {
  const [page,setPage]=useState(1);
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const frame = useRef<number | null>(null);
  const floating=useRef<HTMLDivElement>(null);
  const previousPositions=useRef(new Map<string,{x:number;y:number}>());
  const [dragView,setDragView]=useState<DragView|null>(null);
  const [preview, setPreview] = useState<TodoId[] | null>(null);
  const [active, setActive] = useState<TodoId | null>(null);
  const [saving, setSaving] = useState(false);
  const itemMap = new Map(items.map(item => [item.id, item]));
  const order = preview ?? completedFirst(normalizeTodoOrder(data['todo-order'], items.map(item => item.id)), data);
  const visibleOrder = order.filter(id => filter === 'done' ? !!data['todo:' + id]?.done : filter === 'yet' ? !data['todo:' + id]?.done : true);
  const paging=paginate(visibleOrder,page);
  useEffect(()=>{if(focusId===undefined||focusId===null)return;const index=visibleOrder.indexOf(focusId);if(index>=0)setPage(Math.floor(index/12)+1)},[focusId]);
  const canReorder = !busy && !saving;

  useLayoutEffect(()=>{
    const next=new Map<string,{x:number;y:number}>();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    grid.current?.querySelectorAll<HTMLElement>('[data-todo-id]').forEach(tile=>{
      const id=tile.dataset.todoId!,position={x:tile.offsetLeft,y:tile.offsetTop},previous=previousPositions.current.get(id);
      next.set(id,position);
      if(active!==null&&String(active)!==id&&previous&&!reduced&&typeof tile.animate==='function'){
        const x=previous.x-position.x,y=previous.y-position.y;
        if(x||y){tile.getAnimations().forEach(animation=>animation.cancel());tile.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:160,easing:'ease-out'})}
      }
    });
    previousPositions.current=next;
  },[preview,active,items,filter,paging.page]);

  function stopFrame() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }
  useEffect(() => () => { stopFrame(); drag.current = null; }, []);

  function track() {
    const d = drag.current, root = grid.current;
    if (!d || !root) return;
    if(floating.current)floating.current.style.transform=`translate3d(${d.x-d.offsetX}px,${d.y-d.offsetY-14}px,0) scale(1.06) rotate(-2deg)`;
    const edge = 110;
    const speed = d.y < edge ? -Math.min(14, (edge - d.y) / 6) : d.y > window.innerHeight - edge ? Math.min(14, (d.y - window.innerHeight + edge) / 6) : 0;
    if (speed) window.scrollBy(0, speed);
    // Use the slots' layout positions so sliding animations cannot change the drop target.
    const bounds=root.getBoundingClientRect();
    const tile=Array.from(root.querySelectorAll<HTMLElement>('[data-todo-id]')).find(node=>{
      const left=bounds.left+node.offsetLeft,top=bounds.top+node.offsetTop;
      return d.x>=left&&d.x<=left+node.offsetWidth&&d.y>=top&&d.y<=top+node.offsetHeight;
    });
    if (tile) {
      const target = items.find(item => String(item.id) === tile.dataset.todoId)?.id;
      const next = target !== undefined && !!data['todo:' + target]?.done === d.done ? moveTodo(d.order, d.id, target) : d.order;
      if (next !== d.order) { d.order = next; setPreview(next); }
    }
    frame.current = requestAnimationFrame(track);
  }

  function begin(e: PointerEvent<HTMLButtonElement>, id: TodoId) {
    if (!canReorder || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || !grid.current) return;
    e.preventDefault();
    const tile=e.currentTarget.closest<HTMLElement>('[data-todo-id]');
    if(!tile)return;
    const rect=tile.getBoundingClientRect();
    grid.current.setPointerCapture(e.pointerId);
    drag.current = { id, done: !!data['todo:' + id]?.done, pointer: e.pointerId, x: e.clientX, y: e.clientY, offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,order: [...order], original: [...order] };
    setDragView({id,width:rect.width,height:rect.height,left:rect.left,top:rect.top-14});
    setPreview([...order]); setActive(id);
    frame.current = requestAnimationFrame(track);
  }

  async function finish(e: PointerEvent<HTMLDivElement>, cancelled = false) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null; stopFrame(); setActive(null);setDragView(null);
    if (grid.current?.hasPointerCapture(e.pointerId)) grid.current.releasePointerCapture(e.pointerId);
    if (!cancelled && d.order.some((id, i) => id !== d.original[i])) {
      setSaving(true);
      try { await onReorder(d.order); } finally { setSaving(false); setPreview(null); }
    } else setPreview(null);
  }

  async function keyboardMove(e: KeyboardEvent<HTMLButtonElement>, id: TodoId) {
    if (!canReorder) return;
    const columns = grid.current ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length : 3;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (!(e.key in step)) return;
    e.preventDefault();
    const visible = paging.items.filter(item => !!data['todo:' + item]?.done === !!data['todo:' + id]?.done);
    const target = visible[visible.indexOf(id) + step[e.key]];
    if (target === undefined) return;
    const next = moveTodo(order, id, target);
    setPreview(next); setSaving(true);
    try { await onReorder(next); } finally { setSaving(false); setPreview(null); }
  }

  return <>
    <p className="grid-hint">⠿ をドラッグして、このページの中で並べ替え。</p>
    <p className="sr-only" id="reorder-help">並べ替えボタンを指でドラッグ、またはキーボードの矢印キーで移動できます。</p>
    <div ref={grid} className={'todo-grid'+(active!==null?' is-sorting':'')} aria-label="一緒にやりたいこと" aria-busy={saving}
      onPointerMove={e => { if (drag.current?.pointer === e.pointerId) { drag.current.x = e.clientX; drag.current.y = e.clientY; } }}
      onPointerUp={e => { void finish(e); }} onPointerCancel={e => { void finish(e, true); }}
      onLostPointerCapture={e => { if (drag.current) void finish(e, true); }}>
      {paging.items.map((id, index) => {
        const title = itemMap.get(id)?.title;
        if(!title)return null;
        const record = data['todo:' + id], done = !!record?.done;
        const firstInGroup = index === 0 || !!data['todo:' + paging.items[index - 1]]?.done !== done;
        return <Fragment key={id}>{firstInGroup && <h2 className="todo-group-title">{done ? '✿ できたこと' : '✿ これからやりたいこと'}</h2>}<article data-todo-id={id} className={'todo-cell' + (done ? ' is-done' : '') + (active === id ? ' is-drop-slot' : '')}>
          <button type="button" className="todo-drag-handle" disabled={!canReorder}
            aria-label={title + 'の順番を変える'} aria-describedby="reorder-help"
            onPointerDown={e => begin(e, id)} onKeyDown={e => { void keyboardMove(e, id); }}><span aria-hidden="true">⠿</span></button>
          <button type="button" className="todo-cell-toggle" aria-pressed={done} aria-label={`${title}：${done ? 'できた' : 'これから'}`}
            disabled={busy || saving || active !== null} onClick={() => onToggle(id)}>
            <span className="todo-cell-top"><span className="todo-mark" aria-hidden="true">{done ? '✓' : '○'}</span></span>
            {done && record.photoId && <img className="todo-memory-photo" src={'/api/image/' + record.photoId} alt={title + 'の思い出'} loading="lazy"/>}
            <span className="todo-title">{title}</span>
            <span className="todo-status">{done ? 'できた！' : '写真を添えて「できた！」'}</span>
            {done && <time className="todo-date" dateTime={record.date}>{record.date}</time>}
          </button>
        </article></Fragment>;
      })}
    </div>
    {!visibleOrder.length&&<p className="collection-empty">{filter==='done'?'できたことは、これから少しずつ。':'これからの予定はありません。やりたいことを追加してみよう。'}</p>}
    <Pagination {...paging} disabled={active!==null||saving||busy} onChange={next=>{setPage(next);grid.current?.scrollIntoView({block:'start'})}}/>
    {dragView&&typeof document!=='undefined'&&createPortal(<>
      <div ref={floating} className={'todo-cell todo-drag-preview'+(data['todo:'+dragView.id]?.done?' is-done':'')} aria-hidden="true" style={{width:dragView.width,minHeight:dragView.height,transform:`translate3d(${dragView.left}px,${dragView.top}px,0) scale(1.06) rotate(-2deg)`}}>
        <span className="todo-floating-handle">⠿</span>
        <span className="todo-drag-preview-content">
          <span className="todo-cell-top"><span className="todo-mark">{data['todo:'+dragView.id]?.done?'✓':'○'}</span></span>
          {data['todo:'+dragView.id]?.done&&data['todo:'+dragView.id]?.photoId&&<img className="todo-memory-photo" src={'/api/image/'+data['todo:'+dragView.id].photoId} alt=""/>}
          <span className="todo-title">{itemMap.get(dragView.id)?.title}</span><span className="todo-floating-label">移動中</span>
        </span>
      </div>
      <div className="todo-drag-notice" aria-hidden="true"><span>⠿</span> 点線のマスへ移動 · 指をはなして決定</div>
    </>,document.body)}
    <p role="status" className="grid-save-status">{active !== null ? 'カードを移動中。点線のマスが移動先です。' : saving ? '順番を保存しています…' : ''}</p>
  </>;
}
