/* Original synthesized ambience and interaction tones. No third-party recordings.
   Both channels default on; browser audio unlocks on the first interaction. */
(() => {
    'use strict';
    let context = null, master = null, musicBus = null, analyser = null, musicFilter = null;
    let sfxEnabled = window.AnalogFitPrefs?.get('sfx') ?? true,
        musicEnabled = window.AnalogFitPrefs?.get('music') ?? true,
        volume = (window.AnalogFitPrefs?.get('volume') ?? 25) / 100;
    let chordTimer = null, noteTimer = null, voices = [];
    let lastTick = 0;
    const $ = id => document.getElementById(id);
    const isEnglish = () => window.analogfit?.state.lang === 'en';

    async function activate() {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        if (!context) {
            context = new Audio();
            master = context.createGain();
            master.gain.value = volume;
            analyser = context.createAnalyser();
            analyser.fftSize = 1024;
            master.connect(analyser).connect(context.destination);
        }
        try { if (context.state === 'suspended') await context.resume(); }
        catch (_) { return false; }
        return context.state === 'running';
    }
    function note(frequency, when, duration, strength, destination = master, type = 'sine') {
        if (!context || !destination) return;
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, when);
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(strength, when + Math.min(.04, duration / 4));
        gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
        oscillator.connect(gain).connect(destination);
        oscillator.start(when);
        oscillator.stop(when + duration + .02);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    function effect(kind = 'click') {
        if (!sfxEnabled || document.hidden || context?.state !== 'running') return;
        const now = context.currentTime;
        if (kind === 'tick') {
            if (performance.now() - lastTick < 100) return;
            lastTick = performance.now();
            note(420, now, .045, .055);
        } else if (kind === 'select') {
            note(392, now, .14, .08);
            note(587.33, now + .065, .19, .065);
        } else {
            note(740, now, .07, .055);
            note(1110, now + .012, .045, .018);
        }
    }
    function stopMusic() {
        clearInterval(chordTimer); clearInterval(noteTimer);
        chordTimer = noteTimer = null;
        if (!context || !musicBus) return;
        const bus = musicBus, filter = musicFilter;
        bus.gain.cancelScheduledValues(context.currentTime);
        bus.gain.setTargetAtTime(0, context.currentTime, .08);
        voices.forEach(oscillator => { try { oscillator.stop(context.currentTime + .35); } catch (_) {} });
        voices = [];
        setTimeout(() => { bus.disconnect(); filter?.disconnect(); }, 450);
        musicBus = null;
        musicFilter = null;
    }
    function startMusic() {
        if (!musicEnabled || document.hidden || context?.state !== 'running' || musicBus) return;
        musicBus = context.createGain();
        musicBus.gain.setValueAtTime(0, context.currentTime);
        musicBus.gain.linearRampToValueAtTime(.55, context.currentTime + 1.5);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 1100; filter.Q.value = .25;
        musicFilter = filter;
        musicBus.connect(filter).connect(master);
        // Slow, evolving pad voicings with sparse original pentatonic notes.
        const chords = [[110,164.8138,220,329.6276],[87.3071,130.8128,174.6141,261.6256],
            [130.8128,195.9977,261.6256,391.9954],[97.9989,146.8324,195.9977,293.6648]];
        let chord = 0, step = 0;
        voices = chords[0].map((frequency, index) => {
            const oscillator = context.createOscillator(), gain = context.createGain();
            oscillator.type = 'sine'; oscillator.frequency.value = frequency;
            oscillator.detune.value = index % 2 ? 3 : -3;
            gain.gain.value = index === 0 ? .065 : .035;
            oscillator.connect(gain).connect(musicBus); oscillator.start();
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
            return oscillator;
        });
        chordTimer = setInterval(() => {
            chord = (chord + 1) % chords.length;
            voices.forEach((oscillator, index) =>
                oscillator.frequency.setTargetAtTime(chords[chord][index], context.currentTime, 1.2));
        }, 10000);
        const melody = [440,659.255,523.251,783.991,659.255,523.251,391.995,587.33];
        noteTimer = setInterval(() => {
            if (musicBus && context.state === 'running') {
                note(melody[step++ % melody.length], context.currentTime, 2.7, .025, musicBus);
            }
        }, 2500);
    }
    function render() {
        const en = isEnglish();
        $('toggleSfx').textContent = (en ? 'Interaction sounds' : 'Suara interaksi') + (sfxEnabled ? ' · ON' : ' · OFF');
        $('toggleMusic').textContent = (en ? 'Ambient music' : 'Musik ambient') + (musicEnabled ? ' · ON' : ' · OFF');
        $('toggleSfx').setAttribute('aria-pressed', String(sfxEnabled));
        $('toggleMusic').setAttribute('aria-pressed', String(musicEnabled));
        $('btnSettings').classList.toggle('sound-enabled', sfxEnabled || musicEnabled);
        $('audioVolumeValue').textContent = Math.round(volume * 100) + '%';
        document.querySelector('[data-experience=audioHint]').textContent = en
            ? 'Sound and music default to on and start with your first interaction. Turn either off here. Music pauses in background tabs.'
            : 'Suara dan musik aktif secara bawaan dan dimulai pada interaksi pertama. Matikan masing-masing di sini. Musik dijeda saat tab di latar.';
    }
    document.addEventListener('DOMContentLoaded', () => {
        $('toggleSfx').onclick = () => window.AnalogFitPrefs.set('sfx',!sfxEnabled);
        $('toggleMusic').onclick = () => window.AnalogFitPrefs.set('music',!musicEnabled);
        $('audioVolume').value=String(Math.round(volume*100));
        $('audioVolume').oninput = event => {
            volume = Number(event.target.value) / 100;
            window.AnalogFitPrefs?.set('volume',Number(event.target.value));
            if (master) master.gain.setTargetAtTime(volume, context.currentTime, .04);
            render();
        };
        async function unlock(event) {
            if (!event.isTrusted || (!sfxEnabled && !musicEnabled) || document.hidden) return false;
            try {
                if (!await activate()) return false;
                if (musicEnabled) startMusic();
                return true;
            } catch (_) { return false; }
        }
        document.addEventListener('click', async event => {
            if (!await unlock(event)) return;
            if (event.target.closest('button, summary, .resource-card a') &&
                !event.target.closest('#toggleSfx')) effect();
        });
        document.addEventListener('keydown', event => {
            if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey &&
                !['Escape','Shift','Control','Meta','Alt'].includes(event.key)) void unlock(event);
        });
        document.addEventListener('change', event => {
            if (event.target.matches('select')) effect('select');
        });
        document.addEventListener('input', event => {
            if (event.target.matches('input[type=range]') && event.target.id !== 'audioVolume') effect('tick');
        });
        render();
        // Start with the intro where the browser permits autoplay; otherwise the first click or key starts it.
        if ((sfxEnabled || musicEnabled) && !document.hidden)
            activate().then(running => { if (running && musicEnabled) startMusic(); });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopMusic();
        else if (musicEnabled && context?.state === 'running') startMusic();
    });
    window.addEventListener('pagehide', stopMusic);
    window.addEventListener('analogfit:update', () => { if ($('toggleSfx')) render(); });
    window.addEventListener('analogfit:preferences',event=>{
        if(event.detail.key==='sfx') {sfxEnabled=window.AnalogFitPrefs.get('sfx');render();return;}
        if(event.detail.key==='music') {
            musicEnabled=window.AnalogFitPrefs.get('music');
            if(musicEnabled)startMusic();else stopMusic();
            render();return;
        }
        if(event.detail.key!=='volume')return;
        volume=window.AnalogFitPrefs.get('volume')/100;
        $('audioVolume').value=String(Math.round(volume*100));
        if(master)master.gain.setTargetAtTime(volume,context.currentTime,.04);
        render();
    });
    window.AnalogFitAudio = {
        effect,
        energy() {
            if (!analyser) return 0;
            const wave = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(wave);
            return Math.sqrt(wave.reduce((sum,value) => sum + value * value, 0) / wave.length);
        },
        get state() { return { sfxEnabled, musicEnabled, volume, contextState: context?.state || 'not-created', musicPlaying: !!musicBus }; }
    };
})();
