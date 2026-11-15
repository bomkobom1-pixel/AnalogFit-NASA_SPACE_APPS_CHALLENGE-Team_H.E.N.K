"""Scientific regression tests. Run: python -m unittest discover -s tests -v"""
import copy
import json
from pathlib import Path
import unittest
import numpy as np
import pandas as pd
import analogfit as model
from analogfit_pipeline import sun_grazing_window, slope_median_deg
from science import load_observations, configure_targets, target_features
from fetch_verified import slope
ROOT=Path(__file__).resolve().parents[1]

class ScientificTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.obs=load_observations()
  cls.cfg=configure_targets(json.loads((ROOT/'analogfit_config.json').read_text(encoding='utf-8')),cls.obs)

 def test_source_integrity_and_three_planetary_products(self):
  self.assertEqual(set(self.obs['targets']),{'T1','T2','T3'})
  for tid,t in self.obs['targets'].items():
   self.assertEqual(t['source']['http_status'],206)
   self.assertEqual(t['baseline_m'],500)
   self.assertEqual(self.cfg['targets'][tid]['illumination_latitude_deg'], t['lat'])
   self.assertIn('pds-geosciences.wustl.edu',t['source']['url'])
   self.assertAlmostEqual(t['slope_500m_deg'],slope(t['z']),places=12)

 def test_planar_terrain_at_both_baselines(self):
  for angle in (0,10,35):
   z=np.tile(np.arange(3)*500*np.tan(np.deg2rad(angle)),(3,1))
   self.assertAlmostEqual(slope(z),angle,places=10)
   self.assertAlmostEqual(slope(z.T),angle,places=10)
  with self.assertRaises(ValueError): slope([None]*9)

 def test_fractional_task_coverage_includes_missing_features(self):
  f,c=model.fidelity({'L':1},{'L':.2,'T':.4,'I':.2,'G':.2},0,{'L'})
  self.assertEqual(f,1);self.assertAlmostEqual(c,.2)
  f,c=model.fidelity({'L':1},{'L':2,'T':8},0)
  self.assertEqual(f,1);self.assertAlmostEqual(c,.2)
  self.assertEqual(model.fidelity({'L':1},{'L':0},0),(None,0))

 def test_illustrative_mars_temperature_cannot_be_measured_score(self):
  row={'cell_id':'X','lat':0,'lon':0,'real_cols':'t_mean_K','t_mean_K':210}
  scores=model.score_table(pd.DataFrame([row]),self.cfg,0,42)
  self.assertTrue(scores.F_site_real.isna().all())
  self.assertNotIn('T',target_features(self.cfg['targets']['T3']))

 def test_target_placeholder_exclusion(self):
  cfg=copy.deepcopy(self.cfg)
  for t in cfg['targets'].values():
   t['target_status']['S']['status']='placeholder'
  row={'cell_id':'X','lat':0,'lon':0,'real_cols':'slope_500m_deg','slope_500m_deg':1}
  scores=model.score_table(pd.DataFrame([row]),cfg,0,42)
  self.assertTrue(scores.F_site_real.isna().all())

 def test_negative_control_without_a_score_is_not_a_pass(self):
  row={'cell_id':'N','lat':0,'lon':0,'category':'Negative_Control','real_cols':'','site_name':'N'}
  scores=model.score_table(pd.DataFrame([row]),self.cfg,0,42)
  self.assertEqual(set(model.negative_report(scores).result),{'NOT TESTABLE'})

 def test_zero_ties_and_low_coverage_cannot_validate_an_analog(self):
  site=pd.DataFrame([{'cell_id':'X','site_name':'X','roles':'T1|Navigation'}])
  mine=pd.DataFrame([{'cell_id':'X','target':'T1','task':'Navigation','F_site_real':0.,'coverage_real':.6,'evidence_features':'L;S','evidence_contaminants':'precip_mm_yr'}])
  pool=pd.concat([mine]*50,ignore_index=True)
  report=model.validation_report(site,mine,pool)
  self.assertNotEqual(report.iloc[0].result,'PASS')
  self.assertTrue(pd.isna(report.iloc[0].percentile_vs_global_land))
  mine['coverage_real']=.15
  self.assertNotEqual(model.validation_report(site,mine,pool).iloc[0].result,'PASS')

 def test_known_analogs_require_same_feature_mask(self):
  site=pd.DataFrame([{'cell_id':'X','site_name':'X','roles':'T1|Navigation'}])
  mine=pd.DataFrame([{'cell_id':'X','target':'T1','task':'Navigation','F_site_real':1.,'coverage_real':.6,'evidence_features':'L;S','evidence_contaminants':'precip_mm_yr'}])
  pool=pd.concat([mine]*50,ignore_index=True);pool['evidence_features']='L'
  self.assertTrue(pd.isna(model.validation_report(site,mine,pool).iloc[0].percentile_vs_global_land))

 def test_solar_geometry_sanity(self):
  self.assertTrue(.027 < sun_grazing_window(0)[0] < .034)
  self.assertGreater(sun_grazing_window(-89.6,'Moon')[0],.99)
  for t in self.cfg['targets'].values():
   self.assertAlmostEqual(t['observables_target']['sun_grazing_frac_10d'],sun_grazing_window(t['illumination_latitude_deg'],t['body'])[0],places=10)

 def test_mineralogy_and_similarity_limits(self):
  self.assertEqual(model.jsd_base2([1,0],[1,0]),0)
  self.assertEqual(model.jsd_base2([1,0],[0,1]),1)
  self.assertAlmostEqual(model.gaussian(1,0,1),np.exp(-.5))

if __name__=='__main__':unittest.main()
