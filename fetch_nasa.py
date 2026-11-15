"""
Fetch real data for every AnalogFit site into nasa_cache.json. Needs internet, no login.

  NASA POWER climatology API (MERRA-2 + CERES SYN1deg, 2001-2025)
      skin temperature, precipitation, 10 m wind, roughness length, surface albedo
  ORNL DAAC MODIS subset API: MOD13Q1 v061 NDVI, four 16-day composites of 2023 (Jan, Apr, Jul, Oct)
  OpenTopoData public API: SRTM GL1 (|lat| < 60) or ASTER GDEM v3 (to 83 deg),
      10 x 10 elevations spaced 100 m around the site

Sites and sources already in the cache are skipped, so rerun it after a failure
(the ORNL service often returns 502/503 when busy). Delete nasa_cache.json to refetch everything.

  python fetch_nasa.py --background   also fills nasa_background.json: the same POWER and elevation
      data for about 585 land cells on an equal-area lattice (needs `pip install global-land-mask`;
      takes about 30 minutes because both services limit the request rate).

Run order:  python fetch_nasa.py [--background]  ->  python analogfit_pipeline.py  ->  python analogfit.py
"""
import sys
import datetime
import json
import math
import os
import time
import urllib.error
import urllib.request

from analogfit_pipeline import build_benchmark_earth_grid

CACHE = "nasa_cache.json"
POWER_PARAMS = ["TS", "TS_MAX", "TS_MIN", "PRECTOTCORR", "WS10M", "ALLSKY_SRF_ALB", "Z0M"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
# One 16-day composite per season (Jan, Apr, Jul, Oct 2023). Single-date requests because the ORNL
# service times out on longer windows when busy. ponytail: 4 composites, use all 23 if the service allows.
NDVI_WINDOWS = [("A2023017", "A2023017"), ("A2023113", "A2023113"), ("A2023193", "A2023193"), ("A2023289", "A2023289")]


def get_json(url, tries=4, timeout=120):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if (e.code < 500 and e.code != 429) or attempt == tries - 1:    # 429 = rate limit: wait and retry
                raise
        except urllib.error.URLError:
            if attempt == tries - 1:
                raise
        time.sleep(5 * (attempt + 1))


def power(lat, lon, params=POWER_PARAMS, annual_fallback=False):
    """Mean of the 12 monthly climatology values per parameter (None if any month is fill)."""
    j = get_json("https://power.larc.nasa.gov/api/temporal/climatology/point"
                 f"?parameters={','.join(params)}&community=AG&longitude={lon}&latitude={lat}&format=JSON")
    par = j["properties"]["parameter"]
    out = {}
    for k in params:
        vals = [par[k][m] for m in MONTHS]
        out[k] = None if min(vals) <= -900 else round(sum(vals) / 12, 4)
        if out[k] is None and annual_fallback and par[k]["ANN"] > -900:
            out[k] = par[k]["ANN"]
    out["ALLSKY_SRF_ALB_ANN"] = par["ALLSKY_SRF_ALB"]["ANN"]   # fallback where polar night blanks some months
    return out


def ndvi(lat, lon):
    """Raw MOD13Q1 NDVI integers (scale 0.0001, fill -3000). None where the product has no data."""
    values = []
    for start, end in NDVI_WINDOWS:
        try:
            j = get_json("https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
                         f"?latitude={lat}&longitude={lon}&band=250m_16_days_NDVI"
                         f"&startDate={start}&endDate={end}&kmAboveBelow=0&kmLeftRight=0",
                         tries=2, timeout=20)   # a healthy ORNL answers in seconds; fail fast when it is down
        except urllib.error.HTTPError as e:
            if e.code == 400:      # "No data available": outside MODIS land tiles (e.g. Antarctica)
                return None
            raise
        values += [s["data"][0] for s in j["subset"]]
    return values


def dem(lat, lon):
    dataset = "srtm30m" if abs(lat) < 60 else "aster30m"
    pts = []
    for i in range(10):
        for j in range(10):
            la = lat + (i - 4.5) * 100 / 111320
            lo = lon + (j - 4.5) * 100 / (111320 * math.cos(math.radians(lat)))
            pts.append(f"{la:.6f},{lo:.6f}")
    j = get_json(f"https://api.opentopodata.org/v1/{dataset}?locations={'|'.join(pts)}")
    z = [r["elevation"] for r in j["results"]]
    time.sleep(1.2)                # public API limit: 1 request per second
    return None if any(v is None for v in z) else {"dataset": dataset, "z": z}


BACKGROUND = "nasa_background.json"
BG_PARAMS = ["TS", "PRECTOTCORR", "WS10M", "Z0M", "ALLSKY_SRF_ALB"]
BG_KEYS = BG_PARAMS + ["slope_deg", "elev_m"]


def land_lattice(n=2000):
    """Equal-area Fibonacci lattice on the sphere, land points only (about 29% of n)."""
    import numpy as np
    from global_land_mask import globe
    i = np.arange(n)
    lat = np.round(np.degrees(np.arcsin(1 - 2 * (i + 0.5) / n)), 2)
    lon = np.round(((i * 360 / ((1 + 5 ** 0.5) / 2)) % 360) - 180, 2)
    land = globe.is_land(lat, lon)
    return [float(v) for v in lat[land]], [float(v) for v in lon[land]]


def background():
    """Same data as the curated sites for a global sample of land cells. Resumable."""
    import numpy as np
    from analogfit_pipeline import slope_median_deg
    if os.path.exists(BACKGROUND):
        bg = json.load(open(BACKGROUND))
    else:
        lat, lon = land_lattice()
        bg = {"lattice": "Fibonacci, n=2000, land cells by global-land-mask", "lat": lat, "lon": lon,
              **{k: [None] * len(lat) for k in BG_KEYS}}
    for i, (lat, lon) in enumerate(zip(bg["lat"], bg["lon"])):
        try:
            if bg["TS"][i] is None:
                values = power(lat, lon, BG_PARAMS, annual_fallback=True)
                for k in BG_PARAMS:
                    bg[k][i] = values[k]
                time.sleep(1.2)            # POWER answers 429 when asked faster
            if bg["slope_deg"][i] is None and abs(lat) <= 83:     # ASTER GDEM ends at 83 degrees
                grid = dem(lat, lon)
                if grid:
                    bg["slope_deg"][i] = round(slope_median_deg(grid["z"]), 3)
                    bg["elev_m"][i] = round(float(np.mean(grid["z"])), 1)
        except Exception as e:
            print(f"cell {i} ({lat}, {lon}): FAILED ({e}); rerun to retry")
        if i % 20 == 0:
            print(f"background {i}/{len(bg['lat'])}")
            bg["retrieved"] = datetime.date.today().isoformat()
            json.dump(bg, open(BACKGROUND, "w"))
    bg["retrieved"] = datetime.date.today().isoformat()
    json.dump(bg, open(BACKGROUND, "w"))


def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {"sites": {}}
    down = set()    # services that failed this run: skip them for the remaining sites, rerun later
    for _, row in build_benchmark_earth_grid().iterrows():
        site = cache["sites"].setdefault(row["cell_id"], {})
        for name, fn in (("power", power), ("ndvi", ndvi), ("dem", dem)):
            if name in site or name in down:
                continue
            try:
                site[name] = fn(row["lat"], row["lon"])
                print(f"{row['cell_id']} {name}: {'ok' if site[name] else 'no data'}")
            except Exception as e:      # leave the key out so the next run retries it
                down.add(name)
                print(f"{row['cell_id']} {name}: FAILED ({e}). Skipping {name} for the remaining sites; rerun later.")
            cache["retrieved"] = datetime.date.today().isoformat()
            json.dump(cache, open(CACHE, "w"), indent=1)


if __name__ == "__main__":
    if "--legacy" in sys.argv:
        main()
        if "--background" in sys.argv:
            background()
    else:
        # Default refresh covers all existing samples and preserves raw NASA evidence.
        from fetch_verified import main as verified_main
        sys.argv = [a for a in sys.argv if a != "--background"]
        verified_main()
