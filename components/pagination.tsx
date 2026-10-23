'use client';
export default function Pagination({page,pageCount,total,start,end,onChange,disabled=false}:{page:number;pageCount:number;total:number;start:number;end:number;onChange:(page:number)=>void;disabled?:boolean}){
 if(pageCount<=1)return null;
 return <div className="pagination" role="group" aria-label="ページ切り替え"><p aria-live="polite">{total}件中 {start+1}〜{end}件</p><div><button disabled={disabled||page===1} onClick={()=>onChange(page-1)}>← 前へ</button><span aria-live="polite">{page} / {pageCount}</span><button disabled={disabled||page===pageCount} onClick={()=>onChange(page+1)}>次へ →</button></div></div>
}
