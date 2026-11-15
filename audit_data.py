# Reproduce the data-integrity audit and write its report.
import datetime as dt
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from science import load_observations, observation_sources
from fetch_verified import label_number, slope
from analogfit_pipeline import build_benchmark_earth_grid
ROOT=Path(__file__).resolve().parent

def main():
    data=load_observations()
    sources={source['file']:source for source in observation_sources(data)}
    for src in sources.values():
        assert hashlib.sha256((ROOT/src['file']).read_bytes()).hexdigest()==src['sha256'],src['file']
    for item in data['power'].values():
        raw=json.loads((ROOT/item['source']['file']).read_text())
        for key,value in item['values'].items():
            if value is not None: assert value==raw['properties']['parameter'][key]['ANN'],key
    samples=0
    for tid,t in data['targets'].items():
        text=(ROOT/t['label']['file']).read_text().replace('\r','')
        width=int(label_number(text,'LINE_SAMPLES'))
        arr=np.frombuffer((ROOT/t['source']['file']).read_bytes(),dtype='<i2' if 'LSB_INTEGER' in text else '>i2').reshape(-1,width)
        radius=label_number(text,'A_AXIS_RADIUS')*1000
        scale=label_number(text,'SCALING_FACTOR') if 'SCALING_FACTOR' in text else 1.
        expected=[]
        for lat,lon in t['sample_locations']:
            if 'POLAR STEREOGRAPHIC' in text:
                rho=2*radius*np.tan(np.pi/4+np.deg2rad(lat)/2)
                row=label_number(text,'LINE_PROJECTION_OFFSET')-rho*np.cos(np.deg2rad(lon))/label_number(text,'MAP_SCALE')
                col=label_number(text,'SAMPLE_PROJECTION_OFFSET')+rho*np.sin(np.deg2rad(lon))/label_number(text,'MAP_SCALE')
            else:
                ppd=label_number(text,'MAP_RESOLUTION')
                row=(label_number(text,'MAXIMUM_LATITUDE')-lat)*ppd-.5
                col=(lon-label_number(text,'WESTERNMOST_LONGITUDE'))*ppd-.5
            row-=t['row0'];i=int(np.floor(row));j=int(np.floor(col));dy=row-i;dx=col-j
            patch=arr[i:i+2,j:j+2].astype(float)
            weights=np.array([[(1-dy)*(1-dx),(1-dy)*dx],[dy*(1-dx),dy*dx]])
            expected.append(float((patch*weights).sum()*scale))
        assert np.allclose(expected,t['z'],rtol=0,atol=1e-7),tid
        assert abs(slope(expected)-t['slope_500m_deg'])<1e-8,tid
        samples+=len(expected)
    from fetch_evaluation_data import sample_raster, tile_name, decode_diviner, triangle_contains
    cop_samples=0
    for item in data['earth_terrain'].values():
        if item['dataset']!='copernicus_glo30':continue
        tiles={Path(src['file']).stem:ROOT/src['file'] for src in item['sources']}
        expected=[sample_raster(tiles[tile_name(a,b)],a,b)[0] for a,b in item['sample_locations']]
        assert np.allclose(expected,item['z'],rtol=0,atol=1e-8)
        assert abs(slope(expected)-item['slope_500m_deg'])<1e-8
        cop_samples+=len(expected)
    for context in data.get('target_thermal_context',{}).values():
        rows=decode_diviner((ROOT/context['source']['file']).read_bytes())
        row=rows[context['record_offset_in_slice']]
        assert triangle_contains(row,context['lat'],context['lon'])
        assert row[12]==context['annual_mean_2cm_K'] and row[13]==context['annual_max_surface_K']
        assert context['score_status']=='CONTEXT_ONLY_NOT_COMPARABLE_TO_POWER_TS'
    bg=json.loads((ROOT/'nasa_background.json').read_text())
    cells=[(r.cell_id,float(r.lat),float(r.lon)) for r in build_benchmark_earth_grid().itertuples()]
    cells += [(f'BG_{i:04d}',a,b) for i,(a,b) in enumerate(zip(bg['lat'],bg['lon']))]
    missing=[{'id':cid,'lat':lat,'lon':lon,'reason':'outside ASTER latitude coverage' if abs(lat)>83 else 'provider returned no-data'} for cid,lat,lon in cells if cid not in data['earth_terrain']]
    manifest={'generated_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'counts':{k:len(data[k]) for k in ('targets','earth_terrain','power')},'raw_files_verified':len(sources),'annual_power_responses_checked':len(data['power']),'planetary_samples_redecoded':samples,'copernicus_samples_redecoded':cop_samples,'thermal_context_targets_checked':len(data.get('target_thermal_context',{})),'terrain_gaps':missing,'sources':list(sources.values())}
    (ROOT/'data'/'source_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    val=pd.read_csv(ROOT/'analogfit_validation_report.csv');neg=pd.read_csv(ROOT/'analogfit_negative_control_report.csv')
    ntest=int(val.percentile_vs_global_land.notna().sum());npass=int((val.result=='PASS').sum())
    path=ROOT/'test-artifacts'/'browser-report.json'
    browser=json.loads(path.read_text()) if path.exists() else None
    checked=(f"Chrome: {browser['uiCases']} kombinasi antarmuka, {browser['parity']['comparisons']:,} perbandingan Python-browser, galat maksimum {browser['parity']['maxError']:.3g}, tanpa page error. File lokal, peta/globe offline dan layar 390 px lolos." if browser else 'Laporan browser belum tersedia.')
    targets='\n'.join(f"| {tid} | {t['lat']:.4f}; {t['lon']:.4f} E | {t['slope_500m_deg']:.6f} |" for tid,t in data['targets'].items())
    gaps='\n'.join(f"| {m['id']} | {m['lat']}; {m['lon']} | {m['reason']} |" for m in missing) or '| — | — | Tidak ada gap pada 599 lokasi sampel ini; bukan jaminan cakupan seluruh Bumi. |'
    report=f'''# Audit keakuratan AnalogFit

Audit 15 November 2026. Cadangan sebelum perubahan: `_backup_2026-11-15_scientific_audit/`.

## Hasil verifikasi

- **599 respons NASA POWER asli**, untuk 14 lokasi kurasi/kontrol dan 585 sampel global. Header NASA menyatakan klimatologi Januari 2001 sampai Desember 2025.
- **{len(data['earth_terrain'])} petak medan Bumi**: 589 NASA SRTM / NASA-METI ASTER melalui OpenTopoData serta {cop_samples//9} petak tambahan Copernicus GLO-30 (ESA/DLR/Airbus) dari COG asli. Ditambah **3 petak target NASA PDS LOLA/MOLA**. Setiap petak pembanding memiliki 9 sampel, baseline 500 m, dan tapak sekitar 1 km.
- **{len(sources)} berkas sumber unik** lolos pemeriksaan SHA-256. Seluruh **599 respons** diperiksa terhadap ANN NASA dan **{samples} elevasi target** didekode ulang dari byte PDS, termasuk urutan byte, faktor skala, proyeksi dan interpolasi. Bukti: `data/source_manifest.json`.
- **{cop_samples} sampel Copernicus** didekode ulang dari raster asli. **{len(data.get('target_thermal_context',{}))} konteks termal Diviner** diperiksa terhadap segitiga PRP yang memuat target. Rerata Diviner pada kedalaman 2 cm tidak diperlakukan sebagai suhu permukaan POWER, sehingga tidak menambah cakupan T/I.
- {checked}

## Perubahan ilmiah utama

1. Mode berbukti kini mensyaratkan masukan Bumi **dan target** yang didukung. Label lama hanya memastikan data Bumi terukur. Iluminasi tetap diberi label hasil model.
2. Target lereng isian tangan diganti hasil petak DEM asli NASA. Semua pembanding memakai baseline **500 m**; lereng 100 m tidak dibandingkan dengan MOLA sekitar 463 m seolah setara.
3. Suhu rata-rata global Mars 210 K tidak diperlakukan sebagai pengamatan Arcadia. Suhu Bumi ditampilkan sebagai konteks, belum sebagai bukti analog suhu target.
4. Klimatologi tahunan memakai **ANN** NASA, bukan rerata sederhana bulan yang telah dibulatkan. Maksimum/minimum klimatologi tidak disebut rerata siang/malam.
5. Cakupan memakai seluruh bobot uji, termasuk ciri kosong. Peringkat mendahulukan cakupan setara. Skor parsial tidak disebut penilaian seluruh uji.
6. Persentil membandingkan ciri dan masukan penalti yang sama, memakai peringkat tengah untuk seri. Seluruh skor nol tidak bisa membuat analog lolos.
7. Skor kontrol kosong adalah **NOT TESTABLE**, bukan nol. Rentang Monte Carlo adalah sensitivitas terhadap asumsi, bukan interval kepercayaan pengamatan.
8. Batas Bumi numerik lama tidak lagi disajikan sebagai batas akurasi terkalibrasi. Gravitasi, atmosfer dan radiasi tetap dijelaskan sebagai perbedaan fisika.
9. Albedo tinggi disebut proksi kecerahan, bukan pengukuran tutupan es.
10. Antarmuka memakai huruf lebih besar, bukti per lokasi, sumber target, label pratinjau, tata letak seluler, garis daratan offline dan tekstur globe NASA lokal.

## Target yang benar-benar digunakan

| Target | Lintang; bujur timur | Median lereng baseline 500 m, derajat |
| --- | --- | --- |
{targets}

T1 adalah petak sektor kutub, bukan lokasi pangkalan terverifikasi. T2 adalah permukaan di sekitar pit, bukan interior lava tube. T3 adalah satu petak Arcadia. Angka tidak mewakili seluruh wilayah. Resolusi instrumen asli dan sifat interpolasi tetap berbeda meskipun baseline disamakan.

## Hasil diagnostik

**{npass} dari {ntest} peran yang bisa diuji lolos; {len(val)-ntest} peran belum bisa diuji.** Ambang heuristik: cakupan minimal 50%, minimal 30 sel dengan ciri/penalti setara, skor minimal 50/100 dan persentil minimal 95. Ini bukan standar NASA.

Hasil ini **belum memvalidasi metode sebagai pemilih lokasi latihan secara menyeluruh**. Mineral, es, ukuran butir, CPR dan kondisi termal target belum didukung. Pemetaan peran analog merupakan kurasi yang diwarisi proyek; audit ini tidak memverifikasi tiap pasangan peran dari publikasi independen.

Kontrol negatif: **{int((neg.result=='OK').sum())} OK**, **{int((neg.result=='NOT TESTABLE').sum())} belum bisa diuji**, **{int((neg.result=='FAIL').sum())} gagal**, dari {len(neg)} kombinasi lokasi-target-uji. Penolakan hutan hujan terutama dipengaruhi penalti hujan, sehingga merupakan pemeriksaan kewajaran, bukan validasi independen. Rincian berada di `analogfit_validation_report.csv` dan `analogfit_negative_control_report.csv`.

## Data medan yang kosong

| Lokasi | Lintang; bujur | Alasan |
| --- | --- | --- |
{gaps}

Sepuluh gap lama (delapan di luar lintang ASTER, dua no-data layanan) ditangani dengan raster Copernicus GLO-30 yang terverifikasi. Tidak ada lereng sintetis atau nilai nol yang diisikan. DSM dapat mewakili salju/es, bukan batuan tersingkap.

## Batas akurasi dan klaim

- Sampel 585 titik bukan pemindaian setiap piksel daratan, dan tidak membuktikan kandidat belum pernah diteliti. Di luar penyangga analog terkenal tidak otomatis berarti penemuan baru.
- Indeks 0-100 bukan peluang sukses atau kesiapan misi. Skor tinggi dengan cakupan kecil hanya menjelaskan ciri yang tersedia.
- Data DEM diinterpolasi. Penyamaan baseline tidak menghilangkan perbedaan datum, usia, resolusi atau ketidakpastian instrumen.
- Geometri Matahari mengabaikan refraksi, cakrawala medan, eksentrisitas dan librasi. Tanggal 2027 adalah perkiraan; tidak mengukur bayangan permanen.
- POWER adalah data regional/reanalisis. Kecepatan gesek, ukuran butir perkiraan dan frekuensi debu bukan pengamatan langsung.
- Bobot, toleransi dan penalti hujan belum dikalibrasi dengan data lapangan. Penalti hujan ditujukan pada penyaringan permukaan tandus, bukan semua jenis analog.
- Diviner PRP T1 tersedia sebagai konteks hasil model termal, bukan pasangan suhu POWER. Mineralogi, es tanah, target termal yang kompatibel, serta NDVI dengan QA tetap belum mendukung skor kedua dunia.
- Kolom `ceiling` / `F_total` lama dipertahankan untuk kompatibilitas dengan status **ILLUSTRATIVE_HEURISTIC_NOT_PHYSICAL_LIMIT**, bukan hasil fisika terkalibrasi.
- Resources lomba dicocokkan dengan teks resmi yang diberikan pengguna. Pengambilan ulang halaman Space Apps gagal karena TLS; arsip PDS dan layanan NASA yang digunakan berhasil diakses. [DATA_SOURCES.md](DATA_SOURCES.md) membedakan sumber terpakai dan rencana.

## Reproduksi

```powershell
python -m unittest discover -s tests -v
python analogfit_pipeline.py
python analogfit.py
node tests/browser.cjs
python audit_data.py
```

Buka `index.html` dengan klik ganda. Laporan ini dibangun dari manifest dan CSV keluaran, sehingga bisa diperbarui setelah sumber baru diintegrasikan. Petunjuk ada di [README.md](README.md).
'''
    (ROOT/'AUDIT_KEAKURATAN.md').write_text(report,encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ('counts','raw_files_verified','annual_power_responses_checked','planetary_samples_redecoded')},indent=2))
    print('Validation:',npass,'of',ntest,'pass;',len(val)-ntest,'not testable')
    print('Browser:',browser)

if __name__=='__main__':main()
