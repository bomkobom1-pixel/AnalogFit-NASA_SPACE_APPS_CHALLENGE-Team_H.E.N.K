/* Original NASA images, explicit provenance, and a same-bounds swipe comparison. */
(() => {
    'use strict';
    const $=id=>document.getElementById(id);
    let mode='detailed', split=50, lastSite=null;
    const en=()=>window.analogfit?.state.lang==='en';
    const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
    function selected() {
        return window.analogfit?.places.find(p=>p.id===window.analogfit.state.sel);
    }
    function image(meta,alt) {
        const img=node('img','nasa-terrain-image');
        img.alt=alt;img.decoding='async';img.draggable=false;
        img.onload=()=>img.classList.add('image-ready');
        img.onerror=()=>{img.hidden=true;img.parentElement?.append(node('p','image-failure',en()?'Image unavailable. Open the original NASA source.':'Citra tidak tersedia. Buka sumber NASA asli.'));};
        img.src=meta.file;
        return img;
    }
    function scene(record,large=false) {
        const frame=node('div','terrain-image-frame'+(large?' large':''));
        const sat=record.satellite?.available, dem=record.relief?.available;
        const detailed=record.detailed_satellite?.available;
        const activeMode=mode==='compare'&&!(sat&&dem)?(sat?'satellite':'relief'):mode==='relief'&&!dem?'satellite':mode==='detailed'&&!detailed?'satellite':mode;
        frame.dataset.mode=activeMode;
        const add=(kind,overlay=false)=>{
            const metadata=kind==='detailed'?record.detailed_satellite:kind==='comparisonSatellite'?(detailed?record.detailed_satellite:record.satellite):record[kind];
            const img=image(metadata,kind!=='relief'
                ? (en()?'NASA MODIS satellite view of the selected Earth site':'Citra satelit NASA MODIS untuk lokasi Bumi terpilih')
                : (en()?'NASA/METI ASTER colored elevation relief':'Relief elevasi berwarna NASA/METI ASTER'));
            if(overlay){const layer=node('div','terrain-swipe-layer');layer.style.clipPath='inset(0 '+(100-split)+'% 0 0)';layer.append(img);frame.append(layer);}
            else frame.append(img);
        };
        if(activeMode==='compare'&&sat&&dem){
            add('comparisonSatellite');add('relief',true);
            const line=node('div','terrain-swipe-line');line.style.left=split+'%';frame.append(line);
            const slider=node('input','terrain-compare-slider');
            slider.type='range';slider.min='0';slider.max='100';slider.value=String(split);
            slider.setAttribute('aria-label',en()?'Swipe satellite and elevation relief':'Geser perbandingan satelit dan relief elevasi');
            slider.oninput=()=>{
                split=Number(slider.value);
                frame.querySelector('.terrain-swipe-layer').style.clipPath='inset(0 '+(100-split)+'% 0 0)';
                line.style.left=split+'%';
            };
            frame.append(slider,node('span','terrain-corner-label left',en()?'ELEVATION RELIEF':'RELIEF ELEVASI'),node('span','terrain-corner-label right',detailed?'LANDSAT':'MODIS'));
        }else if((activeMode==='satellite'&&sat)||(activeMode==='relief'&&dem)||(activeMode==='detailed'&&detailed)){
            add(activeMode);
        }else{
            frame.append(node('p','image-failure',en()?'No cached NASA view is available for this site.':'Belum ada citra NASA tersimpan untuk lokasi ini.'));
        }
        const cross=node('span','image-site-reticle','+');
        cross.setAttribute('aria-hidden','true');
        // Marker follows the actual point even if a date-line bound was clipped.
        cross.style.left=((record.lon-record.bbox[1])/(record.bbox[3]-record.bbox[1])*100)+'%';
        cross.style.top=((record.bbox[2]-record.lat)/(record.bbox[2]-record.bbox[0])*100)+'%';
        frame.append(cross);
        if(!large){
            const expand=node('button','image-expand',en()?'Enlarge ↗':'Perbesar ↗');
            expand.type='button';expand.onclick=open;
            frame.append(expand);
        }
        return frame;
    }
    function controls(record,onChange) {
        const bar=node('div','terrain-photo-tabs');
        for(const [value,label]of [['detailed','Landsat'],['satellite','MODIS'],['relief','Relief'],['compare',en()?'Compare':'Bandingkan']]){
            const b=node('button','',label);b.type='button';b.dataset.terrainMode=value;
            const can=value==='compare'?record.satellite?.available&&record.relief?.available:value==='detailed'?record.detailed_satellite?.available:record[value]?.available;
            b.disabled=!can;b.setAttribute('aria-pressed',String(mode===value));
            if(!can)b.title=en()?'Source unavailable for this location':'Sumber tidak tersedia untuk lokasi ini';
            b.onclick=()=>{mode=value;onChange();};
            bar.append(b);
        }
        return bar;
    }
    function caption(record) {
        const cap=node('div','terrain-photo-caption');
        const historical=(mode==='detailed'||mode==='compare')&&record.detailed_satellite?.available;
        const metadata=mode==='relief'?record.relief:historical?record.detailed_satellite:record.satellite;
        cap.append(node('p','hint',en()
            ? 'Approx. 50 km regional context; the scored slope patch is about 1 km. Clouds, snow and data gaps can obscure the surface.'
            : 'Konteks regional sekitar 50 km; petak lereng yang dinilai sekitar 1 km. Awan, salju dan data kosong dapat menutupi permukaan.'));
        const date=metadata?.requested_date;
        cap.append(node('p','image-date',mode==='relief'
            ? 'NASA/METI ASTER · '+(en()?'static multi-date DEM visualization':'visualisasi DEM multiwaktu')
            : historical?'NASA Landsat WELD · '+(en()?'historical annual composite, service time: ':'komposit tahunan historis, waktu layanan: ')+(date||'N/A')
            : 'NASA MODIS · '+(en()?'requested imagery date: ':'tanggal citra yang diminta: ')+(date||'N/A')));
        if(historical)cap.append(node('p','image-date historical-image-note',en()?'Historical view: this does not establish present-day site conditions. Switch to MODIS for the other dated view.':'Tampilan historis: tidak menetapkan kondisi lokasi saat ini. Pilih MODIS untuk citra bertanggal lainnya.'));
        if(mode==='compare')cap.append(node('p','image-date',en()?'Satellite and ASTER views share the same displayed bounds; they are different products and acquisition periods.':'Citra satelit dan ASTER memakai batas tampilan yang sama; produk dan periode akuisisinya berbeda.'));
        if(metadata?.url){
            const link=node('a','image-source-link',en()?'Original NASA image and request ↗':'Citra dan permintaan NASA asli ↗');
            link.href=metadata.url;link.target='_blank';link.rel='noopener noreferrer';cap.append(link);
        }
        return cap;
    }
    function renderCard() {
        const place=selected();if(!place||!window.ANALOGFIT_MEDIA)return;
        const record=window.ANALOGFIT_MEDIA.sites[place.id];
        $('terrainImageryCard')?.remove();
        if(window.AnalogFitPrefs?.get('imagery')===false)return;
        const card=node('section','terrain-imagery-card');card.id='terrainImageryCard';
        const title=node('div','terrain-imagery-heading');
        title.append(node('h2','',en()?'Terrain imagery':'Citra medan'),node('span','chip measured','NASA'));
        card.append(title);
        if(record){
            if(lastSite!==place.id){lastSite=place.id;mode=record.detailed_satellite?.available?'detailed':'satellite';}
            if(mode==='detailed'&&!record.detailed_satellite?.available)mode='satellite';
            if(mode==='relief'&&!record.relief?.available)mode='satellite';
            if(mode==='compare'&&!(record.satellite?.available&&record.relief?.available))mode='satellite';
            card.append(controls(record,()=>{renderCard();if($('dlgTerrainPhoto').open)renderLarge();}),scene(record),caption(record));
        }else{
            card.append(node('p','hint',en()?'This scan cell has no offline close-up. The NASA map layers still provide regional visual context.':'Sel pindai ini belum memiliki cuplikan offline. Lapisan peta NASA tetap menyediakan konteks visual regional.'));
            const link=node('a','image-source-link',en()?'Explore this area in NASA Worldview ↗':'Jelajahi area di NASA Worldview ↗');
            const lat=place.lat,lon=place.lon;
            link.href='https://worldview.earthdata.nasa.gov/?v='+[lon-1,lat-1,lon+1,lat+1].join(',');
            link.target='_blank';link.rel='noopener noreferrer';card.append(link);
        }
        $('detail').querySelector('.scoreline')?.before(card);
    }
    function renderLarge() {
        const place=selected(),record=window.ANALOGFIT_MEDIA.sites[place?.id];
        if(!record)return;
        const body=$('terrainPhotoBody'),close=node('button','btn close',en()?'Close':'Tutup');
        close.onclick=()=>$('dlgTerrainPhoto').close();
        body.replaceChildren(close,node('p','eyebrow','NASA / VISUAL CONTEXT'),
            node('h1','',place.name),controls(record,()=>{renderLarge();renderCard();}),scene(record,true),caption(record),
            node('p','hint',en()?'Satellite imagery is not a ground-level photograph and is excluded from the similarity score. A requested date does not guarantee the acquisition time of every pixel.':'Citra satelit bukan foto dari permukaan tanah dan tidak masuk ke skor kemiripan. Tanggal permintaan tidak menjamin waktu akuisisi setiap piksel.'));
    }
    function open(){renderLarge();if(!$('dlgTerrainPhoto').open)$('dlgTerrainPhoto').showModal();}
    window.addEventListener('analogfit:update',()=>{renderCard();if($('dlgTerrainPhoto')?.open)renderLarge();});
    document.addEventListener('DOMContentLoaded',renderCard);
    window.AnalogFitTerrainMedia={open,get mode(){return mode;}};
})();
