/* Run with node tests/audio-defaults.cjs after browser testing is available. */
const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('url'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..'),check=(value,message)=>{if(!value)throw Error(message);};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies']});
 try{
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');await page.locator('#bootScreen').waitFor({state:'hidden'});
  const initial=await page.evaluate(()=>AnalogFitAudio.state);
  check(initial.sfxEnabled&&initial.musicEnabled,'Sound and music should default to enabled');
  check(!initial.musicPlaying||initial.contextState==='running','Music started without a running audio context');
  const palette=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries(['bg','panel','panel-2','accent','cyan','amber','ink'].map(k=>[k,s.getPropertyValue('--'+k).trim()]));});
  check(JSON.stringify(Object.values(palette))===JSON.stringify(['#080d18','#111b2d','#1c2b45','#3b82f6','#8ec5ff','#d99a52','#f4f7fb']),'Supplied palette differs');
  await page.locator('#btnSettings').click();
  await page.waitForFunction(()=>AnalogFitAudio.state.musicPlaying&&AnalogFitAudio.energy()>0.00001);
  check(await page.locator('#toggleSfx').getAttribute('aria-pressed')==='true','SFX control disagrees');
  check(await page.locator('#toggleMusic').getAttribute('aria-pressed')==='true','Music control disagrees');
  await page.locator('#toggleMusic').click();await page.locator('#toggleSfx').click();
  check(await page.evaluate(()=>!AnalogFitAudio.state.musicPlaying&&!AnalogFitAudio.state.sfxEnabled),'Mute controls failed');
  await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');await page.locator('#bootScreen').waitFor({state:'hidden'});
  await page.locator('#btnSettings').click();
  check(await page.evaluate(()=>!AnalogFitAudio.state.musicEnabled&&!AnalogFitAudio.state.sfxEnabled&&AnalogFitAudio.state.contextState==='not-created'),'Saved mute preference ignored');
  await page.locator('#resetPreferences').click();
  await page.waitForFunction(()=>AnalogFitAudio.state.sfxEnabled&&AnalogFitAudio.state.musicEnabled&&AnalogFitAudio.state.musicPlaying);
  check(errors.length===0,errors.join('\n'));
  fs.writeFileSync(path.join(root,'test-artifacts/audio-defaults-report.json'),JSON.stringify({defaultEnabled:true,startupContextState:initial.contextState,autoplayStarted:initial.musicPlaying,playbackAfterInteraction:true,musicSignal:true,savedMute:true,resetEnables:true,palette,pageErrors:errors},null,2));
  console.log('Audio defaults, gesture, mute persistence, reset and palette checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
