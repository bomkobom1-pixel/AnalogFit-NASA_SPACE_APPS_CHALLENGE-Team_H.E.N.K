/* Large map workspace and native fullscreen, with a file/mobile fallback. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),box=$('workspace');
 let focused=false,controls=false,previousFocus=null;
 const en=()=>window.analogfit?.state.lang==='en';
 function labels(){
  $('mapFocusLabel').textContent=focused?(en()?'Exit expanded map':'Tutup peta besar'):(en()?'Expand map':'Perbesar peta');
  $('btnMapFocus').setAttribute('aria-pressed',String(focused));
  $('btnMapControls').textContent=en()?'Parameters & sites':'Parameter & lokasi';
  $('btnMapControls').setAttribute('aria-expanded',String(controls));
  const native=document.fullscreenElement===box;
  $('btnMapFullscreen').setAttribute('aria-pressed',String(native));
  $('btnMapFullscreen').title=native?(en()?'Exit fullscreen':'Keluar layar penuh'):(en()?'Fullscreen map':'Peta layar penuh');
  $('btnMapFullscreen').setAttribute('aria-label',$('btnMapFullscreen').title);
 }
 function setFocus(value){
  if(value===focused){labels();return;}
  if(value){previousFocus=document.activeElement;window.AnalogFitWorkspace.close();}
  focused=value;controls=false;
  box.classList.toggle('is-map-focus',value);box.classList.remove('show-map-controls');
  document.body.dataset.mapFocus=String(value);
  $('btnMapControls').hidden=!value;$('mapQuestion').hidden=!value;
  $('controls').inert=value;
  $('mapViewNotice').hidden=true;
  labels();
  if(value)$('btnMapFocus').focus({preventScroll:true});
  else (previousFocus?.isConnected?previousFocus:$('btnMapFocus')).focus({preventScroll:true});
  window.dispatchEvent(new Event('resize'));
 }
 async function exit(){
  if(document.fullscreenElement===box)await document.exitFullscreen().catch(()=>{});
  setFocus(false);
 }
 function toggleControls(){
  controls=!controls;box.classList.toggle('show-map-controls',controls);$('controls').inert=focused&&!controls;
  labels();if(controls)$('tabRanking').focus({preventScroll:true});
 }
 function updateQuestion(){
  labels();
  for(const [source,destination] of [['targetSel','mapTargetSel'],['taskSel','mapTaskSel']]){
   const from=$(source),to=$(destination);
   if(!to)continue;
   to.replaceChildren(...Array.from(from.options,o=>new Option(o.text,o.value)));
   to.value=from.value;
  }
 }
 const question=$('mapQuestion');
 for(const [id,source,label] of [['mapTargetSel','targetSel','TARGET'],['mapTaskSel','taskSel','TEST']]){
  const wrap=document.createElement('label'),text=document.createElement('span'),select=document.createElement('select');
  text.textContent=label;select.id=id;select.setAttribute('aria-label',label);
  select.onchange=()=>{$(source).value=select.value;$(source).dispatchEvent(new Event('change',{bubbles:true}));};
  wrap.append(text,select);question.append(wrap);
 }
 $('btnMapFocus').onclick=()=>focused?exit():setFocus(true);
 $('btnMapControls').onclick=toggleControls;
 $('openSiteRankings').addEventListener('click',()=>{
  if(focused){if(!controls)toggleControls();$('tabRanking').click();$('tabRanking').focus({preventScroll:true});}
 });
 $('btnMapFullscreen').onclick=async()=>{
  if(document.fullscreenElement===box){await exit();return;}
  setFocus(true);
  try{
   if(!box.requestFullscreen||!document.fullscreenEnabled)throw Error('unsupported');
   await box.requestFullscreen();labels();
  }catch(_){
   $('mapViewNotice').textContent=en()?'Browser fullscreen is unavailable. Expanded map is active.':'Layar penuh browser tidak tersedia. Peta besar tetap aktif.';
   $('mapViewNotice').hidden=false;
  }
 };
 document.addEventListener('fullscreenchange',()=>{
  if(document.fullscreenElement===box)setFocus(true);else if(focused)setFocus(false);
  labels();
 });
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog[open]')||!focused)return;
  event.preventDefault();if(controls)toggleControls();else exit();
 });
 window.addEventListener('analogfit:locationselected',()=>{
  if(focused&&controls){controls=false;box.classList.remove('show-map-controls');$('controls').inert=true;labels();}
 });
 window.addEventListener('analogfit:update',updateQuestion);
 document.addEventListener('DOMContentLoaded',updateQuestion);
 window.AnalogFitExplorer={expand:()=>setFocus(true),exit,get expanded(){return focused;}};
})();
