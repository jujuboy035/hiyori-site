export const PAGE_SIZE=12;
export function paginate<T>(items:T[],requestedPage:number,pageSize=PAGE_SIZE){
 const pageCount=Math.max(1,Math.ceil(items.length/pageSize));
 const page=Math.min(pageCount,Math.max(1,Math.floor(requestedPage)||1));
 const start=(page-1)*pageSize;
 return {page,pageCount,total:items.length,start,end:Math.min(start+pageSize,items.length),items:items.slice(start,start+pageSize)};
}
