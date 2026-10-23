let lockCount=0;
let restorePage:(()=>void)|null=null;

function preserveStyles(style:CSSStyleDeclaration,names:string[]):()=>void {
  const values=names.map(name=>[name,style.getPropertyValue(name),style.getPropertyPriority(name)]);
  return()=>{for(const[name,value,priority]of values){if(value)style.setProperty(name,value,priority);else style.removeProperty(name)}};
}

export function lockPageScroll():()=>void {
  if(lockCount===0){
    const body=document.body,root=document.documentElement,x=window.scrollX,y=window.scrollY;
    const restoreBody=preserveStyles(body.style,['position','top','left','right','width','overflow','padding-right']);
    const restoreRoot=preserveStyles(root.style,['overflow','overscroll-behavior','scroll-behavior']);
    const scrollbar=Math.max(0,window.innerWidth-root.clientWidth);
    const padding=Number.parseFloat(getComputedStyle(body).paddingRight)||0;
    body.style.setProperty('position','fixed');
    body.style.setProperty('top',`-${y}px`);
    body.style.setProperty('left','0');
    body.style.setProperty('right','0');
    body.style.setProperty('width','100%');
    body.style.setProperty('overflow','hidden');
    if(scrollbar)body.style.setProperty('padding-right',`${padding+scrollbar}px`);
    root.style.setProperty('overflow','hidden');
    root.style.setProperty('overscroll-behavior','none');
    root.style.setProperty('scroll-behavior','auto');
    restorePage=()=>{
      restoreBody();
      // Restore the offset before restoring a site's smooth-scroll preference.
      const scrollBehavior=root.style.getPropertyValue('scroll-behavior');
      restoreRoot();
      const finalBehavior=root.style.getPropertyValue('scroll-behavior');
      const finalPriority=root.style.getPropertyPriority('scroll-behavior');
      root.style.setProperty('scroll-behavior',scrollBehavior||'auto');
      window.scrollTo(x,y);
      if(finalBehavior)root.style.setProperty('scroll-behavior',finalBehavior,finalPriority);else root.style.removeProperty('scroll-behavior');
    };
  }
  lockCount++;
  let released=false;
  return()=>{
    if(released)return;
    released=true;
    lockCount--;
    if(lockCount===0){restorePage?.();restorePage=null}
  };
}
