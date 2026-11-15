/* Paper-linked diagnostics. These explain the existing score; they do not fit
   weights to known analogs or upgrade missing measurements into evidence. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const node = (tag, cls, text) => {
        const item = document.createElement(tag);
        if (cls) item.className = cls;
        if (text != null) item.textContent = text;
        return item;
    };
    const en = () => window.analogfit?.state.lang === 'en';
    const pct = value => Math.round(value * 100);
    const names = {
        en: { S:'Slope', R:'Roughness', B:'Radar CPR', M:'Mineralogy', G:'Grain size', I:'Ground ice', L:'Illumination', T:'Temperature', D:'Dust process' },
        id: { S:'Kemiringan', R:'Kekasaran', B:'CPR radar', M:'Mineralogi', G:'Ukuran butir', I:'Es tanah', L:'Iluminasi', T:'Suhu', D:'Proses debu' }
    };
    function current() {
        if (!window.analogfit) return null;
        const app = window.analogfit, state = app.state;
        const place = app.places.find(p => p.id === state.sel);
        if (!place) return null;
        return { app, state, place, target: window.ANALOGFIT.targets[state.target],
            weights: state.weights || window.ANALOGFIT.tasks[state.task].weights };
    }
    function report() {
        const c = current();
        if (!c) return null;
        const {app,state,place,target,weights} = c;
        const total = Object.values(weights).reduce((sum,w) => sum + Math.max(0,w), 0) || 1;
        const features = window.ANALOGFIT.features.map(code => {
            const earth = place.real.has(code);
            const supported = earth && target.supportedFeatures.includes(code) &&
                Object.hasOwn(place.sims[state.target] || {}, code);
            return {code, weight:(weights[code] || 0)/total, earthSupported:earth,
                targetStatus:target.status[code]?.status || 'unavailable', supported,
                evidenceType:code === 'L' ? 'modeled' : supported ? 'observed-derived' : 'missing',
                similarity:supported ? place.sims[state.target][code] : null};
        });
        const observed = features.filter(f=>f.supported && f.evidenceType==='observed-derived').reduce((s,f)=>s+f.weight,0);
        const modeled = features.filter(f=>f.supported && f.evidenceType==='modeled').reduce((s,f)=>s+f.weight,0);
        const coverage = observed + modeled;
        const threshold = window.ANALOGFIT_MEDIA.paper.discovery_coverage_threshold;
        return {site:place.id,name:place.name || place.id,lat:place.lat,lon:place.lon,
            target:state.target,task:state.task,displayMode:state.mode,scoreMode:'real',customWeights:!!state.weights,
            score:app.score(place,'real').F,coverage,observedCoverage:observed,modeledCoverage:modeled,
            missingCoverage:Math.max(0,1-coverage),coverageThreshold:threshold,
            coverageGatePassed:coverage >= threshold-1e-12,
            validationStatus:'not established',features};
    }
    function ablation() {
        const c = current(), base = report();
        if (!c || base.score == null) return [];
        return base.features.filter(f=>f.supported && f.weight>0).map(feature => {
            const weights = {...c.weights,[feature.code]:0};
            const result = c.app.score(c.place,'real',c.state.target,weights);
            return {removed:feature.code,score:result.F,coverage:result.covReal,
                change:result.F == null ? null : result.F-base.score};
        });
    }
    function evidenceCard() {
        const r = report();
        if (!r || !$('detail')) return;
        const card = node('section','science-readiness');
        card.id = 'scienceReadiness';
        card.dataset.coverageGate = String(r.coverageGatePassed);
        const top = node('div','science-readiness-top');
        top.append(node('span','eyebrow',en()?'SCIENTIFIC READINESS':'KESIAPAN ILMIAH'),
            node('b','',pct(r.coverage)+'% / '+pct(r.coverageThreshold)+'%'));
        const stack = node('div','evidence-stack');
        for (const [type,value] of [['observed',r.observedCoverage],['modeled',r.modeledCoverage],['missing',r.missingCoverage]]) {
            const part = node('i',type);part.style.width=pct(value)+'%';stack.append(part);
        }
        const key = node('p','hint',
            (en()?'Observed ':'Observasi ')+pct(r.observedCoverage)+'% · '+
            (en()?'Modeled ':'Model ')+pct(r.modeledCoverage)+'% · '+
            (en()?'Missing ':'Kosong ')+pct(r.missingCoverage)+'%');
        const status = node('p','readiness-verdict',r.coverageGatePassed
            ? (en()?'Coverage gate met. Scientific validation is still pending.':'Ambang cakupan terpenuhi. Validasi ilmiah masih diperlukan.')
            : (en()?'Below the paper’s discovery coverage threshold. Exploratory comparison only.':'Di bawah ambang cakupan penemuan pada makalah. Hanya perbandingan eksploratif.'));
        const button=node('button','science-inline-button',en()?'Inspect evidence & ablation':'Lihat bukti & ablasi');
        button.type='button';button.onclick=open;
        card.append(top,stack,key,status,button);
        const thermal=window.ANALOGFIT.targets[window.analogfit.state.target].thermalContext;
        if(thermal){
            const section=node('section','target-thermal-context');
            section.append(node('strong','',en()?'NASA Diviner · polar thermal context':'NASA Diviner · konteks suhu kutub'),
                node('p','thermal-value',thermal.annual_mean_2cm_K.toFixed(1)+' K / '+thermal.annual_max_surface_K.toFixed(1)+' K'),
                node('p','hint',en()?'Annual mean at 2 cm depth / annual maximum at the surface. Thermal-model fits to Diviner observations. The containing PRP triangle is used, not a regional average.':'Rerata tahunan pada kedalaman 2 cm / maksimum tahunan di permukaan. Hasil pencocokan model termal ke observasi Diviner. Memakai segitiga PRP yang memuat target, bukan rerata regional.'),
                node('p','hint',en()?'Context only. These quantities are not interchangeable with POWER annual surface temperature; no temperature or ice evidence coverage is added.':'Hanya konteks. Nilai ini tidak setara dengan suhu permukaan tahunan POWER; tidak menambah cakupan bukti suhu atau es.'));
            const link=node('a','',en()?'NASA PDS product definition':'Definisi produk NASA PDS');link.href=thermal.label.url;link.target='_blank';link.rel='noopener';section.append(link);card.append(section);
        }
        $('detail').querySelector('.scoreline')?.after(card);
    }
    function open() {
        renderDialog();
        document.querySelectorAll('.primary-nav .nav-link').forEach(button => {
            const active=button.id==='btnScience';
            button.classList.toggle('active',active);
            if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
        });
        if (!$('dlgScience').open) $('dlgScience').showModal();
    }
    function renderDialog() {
        const r=report(), c=current();
        if (!r || !c) {
            const body=$('scienceBody'),close=node('button','btn close',en()?'Close':'Tutup');
            close.onclick=()=>$('dlgScience').close();
            body.replaceChildren(close,node('p','eyebrow','PAPER → IMPLEMENTATION'),
                node('h1','',en()?'Scientific readiness starts with evidence.':'Kesiapan ilmiah dimulai dari bukti.'),
                node('p','',en()?'Choose a location on the map or in Site rankings to inspect observed and modeled coverage, source provenance, and local ablation.':'Pilih lokasi di peta atau Peringkat lokasi untuk melihat cakupan observasi/model, asal sumber, dan ablasi lokal.'),
                node('p','hint',en()?'The paper requires at least 70% task coverage for discovery. The current 585-point search remains exploratory and has not established mission-site validity.':'Makalah mensyaratkan cakupan uji minimal 70% untuk penemuan. Pencarian 585 titik saat ini tetap eksploratif dan belum memvalidasi lokasi misi.'));
            return;
        }
        const text=names[en()?'en':'id'];
        const body=$('scienceBody');
        const close=node('button','btn close',en()?'Close':'Tutup');
        close.onclick=()=>$('dlgScience').close();
        body.replaceChildren(close,node('p','eyebrow','PAPER → IMPLEMENTATION'),
            node('h1','',en()?'From a score to a testable claim.':'Dari skor ke klaim yang dapat diuji.'),
            node('p','hint',window.ANALOGFIT_MEDIA.paper.version+' · Sections 5–10'));
        body.append(node('p','',en()
            ? 'The paper defines a research protocol. This view identifies which parts the current implementation supports and which still require data or experiments.'
            : 'Makalah mendefinisikan protokol penelitian. Panel ini membedakan bagian yang telah didukung dari bagian yang masih memerlukan data atau eksperimen.'));
        const stats=node('div','science-stats');
        for (const [label,value] of [[en()?'Observed':'Observasi',pct(r.observedCoverage)+'%'],
            [en()?'Modeled':'Model',pct(r.modeledCoverage)+'%'],[en()?'Missing':'Kosong',pct(r.missingCoverage)+'%'],
            [en()?'Discovery gate':'Ambang penemuan',pct(r.coverageThreshold)+'%']]) {
            const item=node('div','');item.append(node('b','',value),node('span','',label));stats.append(item);
        }
        body.append(stats,node('h2','',en()?'Evidence on both worlds':'Bukti pada kedua dunia'));
        const table=node('table','science-table');
        const head=node('tr','');
        for (const title of (en()?['Feature','Task weight','Earth','Target','Included']:['Ciri','Bobot uji','Bumi','Target','Dihitung'])) head.append(node('th','',title));
        table.append(head);
        for (const f of r.features.filter(f=>f.weight>0)) {
            const row=node('tr',f.supported?'supported-row':'');
            const earth=f.code==='L'?(en()?'Geometry model':'Model geometri'):f.earthSupported?(en()?'Supported':'Didukung'):(en()?'Unverified':'Belum terverifikasi');
            const target=f.targetStatus==='computed'?(en()?'Geometry model':'Model geometri'):['derived','measured'].includes(f.targetStatus)?(en()?'NASA-derived':'Turunan data NASA'):(en()?'Unverified / illustrative':'Belum terverifikasi / ilustratif');
            [text[f.code],pct(f.weight)+'%',earth,target,f.supported?(en()?'Yes':'Ya'):(en()?'No':'Tidak')].forEach(value=>row.append(node('td','',value)));
            table.append(row);
        }
        body.append(table,node('h2','',en()?'Leave-one-feature-out ablation':'Ablasi: keluarkan satu ciri'));
        body.append(node('p','hint',en()
            ? 'Recomputes the supported score after removing each included feature. Coverage and the compared feature set change. This is a local sensitivity diagnostic, not independent validation or a causal effect.'
            : 'Menghitung ulang skor berbukti setelah setiap ciri dikeluarkan. Cakupan dan himpunan ciri berubah. Ini diagnostik sensitivitas lokal, bukan validasi independen atau pengaruh sebab-akibat.'));
        const rows=ablation(), ablationTable=node('table','ablation-table');
        const ah=node('tr','');
        (en()?['Removed','Score / 100','Change / 100']:['Dikeluarkan','Skor / 100','Perubahan / 100']).forEach(value=>ah.append(node('th','',value)));
        ablationTable.append(ah);
        rows.forEach(item=>{
            const tr=node('tr','');
            const format=value=>value==null?'N/A':(value*100).toFixed(2);
            [text[item.removed],format(item.score),item.change==null?'N/A':(item.change>=0?'+':'')+format(item.change)]
                .forEach(value=>tr.append(node('td','',value)));
            ablationTable.append(tr);
        });
        body.append(rows.length?ablationTable:node('p','hint',en()?'No supported active features to ablate.':'Tidak ada ciri aktif berbukti untuk diuji ablasi.'));
        body.append(node('h2','paper-gaps-title',en()?'Paper alignment and next experiments':'Kesesuaian makalah dan eksperimen berikutnya'));
        const gaps=en()?[
            ['§6.2 · Coverage','70% is a necessary discovery gate. Passing it alone does not validate a discovery; changing weights to remove missing inputs does not create new evidence.'],
            ['§6.1 · Tolerances','Current Gaussian widths are assumptions. Estimate measurement variance, target-ROI variance and resampling variance independently before combining them.'],
            ['§5.1–5.2 · Terrain','Current comparison uses one 500 m baseline and 1 km reference patches. Add frozen ROI polygons, 30/100/500 m distributions and multi-lag roughness where native data permit.'],
            ['§5.7 · Sun geometry','The app scores the best 10-day window. The paper also requires annual solar-elevation statistics and DEM horizons. These are different observables and must be reported separately.'],
            ['§8 · Robustness','Current intervals perturb model assumptions. Add measurement-error propagation and top-10 rank frequency across joint resampling. They are not confidence intervals from field measurements.'],
            ['§9 · Falsification','Two naive baselines and full-run ablations are available below. All still fail to establish predictive validity. Add independently verified roles and spatially separated field evaluation.'],
            ['§7, §13 · Regime mapping','The paper explicitly calls the ceiling function a convention, not a physical law. Report physical differences and mapping sensitivity separately from site similarity.'],
            ['§10 · Discovery','585 sampled points are not the paper’s 0.05-degree all-land screen. Dense sampling is needed before DBSCAN clustering and a 30–70 m deep dive.']
        ]:[
            ['§6.2 · Cakupan','70% adalah syarat perlu penemuan. Lolos cakupan saja tidak memvalidasi penemuan; menghapus masukan kosong melalui bobot tidak menciptakan bukti baru.'],
            ['§6.1 · Toleransi','Lebar Gaussian saat ini adalah asumsi. Ukur varians instrumen, varians ROI target, dan varians resampling secara independen sebelum digabungkan.'],
            ['§5.1–5.2 · Medan','Perbandingan saat ini memakai satu baseline 500 m dan petak referensi 1 km. Tambahkan poligon ROI tetap, distribusi 30/100/500 m dan kekasaran berbagai lag bila resolusi data memungkinkan.'],
            ['§5.7 · Geometri Matahari','Aplikasi menilai jendela 10 hari terbaik. Makalah juga meminta statistik tahunan dan cakrawala DEM. Definisi ini berbeda dan harus dilaporkan terpisah.'],
            ['§8 · Robustness','Interval saat ini mengubah asumsi model. Tambahkan propagasi galat pengukuran dan frekuensi peringkat 10 besar pada resampling gabungan. Ini bukan interval kepercayaan dari data lapangan.'],
            ['§9 · Falsifikasi','Dua baseline naif dan ablasi seluruh sampel tersedia di bawah. Hasil belum membuktikan validitas prediktif. Tambahkan peran terverifikasi independen dan evaluasi lapangan terpisah secara spasial.'],
            ['§7, §13 · Pemetaan rezim','Makalah menyebut fungsi batas sebagai konvensi, bukan hukum fisika. Laporkan perbedaan fisika dan sensitivitas pemetaan terpisah dari kemiripan lokasi.'],
            ['§10 · Penemuan','585 titik sampel bukan pindai seluruh daratan 0,05 derajat pada makalah. Sampel rapat diperlukan sebelum klaster DBSCAN dan kajian rinci 30–70 m.']
        ];
        const list=node('div','paper-gaps');
        for(const [title,description]of gaps){const section=node('section','');section.append(node('b','',title),node('p','hint',description));list.append(section);}
        body.append(list);
        const evaluation=window.ANALOGFIT_EVALUATION;
        if(evaluation){
            body.append(node('h2','',en()?'Full-run benchmarks':'Benchmark seluruh sampel'),
                node('p','hint',en()?'Naive min–max Euclidean baselines use background + target scaling; curated validation sites never fit normalization. One variant excludes the contamination penalty; the other retains it. These diagnostics do not establish independent predictive validity.':'Baseline naif Euclidean min–max memakai skala latar + target; lokasi validasi tidak melatih normalisasi. Satu versi tanpa penalti lingkungan, versi lain memakai penalti yang sama. Diagnostik ini belum membuktikan validitas prediktif independen.'));
            for(const [method,result] of Object.entries(evaluation.baselineValidation)){
                body.append(node('p','hint',method+': '+result.passed+'/'+result.testable+' '+(en()?'testable roles pass':'peran teruji lolos')));
            }
            body.append(node('p','hint',evaluation.ablationRows+' '+(en()?'full-run feature-removal summaries include score change, top-20 retention and role diagnostics. Removing unsupported weights can raise coverage without adding evidence.':'ringkasan ablasi memuat perubahan skor, retensi 20 teratas dan diagnostik peran. Menghapus bobot kosong dapat menaikkan cakupan tanpa menambah bukti.')));
            for(const [file,label] of [['analogfit_baseline_validation.csv',en()?'Baseline validation CSV':'CSV validasi baseline'],['analogfit_full_ablation.csv',en()?'Full ablation CSV':'CSV ablasi lengkap'],['paper/analogfit.pdf',en()?'Results-synchronized paper':'Makalah dengan hasil terkini']]){
                const a=node('a','science-download',label);a.href=file;a.target='_blank';a.rel='noopener';body.append(a,document.createTextNode(' · '));
            }
        }
        const button=node('button','btn science-export',en()?'Download evidence card (JSON)':'Unduh kartu bukti (JSON)');
        button.id='exportEvidence';button.onclick=exportEvidence;
        body.append(button,node('p','hint',en()?'Includes the current weights, evidence classes, source references, target patch and local ablation.':'Memuat bobot aktif, kelas bukti, referensi sumber, petak target, dan ablasi lokal.'));
    }
    function exportEvidence() {
        const r=report(),c=current();if(!r||!c)return;
        const sourceId=c.place.kind==='cell'?'BG_'+String(Number(c.place.id.slice(2))).padStart(4,'0'):c.place.id;
        const refs=window.ANALOGFIT_MEDIA.provenance[sourceId] || {};
        const sourceObjects=Object.fromEntries(Object.entries(refs).map(([group,key])=>[group,window.ANALOGFIT_MEDIA.sources[key]]));
        const earthPatch=window.ANALOGFIT_MEDIA.terrainPatches?.[sourceId];
        const card={generatedUTC:new Date().toISOString(),paper:window.ANALOGFIT_MEDIA.paper,
            comparison:r,weights:c.weights,target:c.target.referencePatch,targetThermalContext:c.target.thermalContext,sourceReferences:sourceObjects,
            earthTerrainPatch:earthPatch,earthTerrainSources:earthPatch?.source_files.map(file=>window.ANALOGFIT_MEDIA.sources[file]),
            tolerances:c.target.sigma,toleranceStatus:'assumed; measurement/ROI/scale variance not yet quantified',
            ablation:ablation(),imageryRole:'visual context only; does not enter score',
            interpretation:'Exploratory screening, not mission readiness or independent scientific validation.'};
        const link=node('a','');const objectURL=URL.createObjectURL(new Blob([JSON.stringify(card,null,2)],{type:'application/json'}));
        link.href=objectURL;link.download='AnalogFit_'+r.site+'_'+r.target+'_evidence.json';link.click();
        setTimeout(()=>URL.revokeObjectURL(objectURL),2000);
    }
    function update() {
        if(!window.analogfit||!window.ANALOGFIT_MEDIA)return;
        evidenceCard();
        if($('dlgScience').open)renderDialog();
        $('btnScience').textContent=en()?'Science':'Sains';
    }
    window.addEventListener('analogfit:update',update);
    document.addEventListener('DOMContentLoaded',()=>{$('btnScience').onclick=open;update();});
    window.AnalogFitScience={report,ablation,open,exportEvidence};
})();
