/* Decorative, offline WebGL opening. Actual perspective rays intersect shaded
   spheres; NASA Blue Marble is the Earth skin. Sizes/path are cinematic, not data. */
(() => {
 'use strict';
 const screen=document.getElementById('bootScreen');
 const canvas=document.getElementById('intro3d');
 const caption=document.getElementById('introFlightCaption');
 let gl=null,sphereProgram,starProgram,quad,stars,earthTexture;
 let sphereLocations={},starLocations={},request=0,started=0,active=false,frames=0,lastPhase='';
 let renderer='fallback',cameraState=null;
 const vertex=`
 attribute vec2 position;
 varying vec2 uv;
 void main(){uv=position;gl_Position=vec4(position,0.0,1.0);}`;
 const fragment=`
 precision highp float;
 varying vec2 uv;
 uniform vec2 resolution;
 uniform float time;
 uniform vec3 camera,forward,right,up;
 uniform sampler2D earth;
 const vec3 earthCenter=vec3(-4.7,-.25,-8.0);
 const vec3 moonCenter=vec3(.7,1.0,-13.8);
 const vec3 marsCenter=vec3(5.0,-1.2,-19.5);
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
 }
 float terrain(vec3 p){return .58*noise(p)+.28*noise(p*2.07)+.14*noise(p*4.13);}
 float sphere(vec3 origin,vec3 ray,vec3 center,float radius){
  vec3 offset=origin-center;float b=dot(offset,ray),c=dot(offset,offset)-radius*radius;
  float d=b*b-c;if(d<0.0)return 10000.0;
  float t=-b-sqrt(d);return t>.02?t:10000.0;
 }
 float crater(vec3 normal,vec3 center,float radius){
  float d=length(normal-normalize(center));
  return -.18*(1.0-smoothstep(radius*.65,radius,d))+.10*exp(-pow((d-radius)*32.0,2.0));
 }
 void main(){
  vec2 p=uv;p.x*=resolution.x/resolution.y;
  vec3 ray=normalize(forward+right*p.x*.49+up*p.y*.49);
  float a=sphere(camera,ray,earthCenter,1.9);
  float b=sphere(camera,ray,moonCenter,.82);
  float c=sphere(camera,ray,marsCenter,1.42);
  float hit=min(a,min(b,c));
  if(hit>9999.0){
   float nebula=.5+.25*sin(ray.x*3.0+ray.y*7.0)+.18*cos(ray.z*8.0-ray.y*2.0);
   vec3 glow=vec3(.02,.045,.085)*nebula;
   vec3 e=earthCenter-camera;float along=dot(e,ray);
   float edge=length(e-ray*along)-1.9;
   if(along>0.0)glow+=vec3(.09,.28,.62)*exp(-max(edge,0.0)*9.0)*.32;
   gl_FragColor=vec4(glow,.24);return;
  }
  vec3 center=hit==a?earthCenter:hit==b?moonCenter:marsCenter;
  vec3 point=camera+ray*hit,normal=normalize(point-center);
  vec3 light=normalize(vec3(-12.0,9.0,4.0)-center);
  float day=max(dot(normal,light),0.0),rim=pow(1.0-max(dot(normal,-ray),0.0),3.0);
  vec3 color;
  if(hit==a){
   float rotation=time*.16;
   vec3 n=vec3(cos(rotation)*normal.x+sin(rotation)*normal.z,normal.y,-sin(rotation)*normal.x+cos(rotation)*normal.z);
   vec2 map=vec2(atan(n.z,n.x)/6.2831853+.5,asin(clamp(n.y,-1.0,1.0))/3.14159265+.5);
   color=texture2D(earth,map).rgb*(.055+.98*day);
   color+=vec3(.10,.36,.72)*rim*(.2+.6*day);
  }else if(hit==b){
   float rough=terrain(normal*13.0);
   float craters=crater(normal,vec3(-.5,.2,.8),.20)+crater(normal,vec3(.3,.45,.8),.11)+crater(normal,vec3(.4,-.3,.8),.16);
   color=vec3(.68,.72,.79)*(.55+rough*.5+craters)*(.065+.94*day);
   color+=vec3(.12,.15,.21)*rim*.12;
  }else{
   float rough=terrain(normal*7.0);
   float band=1.0-smoothstep(.03,.14,abs(normal.y+.09*sin(normal.x*8.0)));
   color=mix(vec3(.48,.22,.12),vec3(.85,.60,.32),rough)*(.14+day*.86);
   color*=1.0-.24*band;
   color=mix(color,vec3(.86,.88,.9)*(.2+.8*day),smoothstep(.84,.98,abs(normal.y))*.8);
   color+=vec3(.32,.15,.06)*rim*.32;
  }
  gl_FragColor=vec4(color,1.0);
 }`;
 const starVertex=`
 attribute vec3 position;
 uniform vec3 camera,forward,right,up;
 uniform vec2 resolution;
 uniform float density;
 varying float brightness;
 void main(){
  vec3 v=position-camera;float z=dot(v,forward);
  gl_Position=vec4(dot(v,right)/(resolution.x/resolution.y*.49),dot(v,up)/.49,1.0008*z-.20008,z);
  gl_PointSize=clamp(3.0-z*.014,1.0,2.5)*density;
  brightness=.48+.5*fract(sin(dot(position,vec3(12.3,74.4,6.1)))*1741.2);
 }`;
 const starFragment=`precision mediump float;varying float brightness;
 void main(){float alpha=(1.0-smoothstep(.10,.50,length(gl_PointCoord-.5)))*brightness;
 gl_FragColor=vec4(vec3(.74,.86,1.0)*alpha,alpha);}`;
 const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
 const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const shots=[
  {at:0,eye:[-6,1.25,-1],look:[-4.7,-.25,-8]},
  {at:.65,eye:[-5.4,1.25,-1.8],look:[-4.7,-.25,-8]},
  {at:1.15,eye:[-2.1,1.7,-8.5],look:[.7,1,-13.8]},
  {at:2.05,eye:[-.4,1.7,-10.5],look:[.7,1,-13.8]},
  {at:2.55,eye:[1.6,.1,-14],look:[5,-1.2,-19.5]},
  {at:3.4,eye:[4,-.4,-15.3],look:[5,-1.2,-19.5]},
  {at:4.25,eye:[0,1.5,3],look:[0,0,-12]},
  {at:5,eye:[0,.4,-1],look:[0,0,-12]}
 ];
 function cameraAt(seconds){
  let i=0;while(i<shots.length-2&&seconds>shots[i+1].at)i++;
  const a=shots[i],b=shots[i+1],fraction=Math.max(0,Math.min(1,(seconds-a.at)/(b.at-a.at)));
  const t=fraction*fraction*(3-2*fraction),eye=mix(a.eye,b.eye,t),look=mix(a.look,b.look,t);
  const forward=normalize(subtract(look,eye)),right=normalize(cross(forward,[0,1,0])),up=cross(right,forward);
  return {eye,forward,right,up};
 }
 function program(vs,fs){
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(reason);}return s;}
  const v=shader(gl.VERTEX_SHADER,vs),f=shader(gl.FRAGMENT_SHADER,fs),p=gl.createProgram();
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
 }
 function locations(p,names){return Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]));}
 function init(){
  if(gl&&!gl.isContextLost())return true;
  try{
   gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
   if(!gl)throw Error('WebGL unavailable');
   sphereProgram=program(vertex,fragment);starProgram=program(starVertex,starFragment);
   sphereLocations=locations(sphereProgram,['resolution','time','camera','forward','right','up','earth']);
   starLocations=locations(starProgram,['resolution','camera','forward','right','up','density']);
   quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const positions=[];let seed=83191;
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<900;i++)positions.push((random()-.5)*140,(random()-.5)*90,-28-random()*145);
   stars=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,stars);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);
   earthTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,earthTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([38,85,137,255]));
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   const image=new Image();image.onload=()=>{
    if(!gl||gl.isContextLost())return;
    gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);screen.dataset.earthTexture='nasa';
    if(!screen.hidden&&document.body.dataset.boot==='loading'&&(!active||!window.AnalogFitPrefs.motionAllowed))draw(window.AnalogFitPrefs.motionAllowed?0:4.25);
   };
   image.src=window.NASA_BLUE_MARBLE || 'data/raw/blue_marble.jpg';
   renderer='webgl';screen.dataset.renderer=renderer;return true;
  }catch(_){renderer='fallback';screen.dataset.renderer=renderer;return false;}
 }
 function phase(t){
  const name=t<1.05?'earth':t<2.25?'moon':t<3.5?'mars':'arrival';
  if(name===lastPhase)return;lastPhase=name;screen.dataset.flightPhase=name;
  const id=(window.analogfit?.state.lang||window.AnalogFitPrefs.get('language'))==='id';
  caption.textContent=(id?{earth:'01 / Berangkat dari Bumi',moon:'02 / Melintasi orbit Bulan',mars:'03 / Mendekati Mars',arrival:'04 / Memasuki AnalogFit'}:
   {earth:'01 / Earth departure',moon:'02 / Lunar flyby',mars:'03 / Mars approach',arrival:'04 / Enter AnalogFit'})[name];
 }
 function draw(seconds){
  phase(seconds);cameraState=cameraAt(seconds);if(renderer!=='webgl'||!gl||gl.isContextLost())return;
  const width=screen.clientWidth,height=screen.clientHeight;
  const density=Math.min(devicePixelRatio||1,1.5,1100/Math.max(width,height));
  const w=Math.max(1,Math.round(width*density)),h=Math.max(1,Math.round(height*density));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(8/255,13/255,24/255,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const common=loc=>{
   gl.uniform2f(loc.resolution,w,h);gl.uniform3fv(loc.camera,cameraState.eye);
   gl.uniform3fv(loc.forward,cameraState.forward);gl.uniform3fv(loc.right,cameraState.right);gl.uniform3fv(loc.up,cameraState.up);
  };
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
  gl.useProgram(starProgram);common(starLocations);gl.uniform1f(starLocations.density,Math.max(1,density));
  gl.bindBuffer(gl.ARRAY_BUFFER,stars);const starPosition=gl.getAttribLocation(starProgram,'position');
  gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,900);gl.disableVertexAttribArray(starPosition);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(sphereProgram);common(sphereLocations);gl.uniform1f(sphereLocations.time,seconds);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.uniform1i(sphereLocations.earth,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,quad);const position=gl.getAttribLocation(sphereProgram,'position');
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disableVertexAttribArray(position);
  frames++;screen.dataset.flightFrames=String(frames);
 }
 function frame(now){
  if(!active)return;
  const seconds=Math.min(5,Math.max(0,(now-started)/1000));
  draw(window.AnalogFitPrefs.motionAllowed?seconds:4.25);
  if(active&&seconds<5&&window.AnalogFitPrefs.motionAllowed)request=requestAnimationFrame(frame);
 }
 function start(at=performance.now()){
  cancelAnimationFrame(request);started=at;active=true;frames=0;lastPhase='';
  screen.dataset.flightFrames='0';screen.dataset.flightPhase='earth';document.body.dataset.entryTransition='none';
  init();screen.classList.remove('flight-leaving','flight-running');void screen.offsetWidth;screen.classList.add('flight-running');
  draw(window.AnalogFitPrefs.motionAllowed?0:4.25);
  // Start the five-second flight after shader warm-up, not during compilation.
  started=performance.now();
  if(window.AnalogFitPrefs.motionAllowed)request=requestAnimationFrame(frame);
  return started;
 }
 function prepare(){
  if(!window.AnalogFitPrefs.get('intro'))return;
  init();draw(window.AnalogFitPrefs.motionAllowed?0:4.25);
 }
 function finish(animate){
  active=false;cancelAnimationFrame(request);
  document.body.dataset.entryTransition=animate?'3d':'none';
  if(animate)screen.classList.add('flight-leaving');
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer='fallback';screen.dataset.renderer=renderer;});
 canvas.addEventListener('webglcontextrestored',()=>{gl=null;if(active){init();frame(performance.now());}});
 window.addEventListener('resize',()=>{if(active)draw(window.AnalogFitPrefs.motionAllowed?Math.min(5,(performance.now()-started)/1000):4.25);});
 window.addEventListener('pagehide',()=>{active=false;cancelAnimationFrame(request);});
 window.addEventListener('analogfit:preferences',()=>{if(active){cancelAnimationFrame(request);frame(performance.now());}});
 window.AnalogFitIntro={start,prepare,finish,get state(){return {renderer,active,frames,phase:lastPhase,camera:cameraState?.eye.slice(),texture:screen.dataset.earthTexture||'pending'};}};
})();
