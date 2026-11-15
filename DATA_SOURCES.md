# Sumber data dan kaitannya dengan Resources lomba

Daftar Resources dicocokkan dengan teks halaman resmi yang diberikan pengguna. Pengambilan ulang halaman Space Apps dari lingkungan ini gagal karena verifikasi sertifikat TLS; tidak ada klaim bahwa isi halaman langsung telah diverifikasi ulang. Arsip PDS, NASA POWER, dan GIBS berhasil diakses untuk mengunduh data yang benar-benar dipakai.

| Resources yang diberikan | Data yang dipakai aplikasi | Status |
| --- | --- | --- |
| [NASA Earthdata Search](https://search.earthdata.nasa.gov/) | NASA SRTM GL1 v3 / NASA-METI ASTER GDEM v3, disajikan API OpenTopoData | Digunakan; jalur distribusi pihak ketiga dicantumkan. |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | NASA GIBS Blue Marble dan lapisan visual | Digunakan untuk konteks, tidak untuk nilai skor. |
| [NASA PDS](https://pds.nasa.gov/) | DEM LOLA dan MOLA asli | Digunakan langsung dari arsip PDS Geosciences. |
| [NASA LRO](https://pds-geosciences.wustl.edu/missions/lro/) | [LOLA GDR](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) | Digunakan untuk lereng dua target Bulan. |
| [LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) | PRP T1: model rerata tahunan pada 2 cm dan maksimum permukaan; segitiga memuat target | Konteks saja; bukan suhu permukaan POWER dan tidak menambah bobot T/I. |
| [Copernicus Data Space](https://dataspace.copernicus.eu/) | GLO-30 Public, 14 raster COG asli dari distribusi publik AWS | Dipakai untuk 10 gap lereng/elevasi Bumi, termasuk Mount Howe. |
| CSA / ESA selain GLO-30 / JAXA | Produk belum diintegrasikan pada skor | Tidak diklaim digunakan. |

## Produk planet yang benar-benar diambil

Semua produk disimpan sebagai label PDS dan byte slice asli. Nama berkas, URL, rentang byte, dan checksum dapat diperiksa pada `verified_observations.json` dan `data/source_manifest.json`.

| Target | Titik referensi | Produk | Resolusi asli |
| --- | --- | --- | --- |
| T1 | 89,6 S; 0 E | [LOLA LDEM_80S_80M](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_80m.lbl) | 80 m pada kutub; proyeksi polar stereografik |
| T2 | 8,3355 N; 33,2229 E | [LOLA LDEM_1024_00N_15N_030_060](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_1024_00n_15n_030_060.lbl) | 1024 piksel/derajat; sekitar 29,6 m arah utara-selatan |
| T3 | 45 N; 200 E | [MOLA MEGT88N180HB](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n180hb.lbl) | 128 piksel/derajat; sekitar 463 m arah utara-selatan |

LOLA integer little endian dikalikan 0,5 menjadi tinggi relatif terhadap bola referensi. MOLA integer big endian memberi topografi relatif terhadap areoid dalam meter. Grid dapat berisi nilai hasil interpolasi lintasan instrumen; bukan setiap piksel merupakan bidikan laser independen. Petak ini disampel ulang bilinear pada sembilan titik dengan jarak 500 m, lalu dihitung median empat kemiringan. Kesamaan baseline tidak menyetarakan semua sifat fisik atau kualitas pengamatan.

T1 merupakan petak referensi sektor kutub, bukan lokasi pangkalan atau punggungan yang telah divalidasi. T2 mewakili permukaan di sekitar pit, bukan bagian dalam lava tube. T3 mewakili satu petak Arcadia, bukan seluruh kawasan.

## Sumber tambahan dan perangkat lunak

- [NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/): meteorologi dan albedo tahunan ANN; header respons menyatakan periode Januari 2001 sampai Desember 2025.
- [NASA GIBS](https://gibs.earthdata.nasa.gov/): Blue Marble serta lapisan konteks. ID dan format lapisan diperiksa pada capabilities layanan.
- [OpenTopoData SRTM](https://www.opentopodata.org/datasets/srtm/) dan [ASTER](https://www.opentopodata.org/datasets/aster/): layanan distribusi pihak ketiga untuk data NASA / NASA-METI.
- [ORNL DAAC MODIS](https://modis.ornl.gov/rst/api/v1/): rencana NDVI; belum menjadi bukti dalam mode perbandingan berbukti. Citra NDVI yang ditampilkan tidak sama dengan ekstraksi numerik NDVI dengan kendali kualitas.
- Leaflet dan globe.gl: pustaka visual; lisensi tersedia di `vendor/`.
- Natural Earth / world-atlas 2.0.2: garis daratan publik untuk peta offline.
- Esri World Imagery: lapisan opsional non-NASA, diberi label terpisah.
- Python, NumPy, pandas, requests; Playwright dan Chrome hanya untuk pengujian.

Tidak ada klaim penggunaan EMIT, Mini-RF, MODIS NDVI numerik berkualitas atau bukti es tanah pada skor. Diviner setempat digunakan sebagai konteks hasil model termal, bukan pasangan pengamatan suhu pada skor.

## Katalog Resources pada antarmuka

Menu Resources memuat seluruh 11 tautan dari daftar pengguna. NASA Earthdata,
Worldview, PDS, dan LRO dibedakan menurut pemakaian arsip atau konteks visual;
Diviner menyediakan konteks termal T1. Copernicus GLO-30 sudah mendukung lereng
melalui distribusi publik AWS. Dari enam sumber mitra berikut, lima tetap
rujukan dan belum masuk skor:

- [CSA RADARSAT Constellation Mission](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm)
- [CSA RADARSAT-1](https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1)
- [CSA Synthetic Aperture Radar Tutorial](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial)
- [ESA Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/)
- [ESA Open Science Catalog](https://opensciencedata.esa.int/)
- [JAXA G-Portal](https://gportal.jaxa.jp/gpr/index/index)

Logo antarmuka adalah identitas AnalogFit. Tidak ada logo NASA atau lambang
lembaga antariksa yang digunakan sebagai identitas produk.

## Integrasi evaluasi dan audit tambahan

`fetch_evaluation_data.py` mengunduh COG asli, katalog tile, dokumentasi dan lisensi
Copernicus. Empat belas COG menghasilkan 90 sampel tambahan pada 10 petak lama
yang kosong; total 599 petak Bumi kini tersedia. GeoTIFF memakai koordinat piksel
pusat dan interpolasi bilinear asli, tanpa overview atau isian sintetis. Referensi
vertikal EGM2008 dan sifat DSM salju/es dicatat. Lihat [DATA_LICENSES.md](DATA_LICENSES.md).

Diviner [PRP PDS4](https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/)
diambil dengan byte range. Vertices arsip dipakai untuk memverifikasi segitiga
yang memuat T1; pemilihan bukan sekadar tetangga terdekat. `temp_avg` adalah
85,378 K pada kedalaman 2 cm, sedangkan `temp_max` adalah 227,004 K di permukaan,
keduanya dari pencocokan model termal ke observasi Diviner. Label PDS4, rekaman
asli, rentang byte dan SHA-256 disimpan. Data ini tidak menyatakan es teramati.

`audit_data.py` memeriksa 680 sumber unik, mendekode ulang 27 elevasi planet dan
90 sampel Copernicus, serta memverifikasi konteks Diviner. Kartu bukti menyertakan
semua tile terkait petak, bukan hanya satu raster utama.
