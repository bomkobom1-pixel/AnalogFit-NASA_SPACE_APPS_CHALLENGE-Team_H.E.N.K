/* Selection-driven dossier and interface settings. No scientific score changes. */
(() => {
    'use strict';
    const $=id=>document.getElementById(id);
    const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
    const english=()=>window.analogfit?.state.lang==='en';
    let panelOpen=false,lastTrigger=null;
    const WORDS={
        en:{
            dossier:'LOCATION DOSSIER',linked:'SELECTION LINKED',overview:'Overview',imagery:'Imagery',evidence:'Evidence',terrain:'3D terrain',close:'Close',
            settingsTitle:'Make the workspace yours.',settingsIntro:'Interface preferences are saved on this device. Scientific inputs stay unchanged.',
            experienceTitle:'Experience',introTitle:'Five-second opening',introHint:'Astronomical introduction before entering the explorer.',
            motionTitle:'Interface animations',motionHint:'Transitions, camera travel and animated gauges. Switch off for a still interface.',
            replay:'Replay introduction',workspaceTitle:'Workspace',imagesTitle:'Terrain imagery',imagesHint:'Show cached NASA imagery and comparison controls.',
            terrainTitle:'3D terrain model',terrainHint:'Enable the local DEM mesh and elevation/depth inspection.',
            compactTitle:'Compact statistics',compactHint:'A denser location overview with the same measurements.',
            notesTitle:'Expanded science notes',notesHint:'Show the detailed paper-alignment roadmap. Evidence coverage and limitations remain visible.',
            rotationTitle:'Automatic globe rotation',rotationHint:'Optional ambient rotation in the 3D globe view.',defaultViewTitle:'Default map view',
            languageTitle:'Language',audioTitle:'Audio',volume:'Volume',resetPrefs:'Restore interface defaults',
            selectTitle:'Choose a location to begin.',selectHint:'Select a map marker or open Site rankings to inspect its evidence.',
            browseSites:'Browse locations',reopen:'Open selected location ↗'
        },
        id:{
            dossier:'DOSSIER LOKASI',linked:'TERHUBUNG KE PILIHAN',overview:'Ringkasan',imagery:'Citra',evidence:'Bukti',terrain:'Medan 3D',close:'Tutup',
            settingsTitle:'Atur ruang kerja Anda.',settingsIntro:'Preferensi antarmuka disimpan di perangkat ini. Masukan ilmiah tetap sama.',
            experienceTitle:'Pengalaman',introTitle:'Pembuka lima detik',introHint:'Introduksi astronomi sebelum masuk ke penjelajah.',
            motionTitle:'Animasi antarmuka',motionHint:'Transisi, gerakan kamera dan indikator animasi. Matikan untuk antarmuka tanpa gerak.',
            replay:'Putar ulang pembuka',workspaceTitle:'Ruang kerja',imagesTitle:'Citra medan',imagesHint:'Tampilkan citra NASA tersimpan dan kontrol perbandingan.',
            terrainTitle:'Model medan 3D',terrainHint:'Aktifkan mesh DEM lokal dan inspeksi elevasi/kedalaman.',
            compactTitle:'Statistik ringkas',compactHint:'Ringkasan lokasi lebih padat dengan pengukuran yang sama.',
            notesTitle:'Catatan sains terperinci',notesHint:'Tampilkan rincian kesesuaian makalah. Cakupan bukti dan batasan tetap terlihat.',
            rotationTitle:'Rotasi globe otomatis',rotationHint:'Rotasi pilihan pada tampilan globe 3D.',defaultViewTitle:'Tampilan peta bawaan',
            languageTitle:'Bahasa',audioTitle:'Audio',volume:'Volume',resetPrefs:'Pulihkan preferensi antarmuka',
            selectTitle:'Pilih lokasi untuk memulai.',selectHint:'Pilih penanda peta atau buka Peringkat lokasi untuk melihat buktinya.',
            browseSites:'Jelajahi lokasi',reopen:'Buka lokasi terpilih ↗'
        }
    };
    function current() {
        const app=window.analogfit;
        return app?{app,place:app.places.find(p=>p.id===app.state.sel)}:null;
    }
    function translate() {
        const text=WORDS[english()?'en':'id'];
        document.querySelectorAll('[data-mission]').forEach(n=>{
            if(text[n.dataset.mission])n.textContent=text[n.dataset.mission];
        });
        $('btnSettings').setAttribute('aria-label',english()?'Settings':'Pengaturan');
        $('btnSettings').title=english()?'Settings':'Pengaturan';
        $('closeInspector').setAttribute('aria-label',english()?'Close location panel':'Tutup panel lokasi');
        $('skipIntro').textContent=english()?'Skip intro ↗':'Lewati pembuka ↗';
        $('settingsLanguage').value=window.analogfit?.state.lang || 'id';
        for(const input of document.querySelectorAll('[data-pref]')){
            const value=window.AnalogFitPrefs.get(input.dataset.pref);
            if(input.type==='checkbox')input.checked=value;
            else input.value=value;
        }
    }
    function setOpen(value,{focus=true}={}) {
        const c=current();if(value&&!c?.place)return;
        const drawer=$('locationDrawer');
        if(value&&!drawer.contains(document.activeElement))lastTrigger=document.activeElement;
        panelOpen=value;
        drawer.classList.toggle('is-open',value);
        drawer.inert=!value;drawer.setAttribute('aria-hidden',String(!value));
        document.body.dataset.inspector=value?'open':'closed';
        $('reopenInspector').hidden=value||!c?.place;
        $('reopenInspector').setAttribute('aria-expanded',String(value));
        if(value){
            if(focus)$('closeInspector').focus({preventScroll:true});
        }else if(focus){
            (lastTrigger?.isConnected?lastTrigger:$('btnExplore')).focus({preventScroll:true});
        }
        window.dispatchEvent(new CustomEvent('analogfit:inspector',{detail:{open:value}}));
    }
    const scoreText=f=>f==null?'—':f>0&&f<.001?'<0.1':f<.01?(f*100).toFixed(1):String(Math.round(f*100));
    const number=(value,digits=0)=>value==null||!Number.isFinite(value)?'—':value.toLocaleString(english()?'en-US':'id-ID',{maximumFractionDigits:digits});
    function renderDashboard() {
        const c=current(),host=$('locationDashboard');
        if(!c?.place){host.replaceChildren();return;}
        const {app,place}=c,r=app.score(place),science=window.AnalogFitScience.report();
        const title=node('header','dossier-title');
        title.append(node('span','eyebrow',(place.kind==='cell'?'GLOBAL SAMPLE / ':'REFERENCE / ')+place.id),
            node('h1','',app.placeName?app.placeName(place):(place.name||place.id)));
        const coords=Math.abs(place.lat).toFixed(3)+(place.lat>=0?'° N':'° S')+' / '+Math.abs(place.lon).toFixed(3)+(place.lon>=0?'° E':'° W');
        title.append(node('p','dossier-coordinates',coords));
        const badge=node('span','dossier-status',app.state.mode==='all'
            ?(english()?'ILLUSTRATIVE PREVIEW':'PRATINJAU ILUSTRATIF')
            :r.F==null?(english()?'INSUFFICIENT EVIDENCE':'BUKTI BELUM CUKUP')
            :(english()?'EXPLORATORY COMPARISON':'PERBANDINGAN EKSPLORATIF'));
        title.append(badge);
        const hero=node('div','dossier-hero');
        const score=node('div','mission-score');
        score.append(node('span','eyebrow',english()?'SIMILARITY INDEX':'INDEKS KEMIRIPAN'),
            node('strong','',scoreText(r.F)),node('small','',english()?'out of 100 · task-specific':'dari 100 · khusus uji'));
        const observed=science?.observedCoverage||0,modeled=science?.modeledCoverage||0;
        const donut=node('div','evidence-donut');
        donut.style.background='conic-gradient(var(--accent) 0 '+observed*360+'deg,var(--amber) '+observed*360+'deg '+(observed+modeled)*360+'deg,var(--panel-2) '+(observed+modeled)*360+'deg 360deg)';
        donut.setAttribute('role','img');
        donut.setAttribute('aria-label',(english()?'Evidence coverage ':'Cakupan bukti ')+Math.round(r.covReal*100)+'%');
        const centre=node('div','');centre.append(node('b','',Math.round(r.covReal*100)+'%'),node('span','',english()?'supported':'didukung'));donut.append(centre);
        hero.append(score,donut);
        const key=node('div','dossier-evidence-key');
        for(const [type,label,value]of [
            ['observed',english()?'Observed':'Observasi',observed],['modeled',english()?'Modeled':'Model',modeled],
            ['missing',english()?'Missing':'Kosong',Math.max(0,1-observed-modeled)]]){
            const item=node('span',type);item.append(node('i',''),document.createTextNode(label+' '+Math.round(value*100)+'%'));key.append(item);
        }
        const real=(key)=>place.realCols.has(key)&&Number.isFinite(place.v[key])?place.v[key]:null;
        const elevation=real('elev_m'),temp=real('t_mean_K'),rain=real('precip_mm_yr');
        const z=place.raw.dem,relief=z?.length?Math.max(...z)-Math.min(...z):null;
        const grid=node('div','dossier-stats');
        const metrics=[
            [english()?'DEM elevation':'Elevasi DEM',number(elevation),'m',english()?'Local DEM samples':'Sampel DEM lokal'],
            [english()?'Surface temperature':'Suhu permukaan',number(temp),'K',temp==null?(english()?'Unavailable':'Belum tersedia'):number(temp-273.15,1)+' °C · POWER'],
            [english()?'Rain / snow':'Hujan / salju',number(rain),'mm/yr',english()?'Regional annual climatology':'Klimatologi tahunan regional'],
            [english()?'Local relief':'Relief lokal',number(relief,1),'m',english()?'3D grid maximum − minimum':'Maksimum − minimum grid 3D']
        ];
        for(const [label,value,unit,note]of metrics){
            const item=node('article','dossier-stat');
            item.append(node('span','',label));const v=node('strong','',value);v.append(node('small','',unit));item.append(v,node('p','',note));grid.append(item);
        }
        const note=node('p','dossier-interpretation',english()
            ? 'Screening statistics, not a mission-readiness rating. POWER values describe regional 2001–2025 climatology.'
            : 'Statistik penyaringan, bukan penilaian kesiapan misi. Nilai POWER adalah klimatologi regional 2001–2025.');
        host.replaceChildren(title,hero,key,grid,note);
    }
    function update() {
        translate();renderDashboard();
        const c=current();
        $('selectionPrompt').hidden=!!c?.place;
        $('reopenInspector').hidden=panelOpen||!c?.place;
        document.querySelectorAll('[data-jump]').forEach(button=>{
            button.disabled=!({overview:$('locationDashboard'),imagery:$('terrainImageryCard'),evidence:$('scienceReadiness'),terrain:$('terrain')}[button.dataset.jump]);
        });
        if(!c?.place){
            $('evidenceBar').style.width='0';
            $('evidenceText').textContent=english()?'Select a location to inspect its supported evidence.':'Pilih lokasi untuk melihat cakupan buktinya.';
        }
    }
    function settings() {
        translate();$('dlgSettings').showModal();
    }
    document.addEventListener('DOMContentLoaded',()=>{
        setOpen(false,{focus:false});update();
        $('btnSettings').onclick=settings;
        $('closeSettings').onclick=()=>$('dlgSettings').close();
        $('closeInspector').onclick=()=>setOpen(false);
        $('reopenInspector').onclick=()=>setOpen(true);
        $('openSiteRankings').onclick=()=>{
            $('tabRanking').click();$('tabRanking').focus({preventScroll:true});
            if(innerWidth<=1050)$('controls').scrollIntoView({behavior:window.AnalogFitPrefs.motionAllowed?'smooth':'auto',block:'start'});
        };
        $('replayIntro').onclick=()=>{$('dlgSettings').close();window.AnalogFitBoot.replay();};
        $('resetPreferences').onclick=()=>window.AnalogFitPrefs.reset();
        $('settingsLanguage').onchange=e=>document.querySelector('[data-lang="'+e.target.value+'"]').click();
        document.querySelectorAll('[data-pref]').forEach(input=>{
            input.onchange=()=>window.AnalogFitPrefs.set(input.dataset.pref,input.type==='checkbox'?input.checked:input.value);
        });
        document.querySelectorAll('[data-jump]').forEach(button=>{
            button.onclick=()=>{
                const target={overview:$('locationDashboard'),imagery:$('terrainImageryCard'),evidence:$('scienceReadiness'),terrain:$('terrain')}[button.dataset.jump];
                target?.scrollIntoView({behavior:window.AnalogFitPrefs.motionAllowed?'smooth':'auto',block:'start'});
            };
        });
        document.addEventListener('keydown',event=>{
            if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')&&panelOpen){
                event.preventDefault();setOpen(false);
            }
        });
    });
    window.addEventListener('analogfit:update',update);
    window.addEventListener('analogfit:locationselected',()=>{
        $('drawerScroll').scrollTop=0;renderDashboard();setOpen(true);
    });
    window.addEventListener('analogfit:preferences',event=>{
        if(!window.analogfit)return;
        if(['imagery','terrain','motion'].includes(event.detail.key))window.analogfit.refresh(false);
        if(event.detail.key==='defaultView')window.analogfit.setView(event.detail.value);
        if(event.detail.key==='language'&&window.analogfit.state.lang!==event.detail.value){
            window.analogfit.state.lang=event.detail.value;window.analogfit.refresh(true);
        }
        update();
    });
    window.AnalogFitWorkspace={open:()=>setOpen(true),close:()=>setOpen(false),settings,
        get isOpen(){return panelOpen;}};
})();
