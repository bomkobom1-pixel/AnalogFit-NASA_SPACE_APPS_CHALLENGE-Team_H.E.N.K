# Response to the attached evaluation

15 November 2026. This report distinguishes completed changes from research
gaps. The evaluation's placement predictions and unconditional challenge-pass
verdict are opinions; this work does not establish either result.

## Larger map and reviewer workflow — implemented

- The default mission header is shorter and the mobile map is taller.
- **Expand map** fills the browser viewport. **Fullscreen map** uses native browser
  fullscreen when available and otherwise retains the expanded viewport, with
  a visible fallback message. Both work with 2D and the 3D globe.
- Expanded mode exposes target/task selectors and an optional **Parameters &
  sites** panel. Explicit selection opens the dossier over the map without
  shrinking the expanded map. Exit restores the normal workspace.
- The initial prompt and header expose a two-case **Evidence tour**, using actual
  standard-weight scores. Mount Howe tests the polar-lighting hypothesis; Harrat
  Khaybar illustrates the limits of a surface comparison for a cave claim. Neither
  is labeled a verified discovery.
- First-time use defaults to English. Existing language preferences and explicit
  URL language remain effective; Indonesian is still available.

At a tested 1440×900 viewport, the default map measures about 1134×660 pixels;
expanded mode measures 1440×900. On mobile, expanded mode measures 390×844.
Native fullscreen, unsupported-browser fallback, Escape, map resizing and
selection were tested on the actual file-based application.

## Missing polar terrain and partner data — resolved for these samples

All ten missing Earth reference patches now use **Copernicus GLO-30 Public**
(EU/ESA, DLR/Airbus), downloaded as 14 original COGs from the public AWS
distribution. Existing NASA SRTM/ASTER observations are retained.

The evidence table now has **599/599 Earth patches**: 589 NASA SRTM/ASTER and
10 Copernicus fallbacks. This refers only to the 599 sampled locations, not every
pixel of Earth. Nine full-resolution raster samples per patch retain the same
500 m baseline and approximately 1 km footprint as the planetary comparison.
All **90 added elevation samples** were decoded again from the native rasters.
Pixel-center georeferencing, bilinear interpolation, tile boundaries and no-data
are checked; there is no synthetic or zero-filled replacement.

The public COG catalogue, source documentation, licence and native GeoTIFFs are
retained with SHA-256 hashes. Required notices are in Resources and
[DATA_LICENSES.md](DATA_LICENSES.md). DSM heights can describe ice/snow rather
than exposed rock; the height reference is EGM2008. Matching slope baselines does
not remove uncertainty or datum/product differences.

Mount Howe's recovered 500 m slope is **18.817876°**. Its T1 navigation score is
about **1.372/100 at 60% supported coverage**, versus the earlier lighting-only
comparison at 45% coverage. More data need not improve a candidate's score.
The result does not confirm a lunar-polar terrain analog.

Verified 3D terrain is now available for global samples and Mount Howe. These
new meshes have **3×3 samples at 500 m spacing**. Existing curated display meshes
retain their 100 m spacing where available. Footprint, sample spacing, source
and vertical exaggeration are visible; the coarse mesh does not resolve rocks
or landing hazards. Evidence exports include every relevant source tile.

## Thermal gap — real NASA context added; score substitution rejected

The NASA PDS **Diviner PRP triangle containing T1** was extracted using exact byte
ranges, archived vertices, a containing-triangle check, the PDS4 product label
and field definitions. The values are:

| Quantity | Value | Meaning |
| --- | ---: | --- |
| Annual mean temperature | 85.378 K | Thermal-model fit at **2 cm below the surface**. |
| Annual maximum temperature | 227.004 K | Thermal-model fit **at the surface**. |

These values appear as **context only** in the dossier and evidence export.
They add no temperature (`T`) or ice (`I`) score coverage. The annual subsurface
mean is not interchangeable with POWER's annual regional surface temperature;
the PRP ice-depth calculation is not a measured probability of ice occurrence.
The label and raw records are retained for rechecking.

The evaluation's other thermal shortcuts are also insufficient as stated:

- TES/THEMIS **thermal inertia is not temperature**. It cannot fill a Kelvin
  temperature field. It requires a separate observable and regime-aware model.
- Mars Climate Database output is **model output**, not a measured Arcadia
  temperature observation.
- POWER's annual climatological maximum/minimum is not a matched local-time,
  seasonally resolved planetary temperature cycle.
- Adding `T` alone would not validate ISRU, whose standard weights require
  mineralogy, grain size and ice. Robotics would have only 40% supported weight
  from modeled lighting plus temperature; it would still miss the 50% prototype
  role-testability gate. Thermal endurance would reach 60%, below the paper's
  70% discovery-coverage gate. Passing any gate would still not establish validity.

The defensible next implementation is a frozen Arcadia ROI and an explicitly
defined temporal surface-temperature observable on both worlds. Preserve
local-time/season coverage, atmospheric and quality flags, missing-data masks,
native footprints and uncertainty. Aggregate observations to that observable
before enabling `T`; use a modeled class explicitly if a thermal model is needed.
Do not interpolate missing seasons into fictitious measurements or substitute
thermal inertia. Field/process applicability remains a separate question.

Primary definitions:
[Diviner PDS4 PRP label](https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/dlre_prp_south.xml),
[NASA TES archive](https://pds-geosciences.wustl.edu/missions/mgs/tes.html),
[Copernicus product documentation](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM).

## Paper mismatch and missing benchmarks — addressed with real outputs

[paper/analogfit.tex](paper/analogfit.tex) and [paper/analogfit.pdf](paper/analogfit.pdf)
are a results-synchronized empirical revision generated from the audited CSVs
and manifest. They separate implemented data from the original research protocol,
include actual failed/untestable roles, negative controls, coarse top samples,
new terrain/Diviner findings, baseline diagnostics and ablation scope. The
historical protocol is retained as `paper/protocol_draft_v1.tex`; it is not a
report of completed experiments. The original files outside this workspace are
preserved. Rebuild with `python build_empirical_paper.py`.

The run now includes:

- **Two naive min–max Euclidean baselines**: raw, and a variant with the same
  contamination penalty. Normalization is fitted on background plus target,
  excluding curated validation sites. Coverage and compatible-mask gates remain.
  Results are in `analogfit_baseline_scores.csv` and
  `analogfit_baseline_validation.csv`.
- **144 full-run active-feature ablation summaries** across targets/tasks,
  including 36 removals of supported features. They report score changes,
  unavailable scores, top-20 retention and role diagnostics in
  `analogfit_full_ablation.csv`. Removing missing task weights can increase
  renormalized coverage; that is a different question, not additional evidence.
- The Science panel exposes these diagnostics and the paper. The original local
  leave-one-feature-out display remains available.

**Actual result:** AnalogFit and each naive baseline pass **0/3 testable roles**;
11 roles remain untestable. Negative controls remain 81 OK and 9 untestable.
There is no evidence here that AnalogFit beats the naive baselines or that the
candidate ranking is operationally valid. Low rainforest scores are strongly
affected by rainfall penalties. Spatially independent field validation and
verified role labels are still needed.

The source audit verifies **680 original source files**, 599 POWER responses,
27 planetary elevations, 90 Copernicus elevations and the Diviner context triangle.
Fourteen scientific tests pass. Browser tests check 60 question/mode combinations
and 35,940 Python/browser comparisons (maximum error approximately 5.98e-16),
plus fullscreen, mobile, offline, evidence exports and the existing interactions.
Automated agreement verifies implementation consistency, not scientific validity.

## Remaining research priorities

The largest validation/feature-coverage gap is **not resolved** by these changes.
There is no supported mineralogy, grain-size, radar, ice, dust or compatible
target-temperature evidence in the scoring model. ISRU remains unavailable.

Freeze representative ROI polygons; estimate measurement/ROI/resampling
uncertainty; acquire comparable QA-screened thermal/mineral/ice data; add annual
terrain-horizon illumination; then run spatially independent validation and
ranking-stability analysis. Expand the coarse search and investigate geology,
access and logistics only after these definitions are defensible. No competition
placement or validated discovery is promised.

For exact counts/hashes see `data/evaluation_results.json` and
`data/source_manifest.json`. Reproduction commands are in [README.md](README.md).
