import {defaultTodoTitles,isCustomTodoId} from './todo-items';

function linkedTodoId(value:unknown):number|string|null {
  if(isCustomTodoId(value))return value;
  const number=typeof value==='number'?value:typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value)?Number(value):-1;
  return Number.isInteger(number)&&number>=0&&number<defaultTodoTitles.length?number:null;
}

export function isVisibleAlbumPhoto(key:string,photo:any,data:Record<string,any>):boolean {
  if(!key.startsWith('photo:')||!photo||photo.cancelled)return false;
  const todoId=linkedTodoId(photo.todoId);
  if(todoId===null)return true;
  const todo=data['todo:'+todoId];
  return !data['todo-hidden:'+todoId]&&!!todo?.done&&todo.photoId===key.slice(6);
}

export function getAlbumPhotos(data:Record<string,any>):[string,any][] {
  return Object.entries(data).filter(([key,photo])=>isVisibleAlbumPhoto(key,photo,data)).sort((a,b)=>String(b[1].date||'').localeCompare(String(a[1].date||'')));
}

export function visibleAlbumRecords(data:Record<string,any>):Record<string,any> {
  return Object.fromEntries(Object.entries(data).filter(([key,value])=>!key.startsWith('photo:')||isVisibleAlbumPhoto(key,value,data)));
}
