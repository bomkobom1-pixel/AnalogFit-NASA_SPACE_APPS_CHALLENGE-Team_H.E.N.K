/* AnalogFit web app. Reads window.ANALOGFIT (written by analogfit.py) and scores in the browser,
   so the target, test, evidence mode and weights can all be changed live. */
(() => {
    'use strict';
    const D = window.ANALOGFIT;
    const $ = id => document.getElementById(id);
    const el = (tag, attrs = {}, html = '') => {
        const n = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
        n.innerHTML = html;
        return n;
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ============================================================
    // 1. WORDS (English and Indonesian)
    // ============================================================
    const STR = {
        en: {
            q1: 'Where on Earth can we rehearse', q2: 'for',
            btnValidation: 'Does it work?', btnMethod: 'Data and method',
            hEvidence: 'Evidence', modeReal: 'Measured data only', modeAll: 'Add illustrative values',
            hWeights: 'What matters for this test', resetWeights: 'Back to the standard weights',
            hCurated: 'Sites we examined', hDiscover: 'Best places found by the global scan',
            skipIce: 'Skip ground covered by snow or ice',
            view2d: 'Map', view3d: '3D globe', layers: 'NASA imagery layers', legendTitle: 'Match score',
            known: 'Known analog', hypothesis: 'Our hypothesis', negative: 'Rainforest control', cell: 'Global scan cell',
            measured: 'measured', illustrative: 'illustrative',
            hAnswer: 'Short answer', faded: 'Faded: snow or ice, or no measured score',
            ansSite: (n, f, v) => `Best of the sites we examined: ${n}, ${f} out of 100 (${v}).`,
            ansCell: (n, c, f) => `Best place in the global scan: ${n} (${c}), ${f} out of 100.`,
            ansNone: 'No measured score for this test yet.',
            ansHard: 'Nowhere on Earth is a close match for this test. The feature-by-feature list on the right shows why.',
            noWebgl: '3D needs WebGL, which this browser did not provide. Showing the map instead.',
            verdicts: ['Poor match', 'Weak match', 'Partial match', 'Good match', 'Strong match'],
            noScore: 'No measured data', outOf: 'out of 100',
            evidenceReal: (p, have, miss) => `${p}% of what this test depends on is measured${have ? ` (${have})` : ''}.` +
                (miss ? ` Not measured yet: ${miss}.` : ''),
            evidenceAll: miss => `Scores now also use hand-entered illustrative values for ${miss}. Treat them as a preview, not a result.`,
            evidenceNone: 'Nothing this test depends on is measured yet, so there is no measured score to show.',
            previewBtn: 'Preview with illustrative values',
            customWeights: 'Custom weights in use: the likely range is hidden.',
            scanHint: n => `${n} land cells sampled evenly across the globe and scored with measured data only: slope, low Sun, temperature and rainfall.`,
            scanNone: 'The global scan has not been run. Run fetch_nasa.py --background.',
            noCells: 'No scan cell has a measured score for this test.',
            pick: 'Pick a place',
            pickText: 'Choose a marker on the map or a name in the lists to see why it matches, where the comparison fails and what the ground looks like.',
            howTitle: 'How to read the score',
            how: [
                'The match score (0 to 100) says how closely the measurable features of an Earth site resemble the target, for the chosen test.',
                'One bad feature cannot be bought back by good ones, and rain, vegetation or city lights pull the score down.',
                'The Earth limit is separate: gravity, air and radiation that no Earth site can change.'],
            likely: (a, b) => `Likely range ${a} to ${b} when weights and tolerances are varied`,
            evidenceShare: p => `${p}% of this test's weight is measured here`,
            limitTitle: 'Earth limit',
            limitNone: 'No Earth limit for this test: a perfect site would be a perfect rehearsal.',
            limitText: (c, total) => `Even a perfect site is capped at ${c} out of 100 for this test. Score after the limit: ${total}.`,
            ratio: {
                g: (r, b) => `Earth's gravity is ${r} times ${b}'s.`,
                P: (r, b) => `Earth's air pressure is ${r} times ${b}'s.`,
                D: (r, b) => `Radiation on ${b} is ${r} times Earth's.`
            },
            whyTitle: 'Feature by feature', here: 'here', target: 'target', weight: 'weight',
            notCounted: 'not counted in measured mode', similar: 'similar',
            breakTitle: 'Where the comparison breaks down',
            rain: (mm, p) => `${mm} mm of rain or snow a year costs ${p}% of the score.`,
            veg: (v, p) => `Vegetation index ${v} costs ${p}% of the score.`,
            lights: p => `Night lights cost ${p}% of the score.`,
            clean: 'No penalty from rain, vegetation or lights.',
            worst: (f, p) => `Weakest feature: ${f} (${p}% similar).`,
            ice: a => `Snow or ice covers much of the surrounding 50 km (reflects ${a}% of sunlight), so bare ground may be scarce.`,
            regional: 'Temperature, rain and wind describe a region about 50 km wide, not this exact spot.',
            sunTitle: 'Best dates',
            sunText: (p, w) => `Around ${w} the Sun sits within 5 degrees of the horizon ${p}% of the time. That is the window to test with long shadows.`,
            terrainTitle: 'Real terrain in 3D',
            terrainCap: (ve, src) => `0.9 km square of ${src} elevation, heights exaggerated ${ve} times. Drag to rotate.`,
            terrainNone: 'No elevation grid for this place (the elevation data ends at 83 degrees latitude).',
            terrainCell: 'Scan cells keep only the typical slope and elevation. Choose one of the examined sites to see its terrain.',
            valuesTitle: 'Measured here',
            rows: {
                t_mean_K: 'Surface temperature, yearly mean', t_day_K: 'Mean of monthly maxima', t_night_K: 'Mean of monthly minima',
                precip_mm_yr: 'Rain and snow per year', u_star_mean: 'Wind stress at the ground (u*)', albedo: 'Sunlight reflected',
                slope_med_deg: 'Typical slope over 100 m', elev_m: 'Elevation', ndvi: 'Vegetation index (NDVI)'
            },
            src: { power: 'NASA POWER (MERRA-2, CERES)', dem: 'SRTM / ASTER GDEM', modis: 'MODIS' },
            role: 'Documented role',
            dominant: 'mostly',
            valTitle: 'Does the method work?',
            valIntro: n => `A method like this must put the analogs NASA already uses near the top, for the job each is known for, and must reject rainforest. Each known analog is compared with ${n} land cells sampled across the globe, using measured data only.`,
            valCols: ['Known analog', 'Known for', 'Measured score', 'Beats this share of Earth', 'Evidence', 'Result'],
            valPass: 'In the top 5%', valFail: 'Not in the top 5%', valNA: 'Cannot be tested yet',
            valSummary: (p, n, na) => `${p} of ${n} testable roles reach the top 5%. ${na} cannot be tested until minerals, grain size and ice data are added.`,
            valNeg: ok => ok ? 'All three rainforest controls score below 5 for every target and test, as they must.' : 'A rainforest control scored 5 or more. The method fails this check.',
            valHonest: 'Why some known analogs fail today: rainfall is read from a 50 km climate cell, which punishes wet-region sites such as Iceland and Mauna Kea, and every Moon and Mars target value except the Sun geometry is still illustrative. A place in the top 5% with a score near zero only means the rest of Earth scores even lower.',
            methTitle: 'Data and method',
            methFormula: 'match score = similarity of the features (weighted, geometric) × cleanliness of the site',
            methText: [
                'An analog is a triple: an Earth site, a Moon or Mars site, and a test. A place that is right for navigation can be wrong for drilling.',
                'Each feature is compared with a bell curve: full marks at the target value, fading as the gap passes the tolerance.',
                'The Earth limit multiplies the score by a factor set by gravity, air pressure and radiation, which depend only on the test and the target.'],
            methCols: ['Feature', 'Status', 'Source'],
            methSources: 'Sources',
            methLimit: 'Limits to state when presenting this',
            methLimits: [
                'Moon and Mars target values are illustrative except the low-Sun window, which is computed from orbital geometry.',
                'The global scan is a coarse sample of land cells, a first screen and not a survey.',
                'The low-Sun window ignores mountains on the horizon and atmospheric refraction.'],
            planned: 'planned', close: 'Close', generated: 'Scores generated'
        },
        id: {
            q1: 'Di mana di Bumi kita bisa berlatih', q2: 'untuk',
            btnValidation: 'Apakah metodenya terbukti?', btnMethod: 'Data dan metode',
            hEvidence: 'Bukti', modeReal: 'Hanya data terukur', modeAll: 'Tambah nilai ilustratif',
            hWeights: 'Yang penting untuk uji ini', resetWeights: 'Kembali ke bobot standar',
            hCurated: 'Lokasi yang kami kaji', hDiscover: 'Tempat terbaik hasil pindai global',
            skipIce: 'Lewati tanah yang tertutup salju atau es',
            view2d: 'Peta', view3d: 'Globe 3D', layers: 'Lapisan citra NASA', legendTitle: 'Skor kecocokan',
            known: 'Analog terkenal', hypothesis: 'Hipotesis kami', negative: 'Kontrol hutan hujan', cell: 'Sel pindai global',
            measured: 'terukur', illustrative: 'ilustratif',
            hAnswer: 'Jawaban singkat', faded: 'Pudar: salju atau es, atau belum ada skor terukur',
            ansSite: (n, f, v) => `Terbaik dari lokasi yang kami kaji: ${n}, ${f} dari 100 (${v}).`,
            ansCell: (n, c, f) => `Tempat terbaik hasil pindai global: ${n} (${c}), ${f} dari 100.`,
            ansNone: 'Belum ada skor terukur untuk uji ini.',
            ansHard: 'Tidak ada tempat di Bumi yang benar-benar mirip untuk uji ini. Daftar ciri di sebelah kanan menjelaskan alasannya.',
            noWebgl: 'Tampilan 3D memerlukan WebGL, yang tidak tersedia di peramban ini. Peta ditampilkan sebagai gantinya.',
            verdicts: ['Tidak cocok', 'Kecocokan lemah', 'Cocok sebagian', 'Cocok', 'Sangat cocok'],
            noScore: 'Belum ada data terukur', outOf: 'dari 100',
            evidenceReal: (p, have, miss) => `${p}% dari hal yang menentukan uji ini sudah terukur${have ? ` (${have})` : ''}.` +
                (miss ? ` Belum terukur: ${miss}.` : ''),
            evidenceAll: miss => `Skor sekarang juga memakai nilai ilustratif yang diisi tangan untuk ${miss}. Anggap sebagai pratinjau, bukan hasil.`,
            evidenceNone: 'Belum ada satu pun faktor uji ini yang terukur, jadi skor terukur belum bisa ditampilkan.',
            previewBtn: 'Pratinjau dengan nilai ilustratif',
            customWeights: 'Bobot kustom sedang dipakai: rentang kemungkinan disembunyikan.',
            scanHint: n => `${n} sel daratan diambil merata di seluruh dunia dan dinilai hanya dengan data terukur: kemiringan, Matahari rendah, suhu, dan curah hujan.`,
            scanNone: 'Pindai global belum dijalankan. Jalankan fetch_nasa.py --background.',
            noCells: 'Tidak ada sel pindai yang punya skor terukur untuk uji ini.',
            pick: 'Pilih sebuah tempat',
            pickText: 'Pilih penanda di peta atau nama di daftar untuk melihat mengapa tempat itu cocok, di mana perbandingannya gagal, dan seperti apa medannya.',
            howTitle: 'Cara membaca skor',
            how: [
                'Skor kecocokan (0 sampai 100) menyatakan seberapa mirip ciri terukur sebuah lokasi di Bumi dengan target, untuk uji yang dipilih.',
                'Satu ciri yang buruk tidak bisa ditutup oleh ciri yang baik, dan hujan, vegetasi, atau lampu kota menurunkan skor.',
                'Batas Bumi dihitung terpisah: gravitasi, udara, dan radiasi yang tidak bisa diubah oleh lokasi mana pun di Bumi.'],
            likely: (a, b) => `Rentang kemungkinan ${a} sampai ${b} bila bobot dan toleransi divariasikan`,
            evidenceShare: p => `${p}% bobot uji ini terukur di sini`,
            limitTitle: 'Batas Bumi',
            limitNone: 'Tidak ada batas Bumi untuk uji ini: lokasi yang sempurna akan menjadi latihan yang sempurna.',
            limitText: (c, total) => `Lokasi sempurna pun dibatasi ${c} dari 100 untuk uji ini. Skor setelah batas: ${total}.`,
            ratio: {
                g: (r, b) => `Gravitasi Bumi ${r} kali gravitasi ${b}.`,
                P: (r, b) => `Tekanan udara Bumi ${r} kali tekanan di ${b}.`,
                D: (r, b) => `Radiasi di ${b} ${r} kali radiasi di Bumi.`
            },
            whyTitle: 'Ciri demi ciri', here: 'di sini', target: 'target', weight: 'bobot',
            notCounted: 'tidak dihitung pada mode terukur', similar: 'mirip',
            breakTitle: 'Di mana perbandingannya gagal',
            rain: (mm, p) => `Hujan atau salju ${mm} mm per tahun mengurangi skor ${p}%.`,
            veg: (v, p) => `Indeks vegetasi ${v} mengurangi skor ${p}%.`,
            lights: p => `Cahaya malam mengurangi skor ${p}%.`,
            clean: 'Tidak ada pengurangan dari hujan, vegetasi, atau cahaya.',
            worst: (f, p) => `Ciri terlemah: ${f} (${p}% mirip).`,
            ice: a => `Salju atau es menutupi sebagian besar area 50 km di sekitarnya (memantulkan ${a}% sinar Matahari), jadi tanah terbuka mungkin jarang.`,
            regional: 'Suhu, hujan, dan angin mewakili wilayah selebar kira-kira 50 km, bukan titik ini persis.',
            sunTitle: 'Tanggal terbaik',
            sunText: (p, w) => `Sekitar ${w} Matahari berada dalam 5 derajat dari cakrawala selama ${p}% waktu. Itulah jendela untuk uji dengan bayangan panjang.`,
            terrainTitle: 'Medan nyata dalam 3D',
            terrainCap: (ve, src) => `Petak 0,9 km dari elevasi ${src}, tinggi diperbesar ${ve} kali. Seret untuk memutar.`,
            terrainNone: 'Tidak ada grid elevasi untuk tempat ini (data elevasi berakhir di lintang 83 derajat).',
            terrainCell: 'Sel pindai hanya menyimpan kemiringan khas dan ketinggian. Pilih salah satu lokasi yang dikaji untuk melihat medannya.',
            valuesTitle: 'Terukur di sini',
            rows: {
                t_mean_K: 'Suhu permukaan, rata-rata tahunan', t_day_K: 'Rata-rata maksimum bulanan', t_night_K: 'Rata-rata minimum bulanan',
                precip_mm_yr: 'Hujan dan salju per tahun', u_star_mean: 'Tegangan angin di permukaan (u*)', albedo: 'Sinar Matahari yang dipantulkan',
                slope_med_deg: 'Kemiringan khas pada 100 m', elev_m: 'Ketinggian', ndvi: 'Indeks vegetasi (NDVI)'
            },
            src: { power: 'NASA POWER (MERRA-2, CERES)', dem: 'SRTM / ASTER GDEM', modis: 'MODIS' },
            role: 'Peran terdokumentasi',
            dominant: 'dominan',
            valTitle: 'Apakah metodenya terbukti?',
            valIntro: n => `Metode seperti ini harus menempatkan analog yang sudah dipakai NASA di papan atas, untuk tugas yang membuatnya terkenal, dan harus menolak hutan hujan. Setiap analog terkenal dibandingkan dengan ${n} sel daratan di seluruh dunia, hanya dengan data terukur.`,
            valCols: ['Analog terkenal', 'Dikenal untuk', 'Skor terukur', 'Mengungguli sekian persen Bumi', 'Bukti', 'Hasil'],
            valPass: 'Masuk 5% teratas', valFail: 'Tidak masuk 5% teratas', valNA: 'Belum bisa diuji',
            valSummary: (p, n, na) => `${p} dari ${n} peran yang bisa diuji mencapai 5% teratas. ${na} belum bisa diuji sampai data mineral, ukuran butir, dan es ditambahkan.`,
            valNeg: ok => ok ? 'Ketiga kontrol hutan hujan mendapat skor di bawah 5 untuk semua target dan uji, sebagaimana seharusnya.' : 'Ada kontrol hutan hujan yang mendapat skor 5 atau lebih. Metode gagal pada uji ini.',
            valHonest: 'Mengapa sebagian analog terkenal gagal saat ini: curah hujan dibaca dari sel iklim 50 km, yang merugikan lokasi di wilayah basah seperti Islandia dan Mauna Kea, dan semua nilai target Bulan dan Mars selain geometri Matahari masih ilustratif. Masuk 5% teratas dengan skor mendekati nol hanya berarti bagian Bumi lainnya mendapat skor lebih rendah lagi.',
            methTitle: 'Data dan metode',
            methFormula: 'skor kecocokan = kemiripan ciri (berbobot, geometrik) × kebersihan lokasi',
            methText: [
                'Analog adalah tiga serangkai: lokasi di Bumi, lokasi di Bulan atau Mars, dan sebuah uji. Tempat yang tepat untuk navigasi bisa keliru untuk pengeboran.',
                'Setiap ciri dibandingkan dengan kurva lonceng: nilai penuh pada nilai target, lalu memudar ketika selisih melewati toleransi.',
                'Batas Bumi mengalikan skor dengan faktor dari gravitasi, tekanan udara, dan radiasi, yang hanya bergantung pada uji dan target.'],
            methCols: ['Ciri', 'Status', 'Sumber'],
            methSources: 'Sumber',
            methLimit: 'Batasan yang perlu disebut saat presentasi',
            methLimits: [
                'Nilai target Bulan dan Mars masih ilustratif, kecuali jendela Matahari rendah yang dihitung dari geometri orbit.',
                'Pindai global adalah sampel kasar sel daratan: penyaringan awal, bukan survei.',
                'Jendela Matahari rendah mengabaikan gunung di cakrawala dan pembiasan atmosfer.'],
            planned: 'rencana', close: 'Tutup', generated: 'Skor dibuat'
        }
    };

    // Wording reflects the audited evidence rules. A score is a screening index.
    Object.assign(STR.en, {
        modeReal: 'Supported comparisons', modeAll: 'Illustrative preview', measured: 'supported',
        hEvidence: 'Evidence for the selected place', hDiscover: 'Candidates in the sampled land cells',
        scanHint: n => `${n} evenly spaced land samples. Only compatible NASA terrain and modeled Sun geometry enter comparisons. Rainfall is a regional screening penalty. This is not a complete survey.`,
        evidenceReal: (p,have,miss) => `${p}% of the full task weight has comparable Earth and target inputs${have ? `: ${have}` : ''}. Solar illumination is modeled. Missing inputs are excluded, never treated as zero.`,
        evidenceShare: p => `${p}% of the full task weight is supported on both worlds`,
        evidenceNone: 'No supported Earth-target comparison is available for this task. An illustrative preview is available.',
        evidenceAll: () => 'Preview includes hand-entered assumptions. It is not an observed result. Each feature identifies the Earth and target evidence separately.',
        ansNone: 'Insufficient comparable evidence for this task. Inspect the missing features or choose another task.',
        ansHard: 'The available features match poorly in this sample. This does not establish that no Earth analog exists.',
        ansSite: (n,f) => `Leading comparable reference: ${n}, screening index ${f}/100.`,
        ansCell: (n,c,f) => `Candidate outside the known-site buffers: ${n} (${c}), ${f}/100. Field verification is required.`,
        likely: (a,b) => `Sensitivity interval ${a}-${b}: weights, tolerances and penalty anchors varied. Not a statistical confidence interval`,
        limitTitle: 'Physical differences that remain',
        limitNone: 'Gravity, atmosphere and radiation still differ. This task has no active heuristic penalty; that does not imply a perfect rehearsal.',
        limitText: () => 'Earth cannot reproduce the target gravity, atmosphere or radiation. These differences are not converted into a calibrated accuracy cap.',
        clean: 'No penalty from the available inputs. Missing vegetation or night-light data do not establish that the site is clean.',
        ice: a => `Regional albedo is ${a}%. Brightness can indicate snow, ice, sand or clouds; it is not a measured ice-cover fraction.`,
        skipIce: 'Hide very bright cells (albedo >= 0.5; proxy)',
        regional: 'POWER meteorology represents a 0.5 degrees latitude by 0.625 degrees longitude reanalysis cell, with area varying by latitude. Albedo has a coarser footprint. This is not a point measurement.',
        valIntro: n => `Exploratory diagnostic against ${n} sampled cells. A role is testable only with at least 50% task coverage, matching feature and rainfall evidence, and at least 30 comparison cells. Passing also requires a score of at least 50 and a midrank percentile of at least 95. These are heuristic thresholds.`,
        valSummary: (p,n,na) => `${p}/${n} testable roles pass this diagnostic; ${na} roles have insufficient comparable evidence.`,
        valNeg: () => 'Rainforest checks are reported per test: missing scores are NOT TESTABLE. A low score induced by the rainfall penalty is a sanity check, not independent scientific validation.',
        valHonest: 'Targets are explicit 1 km reference patches from NASA PDS LOLA/MOLA, sampled at a common 500 m baseline. These do not resolve cave interiors, rocks or landing hazards. Weights, tolerances and rainfall penalties remain assumptions. Low-coverage scores cannot validate an entire operational role.',
        methLimits: ['Only 500 m slope is currently supported by observed Earth and planetary terrain. Low Sun is an idealized model; all other target features remain unverified or illustrative.', 'The 585-point scan is coarse. A candidate outside 100 km buffers is not evidence of a previously unknown analog.', 'Geometry ignores terrain horizons, refraction, orbital eccentricity and lunar libration. Calendar dates are approximate for 2027; no shadow-persistence claim is made.'],
        methText: ['Select an Earth site, a target reference patch and a task. Scores compare only compatible features supported on both worlds.', 'Similarities use assumed Gaussian tolerances and a weighted geometric mean. Coverage always uses the full task weight, including missing features.', 'Rainfall penalties, task weights and tolerances are heuristic. The score is neither mission readiness nor a probability of success. NASA imagery is for context, not an input to the numerical score.'],
        faded: 'Faded: bright proxy cell or unavailable comparison',
        dataStatus: 'Exploratory screening | observed terrain + modeled illumination | inspect coverage before comparing scores'
    });
    Object.assign(STR.id, {
        modeReal: 'Perbandingan berbukti', modeAll: 'Pratinjau ilustratif', measured: 'didukung',
        hEvidence: 'Bukti untuk lokasi terpilih', hDiscover: 'Kandidat dari sampel daratan',
        scanHint: n => `${n} sampel daratan yang tersebar merata. Hanya medan NASA yang setara dan model geometri Matahari yang dibandingkan. Hujan menjadi penalti regional. Ini bukan survei menyeluruh.`,
        evidenceReal: (p,have,miss) => `${p}% dari seluruh bobot uji memiliki masukan Bumi dan target yang setara${have ? `: ${have}` : ''}. Iluminasi adalah hasil model. Data yang belum tersedia dikeluarkan, bukan dianggap nol.`,
        evidenceShare: p => `${p}% seluruh bobot uji didukung masukan dari kedua dunia`,
        evidenceNone: 'Belum ada perbandingan Bumi-target yang didukung untuk uji ini. Tersedia pratinjau ilustratif.',
        evidenceAll: () => 'Pratinjau menyertakan asumsi yang diisi manual. Ini bukan hasil pengamatan. Bukti Bumi dan target diberi label terpisah untuk setiap ciri.',
        ansNone: 'Bukti yang setara belum cukup untuk uji ini. Lihat ciri yang masih kosong atau pilih uji lain.',
        ansHard: 'Ciri yang tersedia kurang cocok pada sampel ini. Ini belum membuktikan bahwa tidak ada analog di Bumi.',
        ansSite: (n,f) => `Referensi terdepan dengan bukti setara: ${n}, indeks penyaringan ${f}/100.`,
        ansCell: (n,c,f) => `Kandidat di luar penyangga analog terkenal: ${n} (${c}), ${f}/100. Masih perlu verifikasi lapangan.`,
        likely: (a,b) => `Rentang sensitivitas ${a}-${b}: bobot, toleransi, dan ambang penalti divariasikan. Bukan interval kepercayaan statistik`,
        limitTitle: 'Perbedaan fisika yang tetap ada',
        limitNone: 'Gravitasi, atmosfer, dan radiasi tetap berbeda. Tidak ada penalti heuristik aktif untuk uji ini; itu tidak berarti latihan sempurna.',
        limitText: () => 'Bumi tidak mereproduksi gravitasi, atmosfer, atau radiasi target. Perbedaan ini tidak dikonversi menjadi batas akurasi yang terkalibrasi.',
        clean: 'Tidak ada penalti dari masukan yang tersedia. Data vegetasi atau cahaya malam yang kosong bukan bukti bahwa lokasi bersih.',
        ice: a => `Albedo regional ${a}%. Kecerahan dapat berasal dari salju, es, pasir, atau awan; ini bukan pengukuran persentase tutupan es.`,
        skipIce: 'Sembunyikan sel sangat cerah (albedo >= 0,5; proksi)',
        regional: 'Meteorologi POWER mewakili sel reanalisis 0,5 derajat lintang dan 0,625 derajat bujur, dengan luas bergantung lintang. Albedo lebih kasar. Ini bukan pengukuran tepat di titik ini.',
        valIntro: n => `Diagnostik eksploratif terhadap ${n} sel sampel. Peran hanya diuji bila setidaknya 50% bobotnya tersedia, ciri dan bukti hujannya sama, serta ada setidaknya 30 sel pembanding. Lolos juga memerlukan skor minimal 50 dan persentil peringkat tengah minimal 95. Ambang ini heuristik.`,
        valSummary: (p,n,na) => `${p}/${n} peran yang bisa diuji lolos diagnostik; ${na} peran belum memiliki bukti setara yang cukup.`,
        valNeg: () => 'Kontrol hutan hujan dilaporkan per uji: skor kosong berarti BELUM BISA DIUJI. Skor rendah akibat penalti hujan adalah pemeriksaan kewajaran, bukan validasi ilmiah independen.',
        valHonest: 'Target adalah petak referensi 1 km dari LOLA/MOLA NASA PDS, dibandingkan pada baseline 500 m. Petak ini tidak merinci gua, bongkah, atau bahaya pendaratan. Bobot, toleransi, dan penalti hujan tetap asumsi. Skor dengan cakupan rendah tidak memvalidasi seluruh peran operasional.',
        methLimits: ['Saat ini hanya kemiringan 500 m yang didukung pengamatan medan Bumi dan planet. Matahari rendah adalah model ideal; ciri target lainnya masih belum terverifikasi atau ilustratif.', 'Pindai 585 titik bersifat kasar. Kandidat di luar penyangga 100 km bukan bukti penemuan analog baru.', 'Geometri mengabaikan cakrawala medan, refraksi, eksentrisitas orbit, dan librasi Bulan. Tanggal tahun 2027 adalah perkiraan; model tidak mengukur bayangan permanen.'],
        methText: ['Pilih lokasi Bumi, petak referensi target, dan jenis uji. Skor hanya membandingkan ciri setara yang didukung pada kedua dunia.', 'Kemiripan memakai toleransi Gaussian asumsi dan rata-rata geometrik berbobot. Cakupan memakai seluruh bobot uji, termasuk ciri yang kosong.', 'Penalti hujan, bobot, dan toleransi bersifat heuristik. Skor bukan kesiapan misi atau peluang keberhasilan. Citra NASA hanya konteks visual, bukan masukan skor.'],
        faded: 'Pudar: sel sangat cerah menurut proksi atau belum ada perbandingan',
        dataStatus: 'Penyaringan eksploratif | pengamatan medan + model iluminasi | periksa cakupan sebelum membandingkan skor'
    });
    STR.en.rankHint = 'Ranked by comparable evidence coverage, then score. Scores based on different features are not equivalent.';
    STR.id.rankHint = 'Urutan: cakupan bukti setara dahulu, lalu skor. Angka yang memakai ciri berbeda tidak setara.';
    STR.en.role = 'Reference role (curated)';
    STR.id.role = 'Peran rujukan (kurasi)';
    Object.assign(STR.en, {btnMethod:'Method',btnValidation:'Validation',hAnswer:'Comparison summary',hEvidence:'Evidence coverage',hWeights:'Test priorities',hCurated:'Reference locations',hDiscover:'Global sample candidates',legendTitle:'Similarity index'});
    Object.assign(STR.id, {btnMethod:'Metode',btnValidation:'Validasi',hAnswer:'Ringkasan perbandingan',hEvidence:'Cakupan bukti',hWeights:'Prioritas uji',hCurated:'Lokasi rujukan',hDiscover:'Kandidat sampel global',legendTitle:'Indeks kecocokan'});
    STR.en.rows.slope_500m_deg = 'Typical slope at 500 m baseline';
    STR.id.rows.slope_500m_deg = 'Kemiringan pada baseline 500 m';
    STR.en.rows.t_day_K = 'Annual climatology maximum (not daytime mean)';
    STR.en.rows.t_night_K = 'Annual climatology minimum (not nighttime mean)';
    STR.id.rows.t_day_K = 'Maksimum klimatologi tahunan (bukan rerata siang)';
    STR.id.rows.t_night_K = 'Minimum klimatologi tahunan (bukan rerata malam)';
    STR.en.rows.u_star_mean = 'Modeled friction velocity';
    STR.id.rows.u_star_mean = 'Kecepatan gesek hasil model';

    // code: [name, what it means] and the planned source for features that are still illustrative
    const FEATURE = {
        en: {
            S: ['Slope at 500 m', 'median of four slopes on a 1 km reference patch'], R: ['Roughness', 'how bumpy the ground is over 100 m'],
            B: ['Rockiness seen by radar', 'how many blocks and boulders radar detects'], M: ['Minerals', 'what the surface is made of'],
            G: ['Soil grain size', 'how fine the loose material is'], I: ['Ground ice', 'chance of ice in the ground'],
            L: ['Low Sun', 'share of the best 10 days with the Sun grazing the horizon'],
            T: ['Surface temperature', 'yearly mean ground temperature'], D: ['Dust lifting', 'how often wind is strong enough to raise dust']
        },
        id: {
            S: ['Kemiringan 500 m', 'median empat lereng pada petak referensi 1 km'], R: ['Kekasaran', 'seberapa bergelombang tanah pada jarak 100 m'],
            B: ['Kebatuan menurut radar', 'seberapa banyak bongkah batu yang terdeteksi radar'], M: ['Mineral', 'bahan penyusun permukaan'],
            G: ['Ukuran butir tanah', 'seberapa halus material lepasnya'], I: ['Es tanah', 'peluang adanya es di dalam tanah'],
            L: ['Matahari rendah', 'porsi 10 hari terbaik saat Matahari menyisir cakrawala'],
            T: ['Suhu permukaan', 'suhu tanah rata-rata tahunan'], D: ['Debu terangkat', 'seberapa sering angin cukup kuat mengangkat debu']
        }
    };
    const PLANNED = { S: 'SRTM / ASTER GDEM', R: 'NASADEM, Copernicus GLO-30', B: 'RCM, Sentinel-1', M: 'EMIT L2B', G: 'SoilGrids 2.0', I: 'ESA CCI Permafrost', L: 'orbital geometry', T: 'NASA POWER (MERRA-2)', D: 'MERRA-2 wind + SoilGrids' };
    const TASK = {
        en: {
            'Landing: hazard detection': ['landing hazard detection', 'Sensors must spot slopes, rocks and shadows before touchdown.'],
            'Landing: plume and touchdown': ['rocket plume and touchdown', 'The engine blast throws soil around, which depends on grain size, gravity and vacuum.'],
            'Navigation': ['navigation', 'Cameras and lidar must find the way under the same light and over the same shapes.'],
            'Mobility': ['rover driving', 'Wheels meet slope, bumps and loose soil.'],
            'Robotics': ['robotic arm work', 'Arms and tools handle rock and soil in the local heat and cold.'],
            'Construction': ['construction', 'Building with local soil depends on its grains, minerals and ice.'],
            'ISRU': ['using local resources (ISRU)', 'Extracting water and oxygen depends on minerals and ice.'],
            'Thermal/hardware endurance': ['hardware endurance in heat and cold', 'Equipment must survive the temperature swings.'],
            'Human ops: procedures': ['astronaut field procedures', 'Crews rehearse sampling, planning and teamwork on similar ground.'],
            'Human ops: suit/physiology': ['spacesuit and body tests', 'Walking and working in a suit on similar slopes and temperatures.']
        },
        id: {
            'Landing: hazard detection': ['deteksi bahaya saat mendarat', 'Sensor harus mengenali lereng, batu, dan bayangan sebelum mendarat.'],
            'Landing: plume and touchdown': ['semburan roket dan pendaratan', 'Semburan mesin menghamburkan tanah, yang bergantung pada ukuran butir, gravitasi, dan vakum.'],
            'Navigation': ['navigasi', 'Kamera dan lidar harus menemukan jalan di bawah cahaya dan bentuk medan yang sama.'],
            'Mobility': ['mengemudi rover', 'Roda berhadapan dengan lereng, gundukan, dan tanah lepas.'],
            'Robotics': ['kerja lengan robot', 'Lengan dan alat menangani batu dan tanah pada suhu setempat.'],
            'Construction': ['konstruksi', 'Membangun dengan tanah setempat bergantung pada butir, mineral, dan esnya.'],
            'ISRU': ['memanfaatkan sumber daya setempat (ISRU)', 'Mengambil air dan oksigen bergantung pada mineral dan es.'],
            'Thermal/hardware endurance': ['ketahanan alat terhadap panas dan dingin', 'Peralatan harus bertahan menghadapi perubahan suhu.'],
            'Human ops: procedures': ['prosedur lapangan astronaut', 'Kru berlatih pengambilan sampel, perencanaan, dan kerja tim di medan serupa.'],
            'Human ops: suit/physiology': ['uji baju antariksa dan tubuh', 'Berjalan dan bekerja memakai baju antariksa pada lereng dan suhu serupa.']
        }
    };
    const TARGET = {
        en: { T1: 'the lunar south pole reference patch', T2: 'surface terrain near the Mare Tranquillitatis pit', T3: 'the Arcadia Planitia reference patch on Mars' },
        id: { T1: 'petak referensi kutub selatan Bulan', T2: 'medan permukaan di sekitar pit Mare Tranquillitatis', T3: 'petak referensi Arcadia Planitia di Mars' }
    };
    const BODY = { en: { Moon: 'the Moon', Mars: 'Mars' }, id: { Moon: 'Bulan', Mars: 'Mars' } };
    const MINERAL = ['plagioclase', 'low-Ca pyroxene', 'high-Ca pyroxene', 'olivine', 'iron oxides', 'sulfates', 'clays', 'carbonates', 'chlorides', 'hydrated silica', 'ice'];
    // Rough region names so a scan cell reads as a place, not a coordinate. First match wins.
    const REGIONS = [
        ['Antarctica', 'Antarktika', -90, -60, -180, 180], ['Greenland', 'Greenland', 59, 84, -74, -10], ['Iceland', 'Islandia', 63, 67, -25, -13],
        ['Alaska', 'Alaska', 54, 72, -170, -141], ['Arctic Canada', 'Arktik Kanada', 60, 84, -141, -60], ['Canada', 'Kanada', 48, 60, -141, -52],
        ['Western North America', 'Amerika Utara bagian barat', 30, 50, -125, -100], ['Eastern North America', 'Amerika Utara bagian timur', 25, 50, -100, -52],
        ['Mexico and Central America', 'Meksiko dan Amerika Tengah', 7, 30, -118, -77], ['Central Andes and Atacama', 'Andes Tengah dan Atacama', -30, -14, -73, -65],
        ['Patagonia', 'Patagonia', -56, -38, -76, -62], ['Amazon basin', 'Cekungan Amazon', -14, 8, -80, -45], ['South America', 'Amerika Selatan', -56, 13, -82, -34],
        ['Scandinavia', 'Skandinavia', 55, 72, 4, 32], ['Europe', 'Eropa', 36, 72, -11, 32], ['European Russia', 'Rusia Eropa', 44, 72, 32, 60],
        ['Tibetan Plateau', 'Dataran Tinggi Tibet', 28, 38, 78, 103], ['Mongolia and the Gobi', 'Mongolia dan Gobi', 38, 50, 90, 120],
        ['Siberia', 'Siberia', 50, 78, 60, 180], ['Central Asia', 'Asia Tengah', 35, 50, 46, 90], ['Arabian Peninsula', 'Jazirah Arab', 12, 33, 34, 60],
        ['Iran and the Middle East', 'Iran dan Timur Tengah', 25, 42, 34, 63], ['South Asia', 'Asia Selatan', 5, 35, 60, 97], ['East Asia', 'Asia Timur', 20, 50, 97, 146],
        ['Southeast Asia', 'Asia Tenggara', -11, 25, 92, 160], ['Sahara', 'Sahara', 15, 37, -18, 36], ['East Africa', 'Afrika Timur', -12, 15, 28, 52],
        ['West and Central Africa', 'Afrika Barat dan Tengah', -12, 15, -18, 30], ['Madagascar', 'Madagaskar', -26, -12, 43, 51],
        ['Southern Africa', 'Afrika bagian selatan', -36, -12, 10, 41], ['Australia', 'Australia', -45, -10, 112, 155]
    ];

    // ============================================================
    // 2. STATE
    // ============================================================
    const hash = new URLSearchParams(location.hash.slice(1));
    const state = {
        lang: STR[hash.get('lang')] ? hash.get('lang') : (window.AnalogFitPrefs?.get('language') || 'id'),
        target: D.targets[hash.get('t')] ? hash.get('t') : 'T1',
        task: D.tasks[hash.get('k')] ? hash.get('k') : 'Navigation',
        mode: hash.get('m') === 'all' ? 'all' : 'real',
        view: ['2d','3d'].includes(hash.get('v')) ? hash.get('v') : (window.AnalogFitPrefs?.get('defaultView') || '2d'),
        sel: hash.get('s') || null,
        weights: null,
        skipIce: true
    };
    const t = () => STR[state.lang];
    const fname = k => FEATURE[state.lang][k][0];
    const pct = x => Math.round(x * 100);
    const coord = (lat, lon) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

    function regionName(lat, lon) {
        const r = REGIONS.find(r => lat >= r[2] && lat <= r[3] && lon >= r[4] && lon <= r[5]);
        return r ? r[state.lang === 'id' ? 1 : 0] : coord(lat, lon);
    }

    // ============================================================
    // 3. PLACES: the 14 examined sites and the global scan cells, in one shape
    // ============================================================
    const places = D.sites.map(s => ({
        kind: 'site', id: s.id, name: s.name, type: s.type, lat: s.lat, lon: s.lon, sims: s.sims,
        real: new Set(s.realFeatures), realCols: new Set(s.realCols), cAll: s.cAll, cReal: s.cReal, v: s.values, raw: s
    }));
    const bg = D.background;
    for (let i = 0; i < (bg.n || 0); i++) {
        const sims = {};
        for (const tid in bg.sims) {
            sims[tid] = {};
            for (const k in bg.sims[tid]) if (bg.sims[tid][k][i] != null) sims[tid][k] = bg.sims[tid][k][i];
        }
        places.push({
            kind: 'cell', id: 'BG' + i, type: 'cell', lat: bg.lat[i], lon: bg.lon[i], sims,
            real: new Set(bg.realFeatures[i]),
            realCols: new Set(bg.realCols[i]), cAll: bg.cAll[i], cReal: bg.cReal[i],
            v: { slope_500m_deg: bg.slope[i], t_mean_K: bg.tK[i], precip_mm_yr: bg.precip[i], albedo: bg.albedo[i], elev_m: bg.elev[i], sun_grazing_frac_10d: bg.sun[i] },
            raw: { sunWindow: bg.sunWindow[i], dem: bg.dem?.[i] || null, demSpacing:500, demSource:bg.terrainDataset?.[i], roles: [], terrainDataset:bg.terrainDataset?.[i] }
        });
    }
    const byId = Object.fromEntries(places.map(p => [p.id, p]));
    const placeName = p => p.kind === 'site' ? p.name : regionName(p.lat, p.lon);
    const isIcy = p => p.v.albedo != null && p.v.albedo >= 0.5;
    const knownSites = places.filter(p => p.type === 'known');
    function km(a, b) {
        const r = Math.PI / 180, dlat = (b.lat - a.lat) * r, dlon = (b.lon - a.lon) * r;
        const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
        return 12742 * Math.asin(Math.sqrt(h));
    }

    // ============================================================
    // 4. SCORING (must match fidelity() in analogfit.py)
    // ============================================================
    const weightsNow = () => state.weights || D.tasks[state.task].weights;
    const supported = (p,k,target=state.target) => p.real.has(k) && D.targets[target].supportedFeatures.includes(k);

    function score(p, mode = state.mode, target = state.target, weights = weightsNow()) {
        const sims = p.sims[target] || {};
        const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
        let cov = 0, covReal = 0, acc = 0;
        for (const k in sims) {
            const w = weights[k] || 0;
            if (w <= 0) continue;
            if (supported(p,k,target)) covReal += w;
            if (mode === 'real' && !supported(p,k,target)) continue;
            cov += w;
            acc += w * Math.log(Math.max(sims[k], 1e-12));
        }
        const contam = mode === 'real' ? p.cReal : p.cAll;
        return { F: cov > 0 ? Math.exp(acc / cov) * (1 - contam) : null, cov: cov / total, covReal: covReal / total, contam };
    }

    // Contamination split into its parts, for the explanation (same ramps as analogfit.py).
    function contaminationParts(p, mode) {
        const ramp = (v, lo, hi, log) => {
            if (v == null) return 0;
            if (log) { v = Math.log(Math.max(v, 1e-9)); lo = Math.log(lo); hi = Math.log(hi); }
            return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
        };
        const a = D.anchors, use = c => mode === 'all' ? p.kind === 'site' : p.realCols.has(c);
        return {
            rain: use('precip_mm_yr') ? ramp(p.v.precip_mm_yr, a.precipitation_mm_yr.bare, a.precipitation_mm_yr.saturated, true) : 0,
            veg: use('ndvi') ? ramp(p.v.ndvi, a.ndvi.bare, a.ndvi.saturated) : 0,
            lights: use('nightlight_pct') ? ramp(p.v.nightlight_pct, a.nightlights_percentile.bare, a.nightlights_percentile.saturated) : 0
        };
    }

    // Viridis: readable for colour-blind viewers and in greyscale.
    const VIRIDIS = [[68, 1, 84], [65, 68, 135], [42, 120, 142], [34, 168, 132], [122, 209, 81], [253, 231, 37]];
    function color(F) {
        if (F == null) return '#8a94a1';
        const x = Math.min(0.9999, Math.max(0, F)) * 5, i = Math.floor(x), f = x - i;
        const c = VIRIDIS[i].map((a, j) => Math.round(a + (VIRIDIS[i + 1][j] - a) * f));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
    const verdict = F => F == null ? t().noScore : t().verdicts[Math.min(4, Math.floor(F * 5))];
    const show = F => F == null ? '\u2013' : F > 0 && F < .001 ? '<0.1' : F > 0 && F < .01 ? (F * 100).toFixed(1) : String(Math.round(F * 100));

    // ============================================================
    // 5. MAP (Leaflet + NASA GIBS)
    // ============================================================
    const map = L.map('map', { worldCopyJump: true, preferCanvas: true, zoomControl: false, minZoom: 1 }).setView([15, 10], 2);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    // Layer ids, tile matrix sets and dates checked against the GIBS WMTS capabilities on 15 Nov 2026.
    const gibs = (layer, level, ext, time, opts) => L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${time ? time + '/' : ''}GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`,
        Object.assign({ attribution: 'NASA EOSDIS GIBS', maxNativeZoom: level, maxZoom: 16 }, opts || {}));
    const bases = [
        ['NASA Blue Marble', gibs('BlueMarble_ShadedRelief_Bathymetry', 8, 'jpeg')],
        ['NASA MODIS true colour, 10 Nov 2026', gibs('MODIS_Terra_CorrectedReflectance_TrueColor', 9, 'jpeg', '2026-11-10')],
        ['NASA/METI ASTER elevation relief', gibs('ASTER_GDEM_Color_Shaded_Relief', 12, 'jpeg')],
        ['Esri satellite detail (not NASA)', L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri World Imagery', maxZoom: 16 })]
    ];
    const overlays = [
        ['MODIS vegetation (NDVI), Jul 2026', gibs('MODIS_Terra_L3_NDVI_Monthly', 7, 'png', '2026-07-01', { opacity: 0.7 })],
        ['MODIS daytime land temperature, Jul 2026', gibs('MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day', 6, 'png', '2026-07-01', { opacity: 0.7 })],
        ['VIIRS Black Marble night lights', gibs('VIIRS_Black_Marble', 8, 'png', '2016-01-01', { opacity: 0.7 })]
    ];
    // Keep the offline land fallback underneath NASA tiles, not over their land imagery.
    map.createPane('offlineLand');
    map.getPane('offlineLand').style.zIndex = 150;
    map.getPane('offlineLand').style.pointerEvents = 'none';
    L.geoJSON(window.LAND_110M || [], { pane:'offlineLand', interactive:false, style:{color:'#72849e',weight:.7,fillColor:'#1d2c40',fillOpacity:1} }).addTo(map);
    bases[0][1].on('tileerror', () => { $('mapStatus').textContent = state.lang==='id' ? 'Citra daring belum termuat. Garis daratan dan skor tetap tersedia.' : 'Online imagery unavailable. Land outlines and scores remain available.'; });
    bases[0][1].on('tileload', () => { $('mapStatus').textContent = 'NASA GIBS | Blue Marble'; });
    bases[0][1].addTo(map);
    bases.forEach(([name, layer], i) => {
        const lab = el('label', {}, `<input type="radio" name="base" ${i === 0 ? 'checked' : ''}> ${esc(name)}`);
        lab.firstChild.onchange = () => { bases.forEach(b => map.removeLayer(b[1])); layer.addTo(map); layer.bringToBack(); };
        $('layerList').appendChild(lab);
    });
    overlays.forEach(([name, layer]) => {
        const lab = el('label', {}, `<input type="checkbox"> ${esc(name)}`);
        lab.firstChild.onchange = e => e.target.checked ? layer.addTo(map) : map.removeLayer(layer);
        $('layerList').appendChild(lab);
    });

    const SHAPE = {
        known: c => `<circle cx="12" cy="12" r="8.5" fill="${c}" stroke="#fff" stroke-width="2"/>`,
        hypothesis: c => `<rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="${c}" stroke="#fff" stroke-width="2"/>`,
        negative: c => `<rect x="4.5" y="4.5" width="15" height="15" fill="${c}" stroke="#fff" stroke-width="2"/>`
    };
    const svgIcon = (type, c, size = 24) => `<svg class="site-marker" width="${size}" height="${size}" viewBox="0 0 24 24">${SHAPE[type](c)}</svg>`;
    const cellLayer = L.layerGroup().addTo(map), siteLayer = L.layerGroup().addTo(map);
    const selRing = L.circleMarker([0, 0], { radius: 17, color: '#4da3ff', weight: 3, fill: false, interactive: false });
    places.forEach(p => {
        if (p.kind === 'cell') {
            p.marker = L.circleMarker([p.lat, p.lon], { radius: 4.5, weight: 0.6, color: '#fff', fillOpacity: 0.95 }).addTo(cellLayer);
        } else {
            p.marker = L.marker([p.lat, p.lon], { icon: L.divIcon({ className: '', html: '', iconSize: [24, 24], iconAnchor: [12, 12] }), keyboard: true }).addTo(siteLayer);
        }
        p.marker.on('click', () => select(p.id));
        p.marker.bindTooltip('', { direction: 'top', offset: [0, -8] });
    });

    function paintMap() {
        places.forEach(p => {
            const s = score(p), c = color(s.F), tip = `<b>${esc(placeName(p))}</b><br>${verdict(s.F)}${s.F == null ? '' : ': ' + show(s.F)}`;
            if (p.kind === 'cell') {
                const dim = (state.skipIce && isIcy(p)) || s.F == null;
                p.marker.setStyle({ fillColor: c, fillOpacity: dim ? 0.18 : 0.95, opacity: dim ? 0.35 : 1 });
            } else {
                p.marker.setIcon(L.divIcon({ className: '', html: svgIcon(p.type, c), iconSize: [24, 24], iconAnchor: [12, 12] }));
            }
            p.marker.setTooltipContent(tip);
        });
        const p = byId[state.sel];
        if (p) selRing.setLatLng([p.lat, p.lon]).addTo(map); else map.removeLayer(selRing);
    }

    // ============================================================
    // 6. 3D GLOBE (loaded on first use)
    // ============================================================
    let globe = null, globeLoading = null;
    const loadScript = src => new Promise((ok, fail) => {
        const s = el('script', { src });
        s.onload = ok; s.onerror = () => fail(new Error('Could not load ' + src));
        document.head.appendChild(s);
    });
    const BLUE_MARBLE = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0' +
        '&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=4096&HEIGHT=2048&FORMAT=image/jpeg';

    function initGlobe() {
        globeLoading = globeLoading || Promise.all([loadScript('vendor/globe.gl.min.js'), loadScript('vendor/nasa_texture.js')]).then(() => {
            const box = $('globe');
            globe = new Globe(box, { animateIn: false })
                .backgroundColor('#0b0f17').showAtmosphere(true).atmosphereColor('#9cc4ff').atmosphereAltitude(0.16)
                .polygonsData(window.LAND_110M || []).polygonCapColor(() => '#34414f').polygonSideColor(() => 'rgba(0,0,0,0)')
                .polygonStrokeColor(() => '#8493a5').polygonAltitude(0.003)
                .pointLat('lat').pointLng('lon').pointRadius(d => d.kind === 'site' ? 0.85 : 0.5).pointsTransitionDuration(300)
                .pointAltitude(d => d._alt).pointColor(d => d._color).pointLabel(d => d._tip)
                .onPointClick(d => select(d.id))
                .htmlLat('lat').htmlLng('lon').htmlAltitude(d => d._alt + 0.01)
                .htmlElement(d => {
                    const tag = el('div', { class: 'globe-tag', role: 'button', tabindex: '0' }, `<i style="background:${d._color}"></i>${esc(placeName(d))}`);
                    tag.onclick = () => select(d.id);
                    tag.onkeydown = e => { if (e.key === 'Enter') select(d.id); };
                    return tag;
                })
                .ringLat('lat').ringLng('lon').ringColor(() => '#4da3ff').ringMaxRadius(5).ringPropagationSpeed(2).ringRepeatPeriod(900);
            globe.globeMaterial().color.set('#14273c');
            const fit = () => globe.width(box.clientWidth).height(box.clientHeight);
            new ResizeObserver(fit).observe(box);
            fit();
            const calm = window.AnalogFitPrefs?.get('motion') === false;
            globe.pointsTransitionDuration(calm ? 0 : 300);
            globe.controls().autoRotate = !calm && window.AnalogFitPrefs?.get('globeRotation') === true;
            globe.controls().autoRotateSpeed = 0.5;
            box.addEventListener('pointerdown', () => { globe.controls().autoRotate = false; }, { once: true });
            // NASA Blue Marble as the globe skin; the grey land outlines stay if the image cannot load.
            const img = new Image();
            if (!window.NASA_BLUE_MARBLE) img.crossOrigin = 'anonymous';
            img.onload = () => { globe.globeImageUrl(window.NASA_BLUE_MARBLE || BLUE_MARBLE).polygonsData([]); globe.globeMaterial().color.set('#ffffff'); };
            img.src = window.NASA_BLUE_MARBLE || BLUE_MARBLE;
            paintGlobe();
            const p = byId[state.sel];
            globe.pointOfView(p ? { lat: Math.max(-70, Math.min(70, p.lat)), lng: p.lon, altitude: 2.1 } : { lat: 15, lng: 20, altitude: 2.3 }, 0);
        });
        return globeLoading;
    }

    function paintGlobe() {
        if (!globe) return;
        places.forEach(p => {
            const s = score(p);
            p._alt = 0.006 + 0.14 * (s.F || 0);
            p._color = (p.kind === 'cell' && state.skipIce && isIcy(p)) ? 'rgba(138,148,161,0.35)' : color(s.F);
            p._tip = `<b>${esc(placeName(p))}</b><br>${verdict(s.F)}${s.F == null ? '' : ': ' + show(s.F)}`;
        });
        globe.pointsData(places.filter(p => p.kind === 'site' || score(p).F != null).slice())
            .htmlElementsData(places.filter(p => p.id === state.sel).slice())
            .ringsData(byId[state.sel] && window.AnalogFitPrefs.motionAllowed ? [byId[state.sel]] : []);
    }

    function setView(view) {
        state.view = view;
        $('map').style.display = view === '2d' ? 'block' : 'none';
        $('globe').style.display = view === '3d' ? 'block' : 'none';
        $('layers').style.display = view === '2d' ? '' : 'none';
        document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
        if (view === '3d') initGlobe().catch(() => { globe = null; $('answer').insertAdjacentHTML('beforeend', `<p class="hint">${esc(t().noWebgl)}</p>`); setView('2d'); });
        else map.invalidateSize();
        saveHash();
    }

    // ============================================================
    // 7. LEFT PANEL: evidence, weights, rankings
    // ============================================================
    function featureValue(k, v) {
        if (v == null) return null;
        switch (k) {
            case 'S': return v.toFixed(1) + '°';
            case 'R': return Math.exp(v).toFixed(1) + ' m';
            case 'B': return v.toFixed(2);
            case 'G': return Math.round(Math.exp(v)) + ' µm';
            case 'T': return `${Math.round(v)} K (${Math.round(v - 273.15)} °C)`;
            default: return pct(v) + '%';       // I, L, D are shares
        }
    }
    const COLUMN = { S: 'slope_500m_deg', R: 'ln_roughness_100m', B: 'radar_cpr', G: 'ln_d50_um', I: 'permafrost_prob', L: 'sun_grazing_frac_10d', T: 't_mean_K', D: 'f_ex' };
    const targetHas = k => k === 'M' || k in D.targets[state.target].values;
    const reference = () => byId[state.sel] || knownSites[0] || places[0];       // a site with the full set of measured features

    function renderEvidence() {
        const w = weightsNow(), ref = reference();
        const used = D.features.filter(k => (w[k] || 0) > 0 && targetHas(k));
        const have = used.filter(k => supported(ref,k)), miss = used.filter(k => !supported(ref,k));
        const total = Object.values(w).reduce((a,v) => a + Math.max(0,v),0) || 1;
        const share = have.reduce((a, k) => a + w[k], 0) / total;
        $('evidenceBar').style.width = pct(share) + '%';
        const names = list => list.map(k => fname(k).toLowerCase()).join(', ');
        let html;
        if (state.mode === 'all') html = esc(t().evidenceAll(names(miss) || '…'));
        else if (share === 0) html = `${esc(t().evidenceNone)} <button class="btn" id="previewBtn">${esc(t().previewBtn)}</button>`;
        else html = esc(t().evidenceReal(pct(share), names(have), names(miss)));
        if (state.weights) html += `<br>${esc(t().customWeights)}`;
        $('evidenceText').innerHTML = html;
        if ($('previewBtn')) $('previewBtn').onclick = () => setMode('all');
        document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === state.mode));
    }

    function renderWeights() {
        const w = weightsNow(), box = $('weights');
        box.innerHTML = '';
        $('taskHint').textContent = TASK[state.lang][state.task][1];
        D.features.forEach(k => {
            const row = el('div', { class: 'weight', title: FEATURE[state.lang][k][1] });
            const off = !targetHas(k);
            row.innerHTML = `<label for="w_${k}">${esc(fname(k))}</label>
                <input type="range" id="w_${k}" min="0" max="100" step="5" value="${Math.round((w[k] || 0) * 100)}" ${off ? 'disabled' : ''}>
                <output>${off ? '–' : Math.round((w[k] || 0) * 100)}</output>`;
            row.querySelector('input').oninput = e => {
                state.weights = Object.assign({}, weightsNow(), { [k]: e.target.value / 100 });
                row.querySelector('output').textContent = e.target.value;
                $('resetWeights').hidden = false;
                refresh(false);
            };
            box.appendChild(row);
        });
        $('resetWeights').hidden = !state.weights;
    }

    function rankRow(p, s) {
        const li = el('li');
        const sub = (p.kind === 'site' ? t()[p.type] : coord(p.lat, p.lon)) + ` | ${pct(s.covReal)}% ${state.lang === 'id' ? 'cakupan' : 'coverage'}`;
        li.innerHTML = `<button aria-current="${p.id === state.sel}">
            <span class="name">${esc(placeName(p))}<small>${esc(sub)}</small></span>
            <span class="num">${show(s.F)}</span>
            <span class="track"><i style="width:${s.F == null ? 0 : pct(s.F)}%;background:${color(s.F)}"></i></span></button>`;
        li.firstChild.onclick = () => select(p.id, true);
        return li;
    }

    function renderRankings() {
        const scored = places.map(p => [p, score(p)]);
        const order = (a, b) => (state.mode === 'real' && Math.abs(b[1].covReal-a[1].covReal)>1e-9 ? b[1].covReal-a[1].covReal : 0) || (b[1].F == null ? -1 : b[1].F) - (a[1].F == null ? -1 : a[1].F);
        const sites = $('rankSites'), cells = $('rankCells');
        sites.innerHTML = ''; cells.innerHTML = '';
        scored.filter(x => x[0].kind === 'site').sort(order).forEach(([p, s]) => sites.appendChild(rankRow(p, s)));
        $('scanHint').textContent = bg.n ? t().scanHint(bg.n) : t().scanNone;
        const maxCellCoverage = Math.max(0,...scored.filter(x=>x[0].kind==='cell').map(x=>x[1].covReal));
        const best = scored.filter(([p, s]) => s.covReal >= maxCellCoverage-1e-9 && p.kind === 'cell' && s.F != null && !(state.skipIce && isIcy(p))
            && knownSites.every(k => km(p, k) > D.maskKnownKm)).sort(order).slice(0, 8);
        best.forEach(([p, s]) => cells.appendChild(rankRow(p, s)));
        if (bg.n && !best.length) cells.appendChild(el('li', { class: 'hint' }, esc(t().noCells)));

        // The short answer: best examined site and best scan cell, in one or two sentences.
        const topSite = scored.filter(x => x[0].kind === 'site' && x[1].F != null).sort(order)[0], topCell = best[0];
        const lines = [];
        if (topSite) lines.push(t().ansSite(placeName(topSite[0]), show(topSite[1].F), verdict(topSite[1].F).toLowerCase()));
        if (topCell && topCell[1].F >= 0.01) lines.push(t().ansCell(placeName(topCell[0]), coord(topCell[0].lat, topCell[0].lon), show(topCell[1].F)));
        if (!lines.length) lines.push(t().ansNone);
        if (state.mode==='all') lines.push(state.lang==='id' ? 'Pratinjau ilustratif: jangan laporkan angka ini sebagai pengamatan.' : 'Illustrative preview: do not report these numbers as observations.');
        else if (Math.max(topSite ? topSite[1].F : 0, topCell ? topCell[1].F : 0) < 0.4) lines.push(t().ansHard);
        $('answer').innerHTML = lines.map(x => `<p>${esc(x)}</p>`).join('');
        return topSite ? topSite[0].id : null;
    }

    // ============================================================
    // 8. RIGHT PANEL: one place explained
    // ============================================================
    function renderDetail() {
        const box = $('detail'), p = byId[state.sel], T = t();
        if (!p) {
            box.innerHTML = `<h2>${esc(T.pick)}</h2><p>${esc(T.pickText)}</p><h2>${esc(T.howTitle)}</h2>
                <ul class="plain">${T.how.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
            return;
        }
        const s = score(p), w = weightsNow(), tgt = D.targets[state.target], sims = p.sims[state.target] || {};
        const ceil = D.tasks[state.task].ceiling[state.target], body = BODY[state.lang][tgt.body];
        const mc = !state.weights && p.kind === 'site' ? (p.raw.mc[state.target][state.task] || {})[state.mode] : null;
        const chip = k => `<span class="chip ${supported(p,k) ? 'measured' : 'illustrative'}">${k === 'L' ? (state.lang === 'id' ? 'model' : 'modeled') : supported(p,k) ? T.measured : T.illustrative}</span>`;

        let html = `<p class="hint">${esc(coord(p.lat, p.lon))}</p><h1 class="place-name">${esc(placeName(p))}</h1>
            <span class="chip kind">${esc(T[p.type])}</span>`;
        const role = (p.raw.roles || []).filter(r => r[0] === state.target).map(r => TASK[state.lang][r[1]][0]);
        if (role.length) html += ` <span class="hint">${esc(T.role)}: ${esc(role.join(', '))}</span>`;

        html += `<div class="scoreline"><div class="dial" style="color:${s.F == null ? 'inherit' : 'var(--ink)'}">${show(s.F)}<small> ${esc(T.outOf)}</small></div>
            <div><div class="verdict">${esc(s.F != null && s.covReal < .7 ? (state.lang === 'id' ? 'Bukti parsial - belum menilai seluruh uji' : 'Partial evidence - not a full task assessment') : verdict(s.F))}</div>
            <div class="meter" aria-hidden="true"><i style="width:${s.F == null ? 0 : pct(s.F)}%;background:${color(s.F)}"></i></div>
            <div class="hint">${esc(T.evidenceShare(pct(s.covReal)))}</div></div></div>`;
        if (mc && mc[0] != null) html += `<p class="hint">${esc(T.likely(show(mc[0]), show(mc[1])))}.</p>`;

        const patch = tgt.referencePatch;
        if (patch) html += `<div class="block source-card"><b>${state.lang==='id' ? 'Referensi target NASA' : 'NASA target reference'}</b><p>${esc(tgt.body)}: ${esc(coord(patch.lat,patch.lon))}. ${state.lang==='id' ? 'Petak 1 km; baseline 500 m. Medan regional, bukan interior gua atau zona pendaratan terverifikasi.' : '1 km patch; 500 m baseline. Regional terrain, not cave interiors or a verified landing zone.'}</p><a href="${esc(patch.source.url)}" target="_blank" rel="noopener">${patch.body==='Moon' ? 'LRO / LOLA' : 'MGS / MOLA'} | NASA PDS</a></div>`;

        // Physical constraints are qualitative; no calibrated numerical cap is claimed.
        html += `<h2>${esc(T.limitTitle)}</h2><div class="block"><p>${esc(T.limitText())}</p><p>${state.lang==='id' ? 'Gravitasi Bumi tetap 1 g. Bulan sekitar 0,165 g dan Mars sekitar 0,378 g. Atmosfer Bumi mengubah perpindahan panas, debu, dan mobilitas; Bumi juga melindungi dari radiasi antariksa.' : 'Earth remains at 1 g. The Moon is about 0.165 g and Mars about 0.378 g. Terrestrial air changes heat transfer, dust and mobility; Earth also shields space radiation.'}</p></div>`;

        // Feature by feature
        const feats = D.features.filter(k => (w[k] || 0) > 0 && k in sims).sort((a, b) => w[b] - w[a]);
        const wsum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
        html += `<h2>${esc(T.whyTitle)}</h2><div class="block">`;
        feats.forEach(k => {
            const counted = state.mode === 'all' || supported(p,k);
            let vals;
            if (k === 'M') {
                const top = v => MINERAL[v.indexOf(Math.max(...v))] + ' ' + pct(Math.max(...v) / v.reduce((a, b) => a + b, 0)) + '%';
                vals = `${T.here}: ${T.dominant} ${top(p.raw.minerals)}, ${T.target}: ${T.dominant} ${top(tgt.minerals)}`;
            } else {
                vals = `${T.here} ${featureValue(k, p.v[COLUMN[k]])}, ${T.target} ${featureValue(k, tgt.values[k])}`;
            }
            html += `<div class="feature ${counted ? '' : 'off'}" title="${esc(FEATURE[state.lang][k][1])}">
                <div class="top"><span><span class="fname">${esc(fname(k))}</span> ${chip(k)}</span>
                <span>${pct(sims[k])}% ${esc(T.similar)}</span></div>
                <div class="vals">${esc(vals)}. ${esc(T.weight)} ${pct(w[k] / wsum)}%${counted ? '' : '. ' + esc(T.notCounted)}</div>
                <div class="bar"><i style="width:${pct(sims[k])}%;background:${color(sims[k])}"></i></div></div>`;
        });
        if (!feats.length) html += `<p class="hint">${esc(T.evidenceNone)}</p>`;
        html += '</div>';

        // Where it breaks down
        const parts = contaminationParts(p, state.mode), lines = [];
        if (parts.rain > 0) lines.push(T.rain(Math.round(p.v.precip_mm_yr), pct(parts.rain)));
        if (parts.veg > 0) lines.push(T.veg(p.v.ndvi.toFixed(2), pct(parts.veg)));
        if (parts.lights > 0) lines.push(T.lights(pct(parts.lights)));
        if (!lines.length) lines.push(T.clean);
        const counted = feats.filter(k => state.mode === 'all' || supported(p,k));
        if (counted.length) {
            const worst = counted.reduce((a, b) => sims[a] <= sims[b] ? a : b);
            if (sims[worst] < 0.6) lines.push(T.worst(fname(worst).toLowerCase(), pct(sims[worst])));
        }
        if (isIcy(p)) lines.push(T.ice(pct(p.v.albedo)));
        lines.push(T.regional);
        html += `<h2>${esc(T.breakTitle)}</h2><ul class="plain">${lines.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;

        // Best dates
        if ((w.L || 0) > 0 && p.v.sun_grazing_frac_10d != null) {
            html += `<h2>${esc(T.sunTitle)}</h2><p>${esc(T.sunText(pct(p.v.sun_grazing_frac_10d), p.raw.sunWindow))}</p>`;
        }

        // Terrain
        if (window.AnalogFitPrefs?.get('terrain') !== false) {
        html += `<h2>${esc(T.terrainTitle)}</h2>`;
        html += p.raw.dem ? `<canvas id="terrain" width="696" height="380" tabindex="0" aria-label="${esc(T.terrainTitle)}"></canvas><p class="hint" id="terrainCap"></p>`
            : `<p class="hint">${esc(p.kind === 'cell' ? T.terrainCell : T.terrainNone)}</p>`;

        }

        // Measured values
        const src = { slope_500m_deg: 'dem', t_mean_K: 'power', t_day_K: 'power', t_night_K: 'power', precip_mm_yr: 'power', u_star_mean: 'power', albedo: 'power', slope_med_deg: 'dem', elev_m: 'dem', ndvi: 'modis' };
        const fmt = {
            slope_500m_deg: v => `${v.toFixed(2)} degrees`,
            t_mean_K: v => `${Math.round(v)} K (${Math.round(v - 273.15)} °C)`, t_day_K: v => `${Math.round(v - 273.15)} °C`, t_night_K: v => `${Math.round(v - 273.15)} °C`,
            precip_mm_yr: v => `${Math.round(v)} mm`, u_star_mean: v => `${v.toFixed(2)} m/s`, albedo: v => `${pct(v)}%`,
            slope_med_deg: v => `${v.toFixed(1)}°`, elev_m: v => `${Math.round(v)} m`, ndvi: v => v.toFixed(2)
        };
        const sourceLabel=c=>src[c]==='dem'&&p.raw.terrainDataset==='copernicus_glo30'?'Copernicus GLO-30 (ESA / DLR / Airbus)':T.src[src[c]];
        const rows = Object.keys(src).filter(c => p.v[c] != null && p.realCols.has(c))
            .map(c => `<tr title="${esc(sourceLabel(c))}"><td>${esc(T.rows[c])}<br><span class="hint">${esc(sourceLabel(c))}</span></td><td>${fmt[c](p.v[c])}</td></tr>`).join('');
        html += `<h2>${esc(T.valuesTitle)}</h2><table class="kv">${rows}</table>`;
        box.innerHTML = html;
        box.scrollTop = 0;
        if (p.raw.dem && $('terrain')) terrain($('terrain'), p.raw.dem, p.raw.demSource || (Math.abs(p.lat)<60?'SRTM':'ASTER GDEM'),p.raw.demSpacing || 100);
    }

    // ============================================================
    // 9. 3D TERRAIN from the real elevation grid (plain canvas, drag to rotate)
    // ============================================================
    function terrain(canvas, z, source, spacing=100) {
        source=({copernicus_glo30:'Copernicus GLO-30',srtm30m:'NASA SRTM GL1',aster30m:'NASA/METI ASTER GDEM'})[source] || source;
        const n = Math.round(Math.sqrt(z.length)), ctx = canvas.getContext('2d');
        const lo = Math.min(...z), hi = Math.max(...z), relief = hi - lo, range = Math.max(relief, 1);
        const span = (n - 1) * spacing;
        const defaultVE = Math.max(1, Math.min(25, Math.round(0.3 * span / range)));
        let ve = defaultVE, az = -0.6, tilt = .55, mode = 'elevation', spin = false;
        const en = state.lang === 'en';
        const heightPalette = [[23,53,102],[37,111,155],[51,164,150],[177,198,125],[229,174,88],[239,231,205]];
        const depthPalette = [[191,236,232],[82,172,199],[37,111,155],[23,53,102]];
        const ramp = (fraction, palette) => {
            const v = Math.max(0,Math.min(.99999,fraction))*(palette.length-1), i = Math.floor(v), t = v-i;
            return palette[i].map((c,j)=>Math.round(c+(palette[i+1][j]-c)*t));
        };
        const toolbar = el('div', {class:'terrain-controls'});
        toolbar.innerHTML = '<select id="terrainColorMode" aria-label="Terrain color meaning"><option value="elevation">' + (en?'Elevation colors':'Warna elevasi') + '</option><option value="depth">' + (en?'Relative depth':'Kedalaman relatif') + '</option></select>' +
            '<button class="btn" id="terrainSpin" aria-pressed="false">' + (en?'Rotate':'Putar') + '</button><button class="btn" id="terrainReset">' + (en?'Reset view':'Reset') + '</button>' +
            '<label class="terrain-ve">VE <input id="terrainExaggeration" type="range" min="1" max="25" value="'+ve+'" aria-label="Vertical exaggeration"><output id="terrainVEValue">'+ve+'x</output></label>';
        const legend = el('div',{class:'terrain-depth-legend',id:'terrainDepthLegend'});
        legend.dataset.minElevation = lo;
        legend.dataset.maxElevation = hi;
        canvas.before(toolbar); canvas.after(legend);
        function label() {
            const palette = mode==='depth'?depthPalette:heightPalette;
            const values = mode==='depth'?[0,relief/2,relief]:[lo,(lo+hi)/2,hi];
            legend.innerHTML = '<div class="terrain-ramp" style="background:linear-gradient(90deg,' + palette.map(c=>'rgb('+c.join(',')+')').join(',') + ')"></div><div class="terrain-depth-ticks">' +
                values.map(v=>'<span>'+v.toFixed(1)+' m</span>').join('') + '</div><p class="hint">' +
                (mode==='depth'?(en?'Depth below the highest sampled point; not subsurface depth.':'Kedalaman dari titik sampel tertinggi; bukan kedalaman bawah tanah.'):
                (en?'Lower to higher elevation. Colors use this patch\'s local range.':'Elevasi rendah ke tinggi. Warna mengikuti rentang lokal petak ini.')) + '</p>';
            $('terrainCap').textContent = n+' × '+n+' · '+spacing+' m '+(en?'sample spacing':'jarak sampel')+' · '+(span/1000).toFixed(1)+' km · '+source+' · VE '+ve+'x. '+Math.round(lo)+' to '+Math.round(hi)+' m. ' +
                (en?'Relief '+relief.toFixed(1)+' m. Drag or use arrow keys.':'Relief '+relief.toFixed(1)+' m. Seret atau gunakan tombol panah.');
        }
        const draw = () => {
            const W=canvas.width,H=canvas.height,ca=Math.cos(az),sa=Math.sin(az),k=W/(span*1.75);
            const pt=(i,j)=>{
                const x=(j-(n-1)/2)*spacing,y=(i-(n-1)/2)*spacing,h=(z[i*n+j]-lo)*ve;
                const rx=x*ca-y*sa,ry=x*sa+y*ca;
                return [W/2+rx*k,H*.65+ry*k*tilt-h*k,ry];
            };
            ctx.clearRect(0,0,W,H);
            const quads=[];
            for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){
                const c=[pt(i,j),pt(i,j+1),pt(i+1,j+1),pt(i+1,j)];
                const mean=(z[i*n+j]+z[i*n+j+1]+z[(i+1)*n+j+1]+z[(i+1)*n+j])/4;
                const shade=.88+.12*Math.max(-1,Math.min(1,(z[i*n+j+1]-z[i*n+j]+z[i*n+j]-z[(i+1)*n+j])*ve/(2*spacing)));
                const fraction=relief===0?.5:mode==='depth'?(hi-mean)/range:(mean-lo)/range;
                quads.push([c,fraction,shade,c.reduce((sum,p)=>sum+p[2],0)]);
            }
            quads.sort((a,b)=>a[3]-b[3]);
            quads.forEach(([c,e,shade])=>{
                const rgb=ramp(e,mode==='depth'?depthPalette:heightPalette).map(v=>Math.round(v*shade));
                ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.strokeStyle='rgba(8,18,32,.45)';ctx.lineWidth=.7;
                ctx.beginPath();ctx.moveTo(c[0][0],c[0][1]);c.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.stroke();
            });
        };
        let drag=null;
        canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
        canvas.onpointermove=e=>{if(drag){az+=(e.clientX-drag.x)*.01;tilt=Math.max(.2,Math.min(.9,tilt+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};draw();}};
        canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
        canvas.onkeydown=e=>{
            if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;
            e.preventDefault();if(e.key==='ArrowLeft')az-=.15;if(e.key==='ArrowRight')az+=.15;
            if(e.key==='ArrowUp')tilt=Math.max(.2,tilt-.05);if(e.key==='ArrowDown')tilt=Math.min(.9,tilt+.05);
            if(e.key==='Home'){az=-.6;tilt=.55;}draw();
        };
        $('terrainColorMode').onchange=e=>{mode=e.target.value;label();draw();};
        $('terrainExaggeration').oninput=e=>{ve=Number(e.target.value);$('terrainVEValue').textContent=ve+'x';label();draw();};
        $('terrainReset').onclick=()=>{az=-.6;tilt=.55;ve=defaultVE;$('terrainExaggeration').value=ve;$('terrainVEValue').textContent=ve+'x';label();draw();};
        $('terrainSpin').onclick=()=>{
            spin=!spin;$('terrainSpin').setAttribute('aria-pressed',String(spin));
            if(spin){let previous=performance.now();const frame=now=>{if(!spin||!canvas.isConnected)return;az+=(now-previous)*.00025;previous=now;draw();requestAnimationFrame(frame);};requestAnimationFrame(frame);}
        };
        $('terrainSpin').disabled=!window.AnalogFitPrefs.motionAllowed;
        label();draw();
    }

    // ============================================================
    // 10. DIALOGS
    // ============================================================
    function renderValidation() {
        const T = t(), v = D.validation;
        const testable = v.filter(r => r.percentile_vs_global_land != null), pass = testable.filter(r => r.result === 'PASS');
        const negOk = places.filter(p => p.type === 'negative').every(p => Object.keys(D.targets).every(tid =>
            Object.keys(D.tasks).every(task => ['real', 'all'].every(m => (score(p, m, tid, D.tasks[task].weights).F || 0) < 0.05))));
        const rows = v.map(r => `<tr><td>${esc(r.site)}</td><td>${esc(TASK[state.lang][r.task][0])}, ${esc(TARGET[state.lang][r.target])}</td>
            <td>${r.F_site_real == null ? '–' : Math.round(r.F_site_real * 100)}</td>
            <td>${r.percentile_vs_global_land == null ? '–' : r.percentile_vs_global_land + '%'}</td>
            <td>${pct(r.coverage_real)}% ${esc(T.measured)}</td>
            <td><b>${esc(r.percentile_vs_global_land == null ? T.valNA : r.result === 'PASS' ? T.valPass : T.valFail)}</b></td></tr>`).join('');
        $('validationBody').innerHTML = `<button class="btn close">${esc(T.close)}</button><h1>${esc(T.valTitle)}</h1>
            <p>${esc(T.valIntro(bg.n || 0))}</p>
            <p><b>${esc(T.valSummary(pass.length, testable.length, v.length - testable.length))}</b></p>
            <p><b>${esc(T.valNeg(negOk))}</b></p><p>${Object.entries((D.negative || []).reduce((a,r)=>{a[r.result]=(a[r.result]||0)+1;return a;},{})).map(([k,v])=>`${esc(k)}: ${v}`).join(' | ')}</p>
            <table><tr>${T.valCols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${rows}</table>
            <p class="hint">${esc(T.valHonest)}</p>`;
    }

    function renderMethod() {
        const T = t(), ref = reference();
        const rows = D.features.map(k => `<tr><td><b>${esc(fname(k))}</b><br><span class="hint">${esc(FEATURE[state.lang][k][1])}</span></td>
            <td><span class="chip ${supported(ref,k) ? 'measured' : 'illustrative'}">${supported(ref,k) ? T.measured : T.illustrative}</span></td>
            <td>${supported(ref,k) ? '' : T.planned + ': '}${esc((k==='S' ? 'NASA SRTM / ASTER via OpenTopoData; Copernicus GLO-30 polar fallback; NASA PDS LOLA/MOLA, baseline 500 m' : PLANNED[k]))}</td></tr>`).join('');
        const targetRows = D.features.map(k => `<tr><td>${esc(fname(k))}</td><td>${esc(({derived: state.lang==='id'?'turunan data NASA':'derived from NASA data',computed:state.lang==='id'?'model geometri':'geometry model',placeholder:state.lang==='id'?'ilustratif':'illustrative',illustrative_global_mean:state.lang==='id'?'rerata global, bukan lokasi target':'global mean, not target observation'})[(D.targets[state.target].status[k] || {}).status] || (state.lang==='id'?'belum tersedia':'unavailable'))}</td><td>${esc((D.targets[state.target].status[k] || {}).source || 'No target observation')}</td></tr>`).join('');
        const links = [['Challenge Resources (source of the supplied resource list)', 'https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/?tab=resources'], ['NASA Earthdata Search ? Earth terrain archive', 'https://search.earthdata.nasa.gov/'], ['NASA Worldview ? contextual imagery', 'https://worldview.earthdata.nasa.gov/'], ['NASA PDS ? planetary observations used', 'https://pds.nasa.gov/'], ['LRO LOLA ? lunar topography used', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm'], ['MGS MOLA ? Martian topography used', 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html'], ['LRO Diviner ? PRP T1 thermal context, excluded from scores', 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm'], ['NASA POWER ? supplementary climatology used', 'https://power.larc.nasa.gov/'], ['NASA GIBS imagery', 'https://gibs.earthdata.nasa.gov/'], ['Copernicus GLO-30 (ESA / DLR / Airbus), polar terrain used', 'https://doi.org/10.5270/ESA-c5d3d65'],
        ['SRTM and ASTER GDEM via OpenTopoData', 'https://www.opentopodata.org/'], ['ORNL DAAC MODIS subsets ? not used for supported comparisons yet', 'https://modis.ornl.gov/rst/api/v1/']];
        $('methodBody').innerHTML = `<button class="btn close">${esc(T.close)}</button><h1>${esc(T.methTitle)}</h1>
            <div class="formula">${esc(T.methFormula)}</div>
            <ul class="plain">${T.methText.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            <table><tr>${T.methCols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${rows}</table>
            <h2>${state.lang==='id' ? 'Bukti target yang dipilih' : 'Selected target evidence'}</h2><table><tr><th>${state.lang==='id' ? 'Ciri' : 'Feature'}</th><th>Status</th><th>${state.lang==='id' ? 'Sumber / batasan' : 'Source / limits'}</th></tr>${targetRows}</table>
            <h2>${esc(T.methSources)}</h2><ul class="plain">${links.map(l => `<li><a href="${l[1]}" target="_blank" rel="noopener">${esc(l[0])}</a></li>`).join('')}</ul>
            <h2>${esc(T.methLimit)}</h2><ul class="plain">${T.methLimits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            <p class="hint">${esc(T.generated)} ${esc(D.generated)}. Team H.E.N.K., NASA Space Apps Challenge 2026.</p>`;
    }
    const openDialog = (id, render) => { render(); $(id).showModal(); $(id).querySelector('.close').onclick = () => $(id).close(); };

    // ============================================================
    // 11. WIRING
    // ============================================================
    function saveHash() {
        const h = new URLSearchParams({ t: state.target, k: state.task, m: state.mode, v: state.view, lang: state.lang });
        if (state.sel) h.set('s', state.sel);
        try { history.replaceState(null, '', '#' + h.toString()); } catch (_) { /* Some file:// browsers restrict history updates. */ }
    }

    function select(id, fly, options = {}) {
        if (!byId[id]) return;
        state.sel = id;
        const p = byId[id];
        if (p && fly) {
            if (state.view === '2d') map.flyTo([p.lat, p.lon], Math.max(map.getZoom(), 4), { duration: window.AnalogFitPrefs?.motionAllowed === false ? 0 : 0.8 });
            else if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat: p.lat, lng: p.lon, altitude: 1.6 }, window.AnalogFitPrefs?.motionAllowed === false ? 0 : 900); }
        }
        refresh(false);
        if (options.explicit !== false) window.dispatchEvent(new CustomEvent('analogfit:locationselected', {detail:{id}}));
    }

    function setMode(mode) { state.mode = mode; refresh(false); }

    function fillSelects() {
        const ts = $('taskSel'), gs = $('targetSel');
        ts.innerHTML = Object.keys(D.tasks).map(k => `<option value="${esc(k)}">${esc(TASK[state.lang][k][0])}</option>`).join('');
        gs.innerHTML = Object.keys(D.targets).map(k => `<option value="${k}">${esc(TARGET[state.lang][k])}</option>`).join('');
        ts.value = state.task; gs.value = state.target;
    }

    function renderLegend() {
        $('ramp').style.background = `linear-gradient(90deg,${[0, .2, .4, .6, .8, 1].map(color).join(',')})`;
        $('legendKeys').innerHTML = ['known', 'hypothesis', 'negative'].map(k => `<span>${svgIcon(k, '#8a94a1', 16)} ${esc(t()[k])}</span>`).join('') +
            `<span><svg width="16" height="16"><circle cx="8" cy="8" r="4.5" fill="#8a94a1" stroke="#fff"/></svg> ${esc(t().cell)}</span>` +
            `<span style="grid-column:1/-1" class="hint">${esc(t().faded)}</span>`;
    }

    function refresh(texts) {
        if (texts) {
            $('dataStatus').textContent = t().dataStatus;
            document.documentElement.lang = state.lang;
            document.querySelectorAll('[data-t]').forEach(n => { n.textContent = t()[n.dataset.t]; });
            document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === state.lang));
            fillSelects(); renderLegend(); renderWeights();
        }
        renderRankings();
        renderEvidence();
        renderDetail(); paintMap(); paintGlobe(); saveHash();
        window.dispatchEvent(new Event('analogfit:update'));
    }

    // Keep the chosen location while changing tasks, including tasks with no score.
    const newQuestion = () => { state.weights = null; renderWeights(); refresh(false); select(state.sel, true, {explicit:false}); };
    $('taskSel').onchange = e => { state.task = e.target.value; newQuestion(); };
    $('targetSel').onchange = e => { state.target = e.target.value; newQuestion(); };
    $('resetWeights').onclick = () => { state.weights = null; renderWeights(); refresh(false); };
    $('skipIce').onchange = e => { state.skipIce = e.target.checked; refresh(false); };
    $('btnValidation').onclick = () => openDialog('dlgValidation', renderValidation);
    $('btnMethod').onclick = () => openDialog('dlgMethod', renderMethod);
    document.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => setMode(b.dataset.mode); });
    document.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => setView(b.dataset.view); });
    document.querySelectorAll('[data-lang]').forEach(b => { b.onclick = () => { state.lang = b.dataset.lang; window.AnalogFitPrefs?.set('language',state.lang); refresh(true); }; });

    window.addEventListener('analogfit:preferences',event=>{
        if (globe) globe.controls().autoRotate = window.AnalogFitPrefs.motionAllowed && window.AnalogFitPrefs.get('globeRotation');
        if (globe && event.detail.key==='motion') {globe.pointsTransitionDuration(window.AnalogFitPrefs.motionAllowed?300:0);paintGlobe();}
    });
    new ResizeObserver(()=>map.invalidateSize({pan:false})).observe($('map'));
    refresh(true);
    setView(state.view);
    window.analogfit = { state, places, score, select, placeName, renderValidation, renderMethod, setView, refresh };       // handy in the console and for tests
    window.dispatchEvent(new Event('analogfit:ready'));
})();
