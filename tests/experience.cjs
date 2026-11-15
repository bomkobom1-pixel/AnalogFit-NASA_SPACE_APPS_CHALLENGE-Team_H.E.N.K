/* Acceptance checks for paper diagnostics, NASA images, terrain depth and audio. */
const { chromium } = require('../.test-tools/node_modules/playwright');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname,'..');
const artifacts = path.join(root,'test-artifacts');
const check = (condition,message) => { if(!condition) throw new Error(message); };

(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true,
        args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
    try{
        const context=await browser.newContext({offline:true,viewport:{width:1440,height:1050},acceptDownloads:true});
        const page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.goto(pathToFileURL(path.join(root,'index.html')).href);
        await page.waitForFunction(()=>document.body.dataset.boot==='ready');
        await page.locator('#bootScreen').waitFor({state:'hidden'});
        await page.locator('[data-lang=id]').click();
        check(await page.evaluate(()=>AnalogFitAudio.state.sfxEnabled&&AnalogFitAudio.state.musicEnabled),'Audio defaults should be enabled');
        await page.evaluate(()=>analogfit.select('VAL_01'));
        await page.waitForFunction(()=>document.querySelector('#terrainImageryCard img')?.naturalWidth===720);
        const base=await page.evaluate(()=>({science:AnalogFitScience.report(),score:analogfit.score(analogfit.places.find(p=>p.id==='VAL_01')).F,dem:ANALOGFIT.sites.find(s=>s.id==='VAL_01').dem}));
        check(Math.abs(base.science.coverage-.6)<1e-12,'Supported coverage incorrect');
        check(Math.abs(base.science.observedCoverage-.15)<1e-12,'Modeled illumination counted as observed');
        check(Math.abs(base.science.modeledCoverage-.45)<1e-12,'Modeled coverage incorrect');
        check(!base.science.coverageGatePassed,'Low-coverage site passed paper gate');
        check(base.science.coverageThreshold===.7,'Paper discovery threshold missing');
        check(await page.locator('#scienceReadiness').getAttribute('data-coverage-gate')==='false','Readiness badge incorrect');
        await page.locator('#btnScience').click();
        check(await page.locator('.ablation-table tr').count()===3,'Expected two supported-feature ablations');
        check((await page.locator('#scienceBody').innerText()).includes('500 m'),'Paper alignment missing');
        const downloadPromise=page.waitForEvent('download');
        await page.locator('#exportEvidence').click();
        const download=await downloadPromise;
        const evidencePath=path.join(artifacts,'experience-evidence.json');
        await download.saveAs(evidencePath);
        const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
        check(evidence.comparison.scoreMode==='real','Evidence export score mode ambiguous');
        check(evidence.sourceReferences.power.sha256.length===64,'NASA provenance absent');
        check(evidence.ablation.length===2,'Ablation export missing');
        await page.screenshot({path:path.join(artifacts,'experience-science.png'),animations:'disabled'});
        await page.keyboard.press('Escape');

        await page.locator('[data-terrain-mode=compare]').click();
        check(await page.locator('.terrain-swipe-layer').count()===1,'Terrain comparison absent');
        await page.locator('.terrain-compare-slider').evaluate(input=>{input.value='25';input.dispatchEvent(new Event('input',{bubbles:true}));});
        check((await page.locator('.terrain-swipe-layer').getAttribute('style')).includes('75%'),'Comparison swipe failed');
        await page.locator('.image-expand').click();
        await page.waitForFunction(()=>Array.from(document.querySelectorAll('#terrainPhotoBody img')).every(img=>img.complete&&img.naturalWidth===720));
        await page.screenshot({path:path.join(artifacts,'experience-terrain-images.png'),animations:'disabled'});
        await page.keyboard.press('Escape');

        await page.locator('#terrainColorMode').selectOption('depth');
        const legend=await page.locator('#terrainDepthLegend').innerText();
        check(legend.includes('0.0 m')&&legend.includes('36.0 m'),'Relative-depth meter legend incorrect');
        check(legend.includes('bukan kedalaman bawah tanah'),'Depth reference missing');
        const before=await page.locator('#terrain').evaluate(canvas=>canvas.toDataURL());
        await page.locator('#terrain').focus();await page.keyboard.press('ArrowRight');
        check(before!==await page.locator('#terrain').evaluate(canvas=>canvas.toDataURL()),'Keyboard terrain rotation failed');
        await page.locator('#terrainExaggeration').evaluate(input=>{input.value='10';input.dispatchEvent(new Event('input',{bubbles:true}));});
        check(await page.locator('#terrainVEValue').innerText()==='10x','Exaggeration control failed');
        await page.locator('#terrainSpin').click();
        check(await page.locator('#terrainSpin').getAttribute('aria-pressed')==='true','Optional rotation failed');
        await page.locator('#terrainSpin').click();
        await page.locator('#terrain').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(artifacts,'experience-depth.png'),animations:'disabled'});
        const after=await page.evaluate(()=>({score:analogfit.score(analogfit.places.find(p=>p.id==='VAL_01')).F,dem:ANALOGFIT.sites.find(s=>s.id==='VAL_01').dem}));
        check(after.score===base.score,'Visual controls changed the scientific score');
        check(JSON.stringify(after.dem)===JSON.stringify(base.dem),'Vertical exaggeration mutated raw elevations');
        await page.selectOption('#taskSel','ISRU');
        check(await page.evaluate(()=>AnalogFitScience.report().coverage)===0,'Missing mineral/ice evidence counted');
        check((await page.evaluate(()=>AnalogFitScience.ablation())).length===0,'Missing-score ablation fabricated a result');
        await page.selectOption('#taskSel','Navigation');

        await page.locator('#btnSettings').click();
        await page.locator('#toggleSfx').click();
        check(!(await page.evaluate(()=>AnalogFitAudio.state)).sfxEnabled,'SFX failed to disable');
        await page.locator('#toggleSfx').click();
        check((await page.evaluate(()=>AnalogFitAudio.state)).sfxEnabled,'SFX failed to enable');
        await page.locator('#toggleMusic').click();
        check(!(await page.evaluate(()=>AnalogFitAudio.state.musicPlaying)),'Music failed to disable');
        await page.locator('#toggleMusic').click();
        await page.waitForFunction(()=>AnalogFitAudio.state.musicPlaying&&AnalogFitAudio.energy()>0.00001);
        const rms=await page.evaluate(()=>AnalogFitAudio.energy());
        await page.locator('#audioVolume').evaluate(input=>{input.value='10';input.dispatchEvent(new Event('input',{bubbles:true}));});
        check(Math.abs((await page.evaluate(()=>AnalogFitAudio.state.volume))-.1)<1e-12,'Volume control failed');
        await page.locator('#toggleMusic').click();
        check(!(await page.evaluate(()=>AnalogFitAudio.state.musicPlaying)),'Music failed to stop');
        await page.locator('#toggleSfx').click();
        check(!(await page.evaluate(()=>AnalogFitAudio.state.sfxEnabled)),'SFX failed to disable');
        await page.locator('#closeSettings').click();

        for(const width of [390,768,1024,1440]){
            await page.setViewportSize({width,height:900});
            check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Experience overflow at '+width);
        }
        await page.setViewportSize({width:390,height:844});
        await page.screenshot({path:path.join(artifacts,'experience-mobile.png'),fullPage:true,animations:'disabled'});
        const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/terrain_media_manifest.json'),'utf8'));
        let images=0;
        for(const site of Object.values(manifest.sites))for(const kind of ['satellite','relief','detailed_satellite']){
            const meta=site[kind];if(!meta.available)continue;
            const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,meta.file))).digest('hex');
            check(digest===meta.sha256,'Terrain image checksum failed');images++;
        }
        check(images>=27,'Expected at least 27 original NASA imagery responses');
        check(errors.length===0,'Page errors: '+errors.join('\n'));
        const report={paperCoverageGate:true,observedVersusModeled:true,localAblation:true,
            evidenceExport:true,nasaImagesVerified:images,offlineImagery:true,swipeComparison:true,
            depthLegendMetres:true,terrainKeyboardAndExaggeration:true,scoreAndDEMUnchanged:true,
            defaultAudioEnabled:true,musicStartsWithInteraction:true,sfxAndMusicControls:true,musicRMS:rms,viewportWidths:[390,768,1024,1440],pageErrors:errors};
        fs.writeFileSync(path.join(artifacts,'experience-report.json'),JSON.stringify(report,null,2));
        console.log(JSON.stringify(report,null,2));
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
