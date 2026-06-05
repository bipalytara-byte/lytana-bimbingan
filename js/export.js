// ============================================================
// export.js — Export PDF: Arsip Mahasiswa & Evaluasi Belum Bimbingan
// Membutuhkan library jsPDF (sudah dimuat di index.html)
// ============================================================
// EXPORT ARSIP PDF — Semua Mahasiswa Bimbingan
// ============================================================
async function exportArsipMahasiswa() {
  const students = state.dosenStudents || [];
  if (!students.length) { toast('Muat data mahasiswa dulu.', 'error'); return; }
  if (!window.jspdf) { toast('Library PDF sedang dimuat, coba lagi sebentar...', 'info'); return; }

  const dosenNama  = state.user?.nama  || 'Dosen';
  const dosenProdi = state.user?.prodi || '';
  const tglCetak   = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const total      = students.length;

  // Hitung ringkasan status
  const STATUS_LABELS = { aktif_bimbingan:'Aktif Bimbingan', tidak_aktif:'Tidak Aktif', revisi:'Revisi', menunggu_sidang:'Menunggu Sidang', lulus:'Lulus' };
  const statusCount = {};
  students.forEach(s => { const st = s.statusSkripsi || 'tidak_aktif'; statusCount[st] = (statusCount[st]||0)+1; });

  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = 210, H = 297;
  const mg   = 18;   // margin kiri/kanan
  let   y    = 0;

  // ─────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────
  doc.setFillColor(15, 28, 46);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 5, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ARSIP MAHASISWA BIMBINGAN SKRIPSI', mg + 2, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Lytana — Linkage of Your Technical Appointment & Network Assistance', mg + 2, 20);

  doc.setTextColor(200, 215, 235);
  doc.setFontSize(8.5);
  doc.text('Dosen: ' + dosenNama + (dosenProdi ? '  |  ' + dosenProdi : ''), mg + 2, 28.5);
  doc.text('Dicetak: ' + tglCetak, W - mg - 2, 28.5, { align: 'right' });

  y = 44;

  // ─────────────────────────────────────────────────────────────
  // SUMMARY BOXES  (Total · Aktif · Tidak Aktif · Revisi · Sidang · Lulus)
  // ─────────────────────────────────────────────────────────────
  const boxes = [
    { label: 'Total',          val: total,                                       color: [37,99,235]   },
    { label: 'Aktif',          val: statusCount['aktif_bimbingan']  || 0,        color: [16,185,129]  },
    { label: 'Tidak Aktif',    val: statusCount['tidak_aktif']      || 0,        color: [100,116,139] },
    { label: 'Revisi',         val: statusCount['revisi']           || 0,        color: [245,158,11]  },
    { label: 'Menunggu Sidang',val: statusCount['menunggu_sidang']  || 0,        color: [139,92,246]  },
    { label: 'Lulus',          val: statusCount['lulus']            || 0,        color: [56,189,248]  },
  ];
  const bw = (W - mg * 2 - 5 * 3) / 6;
  boxes.forEach((b, i) => {
    const bx = mg + i * (bw + 3);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(bx, y, bw, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(String(b.val), bx + bw / 2, y + 11, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(b.label, bx + bw / 2, y + 17, { align: 'center' });
  });
  y += 28;

  // ─────────────────────────────────────────────────────────────
  // SECTION TITLE
  // ─────────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(mg, y, W - mg * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DAFTAR MAHASISWA BIMBINGAN  (' + total + ' orang)', mg + 4, y + 5.5);
  y += 10;

  // ─────────────────────────────────────────────────────────────
  // TABLE — kolom: No | Nama | Tgl Daftar | Status | Bimbingan (×)
  // ─────────────────────────────────────────────────────────────
  const COL_NO    = 10;
  const COL_DATE  = 26;
  const COL_ST    = 34;
  const COL_CNT   = 22;
  const COL_NAMA  = W - mg * 2 - COL_NO - COL_DATE - COL_ST - COL_CNT;

  // x start positions
  const xNo   = mg;
  const xNama = mg + COL_NO;
  const xDate = mg + COL_NO + COL_NAMA;
  const xSt   = mg + COL_NO + COL_NAMA + COL_DATE;
  const xCnt  = mg + COL_NO + COL_NAMA + COL_DATE + COL_ST;

  const drawTableHeader = (yy) => {
    doc.setFillColor(235, 241, 255);
    doc.rect(mg, yy, W - mg * 2, 7.5, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('No',          xNo   + 1.5,            yy + 5);
    doc.text('Nama Mahasiswa', xNama + 1.5,          yy + 5);
    doc.text('Tgl Daftar',  xDate + 1.5,            yy + 5);
    doc.text('Status',      xSt   + 1.5,            yy + 5);
    doc.text('Bimbingan',   xCnt  + COL_CNT / 2,    yy + 5, { align: 'center' });
    // garis vertikal header
    doc.setDrawColor(200, 210, 240);
    doc.setLineWidth(0.25);
    [xNama, xDate, xSt, xCnt].forEach(x => doc.line(x, yy, x, yy + 7.5));
    return yy + 8.5;
  };

  // Status → warna teks singkat
  const stColor = (st) => {
    if (st === 'aktif_bimbingan')  return [16, 185, 129];
    if (st === 'revisi')           return [245, 158, 11];
    if (st === 'menunggu_sidang')  return [139, 92, 246];
    if (st === 'lulus')            return [56, 189, 248];
    return [100, 116, 139];
  };
  const stShort = (st) => {
    if (st === 'aktif_bimbingan')  return 'Aktif';
    if (st === 'tidak_aktif')      return 'Tdk Aktif';
    if (st === 'revisi')           return 'Revisi';
    if (st === 'menunggu_sidang')  return 'Menunggu Sidang';
    if (st === 'lulus')            return 'Lulus';
    return st || '—';
  };

  y = drawTableHeader(y);

  students.forEach((s, idx) => {
    const ROW_H = 7.5;

    // Page break
    if (y + ROW_H > H - 20) {
      // footer halaman ini
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.4);
      doc.line(mg, H - 14, W - mg, H - 14);
      doc.setTextColor(160, 175, 195);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('Arsip digenerate otomatis oleh Lytana — ' + dosenNama, W / 2, H - 9, { align: 'center' });
      doc.text('Lytana — Powered by Skuro Production ' + new Date().getFullYear(), W / 2, H - 4.5, { align: 'center' });
      doc.addPage();
      y = mg;
      y = drawTableHeader(y);
    }

    // Row background — zebra
    const bg = idx % 2 === 0 ? [248, 250, 255] : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(mg, y, W - mg * 2, ROW_H, 'F');

    // No
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(String(idx + 1), xNo + 1.5, y + 5);

    // Nama
    doc.setTextColor(20, 30, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const namaDisplay = s.nama.length > 36 ? s.nama.substring(0, 34) + '…' : s.nama;
    doc.text(namaDisplay, xNama + 1.5, y + 5);

    // Tgl Daftar
    doc.setTextColor(80, 95, 120);
    doc.setFontSize(7);
    const tglDaftar = s.createdAt
      ? new Date(s.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    doc.text(tglDaftar, xDate + 1.5, y + 5);

    // Status — berwarna
    const [sr, sg, sb] = stColor(s.statusSkripsi);
    doc.setTextColor(sr, sg, sb);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(stShort(s.statusSkripsi), xSt + 1.5, y + 5);

    // Jumlah bimbingan — center
    const cnt = s.bimbinganCount || 0;
    const cntColor = cnt === 0 ? [244, 63, 94] : [16, 185, 129];
    doc.setTextColor(cntColor[0], cntColor[1], cntColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(String(cnt) + '×', xCnt + COL_CNT / 2, y + 5, { align: 'center' });

    // Garis bawah baris + garis vertikal
    doc.setDrawColor(215, 225, 240);
    doc.setLineWidth(0.15);
    doc.line(mg, y + ROW_H, W - mg, y + ROW_H);
    doc.setDrawColor(210, 220, 240);
    [xNama, xDate, xSt, xCnt].forEach(x => doc.line(x, y, x, y + ROW_H));

    y += ROW_H;
  });

  // ─────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.4);
  doc.line(mg, H - 14, W - mg, H - 14);
  doc.setTextColor(160, 175, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Arsip digenerate otomatis oleh Lytana — ' + dosenNama, W / 2, H - 9, { align: 'center' });
  doc.text('Lytana — Powered by Skuro Production ' + new Date().getFullYear(), W / 2, H - 4.5, { align: 'center' });

  const fname = 'Arsip_Mahasiswa_' + (dosenNama || 'Dosen').replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().toISOString().substring(0, 10) + '.pdf';
  doc.save(fname);
  toast('Arsip PDF ' + total + ' mahasiswa berhasil diunduh!', 'success');
}

async function exportBelumBimbingan() {
  const students = state.dosenStudents || [];
  if (!students.length) { toast('Belum ada data mahasiswa.', 'error'); return; }

  const belum = students.filter(s => !s.bimbinganCount || s.bimbinganCount === 0);
  const sudah = students.filter(s => s.bimbinganCount && s.bimbinganCount > 0);
  const dosenNama = state.user?.nama || 'Dosen';
  const tglCetak = new Date().toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const total = students.length;

  if (!window.jspdf) { toast('Library PDF sedang dimuat, coba lagi sebentar...', 'info'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const margin = 18;
  let y = 0;

  // ── Header strip ──
  doc.setFillColor(15, 28, 46);
  doc.rect(0, 0, W, 34, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 5, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('EVALUASI BIMBINGAN SKRIPSI', margin + 2, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Lytana — Linkage of Your Technical Appointment & Network Assistance', margin + 2, 20);
  doc.setTextColor(200, 215, 235);
  doc.setFontSize(8.5);
  doc.text('Dosen: ' + dosenNama, margin + 2, 28);
  doc.text('Dicetak: ' + tglCetak, W - margin - 2, 28, { align: 'right' });

  y = 42;

  // ── Summary boxes (3 boxes: Total · Sudah · Belum) ──
  const boxes = [
    { label: 'Total Mahasiswa Bimbingan', val: total,        color: [37, 99, 235]  },
    { label: 'Sudah Pernah Bimbingan',    val: sudah.length, color: [16, 185, 129] },
    { label: 'Belum Pernah Bimbingan',    val: belum.length, color: [244, 63, 94]  },
  ];
  const bw = (W - margin * 2 - 8) / 3;
  boxes.forEach((b, i) => {
    const bx = margin + i * (bw + 4);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(bx, y, bw, 20, 2.5, 2.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(b.val), bx + bw / 2, y + 11, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(b.label, bx + bw / 2, y + 17, { align: 'center' });
  });
  y += 28;

  // ── Section title ──
  doc.setFillColor(244, 63, 94);
  doc.rect(margin, y, W - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    'DAFTAR MAHASISWA BELUM PERNAH BIMBINGAN  (' + belum.length + ' orang)',
    margin + 4, y + 5.5
  );
  y += 10;

  if (belum.length === 0) {
    // Semua sudah bimbingan
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin, y, W - margin * 2, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Semua mahasiswamu sudah pernah bimbingan!', W / 2, y + 10, { align: 'center' });
    y += 22;
  } else {
    // ── Table header ──
    // Columns: No | Nama | Jumlah Bimbingan
    const colNo   = 12;
    const colNama = W - margin * 2 - colNo - 40;  // flexible
    const colCount = 40;

    doc.setFillColor(235, 241, 255);
    doc.rect(margin, y, W - margin * 2, 7, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('No',              margin + 2,                        y + 4.8);
    doc.text('Nama Mahasiswa',  margin + colNo + 2,                y + 4.8);
    doc.text('Bimbingan (×)',   margin + colNo + colNama + 2,      y + 4.8);
    // separator lines
    doc.setDrawColor(200, 210, 235);
    doc.setLineWidth(0.3);
    doc.line(margin + colNo,            y, margin + colNo,            y + 7);
    doc.line(margin + colNo + colNama,  y, margin + colNo + colNama,  y + 7);
    y += 8;

    belum.forEach((s, idx) => {
      // Page break
      if (y > H - 22) {
        // Footer on this page
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.4);
        doc.line(margin, H - 16, W - margin, H - 16);
        doc.setTextColor(160, 175, 195);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text('Dokumen digenerate otomatis oleh Lytana. Harap segera menghubungi mahasiswa yang belum bimbingan.', W / 2, H - 11, { align: 'center' });
        doc.text('Lytana — Powered by Skuro Production ' + new Date().getFullYear(), W / 2, H - 6, { align: 'center' });
        doc.addPage();
        y = margin;
        // Repeat table header on new page
        doc.setFillColor(235, 241, 255);
        doc.rect(margin, y, W - margin * 2, 7, 'F');
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('No',              margin + 2,                       y + 4.8);
        doc.text('Nama Mahasiswa',  margin + colNo + 2,               y + 4.8);
        doc.text('Bimbingan (×)',   margin + colNo + colNama + 2,     y + 4.8);
        doc.setDrawColor(200, 210, 235);
        doc.setLineWidth(0.3);
        doc.line(margin + colNo,           y, margin + colNo,           y + 7);
        doc.line(margin + colNo + colNama, y, margin + colNo + colNama, y + 7);
        y += 8;
      }

      const rowH = 7.5;
      const rowBg = idx % 2 === 0 ? [250, 252, 255] : [255, 255, 255];
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
      doc.rect(margin, y, W - margin * 2, rowH, 'F');

      // No — merah bold
      doc.setTextColor(244, 63, 94);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(String(idx + 1), margin + 2, y + 5);

      // Nama — hitam gelap
      doc.setTextColor(20, 30, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const namaDisplay = s.nama.length > 38 ? s.nama.substring(0, 36) + '...' : s.nama;
      doc.text(namaDisplay, margin + colNo + 2, y + 5);

      // Jumlah bimbingan — center di kolom kanan, merah
      doc.setTextColor(244, 63, 94);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('0', margin + colNo + colNama + colCount / 2, y + 5, { align: 'center' });

      // Garis bawah baris
      doc.setDrawColor(220, 228, 240);
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowH, W - margin, y + rowH);

      // Garis vertikal kolom
      doc.setDrawColor(210, 220, 235);
      doc.line(margin + colNo,           y, margin + colNo,           y + rowH);
      doc.line(margin + colNo + colNama, y, margin + colNo + colNama, y + rowH);

      y += rowH;
    });
  }

  // ── Footer ──
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.4);
  doc.line(margin, H - 16, W - margin, H - 16);
  doc.setTextColor(160, 175, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Dokumen digenerate otomatis oleh Lytana. Harap segera menghubungi mahasiswa yang belum bimbingan.', W / 2, H - 11, { align: 'center' });
  doc.text('Lytana — Powered by Skuro Production ' + new Date().getFullYear(), W / 2, H - 6, { align: 'center' });

  const fname = 'Evaluasi_BelumBimbingan_' + (dosenNama || 'Dosen').replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().toISOString().substring(0, 10) + '.pdf';
  doc.save(fname);
  toast('PDF evaluasi berhasil diunduh! Kirim ke grup mahasiswa sebagai tindak lanjut.', 'success');
}

