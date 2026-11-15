"""Reproduce the evaluation response, naive baselines and full-run ablations.
No weights or tolerances are fitted to validation outcomes. Baseline scaling is
fitted on background observations plus the target, excluding curated analogs.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
import analogfit as model
from science import load_observations,configure_targets,target_features
ROOT=Path(__file__).resolve().parent

def naive_scores(values,target,weights,background_mask):
 """One minus clipped weighted Euclidean distance after joint min/max scaling.
 Missing features stay missing; constant features contribute zero distance.
 """
 values=np.asarray(values,float);target=np.asarray(target,float);weights=np.asarray(weights,float)
 fitted=np.vstack([values[background_mask],target[None,:]])
 low=np.nanmin(fitted,axis=0);span=np.nanmax(fitted,axis=0)-low
 delta=np.divide(values-target,span,out=np.zeros_like(values),where=span>1e-15)
 present=np.isfinite(values)&np.isfinite(target)&(weights>0)
 mass=(present*weights).sum(axis=1)
 distance=np.sqrt(np.divide(np.where(present,delta*delta,0).dot(weights),mass,out=np.zeros(len(values)),where=mass>0))
 score=1-np.clip(distance,0,1);score[mass==0]=np.nan
 return score

def generate():
 obs=load_observations();cfg=configure_targets(json.loads((ROOT/'analogfit_config.json').read_text()),obs)
 sites=pd.read_csv(ROOT/'analogfit_model_ready_features.csv');background=pd.read_csv(ROOT/'analogfit_background_features.csv')
 rows=pd.concat([sites,background],ignore_index=True).to_dict('records');n=len(rows)
 isbg=np.array([r['cell_id'].startswith('BG_') for r in rows]);stored=pd.concat([pd.read_csv(ROOT/'analogfit_model_output_scores.csv'),pd.read_csv(ROOT/'analogfit_background_scores.csv')],ignore_index=True)
 baseline_records=[];ablation=[];baseline_validation=[]
 for tid,tgt in cfg['targets'].items():
  supported=sorted(target_features(tgt));codes=[k for k in supported if k in model.FEATURES and k!='M']
  sims=[model.similarities(r,tgt) for r in rows];realsets=[model.real_sets(r) for r in rows]
  clean=np.array([1-model.contamination(r,cfg['contamination_anchors'],parts[2]) for r,parts in zip(rows,realsets)])
  feature_values=np.array([[float(r.get(model.FEATURES[k][0],np.nan)) if model.FEATURES[k][0] in parts[0] else np.nan for k in codes] for r,parts in zip(rows,realsets)])
  target_values=[tgt['observables_target'][model.FEATURES[k][1]] for k in codes]
  for task,weights in cfg['task_weights'].items():
   current=stored[(stored.target==tid)&(stored.task==task)].set_index('cell_id').loc[[r['cell_id'] for r in rows]]
   base=current.F_site_real.to_numpy(float)
   raw=naive_scores(feature_values,target_values,[weights.get(k,0) for k in codes],isbg)
   for name,values in [('naive_raw_minmax',raw),('naive_same_penalty',raw*clean)]:
    records=[]
    for r,(_,ref),value in zip(rows,current.iterrows(),values):
     records.append({'cell_id':r['cell_id'],'site':r.get('site_name',r['cell_id']),'category':r.get('category','Background'),'target':tid,'task':task,
      'F_site_real':value,'coverage_real':ref.coverage_real,'evidence_features':ref.evidence_features,'evidence_contaminants':ref.evidence_contaminants,'method':name})
    table=pd.DataFrame(records);baseline_records.extend(records)
   original_ids={rows[i]['cell_id'] for i in sorted(np.flatnonzero(isbg&np.isfinite(base)),key=lambda i:(-base[i],rows[i]['cell_id']))[:20]}
   for code in model.FEATURES:
    if weights.get(code,0)<=0:continue
    reduced=dict(weights);reduced[code]=0
    changed=np.array([model.fidelity(s,reduced,1-c,subset=(real[1]&target_features(tgt)))[0] if s else None for s,real,c in zip(sims,realsets,clean)],dtype=float)
    table=current.reset_index().copy();table['F_site_real']=changed
    # Ablation changes the compared evidence mask and coverage. Derive them again.
    for j,real in enumerate(realsets):
     active=real[1]&target_features(tgt)&{k for k,w in reduced.items() if w>0}&sims[j].keys()
     table.loc[j,'coverage_real']=sum(reduced[k] for k in active)/max(sum(reduced.values()),1e-30)
     table.loc[j,'evidence_features']=';'.join(sorted(active))
    relevant=sites.copy();relevant['roles']=relevant.roles.map(lambda value: ';'.join(x for x in str(value).split(';') if x==tid+'|'+task))
    vr=model.validation_report(relevant,table[~isbg],table[isbg])
    new_ids={rows[i]['cell_id'] for i in sorted(np.flatnonzero(isbg&np.isfinite(changed)),key=lambda i:(-changed[i],rows[i]['cell_id']))[:20]}
    joint=np.isfinite(base)&np.isfinite(changed)
    supported_active=code in codes and any(code in r[1] for r in realsets)
    ablation.append({'target':tid,'task':task,'removed':code,'supported_feature':supported_active,
     'max_score_change':float(np.max(np.abs(base[joint]-changed[joint]))) if joint.any() else None,
     'score_became_unavailable':int((np.isfinite(base)&~np.isfinite(changed)).sum()),
     'top20_retained':len(original_ids&new_ids),'top20_before':len(original_ids),'top20_after':len(new_ids),
     'testable_roles':int(vr.percentile_vs_global_land.notna().sum()) if len(vr) else 0,'passed_roles':int((vr.result=='PASS').sum()) if len(vr) else 0})
 baseline_table=pd.DataFrame(baseline_records);baseline_table.to_csv(ROOT/'analogfit_baseline_scores.csv',index=False)
 for name,table in baseline_table.groupby('method'):
  bgmask=table.cell_id.str.startswith('BG_');vr=model.validation_report(sites,table[~bgmask],table[bgmask]);vr['method']=name;baseline_validation.append(vr)
 baseline_validation=pd.concat(baseline_validation,ignore_index=True);baseline_validation.to_csv(ROOT/'analogfit_baseline_validation.csv',index=False)
 pd.DataFrame(ablation).to_csv(ROOT/'analogfit_full_ablation.csv',index=False)
 validation=pd.read_csv(ROOT/'analogfit_validation_report.csv');negative=pd.read_csv(ROOT/'analogfit_negative_control_report.csv')
 top=[]
 for (tid,task),g in stored[stored.cell_id.str.startswith('BG_')&stored.F_site_real.notna()].groupby(['target','task']):
  for _,r in g.sort_values(['coverage_real','F_site_real','cell_id'],ascending=[False,False,True]).head(3).iterrows():
   top.append({k:(None if pd.isna(r[k]) else r[k].item() if isinstance(r[k],np.generic) else r[k]) for k in ['cell_id','target','task','lat','lon','F_site_real','coverage_real','evidence_features']})
 summary={'generatedUTC':dt.datetime.now(dt.timezone.utc).isoformat(),'sampleCount':len(background),'curatedCount':len(sites),
  'earthTerrainPatches':len(obs['earth_terrain']),'copernicusFallbackPatches':sum(r['dataset']=='copernicus_glo30' for r in obs['earth_terrain'].values()),
  'thermalContextTargets':list(obs.get('target_thermal_context',{})),
  'validation':{'roles':len(validation),'testable':int(validation.percentile_vs_global_land.notna().sum()),'passed':int((validation.result=='PASS').sum())},
  'negativeControls':negative.result.value_counts().to_dict(),
  'baselineValidation':{name:{'testable':int(g.percentile_vs_global_land.notna().sum()),'passed':int((g.result=='PASS').sum())} for name,g in baseline_validation.groupby('method')},
  'baselineDefinition':'1 - clipped weighted Euclidean distance after background+target min/max normalization; raw and same-penalty variants. Curated validation sites never fit scaling. Compatible feature/penalty masks and coverage gates retained.',
  'ablationRows':len(ablation),'topCandidates':top,
  'interpretation':'Exploratory screening only. No new discovery, predictive superiority, independent field validation or mission suitability is established.',
  'sourceHashes':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['verified_observations.json','analogfit_config.json','analogfit_validation_report.csv','analogfit_model_output_scores.csv','analogfit_background_scores.csv']}}
 (ROOT/'data/evaluation_results.json').write_text(json.dumps(summary,indent=2,allow_nan=False),encoding='utf-8')
 (ROOT/'evaluation_data.js').write_text('window.ANALOGFIT_EVALUATION = '+json.dumps(summary,allow_nan=False)+';\n',encoding='utf-8')
 print(json.dumps({k:v for k,v in summary.items() if k not in ['topCandidates','sourceHashes']},indent=2))
 return summary

if __name__=='__main__':generate()
