# AnalogFit

A map for finding places on Earth that are good analogs for a specific test on the Moon or Mars.
Open **`index.html` with a double click**. No server or account is needed.
English is the default for international review; the ID button switches to
Indonesian. A language choice that has already been saved is respected.

The interface uses the pitch-deck palette: Deep Space #080D18, Midnight Navy #111B2D,
Slate Blue #1C2B45, Signal Blue #3B82F6, Data Cyan #8EC5FF, Mars Amber #D99A52,
and text #F4F7FB. A **five-second 3D WebGL opening** moves the camera from Earth,
past the Moon and Mars, shows the AnalogFit logo, then enters the workspace
with a perspective transition. Earth uses a local NASA Blue Marble texture;
the Moon and Mars are procedural illustrations. The scale and paths in the opening are
cinematic decoration, not an orbit simulation or mission data.
A Skip button is available; the opening can be switched off or replayed
from the **Settings** gear icon. The percentage indicator
shows readiness of local components, not a simulated download time.
Switch off animations in Settings for a still interface. If WebGL is not
available, the opening falls back to CSS. The renderer stops after entry;
it does not affect data, scores or the map.

## How to use

1. Choose the test type and the target in the questions at the top.
2. Use **Supported comparisons** for screening results. Check the coverage percentage before comparing numbers.
3. Select a location on the map or in the rankings to open its dossier, which slides in.
   The right-hand panel is closed by default; close it with the × button or Escape and
   reopen it with the selected-location button. The summary shows the similarity index,
   observed/modeled coverage, DEM elevation, temperature, precipitation and real relief.
   Scroll to see the Earth values, NASA target, sources and the limits of the analog.
4. Choose Map or 3D Globe. Land outlines, scores and the NASA globe texture work offline; extra imagery layers need internet.
5. Illustrative preview includes manual assumptions and must not be reported as observed results.
6. The **Configuration** and **Site rankings** tabs separate the parameters from the candidate list.
7. The **Resources** menu holds the 11 links from the challenge list: 5 NASA and 6
   CSA/ESA/JAXA partner sources. Use the filters or search. The status labels separate data
   in use, visual context, and references not yet integrated.
8. The **Science** menu links the implementation to the team's paper:
   observed vs modeled coverage, the 70% threshold, local ablation, and JSON evidence cards.
9. Terrain imagery offers historical Landsat, dated MODIS, ASTER relief, and a
   swipe comparison. Source and service time are always shown. Historical
   Landsat is not evidence of current site conditions; imagery does not enter the score.
10. In 3D terrain, choose **Elevation colour** or **Relative depth**. The legend
    uses metres. Depth is measured from the highest sample point, not below
    ground. Use the VE slider, arrow keys, drag, or Rotate to inspect.
    Global samples and Mount Howe now use a 3×3 grid with 500 m spacing;
    other curated sites keep the older 100 m display grid where available.
    Sample spacing, source and VE are always shown.
11. Open the **Settings** gear icon for SFX, music and volume.
    Both are on by default and start with the first click or key press, as browsers
    require; music pauses while the tab is in the background.
12. Settings also controls animations, imagery, 3D terrain, compact statistics, detailed
    science notes, globe rotation, default view and language. Interface preferences
    are saved on the device when browser storage is available. Scores and data do not
    change. Evidence coverage and key limits stay visible.
13. Choose **Expand map** for a viewport-sized map, or the **Fullscreen** icon
    for browser fullscreen. Where fullscreen is not supported, the large map is still
    available. Target, test type and the parameter/site panel can be reached
    directly from the large map. Exit with the same button or Escape.
14. **Evidence tour** opens two comparison studies with live scores,
    sources and limits. This is hypothesis testing, not a discovery claim.

Changes made in response to evaluation: [EVALUATION_RESPONSE.md](EVALUATION_RESPONSE.md).
The synchronised empirical paper: [paper/analogfit.pdf](paper/analogfit.pdf),
with source [paper/analogfit.tex](paper/analogfit.tex). The earlier protocol is archived
separately; the empirical version does not claim that every planned study is complete.

An assessment of how useful each feature group is for analyst work is in
[FEATURE_USEFULNESS_REVIEW.md](FEATURE_USEFULNESS_REVIEW.md). It is based on
the tasks and the paper, not on user testing with NASA staff.

To improve the research method, see [SCIENCE_ROADMAP.md](SCIENCE_ROADMAP.md),
which maps the real gaps against sections 5–10 of the original paper.

## Data actually used

| Data | Use and limits |
| --- | --- |
| NASA PDS LRO LOLA | Two lunar reference patches; slope derived from the original DEM, not hand-entered target values. |
| NASA PDS MGS MOLA | One Arcadia Planitia patch; slope derived from the original DEM. |
| NASA/METI ASTER GDEM v3 and NASA SRTM GL1 v3 via OpenTopoData | Earth terrain. The third-party API provider is named explicitly. |
| Copernicus GLO-30 Public (EU/ESA, DLR/Airbus) | Ten empty patches filled from 14 original COGs; Earth terrain covers 599/599 sample sites. 500 m baseline. The DSM can represent snow/ice. See DATA_LICENSES.md. |
| NASA PDS LRO Diviner PRP | T1 thermal context from the triangle containing the target. The 85.378 K mean at 2 cm depth and the 227.004 K surface maximum are thermal-model outputs. They add no temperature/ice evidence to the score. |
| NASA POWER, MERRA-2 / CERES | 599 original 2001–2025 climatology responses. Uses the service's ANN value, not a rounded simple mean of 12 months. Rainfall becomes a screening penalty; Earth temperature is shown as context. |
| NASA GIBS / Worldview | Context imagery and the offline Blue Marble texture. Imagery does not enter the numeric score. |
| Solar geometry | Idealised model with a flat horizon. Not a measurement of illumination or permanent shadow. |

LOLA/MOLA and NASA PDS are among the source paths in the challenge Resources supplied by the user. POWER is an additional NASA source. See [DATA_SOURCES.md](DATA_SOURCES.md) for how the sources relate to the challenge Resources, and [AUDIT_KEAKURATAN.md](AUDIT_KEAKURATAN.md) (accuracy audit, in Indonesian) for the audit results.

## What the score and coverage mean

The score is a 0–100 screening index: a weighted geometric mean of the similarity of the available features, multiplied by environmental penalties. Weights, Gaussian tolerances and penalty thresholds are model assumptions.

A feature enters supported mode only when the **Earth and target** inputs are both supported and at comparable scale. Slope uses a **500 m** baseline on a 1 km patch on both worlds. Coverage uses **all of the test's weights**, including features not yet available. A high score with low coverage does not prove a match for the whole test, or mission readiness.

Currently only slope is backed by terrain observations on both worlds. Illumination comes from a model. Minerals, grain size, CPR, ground ice, dust, and local target temperature are not yet verified and are excluded from supported mode. The 210 K global mean temperature of Mars is not treated as an Arcadia observation. Missing data is not treated as zero.

## Re-running

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

The default downloader uses `fetch_verified.py`. It keeps the original responses in `data/raw/`, records the URL, UTC timestamp, PDS label, byte range and SHA-256 in `verified_observations.json`, and resumes missing data. Cached data that is already complete is not downloaded again. `--legacy` runs the old downloader for compatibility; its output does not automatically count as verified evidence.

For developer browser tests, install Playwright locally into `.test-tools/` (excluded from the repository):

```powershell
npm install --prefix .test-tools --no-audit --no-fund playwright
node tests/browser.cjs
node tests/ui.cjs
node tests/experience.cjs
node tests/mission.cjs
node tests/evaluation.cjs
node tests/intro-3d.cjs
```

The tests use the installed Chrome, open the app over `file://`, compare Python and browser scores, and check offline mode and a 390 px screen. Evidence is saved to `test-artifacts/`.

## Limits that still apply

- The 585 global points are a coarse sample, not a scan of every land pixel. Candidates outside a 100 km buffer around known analogs do not yet prove the discovery of a new analog.
- The Moon/Mars patches are explicit reference points. A 1 km patch does not describe a whole region, cave interiors, boulders, or landing safety.
- The instruments' coverage and native resolution differ. A common baseline does not remove interpolation or DEM uncertainty.
- POWER is reanalysis/regional: meteorology at about 0.5° latitude by 0.625° longitude; albedo is coarser.
- Rainfall is not relevant to every analog question. The current penalty targets screening for barren surfaces, not full geological, astrobiological or resource validation.
- The Monte Carlo ranges are sensitivity to assumptions, not observational confidence intervals.
- Earth's gravity, atmosphere and radiation remain different. The old `ceiling` and `F_total` columns are kept for compatibility with status **ILLUSTRATIVE_HEURISTIC_NOT_PHYSICAL_LIMIT**; they are not shown as a calibrated accuracy limit.

## Main files

| File | Purpose |
| --- | --- |
| `science.py` | Source integrity and the two-world evidence rules. |
| `fetch_verified.py` | NASA and Earth terrain downloads with data provenance. |
| `fetch_evaluation_data.py` | Polar Copernicus downloads, Diviner context and strict observable definitions. |
| `evaluation_report.py` | Two naive baselines and 144 ablation summaries across all samples. |
| `build_empirical_paper.py` | Empirical paper built from the current CSV and audit results. |
| `analogfit_pipeline.py` | Features, baselines and solar geometry. |
| `analogfit.py` | Scores, sensitivity, diagnostics, CSV/GeoJSON and app data. |
| `analogfit_config.json` | Weight/tolerance assumptions and illustrative values; verified terrain targets are loaded at build time. |
| `analogfit_background_scores.csv` | Scores for all 585 global samples, for re-checking. |
| `index.html`, `app.js`, `vendor/` | The serverless app and its local assets. |
| `explorer.js`, `explorer.css`, `walkthrough.js` | Large map, fullscreen and the evidence tour. |

Theme, logo, opening and the source catalogue are in `ui.css`, `ui.js` and
`assets/analogfit-mark.svg`. UI tests are in `tests/ui.cjs`; results are
saved to `test-artifacts/ui-report.json`.

The imagery, science panel and audio extensions are in `terrain-view.js`, `science-view.js`,
`audio.js` and `experience.css`. Run `python fetch_terrain_media.py` to
prepare or resume the NASA imagery cache; output is saved to
`assets/terrain/`, `terrain_media.js` and `data/terrain_media_manifest.json`.
Pillow is used only to detect blank imagery responses; the original NASA images
are stored unmodified. New feature test results: `test-artifacts/experience-report.json`.

Code and documentation were written and revised with help from Claude (Anthropic) and OpenAI Codex. The NASA name identifies data sources, not NASA endorsement or certification of the app.
