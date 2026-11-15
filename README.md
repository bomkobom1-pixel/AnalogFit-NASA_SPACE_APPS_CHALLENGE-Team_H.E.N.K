# AnalogFit

Peta untuk mencari kandidat analog Bumi bagi uji tertentu di Bulan atau Mars.
Buka **`index.html` dengan klik ganda**. Tidak perlu server atau akun.
Bahasa Inggris menjadi bawaan untuk peninjauan internasional; tombol ID menyediakan
bahasa Indonesia. Pilihan bahasa yang sudah disimpan tetap dihormati.

Antarmuka memakai palet pitch deck: Deep Space #080D18, Midnight Navy #111B2D,
Slate Blue #1C2B45, Signal Blue #3B82F6, Data Cyan #8EC5FF, Mars Amber #D99A52,
dan teks #F4F7FB. Pembuka **3D WebGL lima detik** membawa kamera dari Bumi,
melewati Bulan dan Mars, menampilkan logo AnalogFit, lalu memasukkan ruang kerja
dengan transisi perspektif. Bumi memakai tekstur NASA Blue Marble lokal;
Bulan/Mars adalah ilustrasi prosedural. Skala dan lintasan pembuka adalah
dekorasi sinematik, bukan simulasi orbit atau data misi.
Tombol Lewati tersedia; pembuka dapat dimatikan atau diputar
ulang melalui ikon roda gigi **Pengaturan / Settings**. Indikator persentase
menunjukkan kesiapan komponen lokal, bukan waktu unduh simulasi.
Matikan animasi melalui Settings untuk tampilan statis. Jika WebGL tidak
tersedia, pembuka memakai cadangan CSS. Renderer berhenti setelah masuk;
tidak memengaruhi data, skor, atau peta.

## Cara memakai

1. Pilih jenis uji dan target pada pertanyaan di bagian atas.
2. Gunakan **Perbandingan berbukti** untuk hasil penyaringan. Periksa persentase cakupan sebelum membandingkan angka.
3. Pilih lokasi di peta atau peringkat untuk membuka dossier dengan animasi geser.
   Panel kanan tertutup secara bawaan; tutup dengan tombol × atau Escape dan
   buka lagi melalui tombol lokasi terpilih. Ringkasan menampilkan indeks kemiripan,
   cakupan observasi/model, elevasi DEM, suhu, presipitasi dan relief nyata.
   Gulir untuk melihat nilai Bumi, target NASA, sumber dan batas analoginya.
4. Pilih Peta atau Globe 3D. Garis daratan, skor, dan tekstur globe NASA tersedia offline; lapisan citra tambahan memerlukan internet.
5. Pratinjau ilustratif menyertakan asumsi manual dan tidak boleh dilaporkan sebagai hasil pengamatan.
6. Tab **Pengaturan** dan **Peringkat lokasi** memisahkan parameter dari daftar kandidat.
7. Menu **Resources** memuat 11 tautan pada daftar tantangan: 5 NASA dan 6 sumber
   mitra CSA/ESA/JAXA. Gunakan filter atau pencarian. Status membedakan data
   terpakai, konteks visual, dan rujukan yang belum diintegrasikan.
8. Menu **Sains / Science** menghubungkan implementasi dengan makalah tim:
   cakupan observasi vs model, ambang 70%, ablasi lokal, dan kartu bukti JSON.
9. Citra medan menyediakan Landsat historis, MODIS bertanggal, relief ASTER, serta
   perbandingan geser. Sumber dan waktu layanan selalu ditampilkan. Landsat
   historis bukan bukti kondisi lokasi saat ini; citra tidak masuk ke skor.
10. Pada medan 3D, pilih **Warna elevasi** atau **Kedalaman relatif**. Legenda
    memakai meter. Kedalaman dihitung dari titik sampel tertinggi, bukan bawah
    tanah. Gunakan slider VE, tombol panah, seret, atau Putar untuk inspeksi.
    Sampel global dan Mount Howe kini memakai grid 3×3 dengan jarak 500 m;
    lokasi kurasi lain mempertahankan grid tampilan lama 100 m jika tersedia.
    Jarak sampel, sumber dan VE selalu ditampilkan.
11. Buka ikon roda gigi **Pengaturan / Settings** untuk SFX, musik dan volume.
    Keduanya dimulai dalam keadaan mati; musik dijeda saat tab di latar.
12. Settings juga mengatur animasi, citra, medan 3D, statistik ringkas, catatan
    sains terperinci, rotasi globe, tampilan awal dan bahasa. Preferensi antarmuka
    disimpan di perangkat bila penyimpanan browser tersedia. Skor dan data tidak
    berubah. Cakupan bukti dan batas penting tetap terlihat.
13. Pilih **Expand map / Perbesar peta** untuk peta sebesar viewport, atau ikon
    **Fullscreen** untuk layar penuh browser. Jika tidak didukung, peta besar
    tetap tersedia. Target, jenis uji dan panel parameter/lokasi dapat diakses
    langsung dari peta besar. Keluar lewat tombol yang sama atau Escape.
14. **Evidence tour / Tur bukti** membuka dua studi perbandingan dengan skor
    langsung, sumber dan batasnya. Ini pengujian hipotesis, bukan klaim penemuan.

Hasil perbaikan evaluasi: [EVALUATION_RESPONSE.md](EVALUATION_RESPONSE.md).
Makalah empiris yang sudah disinkronkan: [paper/analogfit.pdf](paper/analogfit.pdf),
dengan sumber [paper/analogfit.tex](paper/analogfit.tex). Protokol lama diarsipkan
terpisah; versi empiris tidak mengklaim semua rencana penelitian telah selesai.

Evaluasi kegunaan setiap kelompok fitur untuk pekerjaan analis terdapat di
[FEATURE_USEFULNESS_REVIEW.md](FEATURE_USEFULNESS_REVIEW.md). Ini evaluasi
berdasarkan tugas dan makalah, bukan pengujian pengguna bersama staf NASA.

Untuk meningkatkan metode penelitian, lihat [SCIENCE_ROADMAP.md](SCIENCE_ROADMAP.md),
yang memetakan kesenjangan nyata terhadap bagian 5–10 makalah asli.

## Data yang benar-benar digunakan

| Data | Pemakaian dan batas |
| --- | --- |
| NASA PDS LRO LOLA | Dua petak referensi Bulan; lereng diturunkan dari DEM asli, bukan nilai target isian tangan. |
| NASA PDS MGS MOLA | Satu petak Arcadia Planitia; lereng diturunkan dari DEM asli. |
| NASA/METI ASTER GDEM v3 dan NASA SRTM GL1 v3 via OpenTopoData | Medan Bumi. Penyedia API pihak ketiga disebutkan secara eksplisit. |
| Copernicus GLO-30 Public (EU/ESA, DLR/Airbus) | Sepuluh petak kosong diisi dari 14 COG asli; total medan Bumi 599/599 lokasi sampel. Baseline 500 m. DSM dapat mewakili salju/es. Lihat DATA_LICENSES.md. |
| NASA PDS LRO Diviner PRP | Konteks termal T1 dari segitiga yang memuat target. Rerata 85,378 K pada kedalaman 2 cm dan maksimum permukaan 227,004 K adalah hasil model termal. Tidak menambah bukti suhu/es pada skor. |
| NASA POWER, MERRA-2 / CERES | 599 respons asli klimatologi 2001-2025. Memakai nilai ANN dari layanan, bukan rerata sederhana 12 bulan yang dibulatkan. Hujan menjadi penalti penyaringan; suhu Bumi ditampilkan sebagai konteks. |
| NASA GIBS / Worldview | Citra konteks dan tekstur Blue Marble offline. Citra tidak masuk ke skor numerik. |
| Geometri Matahari | Model ideal dengan cakrawala datar. Bukan pengukuran iluminasi atau bayangan permanen. |

LOLA/MOLA dan NASA PDS termasuk jalur sumber pada Resources tantangan yang diberikan pengguna. POWER adalah sumber NASA tambahan. Lihat [DATA_SOURCES.md](DATA_SOURCES.md) untuk hubungan sumber dengan Resources lomba dan [AUDIT_KEAKURATAN.md](AUDIT_KEAKURATAN.md) untuk hasil audit.

## Arti skor dan cakupan

Skor adalah indeks penyaringan 0-100: rata-rata geometrik berbobot dari kemiripan ciri yang tersedia, dikalikan penalti lingkungan. Bobot, toleransi Gaussian, dan ambang penalti adalah asumsi model.

Ciri hanya masuk mode berbukti bila masukan **Bumi dan target** sama-sama didukung serta skalanya setara. Lereng memakai baseline **500 m** pada petak 1 km di kedua dunia. Cakupan memakai **seluruh bobot uji**, termasuk ciri yang belum tersedia. Skor tinggi dengan cakupan kecil tidak membuktikan kecocokan seluruh uji atau kesiapan misi.

Saat ini, hanya lereng yang didukung observasi medan pada kedua dunia. Iluminasi berasal dari model. Mineral, ukuran butir, CPR, es tanah, debu, serta suhu target setempat belum terverifikasi dan dikeluarkan dari mode berbukti. Suhu rata-rata global Mars 210 K tidak diperlakukan sebagai pengamatan Arcadia. Data kosong tidak dianggap nol.

## Menjalankan ulang

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

Pengunduh bawaan memakai `fetch_verified.py`, mempertahankan respons asli di `data/raw/`, menyimpan URL, timestamp UTC, label PDS, rentang byte, dan SHA-256 di `verified_observations.json`, serta melanjutkan data yang belum ada. Data cache yang sudah lengkap tidak diunduh ulang. `--legacy` mengakses pengunduh lama untuk kebutuhan kompatibilitas; keluaran lama tidak otomatis menjadi bukti terverifikasi.

Untuk uji browser pengembang, Playwright lokal telah dipasang di `.test-tools/`. Jika folder itu tidak tersedia:

```powershell
npm install --prefix .test-tools --no-audit --no-fund playwright
node tests/browser.cjs
node tests/ui.cjs
node tests/experience.cjs
node tests/mission.cjs
node tests/evaluation.cjs
node tests/intro-3d.cjs
```

Uji memakai Chrome yang sudah terpasang, membuka `file://`, membandingkan skor Python dan browser, serta memeriksa mode offline dan layar 390 px. Bukti tersimpan di `test-artifacts/`.

## Batas yang tetap berlaku

- 585 titik global merupakan sampel kasar, bukan pemindaian setiap piksel daratan. Kandidat di luar penyangga 100 km dari analog terkenal belum membuktikan penemuan analog baru.
- Petak Bulan/Mars adalah titik referensi eksplisit. Petak 1 km tidak menyatakan kondisi seluruh wilayah, interior gua, bongkah, atau keselamatan pendaratan.
- Cakupan dan resolusi asli instrumen berbeda. Kesamaan baseline tidak menghilangkan interpolasi atau ketidakpastian DEM.
- POWER adalah reanalisis/regional: meteorologi sekitar 0,5 derajat lintang dan 0,625 derajat bujur; albedo lebih kasar.
- Curah hujan tidak relevan untuk semua pertanyaan analog. Penalti saat ini ditujukan pada penyaringan permukaan tandus, bukan validasi geologi, astrobiologi, atau sumber daya secara menyeluruh.
- Rentang Monte Carlo adalah sensitivitas terhadap asumsi, bukan interval kepercayaan pengamatan.
- Gravitasi, atmosfer, dan radiasi Bumi tetap berbeda. Kolom `ceiling` dan `F_total` lama disimpan untuk kompatibilitas dengan status **ILLUSTRATIVE_HEURISTIC_NOT_PHYSICAL_LIMIT**; tidak ditampilkan sebagai batas akurasi terkalibrasi.

## Berkas utama

| Berkas | Fungsi |
| --- | --- |
| `science.py` | Integritas sumber dan aturan bukti dua dunia. |
| `fetch_verified.py` | Pengunduhan NASA dan medan Bumi dengan bukti asal data. |
| `fetch_evaluation_data.py` | Pengunduhan Copernicus polar, konteks Diviner dan definisi observabel yang ketat. |
| `evaluation_report.py` | Dua baseline naif dan 144 ringkasan ablasi seluruh sampel. |
| `build_empirical_paper.py` | Makalah empiris dari hasil CSV dan audit saat ini. |
| `analogfit_pipeline.py` | Fitur, baseline, dan geometri Matahari. |
| `analogfit.py` | Skor, sensitivitas, diagnostik, CSV/GeoJSON, dan data aplikasi. |
| `analogfit_config.json` | Asumsi bobot/toleransi dan nilai ilustratif; target medan terverifikasi dimuat saat build. |
| `analogfit_background_scores.csv` | Skor semua 585 sampel global untuk pemeriksaan ulang. |
| `index.html`, `app.js`, `vendor/` | Aplikasi tanpa server dan aset lokal. |
| `explorer.js`, `explorer.css`, `walkthrough.js` | Peta besar, layar penuh dan tur bukti. |
| `_backup_2026-11-15_scientific_audit/` | Cadangan sebelum audit ini. |

Tema, logo, pembuka dan katalog sumber berada pada ui.css, ui.js dan
assets/analogfit-mark.svg. Pengujian UI berada di tests/ui.cjs; hasilnya
tersimpan pada test-artifacts/ui-report.json. Cadangan sebelum pembaruan visual
ada pada _backup_2026-11-15_before_visual_refresh/.

Ekstensi citra, panel sains, dan audio berada di terrain-view.js, science-view.js,
audio.js, serta experience.css. Jalankan python fetch_terrain_media.py untuk
menyiapkan atau melanjutkan cache citra NASA; keluaran disimpan pada
assets/terrain/, terrain_media.js, dan data/terrain_media_manifest.json.
Pillow hanya digunakan untuk memeriksa respons citra kosong; gambar NASA asli
disimpan tanpa modifikasi. Hasil uji fitur baru: test-artifacts/experience-report.json.

Kode dan penjelasan disusun dan diperbaiki dengan bantuan Claude (Anthropic) dan OpenAI Codex. Nama NASA menyatakan sumber data, bukan dukungan atau sertifikasi NASA terhadap aplikasi.
