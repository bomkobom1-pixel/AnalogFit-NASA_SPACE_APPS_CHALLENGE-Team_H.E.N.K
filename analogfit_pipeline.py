"""
AnalogFit, step 2 of 3: build the feature tables.

    python fetch_nasa.py            -> nasa_cache.json, nasa_background.json   (needs internet)
    python analogfit_pipeline.py    -> analogfit_model_ready_features.csv      (14 curated sites)
                                       analogfit_background_features.csv       (global land sample)
    python analogfit.py             -> scores, reports, map data

What this file does
  1. Holds the table of 14 curated sites (illustrative placeholder values).
  2. Replaces placeholders with real data where it exists (NASA POWER, SRTM/ASTER GDEM, MODIS)
     and computes the Sun-grazing window from orbital geometry.
  3. Derives grain size, dust-lifting frequency and terrestrial contamination.
  4. Builds the same real-data features for a global sample of land cells.
"""

import json

import numpy as np
import pandas as pd
from pathlib import Path
from science import load_observations, configure_targets, apply_observations


def load_config(path="analogfit_config.json"):
    with open(path, "r", encoding="utf-8") as f:
        return configure_targets(json.load(f), load_observations())


# Documented role of each known analog (paper Table 6): the (target, task) pairs it must do well at.
KNOWN_ANALOG_ROLES = {
    "VAL_01": [("T3", "ISRU"), ("T3", "Robotics")],
    "VAL_02": [("T3", "Thermal/hardware endurance"), ("T3", "ISRU")],
    "VAL_03": [("T2", "Mobility"), ("T2", "Human ops: procedures")],
    "VAL_04": [("T2", "Construction"), ("T2", "ISRU")],
    "VAL_05": [("T3", "Mobility"), ("T3", "Landing: hazard detection")],
    "VAL_06": [("T3", "Mobility"), ("T3", "Navigation")],
    "VAL_07": [("T1", "Human ops: procedures"), ("T1", "Navigation")],
}


def build_benchmark_earth_grid():
    """
    The 14 curated sites: 7 known analogs (paper Table 6), 4 discovery hypotheses (Section 10) and
    3 negative controls (Section 9.2).

    IMPORTANT: every number typed in this table is an ILLUSTRATIVE PLACEHOLDER, not an observation.
    apply_nasa_data() overwrites the columns for which real data exists and lists them in `real_cols`.
    Columns still illustrative today: roughness, Hurst, radar CPR, sand/silt/clay, permafrost,
    night lights, minerals (and NDVI until fetch_nasa.py can reach the MODIS service).
    """
    sites = [
        # 7 Held-out Validation Analogs (Table 6). known_for = targets each site is an established analog
        # for; validation only tests a site in the role it is known for.
        {"cell_id": "VAL_01", "known_for": "T3", "site_name": "Atacama Desert (Yungay)", "category": "Validation", "lat": -24.08, "lon": -69.92,
         "slope_med_deg": 2.3, "ln_roughness_100m": 0.25, "hurst_H": 0.70, "radar_cpr": 0.22,
         "sand_frac": 0.65, "silt_frac": 0.25, "clay_frac": 0.10, "albedo": 0.26, "t_day_K": 308.0, "t_night_K": 276.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.07, "t_mean_K": 290.0, "u_star_mean": 0.22,
         "ndvi": 0.04, "precip_mm_yr": 2.0, "nightlight_pct": 12.0,
         "minerals": [0.18, 0.22, 0.15, 0.18, 0.12, 0.04, 0.02, 0.05, 0.04, 0.00, 0.00]},

        {"cell_id": "VAL_02", "known_for": "T3", "site_name": "McMurdo Dry Valleys", "category": "Validation", "lat": -77.47, "lon": 162.52,
         "slope_med_deg": 3.5, "ln_roughness_100m": 0.45, "hurst_H": 0.74, "radar_cpr": 0.35,
         "sand_frac": 0.72, "silt_frac": 0.20, "clay_frac": 0.08, "albedo": 0.32, "t_day_K": 258.0, "t_night_K": 244.0,
         "permafrost_prob": 0.92, "sun_grazing_frac_10d": 0.24, "t_mean_K": 253.0, "u_star_mean": 0.28,
         "ndvi": 0.03, "precip_mm_yr": 15.0, "nightlight_pct": 5.0,
         "minerals": [0.25, 0.26, 0.18, 0.12, 0.05, 0.04, 0.02, 0.01, 0.02, 0.00, 0.05]},

        {"cell_id": "VAL_03", "known_for": "T2;T3", "site_name": "Iceland Highlands (Basaltic Tephra)", "category": "Validation", "lat": 64.85, "lon": -16.75,
         "slope_med_deg": 3.1, "ln_roughness_100m": 0.42, "hurst_H": 0.73, "radar_cpr": 0.31,
         "sand_frac": 0.78, "silt_frac": 0.16, "clay_frac": 0.06, "albedo": 0.11, "t_day_K": 281.0, "t_night_K": 271.0,
         "permafrost_prob": 0.15, "sun_grazing_frac_10d": 0.14, "t_mean_K": 275.0, "u_star_mean": 0.32,
         "ndvi": 0.07, "precip_mm_yr": 420.0, "nightlight_pct": 10.0,
         "minerals": [0.28, 0.32, 0.24, 0.10, 0.04, 0.02, 0.00, 0.00, 0.00, 0.00, 0.00]},

        {"cell_id": "VAL_04", "known_for": "T2;T3", "site_name": "Hawaii (Mauna Kea Saddle)", "category": "Validation", "lat": 19.75, "lon": -155.47,
         "slope_med_deg": 4.2, "ln_roughness_100m": 0.48, "hurst_H": 0.75, "radar_cpr": 0.33,
         "sand_frac": 0.75, "silt_frac": 0.18, "clay_frac": 0.07, "albedo": 0.12, "t_day_K": 292.0, "t_night_K": 276.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.06, "t_mean_K": 282.0, "u_star_mean": 0.20,
         "ndvi": 0.06, "precip_mm_yr": 280.0, "nightlight_pct": 25.0,
         "minerals": [0.30, 0.30, 0.25, 0.10, 0.03, 0.02, 0.00, 0.00, 0.00, 0.00, 0.00]},

        {"cell_id": "VAL_05", "known_for": "T3", "site_name": "Mojave Desert", "category": "Validation", "lat": 35.01, "lon": -115.47,
         "slope_med_deg": 2.0, "ln_roughness_100m": 0.24, "hurst_H": 0.69, "radar_cpr": 0.20,
         "sand_frac": 0.70, "silt_frac": 0.20, "clay_frac": 0.10, "albedo": 0.28, "t_day_K": 312.0, "t_night_K": 284.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.07, "t_mean_K": 295.0, "u_star_mean": 0.25,
         "ndvi": 0.08, "precip_mm_yr": 110.0, "nightlight_pct": 35.0,
         "minerals": [0.24, 0.24, 0.16, 0.14, 0.06, 0.08, 0.05, 0.01, 0.02, 0.00, 0.00]},

        {"cell_id": "VAL_06", "known_for": "T3", "site_name": "Death Valley", "category": "Validation", "lat": 36.53, "lon": -116.93,
         "slope_med_deg": 2.8, "ln_roughness_100m": 0.38, "hurst_H": 0.71, "radar_cpr": 0.29,
         "sand_frac": 0.68, "silt_frac": 0.22, "clay_frac": 0.10, "albedo": 0.31, "t_day_K": 318.0, "t_night_K": 289.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.07, "t_mean_K": 298.0, "u_star_mean": 0.26,
         "ndvi": 0.05, "precip_mm_yr": 55.0, "nightlight_pct": 22.0,
         "minerals": [0.20, 0.20, 0.14, 0.12, 0.10, 0.06, 0.08, 0.08, 0.02, 0.00, 0.00]},

        {"cell_id": "VAL_07", "known_for": "T1;T3", "site_name": "Haughton Structure (Devon Island)", "category": "Validation", "lat": 75.37, "lon": -89.68,
         "slope_med_deg": 3.6, "ln_roughness_100m": 0.55, "hurst_H": 0.76, "radar_cpr": 0.38,
         "sand_frac": 0.62, "silt_frac": 0.26, "clay_frac": 0.12, "albedo": 0.35, "t_day_K": 265.0, "t_night_K": 255.0,
         "permafrost_prob": 0.88, "sun_grazing_frac_10d": 0.21, "t_mean_K": 258.0, "u_star_mean": 0.24,
         "ndvi": 0.05, "precip_mm_yr": 130.0, "nightlight_pct": 2.0,
         "minerals": [0.55, 0.15, 0.08, 0.05, 0.03, 0.04, 0.06, 0.00, 0.02, 0.02, 0.00]},

        # 4 Discovery Hypotheses (Section 10)
        {"cell_id": "HYP_H1", "site_name": "Kunene Anorthosite Complex (Angola/Namibia)", "category": "Hypothesis_H1", "lat": -17.20, "lon": 13.80,
         "slope_med_deg": 4.0, "ln_roughness_100m": 0.52, "hurst_H": 0.76, "radar_cpr": 0.36,
         "sand_frac": 0.74, "silt_frac": 0.18, "clay_frac": 0.08, "albedo": 0.24, "t_day_K": 306.0, "t_night_K": 280.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.06, "t_mean_K": 293.0, "u_star_mean": 0.19,
         "ndvi": 0.07, "precip_mm_yr": 95.0, "nightlight_pct": 8.0,
         "minerals": [0.72, 0.14, 0.06, 0.04, 0.02, 0.01, 0.01, 0.00, 0.00, 0.00, 0.00]},

        {"cell_id": "HYP_H2", "site_name": "Mount Howe (Antarctica)", "category": "Hypothesis_H2", "lat": -87.37, "lon": -149.50,
         "slope_med_deg": 4.5, "ln_roughness_100m": 0.60, "hurst_H": 0.77, "radar_cpr": 0.40,
         "sand_frac": 0.70, "silt_frac": 0.22, "clay_frac": 0.08, "albedo": 0.45, "t_day_K": 248.0, "t_night_K": 242.0,
         "permafrost_prob": 0.95, "sun_grazing_frac_10d": 0.82, "t_mean_K": 245.0, "u_star_mean": 0.27,
         "ndvi": 0.01, "precip_mm_yr": 20.0, "nightlight_pct": 0.0,
         "minerals": [0.60, 0.18, 0.08, 0.04, 0.02, 0.02, 0.01, 0.00, 0.00, 0.05, 0.00]},

        {"cell_id": "HYP_H3", "site_name": "Blocky Lava Calibration Field (Atacama/Iceland)", "category": "Hypothesis_H3", "lat": -23.50, "lon": -67.70,
         "slope_med_deg": 3.9, "ln_roughness_100m": 0.68, "hurst_H": 0.79, "radar_cpr": 0.43,
         "sand_frac": 0.80, "silt_frac": 0.14, "clay_frac": 0.06, "albedo": 0.14, "t_day_K": 298.0, "t_night_K": 268.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.07, "t_mean_K": 283.0, "u_star_mean": 0.23,
         "ndvi": 0.03, "precip_mm_yr": 18.0, "nightlight_pct": 5.0,
         "minerals": [0.40, 0.28, 0.18, 0.10, 0.02, 0.02, 0.00, 0.00, 0.00, 0.00, 0.00]},

        {"cell_id": "HYP_H4", "site_name": "Harrat Khaybar / Umm Jirsan (Saudi Arabia)", "category": "Hypothesis_H4", "lat": 25.68, "lon": 39.92,
         "slope_med_deg": 2.4, "ln_roughness_100m": 0.37, "hurst_H": 0.73, "radar_cpr": 0.30,
         "sand_frac": 0.76, "silt_frac": 0.17, "clay_frac": 0.07, "albedo": 0.13, "t_day_K": 314.0, "t_night_K": 285.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.06, "t_mean_K": 299.0, "u_star_mean": 0.24,
         "ndvi": 0.04, "precip_mm_yr": 45.0, "nightlight_pct": 14.0,
         "minerals": [0.27, 0.33, 0.24, 0.11, 0.03, 0.02, 0.00, 0.00, 0.00, 0.00, 0.00]},

        # 3 Negative Controls (Section 9.2 - must score F_site < 0.05)
        {"cell_id": "NEG_01", "site_name": "Central Amazon Basin", "category": "Negative_Control", "lat": -3.46, "lon": -62.21,
         "slope_med_deg": 1.2, "ln_roughness_100m": 0.15, "hurst_H": 0.60, "radar_cpr": 0.45,
         "sand_frac": 0.30, "silt_frac": 0.35, "clay_frac": 0.35, "albedo": 0.14, "t_day_K": 303.0, "t_night_K": 295.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.06, "t_mean_K": 299.0, "u_star_mean": 0.08,
         "ndvi": 0.82, "precip_mm_yr": 2400.0, "nightlight_pct": 30.0,
         "minerals": [0.05, 0.05, 0.05, 0.25, 0.05, 0.45, 0.05, 0.00, 0.05, 0.00, 0.00]},

        {"cell_id": "NEG_02", "site_name": "Congo Basin", "category": "Negative_Control", "lat": 0.50, "lon": 21.50,
         "slope_med_deg": 1.5, "ln_roughness_100m": 0.18, "hurst_H": 0.62, "radar_cpr": 0.44,
         "sand_frac": 0.35, "silt_frac": 0.30, "clay_frac": 0.35, "albedo": 0.15, "t_day_K": 302.0, "t_night_K": 294.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.06, "t_mean_K": 298.0, "u_star_mean": 0.09,
         "ndvi": 0.80, "precip_mm_yr": 1900.0, "nightlight_pct": 25.0,
         "minerals": [0.05, 0.05, 0.05, 0.25, 0.05, 0.45, 0.05, 0.00, 0.05, 0.00, 0.00]},

        {"cell_id": "NEG_03", "site_name": "Lowland Borneo", "category": "Negative_Control", "lat": -0.50, "lon": 114.00,
         "slope_med_deg": 2.0, "ln_roughness_100m": 0.22, "hurst_H": 0.64, "radar_cpr": 0.46,
         "sand_frac": 0.28, "silt_frac": 0.32, "clay_frac": 0.40, "albedo": 0.14, "t_day_K": 304.0, "t_night_K": 296.0,
         "permafrost_prob": 0.00, "sun_grazing_frac_10d": 0.06, "t_mean_K": 300.0, "u_star_mean": 0.08,
         "ndvi": 0.85, "precip_mm_yr": 3100.0, "nightlight_pct": 40.0,
         "minerals": [0.05, 0.05, 0.05, 0.25, 0.05, 0.45, 0.05, 0.00, 0.05, 0.00, 0.00]}
    ]
    return pd.DataFrame(sites)


# ============================================================
# COMPUTED FEATURES (same definition on Earth, Moon and Mars)
# ============================================================

# Orbital constants: obliquity (deg), length of the seasonal cycle (Earth days), solar day (Earth days).
# ponytail: circular orbits; Mars's eccentricity shifts season lengths by a few percent.
BODIES = {
    "Earth": (23.44, 365.2422, 1.0),
    "Moon": (1.54, 346.62, 29.5306),
    "Mars": (25.19, 686.98, 1.02749),
}
SAMPLES_PER_DAY = 1440         # 1-minute steps (coarser steps bias short crossings upward)
_sun_cache = {}


def sun_grazing_window(lat_deg, body="Earth", window_days=10.0, lo=0.0, hi=5.0):
    """
    Share of the best `window_days`-day window in which the Sun's centre is between `lo` and `hi`
    degrees above the horizon. Pure geometry: no terrain horizon, no refraction.

    Why a window and not a yearly average: a low, grazing Sun is what makes lunar-polar navigation
    hard, and on Earth it only happens for some days per year. The analog is the place AND the dates.

    Returns (fraction, start_day), start_day counted in Earth days from the northward equinox
    (about 20 March on Earth).
    """
    key = (round(float(lat_deg), 2), body, window_days, lo, hi)
    if key not in _sun_cache:
        obliquity, year, solar_day = BODIES[body]
        t = np.arange(int((year + window_days) * SAMPLES_PER_DAY)) / SAMPLES_PER_DAY
        dec = np.arcsin(np.sin(np.radians(obliquity)) * np.sin(2 * np.pi * t / year))
        hour_angle = 2 * np.pi * t / solar_day
        phi = np.radians(lat_deg)
        elev = np.degrees(np.arcsin(np.sin(phi) * np.sin(dec) + np.cos(phi) * np.cos(dec) * np.cos(hour_angle)))
        grazing = ((elev > lo) & (elev < hi)).astype(float)
        w = int(window_days * SAMPLES_PER_DAY)
        csum = np.cumsum(np.concatenate([[0.0], grazing]))
        starts = int(year * SAMPLES_PER_DAY)
        frac = (csum[w:w + starts] - csum[:starts]) / w
        best = int(np.argmax(frac))
        _sun_cache[key] = (float(frac[best]), float(t[best]))
    return _sun_cache[key]


def earth_window_label(start_day, window_days=10):
    """Calendar dates of an Earth window, e.g. '23 Sep - 2 Oct'."""
    equinox = pd.Timestamp("2027-03-20")
    a = equinox + pd.Timedelta(days=float(start_day))
    b = a + pd.Timedelta(days=window_days - 1)
    return f"~{a.day} {a.strftime('%b %Y')} - {b.day} {b.strftime('%b %Y')}"


def slope_median_deg(z, step_m=100.0):
    """Median slope at a 100 m baseline from a square grid of elevations sampled every 100 m."""
    z = np.asarray(z, dtype=float)
    n = int(round(np.sqrt(z.size)))
    z = z.reshape(n, n)
    gx = (z[:-1, 1:] - z[:-1, :-1] + z[1:, 1:] - z[1:, :-1]) / (2 * step_m)
    gy = (z[1:, :-1] - z[:-1, :-1] + z[1:, 1:] - z[:-1, 1:]) / (2 * step_m)
    return float(np.degrees(np.arctan(np.median(np.hypot(gx, gy)))))


Z0_FLOOR_M = 1e-3   # ponytail: POWER rounds roughness length to 0.01 m, so ice/snow reads 0
VON_KARMAN = 0.4


def friction_velocity(wind_10m, roughness_length_m):
    """Log-law friction velocity u* (m/s) from 10 m wind speed and surface roughness length."""
    z0 = np.maximum(np.asarray(roughness_length_m, dtype=float), Z0_FLOOR_M)
    return VON_KARMAN * np.asarray(wind_10m, dtype=float) / np.log(10.0 / z0)


# ============================================================
# NASA DATA INTEGRATION (files written by fetch_nasa.py)
# ============================================================

def apply_nasa_data(df, cache_path="nasa_cache.json"):
    """
    Overwrite the illustrative values with real data wherever the cache has it and record which
    columns are real in `real_cols` (semicolon-separated).
      NASA POWER (MERRA-2, CERES SYN1deg; 2001-2025 climatology): t_mean_K, t_day_K, t_night_K,
          precip_mm_yr, albedo, u_star_mean
      MODIS MOD13Q1 v061 (ORNL DAAC), mean of four 2023 composites: ndvi
      SRTM GL1 / ASTER GDEM v3 (via OpenTopoData): slope_med_deg, elev_m
      Orbital geometry: sun_grazing_frac_10d
    """
    df = df.copy()
    try:
        with open(cache_path, "r") as f:
            cache = json.load(f)["sites"]
    except FileNotFoundError:
        print(f"WARNING: {cache_path} not found. Only the Sun-grazing window is real. Run fetch_nasa.py.")
        cache = {}

    df["elev_m"] = np.nan
    df["sun_window"] = ""
    df["dem_z"] = ""
    real_cols = []
    for idx, row in df.iterrows():
        real = ["sun_grazing_frac_10d"]
        frac, start = sun_grazing_window(row["lat"])
        df.at[idx, "sun_grazing_frac_10d"] = frac
        df.at[idx, "sun_window"] = earth_window_label(start)
        site = cache.get(row["cell_id"], {})

        pw = site.get("power")
        if pw:
            albedo = pw["ALLSKY_SRF_ALB"] if pw["ALLSKY_SRF_ALB"] is not None else pw["ALLSKY_SRF_ALB_ANN"]
            values = {
                "t_mean_K": pw["TS"] + 273.15,
                "t_day_K": pw["TS_MAX"] + 273.15,      # mean of the monthly skin-temperature maxima
                "t_night_K": pw["TS_MIN"] + 273.15,    # mean of the monthly skin-temperature minima
                "precip_mm_yr": pw["PRECTOTCORR"] * 365.25,
                "albedo": albedo,
                "u_star_mean": float(friction_velocity(pw["WS10M"], pw["Z0M"])),
            }
            for col, val in values.items():
                df.at[idx, col] = val
                real.append(col)

        ndvi = [v for v in (site.get("ndvi") or []) if v is not None and v > -3000]   # -3000 = MOD13 fill
        if ndvi:
            df.at[idx, "ndvi"] = float(np.mean(ndvi)) * 1e-4
            real.append("ndvi")

        if site.get("dem"):
            z = site["dem"]["z"]
            df.at[idx, "slope_med_deg"] = slope_median_deg(z)
            df.at[idx, "elev_m"] = float(np.mean(z))
            df.at[idx, "dem_z"] = json.dumps(z)
            real += ["slope_med_deg", "elev_m"]

        real_cols.append(";".join(real))

    df["real_cols"] = real_cols
    df["roles"] = [";".join(f"{t}|{k}" for t, k in KNOWN_ANALOG_ROLES.get(c, [])) for c in df["cell_id"]]
    return df


def build_background(path="nasa_background.json"):
    """
    Global land sample (equal-area lattice) with the same real-data features as the curated sites.
    It is the yardstick for validation ("is this analog in the top 5% of Earth?") and the pool the
    discovery list is drawn from. Columns that need data not yet integrated are simply absent.
    """
    try:
        with open(path, "r") as f:
            bg = json.load(f)
    except FileNotFoundError:
        print(f"WARNING: {path} not found. No global background. Run fetch_nasa.py --background.")
        return pd.DataFrame()

    df = pd.DataFrame({
        "cell_id": [f"BG_{i:04d}" for i in range(len(bg["lat"]))],
        "lat": bg["lat"],
        "lon": bg["lon"],
        "t_mean_K": np.array(bg["TS"], dtype=float) + 273.15,
        "precip_mm_yr": np.array(bg["PRECTOTCORR"], dtype=float) * 365.25,
        "u_star_mean": friction_velocity(np.array(bg["WS10M"], dtype=float), np.array(bg["Z0M"], dtype=float)),
        "albedo": np.array(bg["ALLSKY_SRF_ALB"], dtype=float),
        "slope_med_deg": np.array(bg["slope_deg"], dtype=float),
        "elev_m": np.array(bg["elev_m"], dtype=float),
    })
    windows = [sun_grazing_window(lat) for lat in df["lat"]]
    df["sun_grazing_frac_10d"] = [w[0] for w in windows]
    df["sun_window"] = [earth_window_label(w[1]) for w in windows]
    return df.dropna(subset=["t_mean_K", "precip_mm_yr"]).reset_index(drop=True)


def harmonize_features(df, cfg):
    """
    Step 2: Cross-body harmonization (Class A & Class B)
      - Apparent Thermal Inertia (ATI, Eq. 4)
      - Median grain size ln(d_50) from SoilGrids sand/silt/clay fractions (Class B)
      - Shao-Lu threshold friction velocity u_*t(d50) & exceedance fraction f_ex (Eq. 6-7)
    """
    df = df.copy()
    # Eq. 4: Apparent Thermal Inertia (Earth internal ranking check)
    df["ATI"] = (1.0 - df["albedo"]) / np.maximum(df["t_day_K"] - df["t_night_K"], 1.0)

    # Geometric mean grain diameter d_50 (um) from SoilGrids mass fractions (Shirazi & Boersma convention)
    # Representative diameters: sand ~ 200 um, silt ~ 20 um, clay ~ 1 um
    d_sand, d_silt, d_clay = 200.0, 20.0, 1.0
    df["ln_d50_um"] = (
        df["sand_frac"] * np.log(d_sand) +
        df["silt_frac"] * np.log(d_silt) +
        df["clay_frac"] * np.log(d_clay)
    )
    df["d50_m"] = np.exp(df["ln_d50_um"]) * 1e-6

    # Eq. 6: Shao & Lu threshold friction velocity on Earth
    sl = cfg["shao_lu_dust_constants"]
    earth_reg = cfg["regime_constants"]["Earth"]
    A_N = sl["A_N"]
    gamma = sl["gamma_kg_s2"]
    rho_p = sl["rho_p_kg_m3"]
    rho_a = earth_reg["rho_a"]
    g = earth_reg["g"]

    df["u_star_t_ms"] = np.sqrt(
        A_N * ((rho_p / rho_a) * g * df["d50_m"] + gamma / (rho_a * df["d50_m"]))
    )

    # Eq. 7: Dimensionless exceedance fraction f_ex = Pr[u_* / u_*t > 1] (modeled via Weibull/Rayleigh dispersion)
    ratio = df["u_star_mean"] / df["u_star_t_ms"]
    df["f_ex"] = np.exp(- (1.0 / np.maximum(ratio, 1e-6)) ** 2 * (np.pi / 4.0))
    return df


def compute_contamination(df, cfg):
    """
    Terrestrial contamination (paper Eq. 10): how much vegetation, rain and human activity make the
    site unlike a bare planetary surface. 0 = clean, 1 = disqualified.
    C = 1 - (1 - c_NDVI)(1 - c_P)(1 - c_H)
    The scoring engine recomputes this; the columns are kept here for inspection.
    """
    df = df.copy()
    anc = cfg["contamination_anchors"]

    def ramp(v, lo, hi, log=False):
        v = np.asarray(v, dtype=float)
        if log:
            v, lo, hi = np.log(np.maximum(v, 1e-9)), np.log(lo), np.log(hi)
        return np.clip((v - lo) / (hi - lo), 0.0, 1.0)

    df["c_NDVI"] = ramp(df["ndvi"], anc["ndvi"]["bare"], anc["ndvi"]["saturated"])
    df["c_P"] = ramp(df["precip_mm_yr"], anc["precipitation_mm_yr"]["bare"], anc["precipitation_mm_yr"]["saturated"], log=True)
    df["c_H"] = ramp(df["nightlight_pct"], anc["nightlights_percentile"]["bare"], anc["nightlights_percentile"]["saturated"])
    df["C_i"] = 1.0 - (1.0 - df["c_NDVI"]) * (1.0 - df["c_P"]) * (1.0 - df["c_H"])
    return df


def demo():
    """Self-check of the computed features."""
    # Equator: the Sun crosses 0-5 deg in 20 min (equinox) to 21.8 min (solstice), twice a day.
    assert 2 * 20 / 1440 <= sun_grazing_window(0.0)[0] <= 2 * 23 / 1440
    # Lunar south pole in summer: the Sun circles within 2 deg of the horizon, so always "grazing".
    assert sun_grazing_window(-89.6, "Moon")[0] > 0.99
    # Mount Howe (87.37 S): grazing most of the time around the equinox, as the paper's H2 states.
    assert 0.6 < sun_grazing_window(-87.37)[0] < 0.8
    x = np.arange(10) * 100.0
    plane = np.tile(x * np.tan(np.radians(10.0)), (10, 1))
    assert abs(slope_median_deg(plane) - 10.0) < 1e-6 and abs(slope_median_deg(plane.T) - 10.0) < 1e-6
    # Config targets for the Sun-grazing window must equal what the geometry gives.
    cfg = load_config()
    for tid, t in cfg["targets"].items():
        want = sun_grazing_window(t["illumination_latitude_deg"], t["body"])[0]
        assert abs(t["observables_target"]["sun_grazing_frac_10d"] - want) < 5e-4, (tid, want)


if __name__ == "__main__":
    import os
    os.chdir(Path(__file__).resolve().parent)
    cfg = load_config()
    observations = load_observations()
    sites = compute_contamination(harmonize_features(apply_observations(apply_nasa_data(build_benchmark_earth_grid()), observations), cfg), cfg)
    sites.to_csv("analogfit_model_ready_features.csv", index=False)
    print(f"Saved analogfit_model_ready_features.csv ({len(sites)} curated sites)")

    background = apply_observations(build_background(), observations)
    if len(background):
        background.to_csv("analogfit_background_features.csv", index=False)
        print(f"Saved analogfit_background_features.csv ({len(background)} global land cells)")
    print("Next: python analogfit.py")
