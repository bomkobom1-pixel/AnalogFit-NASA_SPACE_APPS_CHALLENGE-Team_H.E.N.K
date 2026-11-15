"""Fetch auditable NASA inputs and equal-baseline terrain. Resumable, no credentials.
python fetch_verified.py [--skip-power] [--skip-terrain] [--skip-targets]
Raw responses, PDS labels and byte slices are preserved under data/raw/.
No TLS verification bypass, synthetic fallback, or authentication is used.
"""
import argparse
import base64
import concurrent.futures
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import re
import time
import requests
import numpy as np

ROOT = Path(__file__).resolve().parent
RAW = ROOT / 'data' / 'raw'
CACHE = ROOT / 'verified_observations.json'
PDS = 'https://pds-geosciences.wustl.edu/'
LOLA = PDS + 'lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/'
BASELINE = 500.0

def now():
 return dt.datetime.now(dt.timezone.utc).isoformat()

def atomic_json(path, value):
 tmp=path.with_suffix(path.suffix+'.tmp')
 tmp.write_text(json.dumps(value,indent=1,allow_nan=False),encoding='utf-8')
 tmp.replace(path)

def get(url, headers=None):
 for attempt in range(4):
  try:
   r=requests.get(url,headers=headers,timeout=(15,60))
   if r.status_code == 429 or r.status_code >= 500:
    if attempt<3: time.sleep(3*(attempt+1)); continue
   r.raise_for_status()
   return r
  except requests.RequestException:
   if attempt==3: raise
   time.sleep(2*(attempt+1))

def preserve(name, response, url):
 path=RAW/name
 path.write_bytes(response.content)
 return {'url':url,'file':str(path.relative_to(ROOT)).replace('\\','/'),
         'sha256':hashlib.sha256(response.content).hexdigest(),'retrieved_utc':now(),
         'http_status':response.status_code,'content_range':response.headers.get('Content-Range')}

def slope(z, step=BASELINE):
 z=np.asarray(z,dtype=float).reshape(3,3)
 if not np.isfinite(z).all() or np.any(np.abs(z)>30000): raise ValueError('Invalid elevation grid')
 gx=(z[:-1,1:]-z[:-1,:-1]+z[1:,1:]-z[1:,:-1])/(2*step)
 gy=(z[1:,:-1]-z[:-1,:-1]+z[1:,1:]-z[:-1,1:])/(2*step)
 return float(np.degrees(np.arctan(np.median(np.hypot(gx,gy)))))

def locations(lat,lon,radius=6371008.8):
 # Local north/east offsets, 1 km square; each derivative spans 500 m.
 deg=radius*math.pi/180
 return [(lat+i*BASELINE/deg,lon+j*BASELINE/(deg*math.cos(math.radians(lat)))) for i in (-1,0,1) for j in (-1,0,1)]

def earth_terrain(data, cells):
 for dataset in ('srtm30m','aster30m'):
  todo=[c for c in cells if c[0] not in data['earth_terrain'] and abs(c[1])<=83 and ('srtm30m' if -56<=c[1]<=60 else 'aster30m')==dataset]
  for start in range(0,len(todo),11):
   batch=todo[start:start+11]
   pts=[p for _,lat,lon in batch for p in locations(lat,lon)]
   url='https://api.opentopodata.org/v1/'+dataset+'?locations='+'|'.join(f'{a:.7f},{b:.7f}' for a,b in pts)+'&interpolation=bilinear'
   try:
    r=get(url);j=r.json()
    if j.get('status')!='OK' or len(j['results'])!=len(pts): raise ValueError('Incomplete DEM response')
    evidence=preserve(f'earth_{dataset}_{batch[0][0]}.json',r,url)
    for i,(cid,lat,lon) in enumerate(batch):
     z=[p['elevation'] for p in j['results'][i*9:(i+1)*9]]
     if any(v is None for v in z): continue
     data['earth_terrain'][cid]={'lat':lat,'lon':lon,'z':z,'slope_500m_deg':slope(z),'baseline_m':BASELINE,'dataset':dataset,'source':evidence}
    atomic_json(CACHE,data)
    print(f'terrain {dataset}: {min(start+11,len(todo))}/{len(todo)}',flush=True)
   except Exception as e:
    print(f'terrain batch FAILED: {e}',flush=True)
   time.sleep(1.1)

def power_cell(cell):
 cid,lat,lon=cell
 params='TS,TS_MAX,TS_MIN,PRECTOTCORR,WS10M,Z0M,ALLSKY_SRF_ALB'
 url=f'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters={params}&community=AG&longitude={lon}&latitude={lat}&format=JSON'
 r=get(url); j=r.json(); p=j['properties']['parameter']; fill=j.get('header',{}).get('fill_value',-999)
 values={k:(float(v['ANN']) if v.get('ANN') is not None and v['ANN']!=fill and v['ANN']>-900 else None) for k,v in p.items()}
 # ANN is the service's annual climatology: never average rounded monthly summaries.
 if values.get('TS') is None or values.get('PRECTOTCORR') is None: raise ValueError('Missing annual climate values')
 evidence=preserve('power_'+cid+'.json',r,url)
 time.sleep(.7)
 return cid,{'values':values,'header':j.get('header',{}),'parameters':j.get('parameters',{}),'source':evidence}

def power_all(data,cells):
 todo=[c for c in cells if c[0] not in data['power']]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures={pool.submit(power_cell,c):c[0] for c in todo}
  for i,f in enumerate(concurrent.futures.as_completed(futures)):
   try:
    cid,value=f.result();data['power'][cid]=value
    atomic_json(CACHE,data)
   except Exception as e: print(f'POWER {futures[f]} FAILED: {e}',flush=True)
   if i%25==0: print(f'POWER: {i+1}/{len(todo)}',flush=True)

def label_number(text,key):
 match=re.search(r'^\s*'+re.escape(key)+r'\s*=\s*([\-\d.]+)',text,re.M)
 if not match: raise ValueError('Missing PDS keyword '+key)
 return float(match.group(1))

def planetary(data):
 specs={
  'T1':(-89.6,0.,'Moon',LOLA+'polar/img/ldem_80s_80m'),
  'T2':(8.3355,33.2229,'Moon',LOLA+'cylindrical/img/ldem_1024_00n_15n_030_060'),
  'T3':(45.,200.,'Mars',PDS+'mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n180hb')}
 for tid,(lat,lon,body,base) in specs.items():
  if tid in data['targets']: continue
  r=get(base+'.lbl');text=r.text.replace('\r','');lm=preserve(tid+'.lbl',r,base+'.lbl')
  width=int(label_number(text,'LINE_SAMPLES'));height=int(label_number(text,'LINES'))
  bits=int(label_number(text,'SAMPLE_BITS'));bpp=bits//8
  endian='<' if 'LSB_INTEGER' in text else '>'
  scale=label_number(text,'SCALING_FACTOR') if 'SCALING_FACTOR' in text else 1.
  rad=label_number(text,'A_AXIS_RADIUS')*1000
  coords=locations(lat,lon,rad)
  if 'POLAR STEREOGRAPHIC' in text:
   # South-polar spherical stereographic, lon0=0, y towards lon0.
   ps=label_number(text,'MAP_SCALE');offr=label_number(text,'LINE_PROJECTION_OFFSET');offc=label_number(text,'SAMPLE_PROJECTION_OFFSET')
   rows=[];cols=[]
   for la,lo in coords:
    rho=2*rad*math.tan(math.pi/4+math.radians(la)/2)
    x=rho*math.sin(math.radians(lo));y=rho*math.cos(math.radians(lo))
    rows.append(offr-y/ps);cols.append(offc+x/ps)
  else:
   ppd=label_number(text,'MAP_RESOLUTION');north=label_number(text,'MAXIMUM_LATITUDE');west=label_number(text,'WESTERNMOST_LONGITUDE')
   rows=[(north-a)*ppd-.5 for a,b in coords];cols=[(b-west)*ppd-.5 for a,b in coords]
  row0=int(math.floor(min(rows)));row1=int(math.floor(max(rows)))+1
  if row0<0 or row1>=height or min(cols)<0 or max(cols)>=width-1: raise ValueError('Target crosses product bounds')
  first=row0*width*bpp;last=(row1+1)*width*bpp-1
  rr=get(base+'.img',headers={'Range':f'bytes={first}-{last}'})
  if rr.status_code!=206 or not rr.headers.get('Content-Range','').startswith(f'bytes {first}-{last}/') or len(rr.content)!=last-first+1:
   raise ValueError('Server did not honor PDS byte range')
  meta=preserve(tid+'.slice',rr,base+'.img')
  arr=np.frombuffer(rr.content,dtype=endian+'i'+str(bpp)).reshape(row1-row0+1,width)
  zs=[]
  for row,col in zip(rows,cols):
   y=row-row0;i=int(math.floor(y));j=int(math.floor(col));dy=y-i;dx=col-j
   vals=arr[i:i+2,j:j+2].astype(float)
   if np.any(vals<=-32767): raise ValueError('PDS fill in target patch')
   zs.append(float(((1-dy)*((1-dx)*vals[0,0]+dx*vals[0,1])+dy*((1-dx)*vals[1,0]+dx*vals[1,1]))*scale))
  data['targets'][tid]={'lat':lat,'lon':lon,'body':body,'z':zs,'slope_500m_deg':slope(zs),'baseline_m':BASELINE,
    'sample_locations':coords,'source':meta,'label':lm,'row0':row0,'width':width,'native_pixel_m':80 if tid=='T1' else float(rad*math.pi/180/label_number(text,'MAP_RESOLUTION')),
    'note':'Interpolated orbital DEM, 3x3 samples at 500 m, 1 km footprint. Regional surface terrain; does not resolve pit interiors, caves or landing hazards. T1 is an explicit reference patch, not a verified base location.'}
  atomic_json(CACHE,data)
  print(f'{tid}: NASA {body} slope at 500 m = {slope(zs):.4f} deg',flush=True)

def imagery(data):
 if data.get('blue_marble'): return
 url='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg'
 r=get(url)
 if not r.content.startswith(b'\xff\xd8'): raise ValueError('GIBS did not return JPEG')
 data['blue_marble']=preserve('blue_marble.jpg',r,url)
 (ROOT/'vendor'/'nasa_texture.js').write_text('window.NASA_BLUE_MARBLE = '+json.dumps('data:image/jpeg;base64,'+base64.b64encode(r.content).decode())+';\n',encoding='utf-8')
 atomic_json(CACHE,data)

def main():
 ap=argparse.ArgumentParser(description=__doc__)
 for flag in ('power','terrain','targets'): ap.add_argument('--skip-'+flag,action='store_true')
 args=ap.parse_args();RAW.mkdir(parents=True,exist_ok=True)
 data=json.loads(CACHE.read_text()) if CACHE.exists() else {'schema':1,'baseline_m':BASELINE,'earth_terrain':{},'power':{},'targets':{}}
 from analogfit_pipeline import build_benchmark_earth_grid
 cells=[(r.cell_id,float(r.lat),float(r.lon)) for r in build_benchmark_earth_grid().itertuples()]
 bg=json.loads((ROOT/'nasa_background.json').read_text())
 cells += [(f'BG_{i:04d}',a,b) for i,(a,b) in enumerate(zip(bg['lat'],bg['lon']))]
 if not args.skip_targets: planetary(data)
 imagery(data)
 if not args.skip_terrain: earth_terrain(data,cells)
 if not args.skip_power: power_all(data,cells)
 print({k:len(data[k]) for k in ('targets','earth_terrain','power')},flush=True)

if __name__=='__main__': main()
