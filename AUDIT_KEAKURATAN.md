# Audit keakuratan AnalogFit

Audit 15 November 2026. Cadangan sebelum perubahan: `_backup_2026-11-15_scientific_audit/`.

## Hasil verifikasi

- **599 respons NASA POWER asli**, untuk 14 lokasi kurasi/kontrol dan 585 sampel global. Header NASA menyatakan klimatologi Januari 2001 sampai Desember 2025.
- **599 petak medan Bumi**: 589 NASA SRTM / NASA-METI ASTER melalui OpenTopoData serta 10 petak tambahan Copernicus GLO-30 (ESA/DLR/Airbus) dari COG asli. Ditambah **3 petak target NASA PDS LOLA/MOLA**. Setiap petak pembanding memiliki 9 sampel, baseline 500 m, dan tapak sekitar 1 km.
- **680 berkas sumber unik** lolos pemeriksaan SHA-256. Seluruh **599 respons** diperiksa terhadap ANN NASA dan **27 elevasi target** didekode ulang dari byte PDS, termasuk urutan byte, faktor skala, proyeksi dan interpolasi. Bukti: `data/source_manifest.json`.
- **90 sampel Copernicus** didekode ulang dari raster asli. **1 konteks termal Diviner** diperiksa terhadap segitiga PRP yang memuat target. Rerata Diviner pada kedalaman 2 cm tidak diperlakukan sebagai suhu permukaan POWER, sehingga tidak menambah cakupan T/I.
- Chrome: 60 kombinasi antarmuka, 35,940 perbandingan Python-browser, galat maksimum 5.98e-16, tanpa page error. File lokal, peta/globe offline dan layar 390 px lolos.

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
| T1 | -89.6000; 0.0000 E | 8.070670 |
| T2 | 8.3355; 33.2229 E | 0.294920 |
| T3 | 45.0000; 200.0000 E | 0.336129 |

T1 adalah petak sektor kutub, bukan lokasi pangkalan terverifikasi. T2 adalah permukaan di sekitar pit, bukan interior lava tube. T3 adalah satu petak Arcadia. Angka tidak mewakili seluruh wilayah. Resolusi instrumen asli dan sifat interpolasi tetap berbeda meskipun baseline disamakan.

## Hasil diagnostik

**0 dari 3 peran yang bisa diuji lolos; 11 peran belum bisa diuji.** Ambang heuristik: cakupan minimal 50%, minimal 30 sel dengan ciri/penalti setara, skor minimal 50/100 dan persentil minimal 95. Ini bukan standar NASA.

Hasil ini **belum memvalidasi metode sebagai pemilih lokasi latihan secara menyeluruh**. Mineral, es, ukuran butir, CPR dan kondisi termal target belum didukung. Pemetaan peran analog merupakan kurasi yang diwarisi proyek; audit ini tidak memverifikasi tiap pasangan peran dari publikasi independen.

Kontrol negatif: **81 OK**, **9 belum bisa diuji**, **0 gagal**, dari 90 kombinasi lokasi-target-uji. Penolakan hutan hujan terutama dipengaruhi penalti hujan, sehingga merupakan pemeriksaan kewajaran, bukan validasi independen. Rincian berada di `analogfit_validation_report.csv` dan `analogfit_negative_control_report.csv`.

## Data medan yang kosong

| Lokasi | Lintang; bujur | Alasan |
| --- | --- | --- |
| — | — | Tidak ada gap pada 599 lokasi sampel ini; bukan jaminan cakupan seluruh Bumi. |

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
