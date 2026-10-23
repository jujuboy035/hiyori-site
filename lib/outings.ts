export type OutingRecord = {day:string;title:string;place:string;note:string;by:string;createdAt:string;updatedAt?:string;updatedBy?:string};
export type OutingEntry = OutingRecord & {id:string};

export function isOutingId(value:unknown):value is string {
  return typeof value==='string' && /^outing:(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|plan:[0-9a-f]{64})$/.test(value);
}

export function getOutings(data:Record<string,any>):OutingEntry[] {
  return Object.entries(data).filter(([id,value])=>isOutingId(id)&&typeof value?.title==='string'&&typeof value?.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.day)).map(([id,value])=>({...value,id} as OutingEntry)).sort((a,b)=>b.day.localeCompare(a.day)||b.createdAt.localeCompare(a.createdAt));
}
