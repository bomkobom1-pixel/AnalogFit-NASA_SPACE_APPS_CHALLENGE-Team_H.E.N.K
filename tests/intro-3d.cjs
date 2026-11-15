/* Real WebGL entrance: camera motion, lifecycle, accessibility and offline use. */
const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('url'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts'),url=pathToFileURL(path.join(root,'index.html')).href;
const check=(v,m)=>{if(!v)throw Error(m);};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__flightPhases=[];window.addEventListener('DOMContentLoaded',()=>{
    const screen=document.getElementById('bootScreen');
    new MutationObserver(()=>{const phase=screen.dataset.flightPhase;if(phase&&window.__flightPhases.at(-1)!==phase)window.__flightPhases.push(phase);}).observe(screen,{attributes:true,attributeFilter:['data-flight-phase']});
   });
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>AnalogFitIntro.state.active&&AnalogFitIntro.state.texture==='nasa');
  const first=await page.evaluate(()=>AnalogFitIntro.state);
  check(first.renderer==='webgl','Real 3D renderer did not initialize');
  await page.waitForTimeout(500);
  const moved=await page.evaluate(()=>AnalogFitIntro.state);
  check(JSON.stringify(first.camera)!==JSON.stringify(moved.camera),'Camera did not move in 3D');
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  const entered=await page.evaluate(()=>({intro:AnalogFitIntro.state,elapsed:Number(document.body.dataset.introElapsed),transition:document.body.dataset.entryTransition,phases:window.__flightPhases}));
  check(entered.elapsed>=4900,'Introduction ended before five seconds');
  check(entered.transition==='3d','3D workspace reveal missing');
  check(!entered.intro.active&&entered.intro.frames>10,'Renderer failed to stop or animate');
  check(['moon','mars','arrival'].every(p=>entered.phases.includes(p)),'A camera phase was skipped');
  await page.locator('#bootScreen').waitFor({state:'hidden'});
  const count=await page.evaluate(()=>AnalogFitIntro.state.frames);await page.waitForTimeout(250);
  check(await page.evaluate(()=>AnalogFitIntro.state.frames)===count,'Hidden intro kept rendering');
  // Replay and Skip use real gestures; avoid a screenshot consuming the skip window.
  await page.locator('#btnSettings').click();await page.locator('#replayIntro').click();
  await page.waitForFunction(()=>AnalogFitIntro.state.active);
  if(await page.locator('#bootScreen').isVisible())await page.locator('#skipIntro').click();
  await page.locator('#bootScreen').waitFor({state:'hidden'});
  check(await page.evaluate(()=>!AnalogFitIntro.state.active&&document.body.dataset.entryTransition==='none'),'Skip did not stop the cinematic');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#btnSettings').click();await page.locator('#replayIntro').click();
  check(await page.evaluate(()=>document.querySelector('#intro3d').getBoundingClientRect().width===innerWidth),'Mobile 3D canvas did not fit');
  await page.waitForTimeout(350);await page.screenshot({path:path.join(out,'intro-3d-mobile.png')});
  await page.locator('#skipIntro').click();await page.locator('#bootScreen').waitFor({state:'hidden'});
  const reduced=await browser.newContext({offline:true,reducedMotion:'reduce',viewport:{width:390,height:844}}),quiet=await reduced.newPage();
  await reduced.addInitScript(()=>localStorage.setItem('analogfit.preferences.v2',JSON.stringify({motion:false})));
  quiet.on('pageerror',e=>errors.push(e.message));await quiet.goto(url);
  const staticA=await quiet.evaluate(()=>AnalogFitIntro.state);await quiet.waitForTimeout(250);
  const staticB=await quiet.evaluate(()=>AnalogFitIntro.state);
  check(JSON.stringify(staticA.camera)===JSON.stringify(staticB.camera),'Disabled-motion camera moved');
  await quiet.waitForFunction(()=>document.body.dataset.boot==='ready');
  check(await quiet.evaluate(()=>document.body.dataset.entryTransition==='none'),'Reduced motion ignored at entry');await reduced.close();
  const fallbackContext=await browser.newContext({offline:true}),fallback=await fallbackContext.newPage();
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return this.id==='intro3d'&&type==='webgl'?null:original.call(this,type,...args);};});
  fallback.on('pageerror',e=>errors.push(e.message));await fallback.goto(url);
  await fallback.waitForFunction(()=>document.body.dataset.boot==='ready');
  check(await fallback.evaluate(()=>AnalogFitIntro.state.renderer)==='fallback','Missing WebGL did not fall back');await fallbackContext.close();
  check(errors.length===0,errors.join('\n'));
  const report={realWebGL:true,cameraMoved:true,nasaEarthTexture:true,phases:entered.phases,introElapsedMs:entered.elapsed,renderedFrames:entered.intro.frames,
   perspectiveEntry:true,rendererStopsAfterEntry:true,replayAndSkip:true,mobile:true,motionSettingRespected:true,noWebGLFallback:true,offline:true,pageErrors:errors};
  fs.writeFileSync(path.join(out,'intro-3d-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
