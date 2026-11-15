# AnalogFit feature usefulness review

Reviewed 15 November 2026 against the user-supplied Space Apps challenge/resource
text, the team's AnalogFit paper (Draft v1, 14 November), the local scientific
audit, and the implemented interface. This is a task-based design assessment,
not a usability study with NASA employees or NASA acceptance of the product.

**Evaluation follow-up:** expanded/native fullscreen maps, two evidence
walkthroughs and English-first entry are implemented. All ten polar terrain gaps
now use Copernicus GLO-30. Diviner PRP T1 supplies context only, with no added T/I
score coverage. Two naive baselines and 144 full-run ablation summaries are now
available; none establishes predictive superiority. See
[EVALUATION_RESPONSE.md](EVALUATION_RESPONSE.md) and [paper/analogfit.pdf](paper/analogfit.pdf).

The useful operational workflow is: define a test and target, inspect comparable
Earth evidence, understand missing inputs and physical differences, then export
a reproducible candidate for further investigation. The app currently supports
exploratory screening and evidence review. It does not establish mission-site
suitability, landing safety, resource availability, or a validated new analog.

## Scientific and decision-support features

| Implemented feature | Value for an analyst | Qualification / decision |
| --- | --- | --- |
| Ten test/task profiles | High: relates analog search to the activity being rehearsed. | Keep. Task weights are assumptions, not NASA requirements. Many tasks lack comparable measurements. |
| Three lunar/Martian reference targets | High: makes the comparison explicit. | Keep. The 1 km patches represent reference terrain, not an entire polar region, pit interior, or Arcadia. Frozen ROI polygons remain a research priority. |
| Global list of 585 land samples | Moderate: searches beyond curated analogs. | Keep as a coarse sample search. It is not an exhaustive land scan, a 0.05-degree grid, or evidence of discovery/novelty. |
| Fourteen curated reference/hypothesis/control sites | High for explanation and diagnostic comparisons. | Keep labels distinct. A documented field role and independent held-out validation still need checking. |
| Rankings of references and global candidates | High: reduces the candidate set for inspection. | Keep coverage before score. Different feature masks and penalties can make scores incomparable; rank is not mission priority. |
| Very bright cell filter | Limited: declutters the coarse search. | Optional. Albedo is a brightness proxy, not verified ice or snow cover. Filtering can hide relevant icy analogs. |
| Supported-evidence mode | Essential: excludes unsupported target/Earth inputs. | Keep as default. Supported evidence includes modeled Sun geometry; it is not all measured data. |
| Illustrative preview mode | Limited: explains planned behavior with missing features. | Retain only with explicit preview labels. Exclude from empirical claims, validation, and site recommendations. |
| Weighted geometric similarity index | Moderate: summarizes available matching features. | Keep with component breakdown and assumptions. A score of 90 is not 90% mission success or confidence. |
| Coverage indicator | Essential: exposes how much task weight has comparable evidence. | Keep visible in every view. Coverage is not data accuracy; changing weights does not create observations. |
| Observed / modeled / missing breakdown | Essential: distinguishes provenance classes. | Keep. Standard navigation is 15% observed-derived slope plus 45% modeled lighting, below the paper's 70% discovery gate. |
| Editable priorities and reset | High for examining sensitivity to the question. | Keep with current weights in exports. Do not tune weights against validation sites and then claim independent success. |
| Earth versus target feature cards | High: explains why a score rises or falls. | Keep units, comparable scale, missing inputs, and feature status. Unmeasured mineral/ice/grain/radar/dust/target-temperature inputs stay excluded. |
| Earth SRTM/ASTER and target LOLA/MOLA slopes | High: a real common terrain observable. | Keep the common 500 m baseline. Native resolution, interpolation, datum and measurement error remain different. One patch is not a terrain distribution. |
| Best ten-day low-Sun model and dates | Moderate for exploratory lighting comparisons. | Keep the modeled label. It omits terrain horizons and other ephemeris details; it is not annual illumination, shadow persistence, or a verified mission lighting window. |
| POWER climate values | Moderate for regional environmental context. | Keep with 2001–2025 climatology and regional scale. It is not current weather or a site-scale sensor observation. Target thermal evidence is still missing. |
| Environmental penalties | Limited/moderate for a bare-surface screening assumption. | Keep assumptions visible. Rain/albedo penalties are not universal analog requirements or calibrated probabilities. They can dominate negative controls. |
| Gravity, atmosphere and radiation differences | High: explains what a terrestrial analog cannot reproduce. | Keep qualitative physical limitations. Legacy numerical ceiling mappings are conventions, not calibrated laws or operational accuracy bounds. |
| Monte Carlo ranges | Moderate as model sensitivity. | Keep the sensitivity label. These are not measurement confidence intervals; joint error propagation and rank stability remain missing. |
| Known-role validation table | High: makes failure visible. | Keep all failures and untestable roles. Current result: 0/3 testable roles pass; 11 are not testable. These diagnostics do not establish operational validity. |
| Rainforest negative controls | Moderate as a sanity check. | Keep results including 9 untestable cases. The 81 OK cases are strongly driven by rain penalties, not independent validation. |
| Leave-one-feature-out ablation | High for explaining local dependence on supported features. | Keep. It changes coverage and the compared feature set; it is not causal analysis or a held-out benchmark. |
| Science/paper alignment panel | High for reviewers planning the next experiment. | Keep core coverage and limitations visible. Detailed roadmap notes can be collapsed through Settings. |
| Method and source tables | Essential for traceability. | Keep measured, derived, modeled and illustrative states explicit. A listed source does not imply integration. |
| Evidence-card JSON export | High: transfers the actual question, weights, target patch, provenance and assumptions. | Keep. It is a reproducible screening record, not a mission approval document. |
| Raw responses, PDS labels and SHA-256 provenance | Essential for reproducibility. | Keep. Integrity verifies file consistency, not scientific validity or independent instrument calibration. |

## Spatial inspection and visual context

| Implemented feature | Value for an analyst | Qualification / decision |
| --- | --- | --- |
| 2D map, markers, zoom and tooltips | High: locates samples and their surroundings. | Keep as default. A marker represents a sample/patch, not a validated operational site boundary. |
| Score colors, symbols and selected-location ring | High for orientation and cross-referencing lists. | Keep legend and numerical/text alternatives; shape distinguishes site categories. Similar colors do not guarantee comparable evidence. |
| NASA GIBS layers | Moderate: gives regional visual context. | Keep dates and attribution. Online layers require network access and do not enter numerical scores. |
| Optional Esri detail layer | Moderate: additional context. | Explicitly label as non-NASA. It does not count as NASA evidence or enter scores. |
| Offline land outlines and cached Blue Marble globe | High for reliable demonstrations and geographic orientation. | Keep. Cache availability does not imply current imagery. |
| 3D globe and score bars | Moderate: global distribution and selection. | Optional. Bar height represents score, not physical elevation; 2D is better for precise comparison. |
| Automatic globe rotation | Low independent analytical value. | Off by default; optional in Settings and subordinate to reduced motion. |
| Cached Landsat, MODIS and ASTER images | High contextual value for curated sites. | Keep product, bounds, date semantics and attribution. Historical mosaics are not current conditions; imagery is not a landing-hazard assessment. Global cells have a Worldview route rather than fabricated close-ups. |
| Imagery tabs, swipe comparison and lightbox | Moderate/high: examines visual differences without leaving the selected site. | Keep optional. Products may have different dates and resolutions; aligned display does not make them co-temporal measurements. |
| Local DEM mesh | Moderate: makes sampled relief easier to interpret. | Optional. Curated legacy 10×10 grids use 100 m spacing and 0.9 km extent. Mount Howe and global samples use the verified 3×3, 500 m scoring grid. Neither resolves small rocks; actual spacing is labeled. |
| Elevation colors and meter legend | High for reading the DEM display. | Keep numeric range. Colors are normalized within each patch and cannot be compared visually as identical absolute ranges across sites. |
| Relative-depth colors | Moderate: helps identify lower parts of a sampled surface. | Keep the highest-sampled-point reference. It is not subsurface depth, regolith thickness, a water depth, or a cave measurement. |
| Drag, keyboard rotation, reset and vertical exaggeration | Moderate: inspect shape from different angles. | Keep VE visible. These change presentation only, not elevations or scientific scores. |
| Optional terrain spin | Low independent analytical value. | Manual inspection aid only; do not start it automatically or interpret it as a simulation. |
| Location statistics dashboard | High: fast factual overview. | Keep actual DEM elevation, POWER temperature, annual precipitation and DEM relief. Missing measurements show unavailable; do not substitute a game level or readiness percentage. |
| Selection-driven sliding dossier | High: preserves map space until inspection is needed. | Keep closed by default, explicit selection to open, close/Escape/reopen, and bottom sheet on mobile. A task/weight change should not force it open. |
| Overview/imagery/evidence/terrain shortcuts | Moderate: makes a long dossier navigable. | Keep, with disabled states for unavailable or hidden sections. |

## Presentation, access and configuration

| Implemented feature | Value for an analyst | Qualification / decision |
| --- | --- | --- |
| Five-second astronomical opening and logo | Presentation value; no independent scientific value. | Requested for the competition demonstration. Keep Skip, replay, disable option, and real local readiness rather than simulated download progress. Decorative planets are not scientific observations. |
| Interface transitions | Moderate for conveying opening/closing and selection state. | Short, optional; honor device reduced-motion preference. Avoid continuous movement during analysis. |
| SFX | Low independent analytical value. | Off by default, explicit enable in Settings. Never use audio as the sole carrier of evidence or state. |
| Ambient music | Presentation value; may distract during analysis. | Off by default, explicit enable and volume in Settings, pauses in background tabs. No contribution to scientific confidence. |
| Settings gear and saved preferences | High for reducing clutter and adapting the workspace. | Keep imagery/terrain/motion/notes/density/default-view/language/audio controls together. Interface settings must not change scientific inputs or scores. |
| Original navy/blue design and consistent panels | Moderate: improves hierarchy and continuity. | Preserve AnalogFit branding. Professional styling does not imply NASA endorsement. |
| English and Indonesian | High for the team and international review. | Keep both, with English available for international scientific collaboration. |
| Keyboard tabs, focus states, Escape and responsive layout | High: access without precise pointing and on smaller displays. | Keep and test. Automated checks do not replace a full assistive-technology usability audit. |
| Resources filters/search and all 11 challenge links | High for finding data and understanding integration status. | Keep five NASA and six partner links. Five reference-only entries do not supply score evidence. Copernicus GLO-30 now supports terrain; Diviner supplies context. NASA POWER is supplementary. |
| File-based offline launch | High for dependable field/demo access without a server/account. | Keep cached data and explicit unavailable-online-layer status. Do not silently invent fresh data when offline. |
| Shareable URL state | Moderate: shares selected question and location. | Keep. A link does not package cached files, custom weights, or every interface preference; export the evidence card for the actual scoring context. |

## Changes made from this assessment

The drawer starts closed and opens on explicit map/list selection. Its dashboard
uses actual measurements and separates score from evidence coverage. Map controls
remain accessible while the desktop drawer is open. Mobile uses a bottom sheet.
The new Settings dialog groups interface controls and audio. Sound and automatic
globe rotation default to off. The five-second opening can be skipped, replayed,
or disabled. Evidence coverage and critical caveats remain visible when detailed
roadmap notes are hidden. Presentation preferences do not alter the score inputs.

## Highest-value scientific work still required

1. Freeze representative target ROI polygons and derive terrain distributions
   at defensible scales; estimate measurement, ROI and resampling uncertainty.
2. Add QA-screened comparable measurements on both worlds, particularly local
   Diviner/other target thermal products, mineralogy and ice where relevant.
   Merely adding a source link is insufficient.
3. Define and compute annual illumination and terrain horizons separately from
   the existing idealized best-ten-day observable.
4. Run spatially independent held-out validation, a naive baseline, full-set
   ablation and joint-resampling ranking stability before asserting predictive
   utility. Preserve and investigate the current failed/untestable diagnostics.
5. Expand the coarse search only after the measurement definitions and coverage
   gates are defensible; corroborate candidates with higher-resolution data and
   field/logistical review before calling them operational analogs.

These tasks have greater scientific value than adding further decorative game
mechanics. See [SCIENCE_ROADMAP.md](SCIENCE_ROADMAP.md) for acceptance criteria,
[AUDIT_KEAKURATAN.md](AUDIT_KEAKURATAN.md) for data and validation findings, and
[DATA_SOURCES.md](DATA_SOURCES.md) for the resource-to-product mapping.

The challenge resource list was supplied by the user. The earlier audit could
access NASA archives/services but could not independently reload the challenge
page. This review does not claim independent confirmation of all competition
wording or feedback from NASA staff.
