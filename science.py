"""Evidence rules shared by feature generation and scoring."""
import hashlib
import json
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent

def observation_sources(value):
 """Walk nested multi-tile and context provenance, not only a primary source."""
 if isinstance(value,dict):
  if {'file','sha256','url'}<=value.keys():yield value
  else:
   for child in value.values():yield from observation_sources(child)
 elif isinstance(value,list):
  for child in value:yield from observation_sources(child)

def load_observations():
 path=ROOT/'verified_observations.json'
 if not path.exists(): return {'targets':{},'power':{},'earth_terrain':{}}
 data=json.loads(path.read_text(encoding='utf-8'))
 checked=set()
 # Integrity failure is a hard error; stale/edited observations cannot silently enter scores.
 for meta in observation_sources(data):
    if not meta or meta['file'] in checked: continue
    raw=(ROOT/meta['file']).resolve()
    if not raw.is_relative_to(ROOT/'data'/'raw'): raise ValueError('Observation path outside data/raw')
    if hashlib.sha256(raw.read_bytes()).hexdigest()!=meta['sha256']: raise ValueError('Checksum mismatch: '+str(raw))
    checked.add(meta['file'])
 return data

def target_features(target):
 return {k for k,s in target.get('target_status',{}).items() if s.get('status') in ('measured','derived','computed')}

def configure_targets(cfg, observations):
 cfg=json.loads(json.dumps(cfg))
 for tid,t in cfg['targets'].items():
  t['target_status']['L']={'status':'computed','source':'Idealized circular-orbit solar geometry; flat horizon, no refraction, no topographic shadow. Model, not a satellite measurement.'}
  # Literature global mean temperature is not evidence for the target region.
  if 'T' in t['target_status']: t['target_status']['T']['status']='illustrative_global_mean'
  obs=observations.get('targets',{}).get(tid)
  if obs:
   t['observables_target']['slope_deg_median_500m']=obs['slope_500m_deg']
   t['target_status']['S']={'status':'derived','source':obs['source']['url'],'baseline_m':500,'native_pixel_m':obs['native_pixel_m']}
   t['reference_patch']=obs
   t['lat']=obs['lat']
   t['illumination_latitude_deg']=obs['lat']
   from analogfit_pipeline import sun_grazing_window
   t['observables_target']['sun_grazing_frac_10d']=sun_grazing_window(obs['lat'], t['body'])[0]
  t['evidence_features']=sorted(target_features(t))
  t['thermal_context']=observations.get('target_thermal_context',{}).get(tid)
 cfg['validation_min_coverage']=.5
 cfg['validation_min_score']=.5
 return cfg

def apply_observations(df, observations):
 df=df.copy()
 if 'dem_z' not in df:df['dem_z']=''
 df['dem_spacing_m']=100.
 df['dem_dataset']=''
 real=[]
 for i,r in df.iterrows():
  cols=['sun_grazing_frac_10d']
  pw=observations.get('power',{}).get(r['cell_id'],{}).get('values',{})
  mapping={'TS':('t_mean_K',273.15,1),'TS_MAX':('t_day_K',273.15,1),'TS_MIN':('t_night_K',273.15,1),'PRECTOTCORR':('precip_mm_yr',0,365.25),'ALLSKY_SRF_ALB':('albedo',0,1)}
  for src,(dst,offset,mult) in mapping.items():
   value=pw.get(src)
   if value is not None and np.isfinite(value):
    df.at[i,dst]=value*mult+offset;cols.append(dst)
  # Neutral log-law estimate is a model. Never label it measured stress or dust frequency.
  terrain=observations.get('earth_terrain',{}).get(r['cell_id'])
  if terrain:
   df.at[i,'slope_500m_deg']=terrain['slope_500m_deg']
   df.at[i,'elev_m']=float(np.mean(terrain['z']))
   cols+=['slope_500m_deg','elev_m']
   df.at[i,'terrain_dataset']=terrain['dataset']
   display=df.at[i,'dem_z']
   if not isinstance(display,str) or not display:
    df.at[i,'dem_z']=json.dumps(terrain['z']);df.at[i,'dem_spacing_m']=500.
    df.at[i,'dem_dataset']=terrain['dataset']
   else:df.at[i,'dem_dataset']='SRTM' if abs(r['lat'])<60 else 'ASTER GDEM'
  real.append(';'.join(cols))
 if 'slope_500m_deg' not in df: df['slope_500m_deg']=np.nan
 df['real_cols']=real
 return df
