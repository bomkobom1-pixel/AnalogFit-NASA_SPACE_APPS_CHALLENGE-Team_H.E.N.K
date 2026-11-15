"""Build a results-synchronized manuscript copy from audited outputs.
The original protocol draft outside this workspace is retained unchanged.
"""
import hashlib
import json
import shutil
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parent

def tex(value):
 replacements={'\\':r'\textbackslash{}','&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','~':r'\textasciitilde{}','^':r'\textasciicircum{}'}
 return ''.join(replacements.get(x,x) for x in str(value))

def build():
 out=ROOT/'paper';out.mkdir(exist_ok=True)
 result=json.loads((ROOT/'data/evaluation_results.json').read_text());manifest=json.loads((ROOT/'data/source_manifest.json').read_text())
 validation=pd.read_csv(ROOT/'analogfit_validation_report.csv');scores=pd.read_csv(ROOT/'analogfit_model_output_scores.csv');bg=pd.read_csv(ROOT/'analogfit_background_scores.csv');obs=json.loads((ROOT/'verified_observations.json').read_text())
 original=ROOT.parent/'AnalogFit_LaTeX'/'analogfit.tex'
 if original.exists():
  shutil.copy2(original,out/'protocol_draft_v1.tex')
  (out/'protocol_origin.json').write_text(json.dumps({'file':str(original),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'role':'Historical research protocol; not a report of completed experiments'},indent=2),encoding='utf-8')
 v=result['validation'];neg=result['negativeControls'];baseline=result['baselineValidation']
 head=r'''\documentclass[10pt,a4paper]{article}
\usepackage[margin=2.1cm]{geometry}
\usepackage[T1]{fontenc}
\usepackage{lmodern,amsmath,booktabs,longtable,array}
\usepackage[hidelinks]{hyperref}
\usepackage{xurl}
\setlength{\parskip}{4pt plus 1pt minus 1pt}
\raggedbottom
\title{AnalogFit: An Audited Prototype for Task-Conditioned Terrestrial Analog Screening}
\author{Team H.E.N.K.\\2026 NASA Space Apps Challenge}
\date{Empirical revision, 15 November 2026}
\begin{document}\maketitle
'''
 text=head+r'\begin{abstract}'+'\n'+tex(
  f'AnalogFit compares an Earth location, a lunar or Martian reference patch, and an operational task. This empirical revision reports the implemented prototype rather than treating the full research protocol as completed. The current run includes {result["curatedCount"]} curated sites and {result["sampleCount"]} global land samples, three explicit target patches and ten task profiles. Comparable 500 m slope is derived from NASA SRTM/ASTER and ESA Copernicus GLO-30 on Earth and NASA LOLA/MOLA on the targets. Low-Sun illumination is an idealized geometry model. Other cross-body inputs remain unsupported. Of {v["roles"]} curated reference roles, {v["testable"]} are testable and {v["passed"]} pass the declared prototype diagnostic. This does not establish discovery, operational suitability, or superiority to naive baselines. We report data provenance, coarse-search candidates, baseline diagnostics and full-set feature ablations, and retain failed and untestable outcomes.')+'\n'+r'\end{abstract}'+'\n'
 text+=r'''\section{Question and implemented scope}
An analog is a triple $(i,T,\tau)$: an Earth sample, a target and a test.
The prototype supports exploratory comparison, not landing certification or
selection of an operational mission site. It evaluates 585 coarse background
points, not every land cell at 0.05 degrees. Target patches are explicit points
with approximately 1 km footprints, not preregistered representative ROI polygons.
No DBSCAN discovery clusters, cluster areas, 30--70 m deep dives or field-confirmed
discoveries are reported. The original Draft v1 research protocol is retained
separately as \texttt{protocol\_draft\_v1.tex}; future-tense plans in that document
must not be read as completed experiments.

\section{Implemented data and observables}
\begin{longtable}{p{3.2cm}p{11.3cm}}
\toprule Source & Actual use and limitations\\\midrule
NASA SRTM / ASTER & 589 Earth patches via OpenTopoData, a third-party distribution API.\\
ESA Copernicus GLO-30 & Native COG fallback for ten missing Earth patches. DSM includes snow, ice and vegetation; it does not identify exposed bedrock. EGM2008 heights, bilinear interpolation and native spacing are retained.\\
NASA LRO LOLA & Slopes on two lunar reference patches.\\
NASA MGS MOLA & Slope on one Arcadia Planitia reference patch.\\
NASA POWER & 599 original climatology responses (2001--2025); annual ANN values are retained. Regional precipitation supplies a declared screening penalty; Earth temperature remains context.\\
NASA LRO Diviner PRP & Thermal-model context for T1. The annual mean is at 2 cm depth; the annual maximum is at the surface. Neither is silently substituted for POWER annual surface temperature; no T or I score coverage is added.\\
NASA GIBS / Worldview & 39 cached contextual images and an offline Blue Marble texture; no numerical image-based score.\\
\bottomrule\end{longtable}
'''
 text+=f"The current manifest verifies {manifest['raw_files_verified']} unique source files, {manifest['planetary_samples_redecoded']} planetary elevations and {manifest.get('copernicus_samples_redecoded',0)} Copernicus samples. Hashes establish integrity, not physical accuracy.\n"
 text+=r'''\subsection{Targets and matching scale}
Earth and target slopes use the median magnitude of four gradients on a 3 by 3
sample grid with a 500 m baseline. This does not erase differences in native
resolution, interpolation, datum, acquisition time or instrument uncertainty.
The T2 patch is terrain near the pit, not a cave interior or the pit itself.
\begin{center}\begin{tabular}{lrrr}\toprule Target & Latitude & East longitude & Median slope (deg)\\\midrule
'''
 for tid,t in obs['targets'].items():text+=f"{tid} & {t['lat']:.4f} & {t['lon']:.4f} & {t['slope_500m_deg']:.6f} \\\\\n"
 text+=r'\bottomrule\end{tabular}\end{center}'+'\n'
 text+=r'''\section{Scoring, evidence coverage and assumptions}
For available comparable features $A$, the supported index is
\[
 F=(1-C)\exp\left[\frac{\sum_{k\in A}w_k\log\max(s_k,10^{-12})}
 {\sum_{k\in A}w_k}\right],\qquad
 \kappa=\frac{\sum_{k\in A}w_k}{\sum_k w_k}.
\]
If no active comparable feature is available, the score is unavailable, not zero.
The denominator of coverage retains missing task inputs. Gaussian widths, task
weights and contamination anchors are declared assumptions, not calibrated
measurement uncertainty. Score is not a probability of success. Standard
navigation has 15 percent observed-derived slope and 45 percent modeled lighting,
giving 60 percent supported coverage, below the protocol's 70 percent necessary
discovery gate. Passing coverage alone would not validate a discovery.

The solar observable is the fraction of the best ten-day window with idealized
low solar elevation. It excludes refraction and DEM horizons and is distinct
from annual illumination or shadow persistence. Monte Carlo ranges perturb
assumptions; they are not observation-based confidence intervals or joint
ranking-stability estimates. Gravity, atmospheric pressure and radiation remain
qualitative physical differences in the interface. The legacy numerical ceiling
is a convention, not a calibrated physical law, and is excluded from the supported
site index and operational conclusions.

\section{Empirical results}
\subsection{Reference-role diagnostics}
The prototype requires at least 50 percent task coverage, 30 comparable
background points, nondegenerate scores, a 95th-percentile rank and a score of
at least 50/100. These thresholds are model assumptions, not NASA acceptance
criteria. Only equal feature and contamination masks are compared. Role mappings
are inherited curated hypotheses; their publication-level independence has not
been re-established here. No weights were fitted to obtain a passing outcome.
'''
 text+=tex(f"The current result is {v['passed']}/{v['testable']} testable roles passing; {v['roles']-v['testable']} roles are not testable.")+'\n'
 text+=r'Scores below are rounded to two decimals; 0.00 can represent a small positive index. N/A denotes an unavailable score or untestable role.'+'\n'
 text+=r'\begin{longtable}{>{\raggedright\arraybackslash}p{3.5cm}>{\raggedright\arraybackslash}p{3.8cm}rrl}\toprule Site & Target / task & Coverage & Score & Result\\\midrule\endfirsthead\toprule Site & Target / task & Coverage & Score & Result\\\midrule\endhead'+'\n'
 for r in validation.itertuples():
  score='N/A' if pd.isna(r.F_site_real) else f'{100*r.F_site_real:.2f}'
  status='N/A' if pd.isna(r.percentile_vs_global_land) else r.result
  text+=f"{tex(r.site)} & {tex(r.target+' / '+r.task)} & {100*r.coverage_real:.0f}\\% & {score} & {status} \\\\\n"
 text+=r'\bottomrule\end{longtable}'+'\n'
 text+=r'\subsection{Negative controls and naive baselines}'+'\n'
 text+=tex(f"The 90 negative-control comparisons contain {neg.get('OK',0)} OK, {neg.get('NOT TESTABLE',0)} not testable and {neg.get('FAIL',0)} failed results. Rainfall strongly drives rejection; this is a sanity check, not independent geological validation.")+'\n'
 text+=r'''Two naive baselines use weighted Euclidean distance after min--max scaling
of raw supported observables across the target and background. The score is
one minus clipped distance. Curated sites never fit the normalization. One
variant omits contamination (the protocol's naive comparison); a second applies
the same contamination penalty to isolate part of the metric difference.
Coverage, mask compatibility and prototype testability gates are retained.
The different score mappings are not calibrated operating characteristics.
'''
 for name,b in baseline.items():text+=tex(f"{name}: {b['passed']}/{b['testable']} testable roles pass.")+'\n\n'
 text+=r'''These results do not establish predictive superiority. Spatially independent
field validation, independently verified role labels and measurement-error
propagation remain required.
\subsection{Full-set ablation and coarse candidates}
'''
 text+=tex(f"The run exports {result['ablationRows']} target/task/active-feature ablation summaries, including unsupported-feature removals, score changes, top-20 retention, unavailable scores and changed validation outcomes. Removed-feature coverage is renormalized over remaining task weights; it must not be presented as additional evidence. Comparisons are local model diagnostics, not causal effects.")+'\n'
 text+=r'\begin{center}\begin{tabular}{llrrr}\toprule Target / navigation & Sample & Latitude & Longitude & Score / coverage\\\midrule'+'\n'
 for tid,g in bg[bg.task=='Navigation'].groupby('target'):
  r=g.sort_values(['coverage_real','F_site_real'],ascending=[False,False]).iloc[0]
  text+=f"{tid} & {tex(r.cell_id)} & {r.lat:.2f} & {r.lon:.2f} & {100*r.F_site_real:.2f} / {100*r.coverage_real:.0f}\\% \\\\\n"
 text+=r'\bottomrule\end{tabular}\end{center}'+'\n'
 text+=r'''These are coarse sample candidates. A high score can reflect flatness,
solar latitude and low regional rainfall; it does not establish lithology,
subsurface geometry, grain size, ice, novelty or operational suitability.
'''
 h2=scores[(scores.cell_id=='HYP_H2')&(scores.target=='T1')&(scores.task=='Navigation')].iloc[0]
 text+=tex(f"Mount Howe now has an actual Copernicus 500 m slope of {obs['earth_terrain']['HYP_H2']['slope_500m_deg']:.4f} degrees. Its T1 navigation index is {100*h2.F_site_real:.3f}/100 at {100*h2.coverage_real:.0f}% coverage. Seasonal low Sun does not compensate for its different terrain or prove a lunar-polar analogue.")+'\n'
 if 'T1' in obs.get('target_thermal_context',{}):
  t=obs['target_thermal_context']['T1'];text+=tex(f"The containing Diviner PRP triangle at T1 has a modeled annual 2 cm mean of {t['annual_mean_2cm_K']:.3f} K and modeled annual surface maximum of {t['annual_max_surface_K']:.3f} K. This is explicitly contextual and adds no temperature/ice score weight.")+'\n'
 text+=r'''\section{Interface and reproducibility}
The static file-based application provides a 2D map, 3D globe, expanded/fullscreen
map workspace, selection-driven dossier, evidence export and English/Indonesian
controls. Terrain meshes label actual sample spacing and vertical exaggeration.
Global cells use the verified coarse 3 by 3 grid; some curated displays retain
legacy 100 m sample grids. Visual detail is not hazard-scale terrain accuracy.
The evidence tour demonstrates a polar-lighting hypothesis and the limits of
surface evidence for a lava-tube claim. Intro, sound and rotation are optional.

Reproduction: run \path{fetch_verified.py}, then
\path{fetch_evaluation_data.py}, \path{analogfit_pipeline.py},
\path{analogfit.py}, \path{evaluation_report.py}, \path{audit_data.py}
and \path{build_empirical_paper.py}. Checksums for the actual inputs and outputs
are in \path{data/evaluation_results.json} and
\path{data/source_manifest.json}. CSVs retain all untestable outcomes.

\section{Remaining work and conclusion}
The strongest next steps are frozen representative ROI polygons, multiscale
terrain distributions where native resolution permits, defensible uncertainty,
QA-screened cross-body thermal/mineral/ice evidence, annual horizon-aware
illumination and spatially independent validation. TES/THEMIS thermal inertia is
not temperature; Mars Climate Database output is model output. Neither should
silently fill a measured annual local-temperature field. Permafrost indicators
are not interchangeable with measured lunar/Martian ice occurrence.

AnalogFit currently makes a limited comparison auditable. It has not demonstrated
an operationally validated new analogue, an exhaustive Earth search or calibrated
mission suitability. Failed validation is a research result to investigate, not
a value to optimize away for a competition claim.

\section*{Sources and attribution}
NASA archives: \url{https://pds-geosciences.wustl.edu/missions/lro/},
\url{https://pds-geosciences.wustl.edu/missions/lro/diviner.htm},
\url{https://pds-geosciences.wustl.edu/missions/mgs/mola.html},
\url{https://power.larc.nasa.gov/}, \url{https://worldview.earthdata.nasa.gov/}.
Copernicus DEM: \url{https://doi.org/10.5270/ESA-c5d3d65}.
Full product identifiers, PDS labels, extraction byte ranges and checksums are
in the source manifest. Resource-list matching uses the challenge text supplied
by the user; competition eligibility and placements have not been independently
verified. No endorsement by NASA or partner agencies is implied.

produced using Copernicus WorldDEM-30 \copyright{} DLR e.V. 2010-2014 and
\copyright{} Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS
by the European Union and ESA; all rights reserved.
The organisations in charge of the Copernicus programme by law or by delegation
do not incur any liability for any use of the Copernicus WorldDEM-30.
\end{document}
'''
 (out/'analogfit.tex').write_text(text,encoding='utf-8')
 print('Wrote paper/analogfit.tex from the audited empirical run')

if __name__=='__main__':build()
