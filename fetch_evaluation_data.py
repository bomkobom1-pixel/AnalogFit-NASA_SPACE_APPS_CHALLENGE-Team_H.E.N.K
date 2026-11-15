"""Resumable, verified integrations responding to the November evaluation.
Copernicus GLO-30 fills only missing Earth DEMs; existing NASA terrain is retained.
Diviner PRP is thermal context, never a surface-temperature score substitution.
"""
import argparse
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
import rasterio
from fetch_verified import ROOT, RAW, CACHE, get, preserve, atomic_json, locations, slope

COP='https://copernicus-dem-30m.s3.amazonaws.com/'
DIV='https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/'
COP_NOTICE='produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved'
COP_LICENSE='https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf'

def all_cells():
 from analogfit_pipeline import build_benchmark_earth_grid
 cells=[(r.cell_id,float(r.lat),float(r.lon)) for r in build_benchmark_earth_grid().itertuples()]
 bg=json.loads((ROOT/'nasa_background.json').read_text())
 return cells+[(f'BG_{i:04d}',a,b) for i,(a,b) in enumerate(zip(bg['lat'],bg['lon']))]

def tile_name(lat,lon):
 a,b=math.floor(lat),math.floor((lon+180)%360-180)
 return f'Copernicus_DSM_COG_10_{"N" if a>=0 else "S"}{abs(a):02d}_00_{"E" if b>=0 else "W"}{abs(b):03d}_00_DEM'

def sample_raster(path,lat,lon):
 """Bilinear interpolation at full native resolution, pixel-center referenced.
 A boundary without a complete 2x2 neighborhood fails instead of clamping.
 """
 with rasterio.open(path) as ds:
  if ds.crs.to_epsg()!=4326: raise ValueError('Unexpected Copernicus CRS')
  inverse=~ds.transform
  col=inverse.a*lon+inverse.b*lat+inverse.c-.5
  row=inverse.d*lon+inverse.e*lat+inverse.f-.5
  i,j=math.floor(row),math.floor(col);dy,dx=row-i,col-j
  if min(i,j)<0 or i+1>=ds.height or j+1>=ds.width: raise ValueError('Sample crosses native tile boundary')
  arr=ds.read(1,window=rasterio.windows.Window(j,i,2,2),masked=True)
  if np.ma.getmaskarray(arr).any() or not np.isfinite(arr).all():raise ValueError('Copernicus no-data')
  weights=np.array([[(1-dy)*(1-dx),(1-dy)*dx],[dy*(1-dx),dy*dx]])
  value=float((arr*weights).sum())
  if abs(value)>10000:raise ValueError('Invalid Earth elevation')
  return value,{'crs':str(ds.crs),'transform':list(ds.transform)[:6],'shape':[ds.height,ds.width],
   'pixel_spacing_m':[abs(ds.transform.a)*111319.49*math.cos(math.radians(lat)),abs(ds.transform.e)*111319.49],
   'height_reference':'EGM2008 orthometric heights; DSM includes snow/ice/vegetation',
   'interpolation':'bilinear, native raster, no overviews','nodata':ds.nodata}

def copernicus(data):
 missing=[c for c in all_cells() if c[0] not in data['earth_terrain']]
 if not missing:return
 source_catalog=data.setdefault('supplemental_sources',{})
 if 'copernicus_tile_catalog' not in source_catalog:
  response=get(COP+'tileList.txt');source_catalog['copernicus_tile_catalog']=preserve('copernicus_tileList.txt',response,COP+'tileList.txt')
  response=get(COP+'readme.html');source_catalog['copernicus_documentation']=preserve('copernicus_readme.html',response,COP+'readme.html')
 catalog=set((ROOT/source_catalog['copernicus_tile_catalog']['file']).read_text().splitlines())
 downloaded=data.setdefault('copernicus_tiles',{})
 for cid,lat,lon in missing:
  coords=locations(lat,lon);zs=[];used={};metadata={}
  try:
   for a,b in coords:
    b=(b+180)%360-180;stem=tile_name(a,b)
    if stem not in catalog:raise ValueError('No public Copernicus tile')
    if stem not in downloaded:
     url=COP+stem+'/'+stem+'.tif';response=get(url)
     if not(response.content[:2] in (b'II',b'MM')):raise ValueError('Not a TIFF response')
     downloaded[stem]=preserve(stem+'.tif',response,url)
     atomic_json(CACHE,data)
    meta=downloaded[stem];used[stem]=meta
    value,details=sample_raster(ROOT/meta['file'],a,b);zs.append(value);metadata[stem]=details
   data['earth_terrain'][cid]={'lat':lat,'lon':lon,'z':zs,'slope_500m_deg':slope(zs),'baseline_m':500,
    'dataset':'copernicus_glo30','sample_locations':coords,'source':next(iter(used.values())),
    'sources':list(used.values()),'raster_metadata':metadata,'release':'Copernicus GLO-30 Public, 2021 COG release',
    'attribution':COP_NOTICE,
    'license_url':'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM',
    'note':'ESA partner-source fallback for missing NASA SRTM/ASTER patches only; 500 m baseline, 1 km footprint. DSM may represent snow/ice, not exposed bedrock.'}
   print(f'{cid}: Copernicus slope {slope(zs):.6f} degrees, {len(used)} native tiles',flush=True)
  except (ValueError,RuntimeError) as error:
   data.setdefault('supplemental_failures',{})[cid]=str(error);print(f'{cid}: remains unavailable: {error}',flush=True)
  atomic_json(CACHE,data)

def decode_diviner(raw):
 rows=[]
 for line in raw.splitlines():
  try:values=[float(x) for x in line.split(b',')]
  except ValueError:continue
  if len(values)==15:rows.append(values)
 return np.asarray(rows)

def diviner_record(index,count=2):
 start=210*(index+1);stop=start+210*count-1
 url=DIV+'dlre_prp_south.tab';response=get(url,headers={'Range':f'bytes={start}-{stop}'})
 if response.status_code!=206 or response.headers.get('Content-Range')!=f'bytes {start}-{stop}/604800210':
  raise ValueError('Diviner server did not return requested byte range')
 rows=decode_diviner(response.content)
 if len(rows)!=count:raise ValueError('Incomplete Diviner records')
 return rows,response

def triangle_contains(row,lat,lon):
 v=row[:9].reshape(3,3);xy=v[:,:2]/(-v[:,2,None])
 a=math.radians(lat);b=math.radians(lon)
 target=np.array([math.cos(a)*math.cos(b),math.cos(a)*math.sin(b)])/(-math.sin(a))
 matrix=np.stack([xy[1]-xy[0],xy[2]-xy[0]],axis=1)
 weights=np.linalg.solve(matrix,target-xy[0])
 return bool(min(weights)>=-1e-8 and sum(weights)<=1+1e-8)

def diviner(data):
 if data.get('target_thermal_context',{}).get('T1'):return
 lat,lon=data['targets']['T1']['lat'],data['targets']['T1']['lon']
 # The PRP has 1200x1200 cells with two triangles per cell, row-major.
 # Binary search uses the actual archived vertices, not an assumed projection.
 target_x=math.cos(math.radians(lat))*math.cos(math.radians(lon))/(-math.sin(math.radians(lat)))
 low,high=0,1199
 while low<high:
  mid=(low+high)//2;row,_=diviner_record(mid*2400+1200)
  centroid=row[0,:9].reshape(3,3).mean(axis=0);x=centroid[0]/(-centroid[2])
  if x>target_x:low=mid+1
  else:high=mid
 for i in range(max(0,low-2),min(1200,low+3)):
  # Longitude zero lies at the central columns; this extractor is deliberately T1-specific.
  rows,response=diviner_record(i*2400+1192,16)
  for k,row in enumerate(rows):
   if not triangle_contains(row,lat,lon):continue
   if not (0<row[12]<500 and 0<row[13]<500):raise ValueError('Invalid PRP temperature')
   label_response=get(DIV+'dlre_prp_south.xml')
   root=ET.fromstring(label_response.content)
   fields={}
   for field in root.iter():
    if field.tag.endswith('Field_Character'):
     items={x.tag.split('}')[-1]:x.text for x in field};fields[items.get('name')]=items.get('description','')
   if '2 cm' not in fields.get('temp_avg','') or 'surface' not in fields.get('temp_max',''):
    raise ValueError('Diviner observable definition changed')
   source=preserve('diviner_T1_prp_records.tab',response,DIV+'dlre_prp_south.tab')
   label=preserve('diviner_T1_prp.xml',label_response,DIV+'dlre_prp_south.xml')
   data.setdefault('target_thermal_context',{})['T1']={
    'lat':lat,'lon':lon,'triangle_center_lon':float(row[9]),'triangle_center_lat':float(row[10]),
    'annual_mean_2cm_K':float(row[12]),'annual_max_surface_K':float(row[13]),
    'record_index':i*2400+1192+k,'record_offset_in_slice':k,
    'source':source,'label':label,'dataset':'LRO-L-DLRE-5-PRP-V2.0',
    'evidence_type':'thermal-model fit to Diviner observations',
    'score_status':'CONTEXT_ONLY_NOT_COMPARABLE_TO_POWER_TS',
    'note':'Annual mean is modeled 2 cm below the surface, not surface temperature; annual maximum is modeled surface temperature. Ice-depth output is not evidence of measured ice occurrence. No T or I coverage is added.'}
   atomic_json(CACHE,data)
   print(f'T1 Diviner context: mean at 2 cm {row[12]:.3f} K; surface maximum {row[13]:.3f} K; does not enter scores',flush=True);return
 raise ValueError('No archived PRP triangle contains T1; no nearest-site substitution allowed')

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--skip-copernicus',action='store_true');parser.add_argument('--skip-diviner',action='store_true');args=parser.parse_args()
 from science import load_observations
 data=load_observations()
 if not args.skip_copernicus:copernicus(data)
 if not args.skip_diviner:diviner(data)
 for item in data['earth_terrain'].values():
  if item['dataset']=='copernicus_glo30':item['attribution']=COP_NOTICE
 sources=data.setdefault('supplemental_sources',{})
 if data.get('copernicus_tiles') and 'copernicus_license' not in sources:
  response=get(COP_LICENSE);sources['copernicus_license']=preserve('copernicus_license.pdf',response,COP_LICENSE)
 atomic_json(CACHE,data)

if __name__=='__main__':main()
