/* Run with: node tests/browser.cjs. Uses the installed Chrome, no app server. */
const { chromium } = require('../.test-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const {pathToFileURL}=require('url');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const artifact=path.join(root,'test-artifacts');fs.mkdirSync(artifact,{recursive:true});
const assert=(v,msg)=>{if(!v)throw new Error(msg);};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1050},deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 await page.waitForFunction(()=>!!window.analogfit);
 assert(await page.locator('#rankSites button').count()===14,'Expected 14 reference/control sites');
 await page.locator('[data-lang=en]').click();
 await page.locator('#btnMethod').click();
 assert((await page.locator('#methodBody').innerText()).includes('NASA PDS'),'Missing NASA source attribution');
 assert((await page.locator('#methodBody').innerText()).includes('geometry model'),'Missing modeled-target label');
 await page.locator('#dlgMethod .close').click();
 await page.locator('#btnValidation').click();
 assert((await page.locator('#validationBody').innerText()).includes('NOT TESTABLE'),'Missing untestable controls');
 await page.locator('#dlgValidation .close').click();
 let cases=0;
 for(const target of ['T1','T2','T3']){
  await page.selectOption('#targetSel',target);
  const tasks=await page.locator('#taskSel option').evaluateAll(xs=>xs.map(x=>x.value));
  for(const task of tasks){
   await page.selectOption('#taskSel',task);
   for(const mode of ['real','all']){
    await page.locator(`[data-mode=${mode}]`).click();
    const info=await page.evaluate(()=>({text:document.querySelector('#detail').textContent,scores:analogfit.places.map(p=>analogfit.score(p))}));
    assert(!/undefined|NaN/.test(info.text),`Broken detail for ${target}/${task}/${mode}`);
    assert(info.scores.every(s=>s.F===null||Number.isFinite(s.F)&&s.F>=0&&s.F<=1),`Invalid score in ${target}/${task}/${mode}`);
    cases++;
   }
  }
 }
 // Compare every exported site AND background score with the browser engine, both modes.
 const py="import pandas as p,json; a=p.concat([p.read_csv('analogfit_model_output_scores.csv'),p.read_csv('analogfit_background_scores.csv')]); print(a[['cell_id','target','task','F_site','F_site_real','coverage_real']].to_json(orient='records',double_precision=15))";
 const expected=JSON.parse(execFileSync('python',['-c',py],{cwd:root,maxBuffer:20000000}).toString());
 const parity=await page.evaluate(rows=>{
  const byid=Object.fromEntries(analogfit.places.map(p=>[p.id,p]));let maxError=0,n=0;
  for(const r of rows){
   const id=r.cell_id.startsWith('BG_')?'BG'+Number(r.cell_id.slice(3)):r.cell_id;
   const p=byid[id];if(!p)throw Error('Missing '+id);
   for(const [mode,col]of [['real','F_site_real'],['all','F_site']]){
    const s=analogfit.score(p,mode,r.target,ANALOGFIT.tasks[r.task].weights);
    if((s.F===null)!==(r[col]===null))throw Error(`Null mismatch ${id} ${r.target} ${r.task} ${mode}`);
    if(s.F!==null){const err=Math.abs(s.F-r[col]);maxError=Math.max(maxError,err);if(err>2e-12)throw Error(`Parity error ${id} ${mode}: ${err}`);}
    if(Math.abs(s.covReal-r.coverage_real)>2e-12)throw Error(`Coverage mismatch ${id}`);
    n++;
   }
  }
  return {comparisons:n,maxError};
 },expected);
 await page.selectOption('#targetSel','T1');await page.selectOption('#taskSel','Navigation');await page.locator('[data-mode=real]').click();
 await page.locator('[data-lang=id]').click();
 await page.evaluate(()=>analogfit.select('VAL_01'));
 await page.screenshot({path:path.join(artifact,'desktop.png'),fullPage:true});
 // Zero user weights must show unavailable, not NaN or a 100 score.
 await page.locator('#weights input[type=range]:enabled').evaluateAll(inputs => inputs.forEach(input => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles:true })); }));
 assert(await page.evaluate(()=>analogfit.places.every(p=>analogfit.score(p).F===null)),'Zero weights scored a site');
 await page.locator('#resetWeights').click();
 // The complete local app and 3D NASA texture must function without HTTP access.
 await context.setOffline(true);
 await page.reload();await page.waitForFunction(()=>!!window.analogfit);
 await page.locator('[data-view="3d"]').click();
 await page.waitForFunction(()=>document.querySelector('#globe canvas')&&document.querySelector('[data-view="3d"]').getAttribute('aria-pressed')==='true');
 await page.waitForTimeout(3500);
 assert(await page.evaluate(()=>typeof NASA_BLUE_MARBLE==='string'&&NASA_BLUE_MARBLE.startsWith('data:image/jpeg')),'NASA offline texture missing');
 await page.screenshot({path:path.join(artifact,'offline-globe.png'),fullPage:true});
 await page.locator('[data-view="2d"]').click();
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile page overflows horizontally');
 await page.screenshot({path:path.join(artifact,'mobile.png'),fullPage:true});
 assert(errors.length===0,'Browser errors: '+errors.join('\n'));
 const report={browser:'installed Chrome (headless, software WebGL)',fileProtocol:true,uiCases:cases,parity,offline2d:true,offline3d:true,mobileWidth:390,pageErrors:errors};
 fs.writeFileSync(path.join(artifact,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
