// ============================================================
// rekap.js — Rekap Akademik (Admin) & Export Rekap (Dosen)
// ============================================================

// ── Rekap Akademik (Admin) ────────────────────────────────────
let rekapData = null;

async function loadAkademikRekap() {
  const c = document.getElementById('a-rekap-container');
  const s = document.getElementById('a-rekap-summary');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Memuat rekap akademik...</div>';
  s.innerHTML = '';
  const res = await api('getAkademikRekap', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  rekapData = res;
  renderAkademikSummary(res.summary);
  renderAkademikTable(res.perDosen, 'semua');
}

function renderAkademikSummary(sum) {
  const s = document.getElementById('a-rekap-summary');
  const items = [
    { n: sum.total,            l: 'Total Mahasiswa',  c: 'var(--blue2)'   },
    { n: sum.aktif_bimbingan,  l: 'Aktif Bimbingan',  c: 'var(--green)'   },
    { n: sum.tidak_aktif,      l: 'Tidak Aktif',      c: 'var(--slate)'   },
    { n: sum.revisi,           l: 'Revisi',           c: 'var(--amber)'   },
    { n: sum.menunggu_sidang,  l: 'Menunggu Sidang',  c: 'var(--purple)'  },
    { n: sum.lulus,            l: 'Lulus / Wisuda',   c: 'var(--sky)'     },
  ];
  s.innerHTML = items.map(i => `<div class="rekap-stat"><div class="num" style="color:${i.c}">${i.n || 0}</div><div class="lbl">${i.l}</div></div>`).join('');
}

function renderAkademikTable(perDosen, filterStatus) {
  const c = document.getElementById('a-rekap-container');
  if (!perDosen || !perDosen.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada data</p></div>'; return; }
  let html = '';
  perDosen.forEach(d => {
    let mhsList = d.mhs;
    if (filterStatus !== 'semua') mhsList = mhsList.filter(m => m.status === filterStatus);
    if (!mhsList.length) return;
    html += `<div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:700;font-size:1rem">${d.nama || d.kode}</div>
          <div style="font-size:0.82rem;color:var(--text2)">${d.prodi || ''} · ${mhsList.length} mahasiswa (P1 / P2)</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['aktif_bimbingan', 'tidak_aktif', 'revisi', 'menunggu_sidang', 'lulus'].map(st => {
            const count = d.mhs.filter(m => m.status === st).length;
            return count > 0 ? statusBadge(st).replace('</span>', ` (${count})</span>`) : '';
          }).join('')}
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Kode</th><th>Status</th><th>Bimbingan</th><th>Terakhir Bimbingan</th><th>Terakhir Aktif</th></tr></thead>
        <tbody>${mhsList.map(m => {
          const days = m.lastActivity ? Math.floor((Date.now() - new Date(m.lastActivity).getTime()) / 86400000) : 999;
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:8px">${renderAvatar(m.foto, m.nama, 28)}<span style="font-weight:600">${m.nama}</span></div></td>
            <td><code style="font-size:0.78rem;background:var(--card2);padding:2px 6px;border-radius:4px">${m.kode}</code></td>
            <td>${statusBadge(m.status)}</td>
            <td style="text-align:center">${m.bimbinganOk}</td>
            <td style="font-size:0.82rem;color:var(--text2)">${m.lastBimbingan ? fmtTgl(m.lastBimbingan.substring(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum ada'}</td>
            <td style="font-size:0.82rem;${days >= 14 ? 'color:var(--rose)' : days >= 10 ? 'color:var(--amber)' : 'color:var(--text2)'}">${daysSinceStr(m.lastActivity)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;
  });
  c.innerHTML = html || '<div class="empty-state"><div class="empty-icon">🔍</div><p>Tidak ada mahasiswa dengan filter ini</p></div>';
}

function filterRekap(status, btn) {
  document.querySelectorAll('#a-rekap-filter .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (rekapData) renderAkademikTable(rekapData.perDosen, status);
}

// ── Export Rekap CSV (Dosen) ──────────────────────────────────
async function doExportRekap() {
  toast('Menyiapkan data rekap...', 'info');
  const res = await api('exportRekap', { token: state.token });
  if (!res.success) return toast(res.message, 'error');
  const data = res.rekap;
  const rows = [
    ['Rekap Bimbingan Skripsi — Lytana'],
    ['Dicetak:', new Date(res.generatedAt).toLocaleString('id-ID')],
    [],
    ['Kode', 'Nama', 'Email', 'Pembimbing 1', 'Pembimbing 2', 'Prodi Dosen', 'Status Skripsi', 'Progress (%)', 'Bimbingan Terselenggara', 'Bimbingan Dibatalkan', 'Terakhir Bimbingan', 'Hari Sejak Bimbingan', 'Terakhir Aktif', 'Terdaftar'],
    ...data.map(m => [
      m.kode, m.nama, m.email, m.dosenNama1, m.dosenNama2, m.dosenProdi,
      STATUS_CONFIG[m.statusSkripsi]?.label || m.statusSkripsi,
      m.avgProgress, m.bimbinganTerselenggara, m.bimbinganDibatalkan,
      m.lastBimbingan ? fmtTgl(m.lastBimbingan.substring(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum ada',
      m.daysSinceLastBimbingan !== null ? m.daysSinceLastBimbingan + ' hari' : '—',
      m.lastActivity ? new Date(m.lastActivity).toLocaleDateString('id-ID') : '—',
      m.createdAt ? new Date(m.createdAt).toLocaleDateString('id-ID') : '—',
    ])
  ];
  downloadCSV(rows, 'Rekap_Bimbingan_Lytana_');
  toast('Rekap berhasil diexport!', 'success');
}

// ── Export Rekap Akademik CSV (Admin) ─────────────────────────
async function exportAkademikCSV() {
  if (!rekapData) { toast('Muat data rekap dulu', 'error'); return; }
  const allMhs    = rekapData.mahasiswa;
  const dosenList = rekapData.perDosen;
  const dosenMap  = {};
  dosenList.forEach(d => { d.mhs.forEach(m => dosenMap[m.kode] = { dosenNama: d.nama, prodi: d.prodi }); });

  const dr = await api('getAllDosen', { token: state.token });
  const dNameMap = {};
  if (dr.success) { dr.dosen.forEach(d => dNameMap[d.kode] = d.nama); }

  const rows = [
    ['REKAP AKADEMIK BIMBINGAN SKRIPSI — LYTANA'],
    ['Dicetak:', new Date(rekapData.generatedAt).toLocaleString('id-ID')],
    [],
    ['RINGKASAN'],
    ['Total Mahasiswa',    rekapData.summary.total],
    ['Aktif Bimbingan',   rekapData.summary.aktif_bimbingan],
    ['Tidak Aktif',       rekapData.summary.tidak_aktif],
    ['Revisi',            rekapData.summary.revisi],
    ['Menunggu Sidang',   rekapData.summary.menunggu_sidang],
    ['Lulus / Wisuda',    rekapData.summary.lulus],
    [],
    ['DETAIL MAHASISWA'],
    ['No', 'Nama', 'Kode', 'Pembimbing 1', 'Pembimbing 2', 'Status Skripsi', 'Jumlah Bimbingan', 'Terakhir Bimbingan', 'Terakhir Aktif'],
    ...allMhs.map((m, i) => [
      i + 1, m.nama, m.kode,
      dNameMap[m.dosenKode1] || m.dosenKode1 || '—',
      dNameMap[m.dosenKode2] || m.dosenKode2 || '—',
      STATUS_CONFIG[m.status]?.label || m.status,
      m.bimbinganOk,
      m.lastBimbingan ? fmtTgl(m.lastBimbingan.substring(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum ada',
      m.lastActivity ? new Date(m.lastActivity).toLocaleDateString('id-ID') : '—',
    ])
  ];
  downloadCSV(rows, 'Rekap_Akademik_Lytana_');
  toast('Rekap Akademik berhasil diexport!', 'success');
}

// ── Helper Download CSV ───────────────────────────────────────
function downloadCSV(rows, prefix) {
  const csv  = rows.map(r => r.map(v => '"' + (String(v || '').replace(/"/g, '""')) + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = prefix + new Date().toISOString().substring(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
