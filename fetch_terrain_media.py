"""Cache unmodified NASA terrain imagery and compact provenance for the browser.

Images are visual context, not calibrated feature inputs. Original responses and
their requested dates, geographic bounds, URLs and SHA-256 hashes are retained.
"""
import concurrent.futures
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path
import time

import requests
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent
DEST = ROOT / "assets" / "terrain"
MANIFEST = ROOT / "data" / "terrain_media_manifest.json"
ENDPOINT = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"


def bounds(lat, lon, width_km=50.0):
    half_lat = width_km * 0.66 / 2 / 111.195
    metres_per_lon_degree = 111.195 * max(0.02, math.cos(math.radians(lat)))
    half_lon = min(20.0, width_km / 2 / metres_per_lon_degree)
    return [max(-90, lat-half_lat), max(-180, lon-half_lon),
            min(90, lat+half_lat), min(180, lon+half_lon)]


def image_request(layer, bbox, date=None):
    params = dict(SERVICE="WMS", REQUEST="GetMap", VERSION="1.3.0",
                  LAYERS=layer, STYLES="", CRS="EPSG:4326",
                  BBOX=",".join(f"{v:.7f}" for v in bbox),
                  WIDTH=720, HEIGHT=475, FORMAT="image/jpeg")
    if date:
        params["TIME"] = date
    response = requests.get(ENDPOINT, params=params, timeout=(15, 35))
    response.raise_for_status()
    if not response.content.startswith(b"\xff\xd8"):
        raise ValueError("NASA response was not JPEG")
    with Image.open(io.BytesIO(response.content)) as image:
        stats = ImageStat.Stat(image.convert("RGB"))
        if max(stats.mean) < 2:
            raise ValueError("NASA returned an all-black/no-data image")
    return response


def fetch_site(site):
    cid, lat, lon = site
    bbox = bounds(lat, lon)
    result = {"bbox": bbox, "requested_width_km": 50, "lat": lat, "lon": lon}
    for kind, layer in [("satellite", "MODIS_Terra_CorrectedReflectance_TrueColor"),
                        ("relief", "ASTER_GDEM_Color_Shaded_Relief")]:
        if kind == "relief" and abs(lat) > 83:
            result[kind] = {"available": False, "reason": "Outside ASTER latitude coverage"}
            continue
        dates = (["2026-01-15", "2025-01-15", "2026-01-20", "2025-01-20"]
                 if lat < -55 else ["2026-07-15", "2025-07-15", "2026-07-20", "2025-07-20"])
        if kind == "relief":
            dates = [None]
        last_error = ""
        for date in dates:
            try:
                response = image_request(layer, bbox, date)
                file = DEST / f"{cid}_{kind}.jpg"
                file.write_bytes(response.content)
                result[kind] = {
                    "available": True, "file": file.relative_to(ROOT).as_posix(),
                    "url": response.url, "layer": layer, "requested_date": date,
                    "date_note": "Requested imagery date; not a pixel-level acquisition-time guarantee"
                                 if date else "Static multi-date DEM visualization",
                    "retrieved_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "sha256": hashlib.sha256(response.content).hexdigest(),
                    "role": "visual context only; excluded from quantitative scoring",
                }
                break
            except (requests.RequestException, ValueError) as error:
                last_error = str(error)
                time.sleep(0.25)
        if kind not in result:
            result[kind] = {"available": False, "reason": last_error}
    return cid, result


def fetch_detailed(item):
    """A historical Landsat composite provides finer visual context where present."""
    cid, record = item
    layer = "Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual"
    date = "2000-12-01"
    try:
        response = image_request(layer, record["bbox"], date)
        file = DEST / f"{cid}_landsat.jpg"
        file.write_bytes(response.content)
        return cid, {
            "available": True, "file": file.relative_to(ROOT).as_posix(),
            "url": response.url, "layer": layer, "requested_date": date,
            "historical": True, "product_label": "NASA Landsat WELD",
            "date_note": "Historical annual composite; service time is not a single acquisition date",
            "retrieved_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "sha256": hashlib.sha256(response.content).hexdigest(),
            "role": "historical visual context only; not current conditions or a scoring input",
        }
    except (requests.RequestException, ValueError) as error:
        return cid, {"available": False, "reason": str(error)}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    current = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"sites": {}}
    from analogfit_pipeline import build_benchmark_earth_grid
    todo = [(r.cell_id, float(r.lat), float(r.lon)) for r in build_benchmark_earth_grid().itertuples()
            if r.cell_id not in current["sites"]]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for future in concurrent.futures.as_completed([pool.submit(fetch_site, item) for item in todo]):
            cid, value = future.result()
            current["sites"][cid] = value
            MANIFEST.write_text(json.dumps(current, indent=2), encoding="utf-8")
            print(cid, {k: value[k]["available"] for k in ("satellite", "relief")}, flush=True)

    detailed = [(cid, value) for cid, value in current["sites"].items() if "detailed_satellite" not in value]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for cid, value in pool.map(fetch_detailed, detailed):
            current["sites"][cid]["detailed_satellite"] = value
            MANIFEST.write_text(json.dumps(current, indent=2), encoding="utf-8")
            print(cid, "historical Landsat", value["available"], flush=True)

    # Share source references instead of copying large elevation request URLs per cell.
    observations = json.loads((ROOT / "verified_observations.json").read_text())
    sources = {}
    provenance = {}
    terrain_patches = {}
    for group in ("earth_terrain", "power"):
        for cid, item in observations[group].items():
            source = item["source"]
            key = source["file"]
            sources[key] = source
            provenance.setdefault(cid, {})[group] = key
            if group=='earth_terrain':
                terrain_patches[cid]={k:item.get(k) for k in ('lat','lon','dataset','baseline_m','z','slope_500m_deg','sample_locations','raster_metadata','attribution','license_url') if item.get(k) is not None}
                terrain_patches[cid]['source_files']=[s['file'] for s in item.get('sources',[source])]
    from science import observation_sources
    for source in observation_sources(observations):
        sources[source['file']]=source
    paper_file = ROOT.parent / "AnalogFit_paper.docx"
    paper = current.get("paper", {
        "title": "AnalogFit: Task-Conditioned, Physics-Consistent Fidelity Mapping",
        "version": "Draft v1, 14 November 2026",
        "file": paper_file.name,
        "discovery_coverage_threshold": 0.7,
    })
    if paper_file.exists():
        paper["sha256"] = hashlib.sha256(paper_file.read_bytes()).hexdigest()
    current["paper"] = paper
    MANIFEST.write_text(json.dumps(current, indent=2), encoding="utf-8")
    payload = dict(current, paper=paper, sources=sources, provenance=provenance, terrainPatches=terrain_patches)
    (ROOT / "terrain_media.js").write_text(
        "// Generated by fetch_terrain_media.py; NASA imagery is visual context only.\n"
        "window.ANALOGFIT_MEDIA = " + json.dumps(payload, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print("Wrote terrain_media.js and original NASA images", flush=True)


if __name__ == "__main__":
    main()
