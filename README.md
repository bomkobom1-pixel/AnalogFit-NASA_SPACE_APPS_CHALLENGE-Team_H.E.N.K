# AnalogFit

**Which places on Earth can stand in for the Moon or Mars, and for which test?**

AnalogFit is an open web map that screens Earth locations as analogs for lunar and Martian sites, one test at a time. It was built by **Team H.E.N.K.** for the **2026 NASA Space Apps Challenge**, challenge *"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"*.

A place can be a good analog for rover navigation and a poor one for resource extraction. AnalogFit therefore scores a triple (an Earth site, a target, a test) and shows, next to every score, how much of the evidence that test needs is actually covered by data.

## Try it

1. Download or clone this repository.
2. Open **`index.html`** with a double click.

No server, account, or install is needed. The map, the 3D globe, and all scores work offline. Extra imagery layers need an internet connection. The interface is in English by default; the **ID** button switches to Indonesian.

## What you can do

- Choose one of **3 targets** and one of **10 test types**, then see **599 Earth locations** ranked for that combination on a 2D map or a 3D globe.
- Open a location's dossier: similarity index, evidence coverage, Earth and target values side by side, data sources, 3D terrain, dated NASA imagery, and the limits of the comparison.
- Take the **Evidence tour**, which walks through two hypothesis sites (Mount Howe and Harrat Khaybar) with live scores.
- Open the **Science** panel for coverage breakdowns, feature ablations, baseline comparisons, and a downloadable evidence card with sources and checksums.
- Open **Resources** for the 11 links on the challenge list, each labeled as used in the score, used as context, or reference only.

| Target | Location | Body |
| --- | --- | --- |
| T1 | Lunar south-polar reference patch, 89.6° S | Moon |
| T2 | Surface beside the Mare Tranquillitatis pit, 8.34° N, 33.22° E | Moon |
| T3 | Arcadia Planitia patch, 45° N, 200° E | Mars |

Test types: landing hazard detection, landing plume and touchdown, navigation, mobility, robotics, construction, in situ resource utilization (ISRU), thermal and hardware endurance, human operations procedures, suit and physiology.

Earth locations: 585 global land samples, 7 well-known analog sites, 4 hypothesis sites, and 3 rainforest negative controls.

## How it works

1. **Evidence rule.** A feature enters the score only if it is supported on both Earth and the target at a matched scale. In this version that feature is terrain slope: the median of four gradients on a 3 × 3 grid with a 500 m baseline, over a patch of about 1 km, computed the same way on both worlds. Low-Sun lighting comes from an idealized solar-geometry model and is labeled as modeled.
2. **Score.** Each feature gets a Gaussian similarity to the target value. Features are combined with a weighted geometric mean, so one bad mismatch cannot be hidden by a good match elsewhere. The result is multiplied by a penalty for Earth-only contamination, currently annual rainfall. The index runs from 0 to 100. It is a screening index, not a probability of mission success.
3. **Coverage.** Coverage is the share of the test's total weight that is supported by data. Missing features are never treated as zero and never filled in. A high score with low coverage describes only the features that are present.
4. **Sensitivity.** A Monte Carlo run (1,000 draws) varies the weights and tolerances and reports the range of each score. The range shows sensitivity to assumptions, not measurement confidence.
5. **Physics Earth cannot copy.** Gravity, atmospheric pressure, and radiation differ at every Earth site. The app explains this for each test in plain words.
6. **Provenance.** Original responses are kept in `data/raw/`. URLs, UTC timestamps, PDS labels, byte ranges, and SHA-256 checksums are recorded in `verified_observations.json` and `data/source_manifest.json`.

## Data used

| Source | Use in AnalogFit |
| --- | --- |
| [NASA LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) | Slope for lunar targets T1 and T2, derived from the archived elevation grids. |
| [NASA MGS MOLA](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n180hb.lbl) | Slope for Mars target T3. |
| [NASA LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) | Thermal-model context for T1. Shown as context only; not scored. |
| NASA SRTM GL1 v3 and NASA/METI ASTER GDEM v3 ([Earthdata Search](https://search.earthdata.nasa.gov/)) | Earth elevation for 589 locations, retrieved through the third-party [OpenTopoData](https://www.opentopodata.org/) API. |
| [NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/) | 2001–2025 climatology: rainfall penalty and temperature context. |
| [NASA GIBS](https://gibs.earthdata.nasa.gov/) / [Worldview](https://worldview.earthdata.nasa.gov/) | Blue Marble globe texture and dated context imagery. Images do not enter the score. |
| [ESA Copernicus DEM GLO-30](https://dataspace.copernicus.eu/) | Earth elevation for 10 polar locations that SRTM and ASTER do not cover, including Mount Howe. |

Details, product IDs, and attribution notices: [DATA_SOURCES.md](DATA_SOURCES.md) and [DATA_LICENSES.md](DATA_LICENSES.md).

## What the tests show

We report the results as they are.

- **Known analogs.** Of 14 documented roles of well-known analog sites, 3 can be tested with the data now in the score. **None of the 3 pass** our threshold (coverage of at least 50%, score of at least 50, rank in the top 5% of global samples).
- **Baselines.** Two simple distance-based baselines also pass 0 of 3. This version does not yet show an advantage over a simple distance measure.
- **Negative controls.** Rainforest sites are rejected in 81 of 90 comparisons; 9 are untestable and none are wrongly accepted. Rainfall drives most of this rejection.
- **Integrity.** The audit verifies 680 original source files by checksum and decodes the planetary elevations again from the archived bytes. Browser tests compare Python and browser scores across 35,940 values.

AnalogFit is therefore an **audited prototype, not a validated site selector**. We did not tune weights to make the validation pass. The full account is in the paper, [paper/analogfit.pdf](paper/analogfit.pdf).

## Limits

- Slope is the only feature supported by observations on both worlds. Mineralogy, grain size, radar, ground ice, dust, and local target temperature are not yet comparable, so ISRU cannot be scored.
- The 585 global points are a coarse sample, not a scan of every land pixel. A high-ranking sample is a candidate to examine, not a discovered analog.
- Each target is one reference patch of about 1 km. It does not describe a whole region, a cave interior, boulders, or landing safety.
- Matching the slope baseline does not remove differences in native resolution, datum, or instrument uncertainty.
- NASA POWER is regional reanalysis data at roughly 0.5° × 0.625°.
- The rainfall penalty suits screening for barren surfaces. It is not appropriate for every analog question.
- Weights, tolerances, and thresholds are stated assumptions. They are not calibrated against field data and are not NASA criteria.

## What comes next

Add features that are comparable on both worlds (target temperature, mineralogy, ground ice, radar roughness), replace the single reference patches with fixed target regions, estimate measurement uncertainty, and repeat the validation. Only after it passes would new sites be presented as discoveries. See [SCIENCE_ROADMAP.md](SCIENCE_ROADMAP.md).

## Reproduce the results

```powershell
python -m pip install -r requirements.txt
python fetch_nasa.py --background
python fetch_evaluation_data.py
python analogfit_pipeline.py
python analogfit.py
python evaluation_report.py
python fetch_terrain_media.py
python audit_data.py
python build_empirical_paper.py
python -m unittest discover -s tests -v
```

Data that is already cached is not downloaded again. Browser tests use Playwright with an installed Chrome:

```powershell
npm install --prefix .test-tools --no-audit --no-fund playwright
node tests/browser.cjs
node tests/ui.cjs
node tests/experience.cjs
node tests/mission.cjs
node tests/evaluation.cjs
node tests/intro-3d.cjs
```

## Repository guide

| File | Purpose |
| --- | --- |
| `index.html`, `app.js`, `ui.js`, `vendor/` | The serverless app and its bundled libraries. |
| `analogfit_pipeline.py` | Features, slope baselines, and solar geometry. |
| `analogfit.py` | Scores, sensitivity, diagnostics, CSV/GeoJSON, and app data. |
| `science.py` | Source integrity and the two-world evidence rule. |
| `fetch_verified.py`, `fetch_evaluation_data.py`, `fetch_terrain_media.py` | Downloads with provenance records. |
| `evaluation_report.py` | Naive baselines and ablation summaries. |
| `audit_data.py` | Checksum and re-decoding audit. |
| `analogfit_config.json` | Targets, test weights, tolerances, and other stated assumptions. |
| `analogfit_*_report.csv`, `analogfit_*_scores.csv` | Validation, negative-control, baseline, and per-sample outputs. |
| `paper/` | The empirical paper, and the earlier research protocol kept as `protocol_draft_v1.tex`. |
| `tests/` | Python science tests and browser tests. |

More documentation: [EVALUATION_RESPONSE.md](EVALUATION_RESPONSE.md), [FEATURE_USEFULNESS_REVIEW.md](FEATURE_USEFULNESS_REVIEW.md), and [AUDIT_KEAKURATAN.md](AUDIT_KEAKURATAN.md) (accuracy audit, in Indonesian).

## Tools and credits

- Python (NumPy, pandas, requests, rasterio, Pillow); HTML, CSS, and JavaScript; [Leaflet](https://leafletjs.com/) 1.9.4 and [globe.gl](https://globe.gl/), both bundled in `vendor/` with their licences; Natural Earth land outlines; Playwright for tests; LaTeX for the paper.
- **Use of AI.** Code and documentation were written and revised with help from Claude (Anthropic) and OpenAI Codex. The AnalogFit logo, the intro animation, and the Moon and Mars in the intro are drawn by code and are illustrations, not mission data. All scores are computed by the Python scripts from the downloaded data.
- The code is under the [MIT License](LICENSE). Data keeps the terms of its providers; see [DATA_LICENSES.md](DATA_LICENSES.md).
- The NASA name identifies data sources. It does not imply NASA endorsement or certification of this app. No NASA logos or mission identifiers are used as product branding.
