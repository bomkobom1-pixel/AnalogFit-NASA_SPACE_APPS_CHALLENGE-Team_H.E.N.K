/* Brief evidence walkthroughs. Hypotheses are never labeled discoveries. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),en=()=>window.analogfit?.state.lang==='en';
 const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
 const cases=[{id:'HYP_H2',target:'T1',task:'Navigation',
  title:['Mount Howe: test a polar-lighting hypothesis','Mount Howe: uji hipotesis cahaya kutub'],
  question:['Can low-Sun geometry compensate for different terrain?','Dapatkah geometri Matahari rendah menutupi perbedaan medan?'],
  evidence:['Earth slope uses Copernicus GLO-30; the target uses NASA LOLA. Solar geometry is calculated separately on both worlds.','Lereng Bumi memakai Copernicus GLO-30; target memakai LOLA NASA. Geometri Matahari dihitung terpisah untuk kedua dunia.'],
  limits:['A seasonally low Sun is not a lunar polar ridge. The score tests only supported features; it does not verify persistent shadows, exposed rock, access or mission suitability.','Matahari rendah musiman bukan punggung kutub Bulan. Skor hanya menguji ciri berbukti; tidak memverifikasi bayangan permanen, batu tersingkap, akses atau kelayakan misi.']},
  {id:'HYP_H4',target:'T2',task:'Navigation',
  title:['Harrat Khaybar: surface terrain versus a cave claim','Harrat Khaybar: medan permukaan dan klaim gua'],
  question:['What does an arid lava-field comparison actually establish?','Apa yang sebenarnya dibuktikan perbandingan lapangan lava tandus?'],
  evidence:['NASA SRTM/ASTER and LOLA provide a 500 m slope comparison; POWER describes regional climate. Imagery is visual context.','SRTM/ASTER dan LOLA NASA menyediakan perbandingan lereng 500 m; POWER menjelaskan iklim regional. Citra memberi konteks visual.'],
  limits:['No scored mineralogy, subsurface geometry or cave thermal measurement is available. A high surface score would not demonstrate a lava-tube habitat analog.','Mineralogi, geometri bawah tanah dan suhu gua belum masuk ke skor. Skor permukaan tinggi tidak membuktikan analog habitat lava tube.']}];
 function render(){
  $('btnWalkthrough').textContent=en()?'Evidence tour':'Tur bukti';
  $('startEvidenceTour').textContent=$('btnWalkthrough').textContent;
  if(!$('dlgWalkthrough').open)return;
  const app=window.analogfit,body=$('walkthroughBody'),close=node('button','btn close',en()?'Close':'Tutup');
  close.onclick=()=>$('dlgWalkthrough').close();
  body.replaceChildren(close,node('p','eyebrow','ANALOGFIT / EVIDENCE WALKTHROUGH'));
  const title=node('h1','',en()?'A candidate is a question to test.':'Kandidat adalah pertanyaan untuk diuji.');title.id='walkthroughTitle';body.append(title,
   node('p','hint',en()?'Two examples show what the current data can explain, and what they cannot establish. Scores below are computed live with standard navigation weights.':'Dua contoh menunjukkan hal yang dapat dijelaskan data dan batasnya. Skor dihitung langsung dengan bobot navigasi standar.'));
  const grid=node('div','tour-cases');
  for(const item of cases){
   const p=app.places.find(p=>p.id===item.id);if(!p)continue;
   const r=app.score(p,'real',item.target,ANALOGFIT.tasks[item.task].weights),i=en()?0:1;
   const card=node('article','tour-case');card.dataset.case=item.id;
   card.append(node('span','eyebrow',item.id+' / '+item.target+' / NAVIGATION'),node('h2','',item.title[i]),node('p','',item.question[i]));
   const score=r.F==null?'N/A':(r.F*100).toFixed(2);
   card.append(node('strong','',score+' / 100 · '+Math.round(r.covReal*100)+'% '+(en()?'supported':'didukung')),
    node('p','',item.evidence[i]),node('p','hint',item.limits[i]));
   const button=node('button','btn',en()?'Inspect this comparison →':'Periksa perbandingan →');
   button.dataset.inspectCase=item.id;
   button.onclick=()=>{
    $('dlgWalkthrough').close();
    for(const [id,value]of [['targetSel',item.target],['taskSel',item.task]]){$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));}
    document.querySelector('[data-mode=real]').click();
    app.select(item.id,true);
   };
   card.append(button);grid.append(card);
  }
  const valid=ANALOGFIT.validation,testable=valid.filter(r=>r.percentile_vs_global_land!=null),passes=testable.filter(r=>r.result==='PASS');
  body.append(grid,node('p','tour-summary',en()
   ?'Current role diagnostics: '+passes.length+'/'+testable.length+' testable roles pass; '+(valid.length-testable.length)+' cannot be tested. More coverage does not guarantee validation. ISRU still lacks comparable mineral, grain-size and ice evidence.'
   :'Diagnostik peran: '+passes.length+'/'+testable.length+' peran yang dapat diuji lolos; '+(valid.length-testable.length)+' belum dapat diuji. Cakupan lebih besar tidak menjamin validasi. ISRU masih kekurangan bukti mineral, ukuran butir dan es yang setara.'));
 }
 $('btnWalkthrough').onclick=()=>{$('dlgWalkthrough').showModal();render();};
 $('startEvidenceTour').onclick=()=>$('btnWalkthrough').click();
 document.addEventListener('DOMContentLoaded',render);window.addEventListener('analogfit:update',render);
})();
