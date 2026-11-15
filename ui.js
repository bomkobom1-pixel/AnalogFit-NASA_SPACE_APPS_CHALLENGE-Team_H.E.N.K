/* Presentation, accessibility and source navigation. Scoring stays in app.js. */
(() => {
    'use strict';
    const byId = id => document.getElementById(id);
    let reducedMotion = !window.AnalogFitPrefs.motionAllowed;
    window.addEventListener('analogfit:preferences',()=>{reducedMotion=!window.AnalogFitPrefs.motionAllowed;});
    let started = performance.now();
    let entryTimer = null, dataReady = false, skipped = false, replaying = false;
    let finished = false;
    let failure = false;
    let progress = 8;
    let resourceFilter = 'all';
    let lastSelection = null;
    let lastLanguage = null;

    const COPY = {
        id: {
            skip: 'Langsung ke penjelajah', explore: 'Penjelajah', resources: 'Resources',
            missionEyebrow: 'EARTH / MOON / MARS', missionTitle: 'Temukan medan latihan di Bumi.',
            missionIntro: 'Pilih tujuan uji. Jelajahi bukti. Pahami batas analoginya.',
            taskLabel: 'APA YANG INGIN DIUJI?', targetLabel: 'DI MANA TARGET MISINYA?',
            workspaceLabel: 'RUANG KERJA MISI', configTab: 'Pengaturan', rankingTab: 'Peringkat lokasi',
            localData: 'Data lokal siap dijelajahi', mapEyebrow: 'EARTH OBSERVATION',
            mapTitle: 'Penjelajah global', analysisLabel: 'ANALISIS LOKASI',
            footerNote: 'Indeks penyaringan eksploratif. Bukan rekomendasi lokasi misi.',
            sourceRegister: 'Daftar sumber', close: 'Tutup',
            resourceTitle: 'Data yang dapat ditelusuri.',
            resourceIntro: 'Sumber dari daftar Resources tantangan, dengan status pemakaian yang jelas.',
            allSources: 'Semua', partnerSources: 'Mitra antariksa', noResources: 'Tidak ada sumber yang sesuai pencarian.',
            sourceHonesty: 'Sumber terpakai dan sumber rujukan dibedakan.',
            resourceScope: 'LOLA/MOLA mendukung lereng target; Copernicus GLO-30 mengisi 10 gap medan Bumi. Diviner T1 dan GIBS hanya konteks. NASA POWER adalah sumber tambahan. CSA/JAXA dan produk ESA lain belum masuk ke skor.',
            search: 'Cari sumber...', used: 'Digunakan', context: 'Konteks visual',
            reference: 'Rujukan / belum terintegrasi', open: 'Buka sumber',
            count: n => n + ' sumber ditampilkan', samples: n => n + ' SAMPEL DARATAN'
        },
        en: {
            skip: 'Skip to explorer', explore: 'Explorer', resources: 'Resources',
            missionEyebrow: 'EARTH / MOON / MARS', missionTitle: 'Find a rehearsal ground on Earth.',
            missionIntro: 'Choose a test. Explore the evidence. Understand the limits.',
            taskLabel: 'WHAT ARE YOU TESTING?', targetLabel: 'WHERE IS THE MISSION TARGET?',
            workspaceLabel: 'MISSION WORKSPACE', configTab: 'Configuration', rankingTab: 'Site rankings',
            localData: 'Local observations ready', mapEyebrow: 'EARTH OBSERVATION',
            mapTitle: 'Global explorer', analysisLabel: 'SITE ANALYSIS',
            footerNote: 'Exploratory screening index. Not a mission-site recommendation.',
            sourceRegister: 'Source register', close: 'Close',
            resourceTitle: 'Evidence you can trace.',
            resourceIntro: 'Sources from the challenge Resources list, with explicit integration status.',
            allSources: 'All sources', partnerSources: 'Space agency partners', noResources: 'No sources match your search.',
            sourceHonesty: 'Integrated data and reference resources are identified separately.',
            resourceScope: 'LOLA/MOLA support target slopes; Copernicus GLO-30 fills ten Earth terrain gaps. Diviner T1 and GIBS are context only. NASA POWER is supplementary. CSA/JAXA and other ESA products do not enter scores.',
            search: 'Search resources...', used: 'In use', context: 'Visual context',
            reference: 'Reference / not integrated', open: 'Open source',
            count: n => n + ' resources shown', samples: n => n + ' LAND SAMPLES'
        }
    };
    const language = () => window.analogfit ? window.analogfit.state.lang : (document.documentElement.lang === 'en' ? 'en' : 'id');
    const copy = () => COPY[language()];

    function finishIntro() {
        if (finished || !dataReady || failure) return;
        window.AnalogFitIntro?.finish(!skipped&&!reducedMotion&&(replaying||window.AnalogFitPrefs.get('intro')));
        finished=true;entryTimer=null;replaying=false;
        const shell=byId('appShell');shell.inert=false;shell.setAttribute('aria-busy','false');
        document.body.dataset.boot='ready';
        byId('btnExplore').focus({preventScroll:true});
        document.body.dataset.introElapsed=String(Math.round(performance.now()-started));
        byId('bootScreen').classList.add('is-leaving');byId('bootScreen').setAttribute('aria-hidden','true');
        setTimeout(()=>{if(document.body.dataset.boot==='ready')byId('bootScreen').hidden=true;},reducedMotion?0:600);
        window.dispatchEvent(new Event('analogfit:entered'));
    }

    // Percentages mark actual local script/data readiness, not a simulated network download.
    window.AnalogFitBoot = {
        step(value) {
            if (finished || failure) return;
            progress = Math.max(progress, value);
            byId('bootBar').style.width = progress + '%';
            byId('bootPercent').textContent = progress + '%';
            byId('bootProgress').setAttribute('aria-valuenow', String(progress));
            const en = (new URLSearchParams(location.hash.slice(1)).get('lang') || window.AnalogFitPrefs.get('language')) === 'en';
            const messages = en
                ? ['Preparing the explorer...', 'Loading map components...', 'Preparing Earth observations...', 'Comparing supported features...', 'Explorer ready.']
                : ['Menyiapkan penjelajah...', 'Memuat komponen peta...', 'Menyiapkan pengamatan Bumi...', 'Menyiapkan perbandingan berbukti...', 'Penjelajah siap.'];
            byId('bootMessage').textContent = messages[value >= 100 ? 4 : value >= 78 ? 3 : value >= 55 ? 2 : value >= 35 ? 1 : 0];
        },
        ready() {
            if (failure) return;
            if(!dataReady&&!skipped&&window.AnalogFitPrefs.get('intro'))started=window.AnalogFitIntro?.start()||performance.now();
            dataReady = true;
            this.step(100);
            clearTimeout(bootTimeout);
            if (finished || entryTimer) return;
            const duration = skipped ? 0 : (replaying || window.AnalogFitPrefs.get('intro')) ? 5000 : 0;
            entryTimer = setTimeout(finishIntro, Math.max(0,duration-(performance.now()-started)));
        },
        skip() {
            skipped = true;
            clearTimeout(entryTimer); entryTimer = null;
            if (dataReady) finishIntro();
        },
        replay() {
            started=performance.now();finished=false;failure=false;skipped=false;replaying=true;
            clearTimeout(entryTimer);entryTimer=null;
            document.body.dataset.boot='loading';
            document.getElementById('appShell').inert=true;
            document.getElementById('appShell').setAttribute('aria-busy','true');
            const screen=document.getElementById('bootScreen');
            screen.hidden=false;screen.classList.remove('is-leaving');screen.removeAttribute('aria-hidden');
            byId('skipIntro').focus({preventScroll:true});
            void screen.offsetWidth;
            started=window.AnalogFitIntro?.start(started)||started;
            this.ready();
        },
        fail() {
            if (finished || failure) return;
            failure = true;
            window.AnalogFitIntro?.finish(false);
            byId('bootScreen').dataset.renderer='fallback';
            clearTimeout(bootTimeout);
            byId('bootMessage').textContent = language() === 'id'
                ? 'Data lokal belum siap. Silakan muat ulang halaman.'
                : 'Local data could not initialize. Please reload the page.';
            byId('bootPercent').textContent = '!';
            byId('bootRetry').hidden = false;
            byId('bootRetry').onclick = () => location.reload();
        }
    };
    const bootTimeout = setTimeout(() => window.AnalogFitBoot.fail(), 12000);
    window.AnalogFitIntro?.prepare();
    window.addEventListener('analogfit:ready', () => window.AnalogFitBoot.ready());
    window.addEventListener('error', event => {
        if (finished) return;
        const target = event.target;
        if (event instanceof ErrorEvent || (target && target.tagName === 'SCRIPT')) window.AnalogFitBoot.fail();
    }, true);

    // The exact resources supplied by the user; unintegrated products never imply measured inputs.
    const RESOURCES = [
        {
            agency: 'NASA / EARTH', group: 'nasa', status: 'used', name: 'NASA Earthdata Search',
            url: 'https://search.earthdata.nasa.gov/',
            id: 'Portal pengamatan Bumi. Asal arsip SRTM/ASTER; elevasi aplikasi disajikan melalui OpenTopoData.',
            en: 'Earth-observation discovery portal. Archive origin for SRTM/ASTER; application elevation is served through OpenTopoData.'
        },
        {
            agency: 'NASA / EARTH', group: 'nasa', status: 'context', name: 'NASA Worldview',
            url: 'https://worldview.earthdata.nasa.gov/index.html',
            id: 'Penjelajah citra satelit NASA. Aplikasi menggunakan layanan GIBS untuk Blue Marble dan lapisan konteks, bukan sebagai masukan skor.',
            en: 'NASA satellite-imagery explorer. The application uses GIBS for Blue Marble and context layers, not as numerical scoring inputs.'
        },
        {
            agency: 'NASA / MOON & MARS', group: 'nasa', status: 'used', name: 'Planetary Data System',
            url: 'https://pds.nasa.gov/',
            id: 'Arsip observasi planet. Data DEM LOLA dan MOLA asli digunakan untuk petak referensi Bulan dan Mars.',
            en: 'Planetary-observation archive. Original LOLA and MOLA DEM products support the lunar and Martian reference patches.'
        },
        {
            agency: 'NASA / MOON', group: 'nasa', status: 'used', name: 'Lunar Reconnaissance Orbiter',
            url: 'https://pds-geosciences.wustl.edu/missions/lro/',
            id: 'Misi pengamatan Bulan. Produk LOLA digunakan untuk menurunkan kemiringan medan pada baseline 500 meter.',
            en: 'Lunar observation mission. LOLA products provide terrain slopes derived at a 500-metre baseline.'
        },
        {
            agency: 'NASA / MOON', group: 'nasa', status: 'context', name: 'LRO Diviner Lunar Data',
            url: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm',
            id: 'Segitiga PRP T1 telah diekstrak: rerata tahunan pada kedalaman 2 cm dan maksimum permukaan dari model termal. Hanya konteks; bukan pasangan suhu POWER atau bukti es.',
            en: 'The containing PRP triangle at T1 is extracted: modeled annual mean at 2 cm depth and surface maximum. Context only; not a POWER temperature counterpart or evidence of ice.'
        },
        {
            agency: 'CSA / RADAR', group: 'partner', status: 'reference', name: 'RADARSAT Constellation Mission',
            url: 'https://donnees-data.asc-csa.gc.ca/en/dataset/rcm',
            id: 'Konstelasi radar untuk pengamatan Bumi siang/malam dan berbagai kondisi cuaca. Rujukan untuk analisis radar lanjutan.',
            en: 'Radar constellation for day/night Earth observations across weather conditions. A reference for future radar analysis.'
        },
        {
            agency: 'CSA / RADAR', group: 'partner', status: 'reference', name: 'RADARSAT-1 Data',
            url: 'https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1',
            id: 'Arsip radar bukaan sintetis terbuka. Belum digunakan untuk menghitung kebatuan atau kekasaran pada aplikasi ini.',
            en: 'Open synthetic-aperture-radar archive. Not yet used to derive blockiness or roughness in this application.'
        },
        {
            agency: 'CSA / LEARNING', group: 'partner', status: 'reference', name: 'Synthetic Aperture Radar Tutorial',
            url: 'https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial',
            id: 'Tutorial Python dan QGIS untuk mengakses serta mengolah citra SAR. Materi pembelajaran, bukan dataset pengamatan.',
            en: 'Python and QGIS tutorial for accessing and processing SAR imagery. Learning material, not an observational dataset.'
        },
        {
            agency: 'ESA / EARTH', group: 'partner', status: 'used', name: 'Copernicus Data Space Ecosystem',
            url: 'https://dataspace.copernicus.eu/',
            id: 'Copernicus GLO-30 (DLR/Airbus, EU/ESA) mengisi 10 petak medan kosong, termasuk Mount Howe. COG asli diakses melalui distribusi publik AWS; baseline lereng 500 m.',
            en: 'Copernicus GLO-30 (DLR/Airbus, EU/ESA) fills ten missing terrain patches, including Mount Howe. Native COGs use the public AWS distribution; slope baseline is 500 m.'
        },
        {
            agency: 'ESA / OPEN SCIENCE', group: 'partner', status: 'reference', name: 'ESA Open Science Catalog',
            url: 'https://opensciencedata.esa.int/',
            id: 'Katalog dataset dan alur kerja geosains. Produk belum diintegrasikan ke perhitungan aplikasi.',
            en: 'Catalogue of geoscience datasets and workflows. Products are not yet integrated into application calculations.'
        },
        {
            agency: 'JAXA / EARTH', group: 'partner', status: 'reference', name: 'JAXA G-Portal',
            url: 'https://gportal.jaxa.jp/gpr/index/index',
            id: 'Portal produk pengamatan Bumi JAXA, termasuk hujan, salju dan vegetasi. Disediakan sebagai sumber lanjutan.',
            en: 'JAXA Earth-observation products, including precipitation, snow and vegetation. Provided as a resource for future integration.'
        }
    ];
    const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    };
    function renderResources() {
        const text = copy();
        const query = byId('resourceSearch').value.trim().toLocaleLowerCase();
        const filtered = RESOURCES.filter(resource =>
            (resourceFilter === 'all' || resource.group === resourceFilter) &&
            (resource.name + ' ' + resource.agency + ' ' + resource[language()]).toLocaleLowerCase().includes(query));
        const fragment = document.createDocumentFragment();
        for (const resource of filtered) {
            const card = element('article', 'resource-card');
            card.dataset.agency = resource.group;
            card.dataset.integration = resource.status;
            const meta = element('div', 'resource-meta');
            meta.append(element('span', 'agency-tag', resource.agency));
            meta.append(element('span', 'resource-status' + (resource.status !== 'reference' ? ' used' : ''), text[resource.status]));
            const link = element('a', '', text.open);
            link.href = resource.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('aria-label', text.open + ': ' + resource.name);
            card.append(meta, element('h2', '', resource.name), element('p', '', resource[language()]), link);
            fragment.append(card);
        }
        byId('resourceGrid').replaceChildren(fragment);
        byId('resourceCount').textContent = text.count(filtered.length);
        byId('resourceEmpty').hidden = filtered.length > 0;
        document.querySelectorAll('[data-resource-filter]').forEach(button =>
            button.setAttribute('aria-pressed', String(button.dataset.resourceFilter === resourceFilter)));
    }
    function translate() {
        const text = copy();
        document.querySelectorAll('[data-ui]').forEach(node => {
            const value = text[node.dataset.ui];
            if (typeof value === 'string') node.textContent = value;
        });
        byId('resourceSearch').placeholder = text.search;
        byId('resourceSearch').setAttribute('aria-label', text.search);
        byId('taskSel').setAttribute('aria-label', text.taskLabel);
        byId('targetSel').setAttribute('aria-label', text.targetLabel);
        const count = window.ANALOGFIT && window.ANALOGFIT.background.n;
        if (count != null) byId('sampleCount').textContent = text.samples(count);
        if (byId('dlgResources').open) renderResources();
    }
    function activeNavigation(id) {
        document.querySelectorAll('.primary-nav .nav-link').forEach(button => {
            const active = button.id === id;
            button.classList.toggle('active', active);
            if (active) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
        });
    }
    function openResources() {
        renderResources();
        activeNavigation('btnResources');
        byId('dlgResources').showModal();
    }
    function setPanel(id, focus = false) {
        const tabs = Array.from(document.querySelectorAll('[data-panel]'));
        tabs.forEach(button => {
            const active = button.dataset.panel === id;
            button.setAttribute('aria-selected', String(active));
            button.tabIndex = active ? 0 : -1;
            byId(button.dataset.panel).hidden = !active;
            if (active && focus) button.focus();
        });
    }
    function updatePresentation() {
        if (!window.analogfit) return;
        if (lastLanguage !== language()) {
            lastLanguage = language();
            translate();
        }
        const selected = window.analogfit.state.sel;
        const place = window.analogfit.places.find(item => item.id === selected);
        if (place) {
            byId('selectedCoordinate').textContent = Math.abs(place.lat).toFixed(2) +
                (place.lat >= 0 ? ' N' : ' S') + ' / ' + Math.abs(place.lon).toFixed(2) + (place.lon >= 0 ? ' E' : ' W');
        }
        if (selected !== lastSelection) {
            lastSelection = selected;
            if (!reducedMotion) {
                byId('detail').classList.remove('content-enter');
                requestAnimationFrame(() => byId('detail').classList.add('content-enter'));
            }
        }
    }
    window.addEventListener('analogfit:update', updatePresentation);
    document.addEventListener('DOMContentLoaded', () => {
        translate();
        byId('skipIntro').onclick=()=>window.AnalogFitBoot.skip();
        updatePresentation();
        if (window.analogfit) window.AnalogFitBoot.ready();
        byId('btnResources').onclick = openResources;
        byId('footerResources').onclick = openResources;
        byId('closeResources').onclick = () => byId('dlgResources').close();
        byId('btnExplore').onclick = () => {
            activeNavigation('btnExplore');
            if (window.innerWidth <= 1050) byId('stage').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        };
        for (const id of ['btnMethod', 'btnValidation']) {
            byId(id).addEventListener('click', () => activeNavigation(id));
        }
        document.querySelectorAll('dialog').forEach(dialog => {
            dialog.addEventListener('close', () => activeNavigation('btnExplore'));
            dialog.addEventListener('keydown', event => {
                // Search inputs consume Escape in some browsers. The modal still closes.
                if (event.key === 'Escape') {
                    event.preventDefault();
                    activeNavigation('btnExplore');
                    dialog.close();
                }
            });
            dialog.addEventListener('click', event => {
                if (event.target !== dialog) return;
                const rect = dialog.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
            });
        });
        byId('resourceSearch').oninput = renderResources;
        document.querySelectorAll('[data-resource-filter]').forEach(button => {
            button.onclick = () => { resourceFilter = button.dataset.resourceFilter; renderResources(); };
        });
        const tabs = Array.from(document.querySelectorAll('[data-panel]'));
        tabs.forEach((button, index) => {
            button.onclick = () => setPanel(button.dataset.panel);
            button.onkeydown = event => {
                let next;
                if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
                else if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
                else if (event.key === 'Home') next = tabs[0];
                else if (event.key === 'End') next = tabs[tabs.length - 1];
                if (next) { event.preventDefault(); setPanel(next.dataset.panel, true); }
            };
        });
    });
})();
