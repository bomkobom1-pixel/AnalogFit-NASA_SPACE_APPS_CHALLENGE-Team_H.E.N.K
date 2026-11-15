"""
AnalogFit, step 3 of 3: score every Earth site against every Moon/Mars target and task.
Team H.E.N.K. | 2026 NASA Space Apps Challenge

    python analogfit.py [--mc 1000] [--seed 42]

Inputs   analogfit_config.json, analogfit_model_ready_features.csv,
         analogfit_background_features.csv (optional global land sample)
Outputs  analogfit_model_output_scores.csv      one row per site x target x task
         analogfit_validation_report.csv        known analogs vs the global sample, for their documented role
         analogfit_negative_control_report.csv  rainforest cells must score below 0.05
         analogfit_data_quality_report.csv      which inputs are real, per site
         analogfit_map.geojson                  curated sites for GIS tools
         analogfit_data.js                      everything the web app needs (opens without a server)

Every score is reported twice (neither is a probability of mission success):
    all   uses all nine features, including the illustrative placeholders
    real  uses only features supported on both Earth AND target; computed Sun geometry is identified separately
`coverage_real` says how much of the task's weight the real score rests on.
"""

import argparse
import ast
import datetime
import json
from pathlib import Path

import numpy as np
import pandas as pd
from science import load_observations, configure_targets, target_features

BASE_DIR = Path(__file__).resolve().parent
HURST_SIGMA = 0.10
PASS_PERCENTILE = 95.0          # paper Table 6: a known analog must be in the top 5% of Earth land cells
NEGATIVE_MAX = 0.05             # paper Section 9.2

# code: (column in the features CSV, key in targets.observables_target, key in targets.tolerances_sigma)
FEATURES = {
    "S": ("slope_500m_deg", "slope_deg_median_500m", "slope"),
    "R": ("ln_roughness_100m", "ln_roughness_100m", "roughness"),
    "B": ("radar_cpr", "radar_cpr", "cpr"),
    "M": ("minerals", "mineralogy_vector", None),
    "G": ("ln_d50_um", "ln_grain_size_d50_um", "grain_size"),
    "I": ("permafrost_prob", "ice_probability", "ice"),
    "L": ("sun_grazing_frac_10d", "sun_grazing_frac_10d", "illumination"),
    "T": ("t_mean_K", "thermal_mean_K", "thermal"),
    "D": ("f_ex", "dust_exceedance_f_ex", "dust"),
}
# contamination component: (column, anchor key in the config, log axis?)
CONTAMINANTS = [
    ("ndvi", "ndvi", False),
    ("precip_mm_yr", "precipitation_mm_yr", True),
    ("nightlight_pct", "nightlights_percentile", False),
]


def finite(value):
    try:
        return bool(np.isfinite(float(value)))
    except (TypeError, ValueError):
        return False


# ============================================================
# 1. SIMILARITY PER FEATURE (paper Eq. 3 and 8)
# ============================================================

def jsd_base2(p, q):
    """Jensen-Shannon divergence in bits: 0 = identical mixtures, 1 = nothing in common."""
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    p, q = p / p.sum(), q / q.sum()
    m = 0.5 * (p + q)

    def kl(a, b):
        mask = a > 0
        return float(np.sum(a[mask] * np.log2(a[mask] / b[mask])))

    return 0.5 * kl(p, m) + 0.5 * kl(q, m)


def gaussian(site_value, target_value, sigma):
    return float(np.exp(-((float(site_value) - float(target_value)) ** 2) / (2.0 * float(sigma) ** 2)))


def similarities(row, target):
    """
    Similarity in [0, 1] for every feature that both the site and the target have.
    1 = the Earth site matches the target value; it fades as the gap grows past the tolerance.
    """
    obs, tol = target["observables_target"], target["tolerances_sigma"]
    out = {}
    for code, (column, target_key, sigma_key) in FEATURES.items():
        if target_key not in obs or column not in row or obs[target_key] is None:
            continue
        if code == "M":
            minerals = row[column]
            if isinstance(minerals, str):
                minerals = ast.literal_eval(minerals)
            if isinstance(minerals, (list, tuple)) and sum(minerals) > 0:
                out[code] = float(np.clip(1.0 - jsd_base2(minerals, obs[target_key]), 0.0, 1.0))
            continue
        if not finite(row[column]):
            continue
        s = gaussian(row[column], obs[target_key], tol[sigma_key])
        if code == "R" and finite(row.get("hurst_H")) and "hurst_exponent_H" in obs:
            s = float(np.sqrt(s * gaussian(row["hurst_H"], obs["hurst_exponent_H"], HURST_SIGMA)))
        out[code] = s
    return out


# ============================================================
# 2. TERRESTRIAL CONTAMINATION (paper Eq. 10)
# ============================================================

def contamination(row, anchors, columns, scale=1.0):
    """
    0 = as bare as a planetary surface, 1 = disqualified by vegetation, rain or human activity.
    `columns` selects which components count (the real-data score only uses the real ones).
    `scale` may be an array: it perturbs the anchors for the Monte Carlo run.
    """
    scale = np.asarray(scale, dtype=float)
    clean = np.ones_like(scale)
    for column, anchor_key, log_axis in CONTAMINANTS:
        if column not in columns or not finite(row.get(column)):
            continue
        value = float(row[column])
        low, high = anchors[anchor_key]["bare"] * scale, anchors[anchor_key]["saturated"] * scale
        if log_axis:
            value, low, high = np.log(max(value, 1e-9)), np.log(low), np.log(high)
        clean = clean * (1.0 - np.clip((value - low) / (high - low), 0.0, 1.0))
    return 1.0 - clean


# ============================================================
# 3. SITE FIDELITY (paper Eq. 9) AND EARTH CEILING (Eq. 11)
# ============================================================

def fidelity(sims, weights, contam, subset=None):
    """
    Weighted geometric mean of the similarities, times (1 - contamination).
    Geometric, so one bad feature cannot be bought back by good ones.
    Returns (score or None, coverage): coverage is the share of the task weight actually scored.
    """
    active = [k for k in sims if weights.get(k, 0.0) > 0 and (subset is None or k in subset)]
    mass = float(sum(v for v in weights.values() if v > 0))
    active_mass = float(sum(weights[k] for k in active))
    coverage = active_mass / mass if mass else 0.0
    if not active:
        return None, 0.0
    log_mean = sum(weights[k] * np.log(max(sims[k], 1e-12)) for k in active) / active_mass
    return float(np.exp(log_mean) * (1.0 - contam)), coverage


def regime_ceiling(target, task, cfg):
    """
    Legacy illustrative multiplier, NOT a calibrated physical ceiling or validated fidelity.
    Kept for export compatibility only; the UI shows physical differences without an accuracy cap.
    """
    earth, body = cfg["regime_constants"]["Earth"], cfg["regime_constants"][target["body"]]
    ratios = {
        "g": earth["g"] / body["g"],
        "P": earth["P_mbar"] / body["P_mbar"],
        "D": body["dose_uSv_day"] / earth["dose_uSv_day"],
    }
    ceiling, applied = 1.0, {}
    for factor, on in cfg["regime_flags_v_tau"][task].items():
        if on:
            ceiling *= 1.0 / (1.0 + abs(np.log10(ratios[factor])))
            applied[factor] = ratios[factor]
    return float(ceiling), applied


# ============================================================
# 4. MONTE CARLO UNCERTAINTY (paper Section 8)
# ============================================================

def monte_carlo(sims, weights, row, cfg, real_features, real_contaminants, n, rng, alpha=50.0):
    """
    5th-95th percentile of the score when the judgement calls are shaken:
    task weights (Dirichlet), tolerances (x0.5 to x2) and contamination anchors (+-25%).
    A Gaussian similarity with its tolerance scaled by m is s ** (1 / m**2), so no rescoring is needed.
    """
    active = [k for k in sims if weights.get(k, 0.0) > 0]
    if not active:
        return {}
    logs = np.log(np.maximum([sims[k] for k in active], 1e-12))
    prior = np.array([weights[k] for k in active], dtype=float)
    w = rng.dirichlet(alpha * prior / prior.sum(), size=n)
    mult = np.exp(rng.uniform(-np.log(2), np.log(2), size=(n, len(active))))
    no_sigma = np.array([k == "M" for k in active])
    logs_mc = np.where(no_sigma, logs, logs / mult ** 2)
    scale = rng.uniform(0.75, 1.25, size=n)
    anchors = cfg["contamination_anchors"]

    out = {}
    f_all = np.exp((w * logs_mc).sum(axis=1)) * (1.0 - contamination(row, anchors, [c[0] for c in CONTAMINANTS], scale))
    out["all"] = [float(np.percentile(f_all, 5)), float(np.percentile(f_all, 95))]
    real = np.array([k in real_features for k in active])
    if real.any():
        wr = w[:, real]
        f_real = np.exp((wr * logs_mc[:, real]).sum(axis=1) / wr.sum(axis=1))
        f_real = f_real * (1.0 - contamination(row, anchors, real_contaminants, scale))
        out["real"] = [float(np.percentile(f_real, 5)), float(np.percentile(f_real, 95))]
    return out


# ============================================================
# 5. LOAD AND SCORE
# ============================================================

def real_sets(row):
    """Which features and contamination components of this row rest on real data."""
    cols = row.get("real_cols")
    real_cols = set(cols.split(";")) if isinstance(cols, str) and cols else set()
    features = {code for code, (column, _, _) in FEATURES.items() if column in real_cols}
    contaminants = [c[0] for c in CONTAMINANTS if c[0] in real_cols]
    return real_cols, features, contaminants


def score_table(df, cfg, n_mc, seed):
    """Score every row of a features table against every target and task."""
    anchors = cfg["contamination_anchors"]
    all_contaminants = [c[0] for c in CONTAMINANTS]
    records = []
    for index, row in enumerate(df.to_dict("records")):
        real_cols, real_features, real_contaminants = real_sets(row)
        rng = np.random.default_rng(seed + index)
        c_all = float(contamination(row, anchors, all_contaminants))
        c_real = float(contamination(row, anchors, real_contaminants))
        for target_id, target in cfg["targets"].items():
            sims = similarities(row, target)
            supported = real_features & target_features(target)
            for task, weights in cfg["task_weights"].items():
                f_all, coverage = fidelity(sims, weights, c_all)
                f_real, coverage_real = fidelity(sims, weights, c_real, supported)
                ceiling, _ = regime_ceiling(target, task, cfg)
                mc = monte_carlo(sims, weights, row, cfg, supported, real_contaminants, n_mc, rng) if n_mc else {}
                records.append({
                    "cell_id": row["cell_id"],
                    "site": row.get("site_name", row["cell_id"]),
                    "category": row.get("category", "Background"),
                    "lat": row["lat"], "lon": row["lon"],
                    "target": target_id, "task": task,
                    "F_site": f_all,
                    "F_site_p05": mc.get("all", [None, None])[0],
                    "F_site_p95": mc.get("all", [None, None])[1],
                    "F_site_real": f_real,
                    "F_site_real_p05": mc.get("real", [None, None])[0],
                    "F_site_real_p95": mc.get("real", [None, None])[1],
                    "ceiling": ceiling,
                    "ceiling_status": "ILLUSTRATIVE_HEURISTIC_NOT_PHYSICAL_LIMIT",
                    "F_total": None if f_all is None else f_all * ceiling,
                    "F_total_real": None if f_real is None else f_real * ceiling,
                    "coverage": coverage,
                    "coverage_real": coverage_real,
                    "evidence_features": ";".join(sorted(k for k in supported if weights.get(k, 0)>0 and k in sims)),
                    "evidence_contaminants": ";".join(sorted(real_contaminants)),
                    "score_status": "PARTIAL" if coverage_real < .7 else "SCREENING",
                    "contamination": c_all,
                    "contamination_real": c_real,
                })
    return pd.DataFrame(records)


def site_type(category):
    category = str(category).lower()
    if category.startswith("validation"):
        return "known"
    if category.startswith("hypothesis"):
        return "hypothesis"
    if category.startswith("negative"):
        return "negative"
    return "background"


# ============================================================
# 6. REPORTS
# ============================================================

def validation_report(sites, scores, bg_scores):
    """
    Held-out test (paper Table 6): for its documented role, each known analog must score at or above
    the 95th percentile of Earth land cells. Uses the real-data score on both sides, so the result
    is only as strong as `coverage_real` says.
    """
    rows = []
    for site in sites.to_dict("records"):
        roles = site.get("roles")
        if not isinstance(roles, str) or not roles:
            continue
        for role in roles.split(";"):
            target_id, task = role.split("|")
            mine = scores[(scores.cell_id == site["cell_id"]) & (scores.target == target_id) & (scores.task == task)].iloc[0]
            row = {"site": site["site_name"], "target": target_id, "task": task,
                   "F_site_real": mine.F_site_real, "coverage_real": mine.coverage_real,
                   "percentile_vs_global_land": None, "n_global_cells": 0,
                   "result": "NOT TESTABLE (coverage below 50%, incompatible evidence, or insufficient background)"}
            if pd.notna(mine.F_site_real) and mine.coverage_real >= .5 and len(bg_scores):
                pool = bg_scores[(bg_scores.target == target_id) & (bg_scores.task == task)
                                 & (bg_scores.evidence_features == mine.evidence_features)
                                 & (bg_scores.evidence_contaminants == mine.evidence_contaminants)].F_site_real.dropna()
                if len(pool) >= 30 and pool.max() - pool.min() > 1e-10:
                    pct = 100.0 * float(((pool < mine.F_site_real - 1e-12).sum() + .5 * np.isclose(pool, mine.F_site_real, rtol=0, atol=1e-12).sum()) / len(pool))
                    row.update({"percentile_vs_global_land": round(pct, 1), "n_global_cells": int(len(pool)),
                                "result": "PASS" if pct >= PASS_PERCENTILE and mine.F_site_real >= .5 else "FAIL"})
            rows.append(row)
    return pd.DataFrame(rows)


def negative_report(scores):
    neg = scores[scores.category.map(site_type) == "negative"].copy()
    neg["result"] = ["NOT TESTABLE" if pd.isna(v) else "OK" if v < NEGATIVE_MAX else "FAIL" for v in neg.F_site_real]
    return neg[["site", "target", "task", "F_site", "F_site_real", "result"]]


def quality_report(sites):
    rows = []
    for site in sites.to_dict("records"):
        _, real_features, real_contaminants = real_sets(site)
        rows.append({
            "cell_id": site["cell_id"], "site": site["site_name"],
            "real_features": " ".join(sorted(real_features)),
            "placeholder_features": " ".join(k for k in FEATURES if k not in real_features),
            "real_contamination_inputs": " ".join(real_contaminants),
        })
    return pd.DataFrame(rows)


# ============================================================
# 7. EXPORTS
# ============================================================

def rounded(value, digits=4):
    return None if value is None or not finite(value) else round(float(value), digits)


def export_geojson(sites, scores, path):
    features = []
    for site in sites.to_dict("records"):
        mine = scores[scores.cell_id == site["cell_id"]]
        _, real_features, _ = real_sets(site)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [site["lon"], site["lat"]]},
            "properties": {
                "cell_id": site["cell_id"], "name": site["site_name"], "site_type": site_type(site["category"]),
                "real_features": sorted(real_features),
                "scores": {
                    f"{r.target}__{r.task}": {
                        "F_site": rounded(r.F_site), "F_site_real": rounded(r.F_site_real),
                        "coverage_real": rounded(r.coverage_real), "ceiling": rounded(r.ceiling),
                        "ceiling_status": "ILLUSTRATIVE_HEURISTIC_NOT_PHYSICAL_LIMIT",
                    } for r in mine.itertuples()
                },
            },
        })
    note = ("F_site_real requires supported Earth AND target data; Sun geometry is modeled. Scores are heuristic screening indices, not validated mission readiness. "
            "F_site also uses illustrative placeholders and must not be reported as a measurement. ceiling is a legacy illustrative multiplier, not a calibrated physical limit.")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "data_note": note, "features": features}, f, indent=1)


def export_app_data(cfg, sites, background, scores, validation, path):
    """One JavaScript file with everything the web app needs, so index.html opens by double-click."""
    targets = {}
    for target_id, target in cfg["targets"].items():
        obs = target["observables_target"]
        targets[target_id] = {
            "name": target["name"], "body": target["body"],
            "supportedFeatures": sorted(target_features(target)),
            "status": target.get("target_status", {}),
            "referencePatch": target.get("reference_patch"),
            "thermalContext": target.get("thermal_context"),
            "values": {code: obs[key] for code, (_, key, _) in FEATURES.items() if key in obs and code != "M"},
            "hurst": obs.get("hurst_exponent_H"),
            "minerals": obs.get("mineralogy_vector"),
            "sigma": {code: target["tolerances_sigma"][sk] for code, (_, _, sk) in FEATURES.items()
                      if sk and sk in target["tolerances_sigma"]},
        }
    tasks = {}
    for task, weights in cfg["task_weights"].items():
        tasks[task] = {"weights": weights, "ceiling": {}}
        for target_id, target in cfg["targets"].items():
            ceiling, applied = regime_ceiling(target, task, cfg)
            tasks[task]["ceiling"][target_id] = {"value": round(ceiling, 4),
                                                 "ratios": {k: float(f"{v:.3g}") for k, v in applied.items()}}

    def target_block(row, real_features):
        block = {}
        for target_id, target in cfg["targets"].items():
            sims = similarities(row, target)
            block[target_id] = {k: float(v) for k, v in sims.items()
                                if real_features is None or k in real_features}   # 5 significant digits: tiny values matter
        return block

    anchors = cfg["contamination_anchors"]
    all_contaminants = [c[0] for c in CONTAMINANTS]
    value_columns = ["slope_500m_deg", "slope_med_deg", "ln_roughness_100m", "hurst_H", "radar_cpr", "ln_d50_um", "permafrost_prob",
                     "sun_grazing_frac_10d", "t_mean_K", "t_day_K", "t_night_K", "f_ex", "ndvi", "precip_mm_yr",
                     "nightlight_pct", "albedo", "u_star_mean", "elev_m"]
    site_list = []
    for site in sites.to_dict("records"):
        real_cols, real_features, real_contaminants = real_sets(site)
        mine = scores[scores.cell_id == site["cell_id"]]
        mc = {}
        for r in mine.itertuples():
            mc.setdefault(r.target, {})[r.task] = {
                "all": [rounded(r.F_site_p05, 3), rounded(r.F_site_p95, 3)],
                "real": [rounded(r.F_site_real_p05, 3), rounded(r.F_site_real_p95, 3)],
            }
        dem = site.get("dem_z")
        roles = site.get("roles")
        site_list.append({
            "id": site["cell_id"], "name": site["site_name"], "type": site_type(site["category"]),
            "lat": site["lat"], "lon": site["lon"],
            "roles": [r.split("|") for r in roles.split(";")] if isinstance(roles, str) and roles else [],
            "realCols": sorted(real_cols), "realFeatures": sorted(real_features),
            "values": {c: rounded(site.get(c), 4) for c in value_columns},
            "minerals": ast.literal_eval(site["minerals"]) if isinstance(site["minerals"], str) else list(site["minerals"]),
            "sunWindow": site.get("sun_window"),
            "dem": json.loads(dem) if isinstance(dem, str) and dem else None,
            "terrainDataset": site.get("terrain_dataset"),
            "demSpacing": site.get("dem_spacing_m",100),
            "demSource": site.get("dem_dataset"),
            "sims": target_block(site, None),
            "cAll": float(contamination(site, anchors, all_contaminants)),
            "cReal": float(contamination(site, anchors, real_contaminants)),
            "mc": mc,
        })

    bg = {"n": 0}
    if len(background):
        rows = background.to_dict("records")
        blocks = [target_block(r, None) for r in rows]
        bg = {
            "n": len(rows),
            "terrainDataset": [r.get("terrain_dataset") for r in rows],
            "dem": [json.loads(r['dem_z']) if isinstance(r.get('dem_z'),str) and r['dem_z'] else None for r in rows],
            "lat": [r["lat"] for r in rows], "lon": [r["lon"] for r in rows],
            "slope": [rounded(r["slope_500m_deg"], 6) for r in rows],
            "tK": [rounded(r["t_mean_K"], 1) for r in rows],
            "precip": [rounded(r["precip_mm_yr"], 0) for r in rows],
            "albedo": [rounded(r["albedo"], 2) for r in rows],
            "elev": [rounded(r["elev_m"], 0) for r in rows],
            "sun": [rounded(r["sun_grazing_frac_10d"], 3) for r in rows],
            "sunWindow": [r["sun_window"] for r in rows],
            "cReal": [float(contamination(r, anchors, real_sets(r)[2])) for r in rows],
            "realCols": [sorted(real_sets(r)[0]) for r in rows],
            "realFeatures": [sorted(real_sets(r)[1]) for r in rows],
            "cAll": [float(contamination(r, anchors, all_contaminants)) for r in rows],
            "sims": {t: {k: [b[t].get(k) for b in blocks] for k in ("S", "L", "T") if any(k in b[t] for b in blocks)}
                     for t in cfg["targets"]},
        }

    data = {
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "schemaVersion": 2,
        "baselineM": 500,
        "validationMinCoverage": .5,
        "dataNote": "Screening index, not a mission success probability. Evidence requires supported Earth AND target values; computed illumination is a flat-horizon model. Weights, tolerances and rainfall penalties are heuristic.",
        "features": list(FEATURES),
        "mineralGroups": cfg["mineral_groups"],
        "targets": targets, "tasks": tasks,
        "anchors": anchors,
        "maskKnownKm": cfg["grid_stages"]["mask_known_analogs_radius_km"],
        "sites": site_list, "background": bg,
        "negative": json.loads(negative_report(scores).to_json(orient="records")),
        "validation": json.loads(validation.to_json(orient="records")) if len(validation) else [],
    }
    with open(path, "w", encoding="utf-8") as f:
        f.write("// Generated by analogfit.py. Do not edit by hand.\nwindow.ANALOGFIT = ")
        json.dump(data, f, separators=(",", ":"), allow_nan=False)
        f.write(";\n")


# ============================================================
# 8. SELF-CHECK AND MAIN
# ============================================================

def demo():
    w = {"S": 0.5, "L": 0.5}
    assert fidelity({"S": 1.0, "L": 1.0}, w, 0.0) == (1.0, 1.0)
    assert fidelity({"S": 1.0, "L": 1e-12}, w, 0.0)[0] < 1e-5              # one bad feature sinks the site
    assert abs(fidelity({"S": 0.25, "L": 1.0}, w, 0.5)[0] - 0.25) < 1e-12   # sqrt(0.25) * (1 - 0.5)
    assert fidelity({"S": 0.9}, w, 0.0, subset={"L"}) == (None, 0.0)
    assert jsd_base2([1, 0], [1, 0]) == 0 and abs(jsd_base2([1, 0], [0, 1]) - 1) < 1e-12
    assert abs(gaussian(1.0, 0.0, 1.0) - np.exp(-0.5)) < 1e-12


def main():
    parser = argparse.ArgumentParser(description="AnalogFit scoring engine.")
    parser.add_argument("--csv", default=str(BASE_DIR / "analogfit_model_ready_features.csv"))
    parser.add_argument("--background", default=str(BASE_DIR / "analogfit_background_features.csv"))
    parser.add_argument("--config", default=str(BASE_DIR / "analogfit_config.json"))
    parser.add_argument("--mc", type=int, default=1000, help="Monte Carlo draws per site (0 switches it off)")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    demo()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = configure_targets(json.load(f), load_observations())
    sites = pd.read_csv(args.csv)
    background = pd.read_csv(args.background) if Path(args.background).exists() else pd.DataFrame()

    scores = score_table(sites, cfg, args.mc, args.seed)
    bg_scores = score_table(background, cfg, 0, args.seed) if len(background) else pd.DataFrame()
    bg_scores.to_csv(BASE_DIR / "analogfit_background_scores.csv", index=False)
    validation = validation_report(sites, scores, bg_scores)
    negative = negative_report(scores)

    scores.to_csv(BASE_DIR / "analogfit_model_output_scores.csv", index=False)
    validation.to_csv(BASE_DIR / "analogfit_validation_report.csv", index=False)
    negative.to_csv(BASE_DIR / "analogfit_negative_control_report.csv", index=False)
    quality_report(sites).to_csv(BASE_DIR / "analogfit_data_quality_report.csv", index=False)
    export_geojson(sites, scores, BASE_DIR / "analogfit_map.geojson")
    export_app_data(cfg, sites, background, scores, validation, BASE_DIR / "analogfit_data.js")

    print(f"Scored {len(sites)} curated sites and {len(background)} global land cells "
          f"x {len(cfg['targets'])} targets x {len(cfg['task_weights'])} tasks.")
    print("\nNegative controls:", negative["result"].value_counts().to_dict())
    print("\nKnown analogs, documented role, percentile among global land cells (real-data score):")
    print(validation.to_string(index=False) if len(validation) else "  none")
    print("\nOpen index.html to explore the result.")


if __name__ == "__main__":
    main()
