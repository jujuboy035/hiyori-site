'use client';

import {useLayoutEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {lockPageScroll} from '@/lib/modal-scroll-lock';

export default function ModalFrame({children}:{children:ReactNode}) {
  const overlay=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const previous=document.activeElement;
    const release=lockPageScroll();
    let frame=0;
    function updateViewport(){
      const view=window.visualViewport,node=overlay.current;
      if(!view||!node)return;
      node.style.setProperty('--modal-viewport-height',`${view.height}px`);
      node.style.setProperty('height',`${view.height}px`);
      node.style.setProperty('top',`${view.offsetTop}px`);
      node.style.setProperty('left',`${view.offsetLeft}px`);
      node.style.setProperty('width',`${view.width}px`);
    }
    function scheduleUpdate(){cancelAnimationFrame(frame);frame=requestAnimationFrame(updateViewport)}
    updateViewport();
    // Start on the close control instead of triggering a mobile keyboard or file picker.
    overlay.current?.querySelector<HTMLButtonElement>('.close')?.focus({preventScroll:true});
    window.visualViewport?.addEventListener('resize',scheduleUpdate);
    window.visualViewport?.addEventListener('scroll',scheduleUpdate);
    window.addEventListener('resize',scheduleUpdate);
    return()=>{
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize',scheduleUpdate);
      window.visualViewport?.removeEventListener('scroll',scheduleUpdate);
      window.removeEventListener('resize',scheduleUpdate);
      release();
      if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});
    };
  },[]);
  if(typeof document==='undefined')return null;
  return createPortal(<div ref={overlay} className="overlay modal-frame">{children}</div>,document.body);
}
