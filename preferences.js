/* Local interface preferences only. Scientific values and weights are untouched. */
(() => {
    'use strict';
    const defaults = {
        intro: true, motion: true, imagery: true, terrain: true,
        expandedScience: true, compactStats: false, globeRotation: false,
        defaultView: '2d', language: 'en', volume: 25, sfx: true, music: true
    };
    let values = {...defaults};
    // v2: audio became on by default; v1 files stored the old "off" for everyone, so they are not read.
    const storageKey = 'analogfit.preferences.v2';
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        for (const [key,value] of Object.entries(saved)) {
            if (!(key in defaults)) continue;
            if (typeof defaults[key] === 'boolean' && typeof value === 'boolean') values[key]=value;
            if (key==='defaultView' && ['2d','3d'].includes(value)) values[key]=value;
            if (key==='language' && ['en','id'].includes(value)) values[key]=value;
            if (key==='volume' && Number.isFinite(value)) values[key]=Math.max(0,Math.min(100,value));
        }
    } catch (_) { /* Private/file browsing can restrict storage. */ }
    function apply() {
        // The in-app switch decides; the OS reduced-motion setting is deliberately not consulted.
        document.body.dataset.motion = values.motion ? 'on' : 'off';
        document.body.dataset.compactStats = String(values.compactStats);
        document.body.dataset.expandedScience = String(values.expandedScience);
    }
    function set(key,value) {
        if (!(key in defaults)) return;
        if (typeof defaults[key] === 'boolean') value=!!value;
        if (key==='defaultView' && !['2d','3d'].includes(value)) return;
        if (key==='language' && !['en','id'].includes(value)) return;
        if (key==='volume') value=Math.max(0,Math.min(100,Number(value)||0));
        values[key]=value;
        try { localStorage.setItem(storageKey,JSON.stringify(values)); } catch (_) {}
        apply();
        window.dispatchEvent(new CustomEvent('analogfit:preferences',{detail:{key,value}}));
    }
    apply();
    window.AnalogFitPrefs={get:key=>values[key],set,
        reset:()=>{for(const [key,value]of Object.entries(defaults))set(key,value);window.dispatchEvent(new Event('analogfit:preferencesreset'));},
        get values(){return {...values};},
        get motionAllowed(){return values.motion;}};
})();
