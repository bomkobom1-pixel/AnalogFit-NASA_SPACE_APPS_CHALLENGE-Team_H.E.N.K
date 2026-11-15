# From the AnalogFit paper to a defensible empirical study

This assessment follows the team's local **AnalogFit_paper.docx**, Draft v1,
14 November 2026, especially sections 5–10 and 13. Its hash is recorded in
data/terrain_media_manifest.json. The original paper was read without modifying it.

The strongest next improvement is to close measurement and validation gaps.
Additional decimal places, weights or animations do not supply those measurements.

**Evaluation follow-up, 15 November:** the ten missing Earth terrain patches now
use verified Copernicus GLO-30. T1 has a containing-triangle Diviner PRP thermal
context record, explicitly excluded from temperature/ice scoring. Two raw-observable
naive baselines and 144 full-run ablation summaries have been executed; all methods
still pass 0/3 testable roles. See [EVALUATION_RESPONSE.md](EVALUATION_RESPONSE.md)
and the results-synchronized [empirical paper](paper/analogfit.pdf). The remaining
research priorities below still apply; a compatible local target-temperature
observable, representative frozen ROIs and independent validation are unresolved.

## What this update implements

- A live **Science** panel maps implemented behavior to the paper's sections.
- Supported task coverage is decomposed into **observed/derived**, **modeled** and
  **missing** evidence. For standard navigation, comparable slope contributes
  15% and modeled illumination 45%; the resulting 60% is below the paper's
  70% discovery gate. Changing weights does not create new observations.
- A **leave-one-feature-out diagnostic** recomputes the supported score after
  removing each included feature. This is local sensitivity; the comparison
  features and coverage change. It is not independent validation or causality.
- A downloadable **evidence card** includes the actual task weights, target
  reference patch, source references/checksums, assumed tolerances and ablations.
- NASA images carry product names, request bounds, date semantics and checksums.
  Imagery provides visual context and is excluded from quantitative scoring.
- The 3D view distinguishes elevation from depth below the highest sampled
  point, with meter legends. Vertical exaggeration changes only the view.

These additions make the implementation easier to audit. They do not establish
that the full research protocol has been executed successfully.

## Priority 1: freeze target regions and estimate defensible tolerances

**Paper: sections 3.1, 5.1–5.2 and 6.1.**

Publish actual ROI polygons before fitting or scoring Earth candidates. The
current explicit reference patches do not represent entire polar ridges, caves
or Arcadia Planitia. Preserve the product identifiers, native resolution,
projection, height reference, processing choices and acquisition period.

Where native data permit, compute median and 90th-percentile slope distributions
at 30, 100 and 500 m, plus multi-lag RMS roughness and Hurst fits. A nominally
fine output grid cannot provide detail absent from a coarse native DEM.

Estimate the tolerance components the paper requires:

    sigma_total^2 = sigma_measurement^2 + sigma_ROI^2 + sigma_resampling^2

Measurement uncertainty must include both Earth and target products. This sum
assumes the components are appropriately treated as independent; otherwise
their dependence also needs to be modeled. The current fixed Gaussian widths
are assumptions, not estimated measurement uncertainty.

**Acceptance:** frozen ROI files, reproducible statistics, documented uncertainty
components and scale checks, rather than hand-selected target summary values.

## Priority 2: add comparable features with quality control

**Paper: sections 4–5 and Tables 3–4.**

The current main supported terrain comparison is slope. Illumination is modeled.
Missing mineralogy, grain size, ice, radar and target-temperature measurements
still prevent most operational claims.

Recommended sequence:

1. Obtain QA-screened MODIS day/night LST and NDVI for matched Earth regions and
   periods. Preserve missing-data and cloud masks, temporal sample counts and
   native footprints. NASA POWER remains regional context, not a replacement
   for every surface measurement proposed in the paper.
2. Extract lunar Diviner and Martian TES/THEMIS measurements for the frozen
   target ROIs. If Mars Climate Database output is used, identify it as model
   output. A global Mars mean is not an Arcadia observation.
3. Add mineralogy and ice only with explicit cross-product definitions and
   coverage masks. Classify a consistency index or proxy according to what it
   actually measures; do not silently label it a calibrated probability.
4. Add radar CPR only after documenting the paper's wavelength, geometry,
   moisture and vegetation caveats. Comparing raw radar channels is insufficient.

**Acceptance:** the same defined observable on both worlds, with provenance,
quality flags and uncertainty. Missing features remain missing.

## Priority 3: distinguish the solar observables

**Paper: section 5.7; app: best ten-day low-Sun window.**

Annual grazing fraction, the distribution of elevation while sunlit, longest
darkness and the best ten-day window are different observables. Report them
separately and select the relevant observable for each operational question.
Add DEM horizons and a documented ephemeris before making shadow-persistence
claims. The current idealized geometry does not measure a permanently
shadowed region or confirm site-specific future lighting dates.

**Acceptance:** a declared time basis, ephemeris and terrain horizon, checked
against reference products. Keep seasonal opportunities distinct from annual
similarity.

## Priority 4: execute the paper's falsification design

**Paper: section 9.**

Freeze weights, target definitions and documented analog roles before evaluation.
Known analogs must stay out of tuning. If the model is revised after inspecting
failures, report that development use and evaluate the revised model on a fresh,
spatially independent test.

Run all of the following on comparable evidence:

- Known-analog role tests and negative controls.
- The paper's naive normalized-distance baseline.
- Full validation-set feature ablation.
- Spatially separated evaluation to reduce neighboring-cell leakage.
- Explicit minimum coverage and tied-score handling.

The evaluation follow-up has now run the first three items and retains explicit
coverage/tie handling. Both naive baselines pass 0/3 testable roles, as does the
supported AnalogFit index. Full ablation summaries are available for 144 active
feature/task/target removals. Spatially independent evaluation and independently
verified role definitions remain outstanding; these internal comparisons do not
establish superior predictive performance.

The current application diagnostic uses extra conservative testability and
minimum-score checks. It is not a verbatim replication of the paper's
percentile-only pass rule. Report both definitions if comparing their results.
Three rainforests rejected by an explicit rain penalty are a useful sanity
check, not independent evidence that the entire similarity model is valid.

**Acceptance:** a predeclared comparison showing exactly what is tested,
what is untestable and whether the method improves over the naive baseline.
Current failed/untestable cases cannot be converted into a success claim.

## Priority 5: propagate measurement error and report rank robustness

**Paper: section 8.**

Current Monte Carlo ranges perturb priors, tolerances and penalty anchors.
They are sensitivity intervals. Add realistic measurement-error distributions
and temporal/spatial resampling, then recompute **joint rankings** across draws.
Report how often each candidate stays in the top 10 and how ranks depend on
weights, feature availability and scale. A local ablation table is not that
rank-stability experiment.

**Acceptance:** reproducible seeds, shared comparison populations, uncertainty
provenance and distributions of scores and ranks, without presenting sensitivity
as a confidence interval derived from independent field measurements.

## Priority 6: dense screening and field verification

**Paper: section 10.**

The 585-point lattice is an exploratory sample, not an all-land 0.05-degree
screen. Build a tiled, reproducible screen only after comparable features are
available. Apply coverage gates and known-site masks before discovery claims.
Run DBSCAN only at a sampling density consistent with the proposed 25 km
neighborhood and five-cell minimum. Sparse distant points cannot support that
regional-clustering protocol.

Deep-dive shortlisted regions at resolutions supported by the source products.
Obtain independent field or published measurements for geotechnical and
operational claims. A coarse orbital image cannot establish boulder hazards,
site access or cave safety.

## Clarify the paper's Earth-regime “ceiling”

**Paper: sections 7 and 13.**

Section 13 correctly calls the ceiling mapping a convention, not a physical
law. Its numerical value should therefore be described as a result **under
that chosen mapping**, not as an experimentally established maximum fidelity.
Keep physical constraints, site similarity and convention sensitivity separate.
The current UI follows that distinction.

## Terrain imagery and audio in this release

The image register currently contains:

- 14 dated MODIS regional views.
- 13 ASTER elevation-relief views; Mount Howe lies beyond ASTER coverage.
- 12 historical Landsat WELD annual-composite views; the two Antarctic sites
  have no usable response for this product and retain MODIS instead.

Historical Landsat service time is not a single acquisition timestamp, and
historical imagery does not establish present-day conditions. Both it and the
dated MODIS views are available in the UI. NASA WMS bounds are preserved so
swipe comparisons refer to the same displayed region, despite different
products and acquisition periods.

Interaction sounds and ambient music are original Web Audio synthesis.
Both are opt-in, have volume controls, and are unrelated to scientific
confidence or data quality. Motion preferences are respected.

Primary imagery-service reference:
[NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/).
Primary lunar-data reference:
[NASA PDS LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm).
