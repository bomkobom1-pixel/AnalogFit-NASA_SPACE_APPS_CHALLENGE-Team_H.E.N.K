"""Regression checks for recovered polar terrain and new scientific context."""
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
import rasterio
from rasterio.transform import from_origin
from science import load_observations,configure_targets,target_features
from fetch_evaluation_data import sample_raster,tile_name,decode_diviner,triangle_contains
from fetch_verified import slope
from evaluation_report import naive_scores
ROOT=Path(__file__).resolve().parents[1]

class EvaluationTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.data=load_observations()

 def test_recovered_patches_redecode_from_native_rasters(self):
  patches={k:v for k,v in self.data['earth_terrain'].items() if v['dataset']=='copernicus_glo30'}
  self.assertEqual(len(patches),10);self.assertIn('HYP_H2',patches)
  for cid,item in patches.items():
   sources={Path(s['file']).stem:ROOT/s['file'] for s in item['sources']}
   z=[sample_raster(sources[tile_name(a,b)],a,b)[0] for a,b in item['sample_locations']]
   np.testing.assert_allclose(z,item['z'],rtol=0,atol=1e-8)
   self.assertAlmostEqual(slope(z),item['slope_500m_deg'],places=10)
   self.assertEqual(item['baseline_m'],500)
   self.assertTrue(all(s['sha256'] for s in item['sources']))

 def test_bilinear_pixel_centres_and_nodata_rejection(self):
  with tempfile.TemporaryDirectory() as tmp:
   file=Path(tmp)/'plane.tif';z=np.array([[0,100,200],[50,150,250],[100,200,300]],dtype='float32')
   def save(array):
    with rasterio.open(file,'w',driver='GTiff',height=3,width=3,count=1,dtype='float32',crs='EPSG:4326',transform=from_origin(0,1,.01,.01),nodata=-9999) as out:out.write(array,1)
   save(z);value,_=sample_raster(file,.9875,.0125);self.assertAlmostEqual(value,112.5)
   z[1,1]=-9999;save(z)
   with self.assertRaisesRegex(ValueError,'no-data'):sample_raster(file,.9875,.0125)

 def test_diviner_observable_definition_cannot_add_temperature_or_ice(self):
  context=self.data['target_thermal_context']['T1'];row=decode_diviner((ROOT/context['source']['file']).read_bytes())[context['record_offset_in_slice']]
  self.assertTrue(triangle_contains(row,context['lat'],context['lon']))
  self.assertEqual(context['annual_mean_2cm_K'],row[12]);self.assertEqual(context['annual_max_surface_K'],row[13])
  cfg=configure_targets(json.loads((ROOT/'analogfit_config.json').read_text()),self.data)
  self.assertNotIn('T',target_features(cfg['targets']['T1']));self.assertNotIn('I',target_features(cfg['targets']['T1']))
  label=(ROOT/context['label']['file']).read_text();self.assertIn('2 cm',label)
  self.assertEqual(context['score_status'],'CONTEXT_ONLY_NOT_COMPARABLE_TO_POWER_TS')

 def test_naive_normalization_does_not_fit_curated_sites(self):
  values=np.array([[0.],[10.],[100.]])
  result=naive_scores(values,[0.],[1.],np.array([True,True,False]))
  np.testing.assert_allclose(result,[1,0,0])
  no_evidence=naive_scores(values,[0.],[0.],np.array([True,True,False]));self.assertTrue(np.isnan(no_evidence).all())

if __name__=='__main__':unittest.main()
