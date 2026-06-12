// ============================================================
// grupBimbingan.js — Fitur Bimbingan Grup (LYTANA)
// Dosen: buat grup tema → jadwalkan sesi → mahasiswa join
// Mahasiswa: lihat & daftar sesi grup dari dosbingnya
// ============================================================
// Versi    : 1.0
// Depends  : helpers.js (api, toast, openModal, closeModal,
//            fmtTgl, renderAvatar, statusBadge, daysSinceStr)
//            config.js (state, GAS_URL)
// GAS actions yang perlu ditambahkan di backend:
//   GET  : getMyGrupBimbingan, getGrupDetail, getGrupSesiList
//          getMhsGrupList, getMhsGrupSesiTersedia
//   POST : createGrupBimbingan, updateGrupBimbingan,
//          deleteGrupBimbingan, addMhsToGrup, removeMhsFromGrup,
//          createGrupSesi, deleteGrupSesi,
//          joinGrupSesi, cancelJoinGrupSesi,
//          validateGrupSesi
// ============================================================

// ─────────────────────────────────────────────────────────────
// STATE LOKAL
// ─────────────────────────────────────────────────────────────
let _grupList        = [];   // daftar grup milik dosen
let _selectedGrupId  = null; // grup yang sedang dibuka
let _grupSesiList    = [];   // sesi-sesi dalam grup yang dibuka
let _mhsGrupList     = [];   // untuk sisi mahasiswa

// Warna tema grup (cycling berdasarkan index)
const GRUP_COLORS = [
  { bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.28)',   accent: 'var(--blue2)',   dot: '#2563eb' },
  { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.28)',  accent: 'var(--purple)',  dot: '#8b5cf6' },
  { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.28)',  accent: 'var(--green)',   dot: '#10b981' },
  { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.28)',  accent: 'var(--amber)',   dot: '#f59e0b' },
  { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.28)',   accent: 'var(--rose)',    dot: '#f43f5e' },
  { bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.28)',   accent: 'var(--sky)',     dot: '#06b6d4' },
];

function grupColor(idx) { return GRUP_COLORS[idx % GRUP_COLORS.length]; }

// ─────────────────────────────────────────────────────────────
// ── DOSEN: Halaman Utama Bimbingan Grup ───────────────────────
// ─────────────────────────────────────────────────────────────

async function loadDosenGrupBimbingan() {
  const c = document.getElementById('d-grup-container');
  if (!c) return;
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Memuat grup bimbingan...</div>';

  const res = await api('getMyGrupBimbingan', { token: state.token });
  if (!res.success) {
    c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
    return;
  }
  _grupList = res.grup || [];
  renderDosenGrupList();
}

function renderDosenGrupList() {
  const c = document.getElementById('d-grup-container');
  if (!c) return;

  if (!_grupList.length) {
    c.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>Belum ada grup bimbingan.<br>
          <span style="font-size:0.82rem;color:var(--text3)">
            Buat grup untuk mengelompokkan mahasiswa dengan tema skripsi serupa
            dan jadwalkan sesi bersama sekaligus.
          </span>
        </p>
      </div>`;
    return;
  }

  c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">
      ${_grupList.map((g, i) => {
        const col         = grupColor(i);
        const anggotaCount = g.anggotaCount || 0;
        const sesiCount    = g.sesiCount    || 0;
        const nextSesi     = g.nextSesi     || null;
        return `
          <div class="card" style="
              background:${col.bg};
              border:1px solid ${col.border};
              cursor:pointer;
              transition:transform .15s,box-shadow .15s;
              position:relative;overflow:hidden"
              onclick="openGrupDetail('${g.id}')"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'"
              onmouseout="this.style.transform='';this.style.boxShadow=''">

            <!-- accent bar kiri -->
            <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${col.dot};border-radius:4px 0 0 4px"></div>

            <div style="padding-left:8px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <div>
                  <div style="font-weight:700;font-size:0.95rem;color:var(--text1)">${g.nama}</div>
                  <div style="font-size:0.76rem;color:var(--text3);margin-top:2px">${g.tema || 'Tanpa tema khusus'}</div>
                </div>
                <span style="
                    background:${col.bg};
                    color:${col.dot};
                    border:1px solid ${col.border};
                    font-size:0.7rem;font-weight:700;
                    padding:2px 8px;border-radius:20px;white-space:nowrap">
                  ${anggotaCount} anggota
                </span>
              </div>

              ${g.deskripsi ? `<div style="font-size:0.8rem;color:var(--text2);margin-bottom:10px;line-height:1.5">${g.deskripsi}</div>` : ''}

              <div style="display:flex;gap:12px;font-size:0.78rem;color:var(--text2);margin-bottom:10px">
                <span>📅 ${sesiCount} sesi terjadwal</span>
                ${nextSesi
                  ? `<span style="color:${col.dot}">▶ ${fmtTgl(nextSesi.tanggal, { day: 'numeric', month: 'short' })} ${nextSesi.jamMulai}</span>`
                  : '<span style="color:var(--text3)">Belum ada sesi</span>'}
              </div>

              <div style="display:flex;gap:6px">
                <button class="btn btn-sm" style="flex:1;background:${col.bg};color:${col.dot};border:1px solid ${col.border};font-weight:600"
                        onclick="event.stopPropagation();openGrupDetail('${g.id}')">
                  📋 Detail & Sesi
                </button>
                <button class="btn btn-ghost btn-sm"
                        onclick="event.stopPropagation();openEditGrup('${g.id}')">Edit</button>
                <button class="btn btn-rose btn-sm"
                        onclick="event.stopPropagation();deleteGrupConfirm('${g.id}','${g.nama.replace(/'/g, "\\'")}')">Hapus</button>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// ── Detail Grup (modal) ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────

async function openGrupDetail(grupId) {
  _selectedGrupId = grupId;
  const grup = _grupList.find(g => g.id === grupId);
  if (!grup) return;

  const idx = _grupList.indexOf(grup);
  const col = grupColor(idx);

  // Set header modal
  document.getElementById('modal-grup-detail-title').textContent = grup.nama;
  document.getElementById('modal-grup-detail-tema').textContent  = grup.tema || 'Tema bebas';

  const c = document.getElementById('modal-grup-detail-body');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  openModal('modal-grup-detail');

  // Load detail + sesi paralel
  const [detailRes, sesiRes] = await Promise.all([
    api('getGrupDetail',    { grupId, token: state.token }),
    api('getGrupSesiList',  { grupId, token: state.token }),
  ]);

  _grupSesiList = sesiRes.sesi || [];

  const anggota = detailRes.anggota || [];

  c.innerHTML = `
    <!-- Anggota Grup -->
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="font-size:0.88rem;font-weight:700;color:var(--text1)">
          👥 Anggota Grup <span style="color:${col.dot}">(${anggota.length})</span>
        </h4>
        <button class="btn btn-sm" style="background:${col.bg};color:${col.dot};border:1px solid ${col.border}"
                onclick="openTambahAnggota('${grupId}')">+ Tambah Anggota</button>
      </div>
      ${anggota.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:8px">
            ${anggota.map(a => `
              <div style="
                  display:flex;align-items:center;gap:6px;
                  background:var(--card2);border:1px solid var(--border2);
                  border-radius:20px;padding:4px 10px 4px 5px;
                  font-size:0.8rem">
                ${renderAvatar(a.foto, a.nama, 24)}
                <div>
                  <span style="font-weight:600">${a.nama}</span>
                  <span style="color:var(--text3);margin-left:4px">${statusBadge(a.statusSkripsi)}</span>
                </div>
                <button onclick="removeMhsFromGrup('${grupId}','${a.kode}','${a.nama.replace(/'/g, "\\'")}',this)"
                        style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:0.9rem;margin-left:2px;padding:0 2px"
                        title="Keluarkan dari grup">✕</button>
              </div>`).join('')}
          </div>`
        : `<div style="color:var(--text3);font-size:0.82rem">Belum ada anggota. Tambahkan mahasiswamu.</div>`}
    </div>

    <hr style="border:none;border-top:1px solid var(--border2);margin:0 0 18px">

    <!-- Sesi Grup -->
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="font-size:0.88rem;font-weight:700;color:var(--text1)">
          📅 Sesi Bimbingan Grup <span style="color:${col.dot}">(${_grupSesiList.length})</span>
        </h4>
        <button class="btn btn-sm" style="background:${col.bg};color:${col.dot};border:1px solid ${col.border}"
                onclick="openBuatGrupSesi('${grupId}')">+ Jadwalkan Sesi</button>
      </div>
      <div id="grup-sesi-list-container">
        ${renderGrupSesiHTML(_grupSesiList, col)}
      </div>
    </div>`;
}

function renderGrupSesiHTML(sesiArr, col) {
  if (!sesiArr.length) {
    return `<div style="color:var(--text3);font-size:0.82rem;padding:8px 0">
      Belum ada sesi. Jadwalkan sesi pertama untuk grup ini.
    </div>`;
  }

  const now      = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  return `<div class="table-wrap"><table>
    <thead>
      <tr>
        <th>Tanggal & Waktu</th>
        <th>Jenis</th>
        <th>Hadir / Daftar</th>
        <th>Topik</th>
        <th>Status</th>
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody>
      ${sesiArr.map(s => {
        const isPast    = s.tanggal < todayStr;
        const joinCount = (s.peserta || []).length;

        const statusBadgeHTML = s.status === 'terselenggara'
          ? '<span class="badge badge-green">✓ Terselenggara</span>'
          : s.status === 'dibatalkan'
            ? '<span class="badge badge-slate">Dibatalkan</span>'
            : isPast
              ? '<span class="badge badge-rose">Belum divalidasi</span>'
              : '<span class="badge badge-blue">Terjadwal</span>';

        const aksiHTML = (s.status === 'terselenggara' || s.status === 'dibatalkan')
          ? `<span style="font-size:0.78rem;color:var(--text3)">Selesai</span>`
          : `<div style="display:flex;gap:4px;flex-wrap:wrap">
              ${isPast
                ? `<button class="btn btn-teal btn-sm"
                           onclick="openValidasiGrupSesi('${s.id}')">✓ Validasi</button>`
                : ''}
              <button class="btn btn-rose btn-sm"
                      onclick="deleteGrupSesiConfirm('${s.id}','${_selectedGrupId}')">Hapus</button>
            </div>`;

        return `<tr>
          <td>
            <div style="font-weight:600;font-size:0.85rem">${fmtTgl(s.tanggal, { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
            <div style="font-size:0.78rem;color:var(--text3)">${s.jamMulai} – ${s.jamSelesai}</div>
          </td>
          <td><span class="badge badge-${s.tipe === 'offline' ? 'blue' : 'teal'}">${s.tipe}</span></td>
          <td style="text-align:center">
            <span style="font-weight:700;color:${col ? col.dot : 'var(--blue2)'}">${joinCount}</span>
            <span style="color:var(--text3)"> mahasiswa</span>
          </td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);font-size:0.82rem">
            ${s.topik || '—'}
          </td>
          <td>${statusBadgeHTML}</td>
          <td>${aksiHTML}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}

// ─────────────────────────────────────────────────────────────
// ── Buat / Edit Grup ──────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

function openBuatGrup() {
  document.getElementById('modal-grup-form-title').textContent = 'Buat Grup Bimbingan';
  document.getElementById('grup-form-id').value        = '';
  document.getElementById('grup-form-nama').value      = '';
  document.getElementById('grup-form-tema').value      = '';
  document.getElementById('grup-form-deskripsi').value = '';
  document.getElementById('grup-save-btn').textContent = '+ Buat Grup';
  openModal('modal-grup-form');
}

function openEditGrup(grupId) {
  const g = _grupList.find(x => x.id === grupId);
  if (!g) return;
  document.getElementById('modal-grup-form-title').textContent = 'Edit Grup';
  document.getElementById('grup-form-id').value        = g.id;
  document.getElementById('grup-form-nama').value      = g.nama;
  document.getElementById('grup-form-tema').value      = g.tema      || '';
  document.getElementById('grup-form-deskripsi').value = g.deskripsi || '';
  document.getElementById('grup-save-btn').textContent = 'Simpan Perubahan';
  openModal('modal-grup-form');
}

async function saveGrupBimbingan() {
  const id        = document.getElementById('grup-form-id').value;
  const nama      = document.getElementById('grup-form-nama').value.trim();
  const tema      = document.getElementById('grup-form-tema').value.trim();
  const deskripsi = document.getElementById('grup-form-deskripsi').value.trim();

  if (!nama) return toast('Nama grup wajib diisi', 'error');

  const btn = document.getElementById('grup-save-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';

  const action = id ? 'updateGrupBimbingan' : 'createGrupBimbingan';
  const params  = { nama, tema, deskripsi, token: state.token };
  if (id) params.id = id;

  const res = await api(action, params, 'POST');
  btn.disabled = false; btn.textContent = id ? 'Simpan Perubahan' : '+ Buat Grup';

  if (!res.success) return toast(res.message, 'error');
  toast(id ? 'Grup diperbarui!' : '🎉 Grup bimbingan berhasil dibuat!', 'success');
  closeModal('modal-grup-form');
  loadDosenGrupBimbingan();
}

async function deleteGrupConfirm(grupId, nama) {
  if (!confirm(`Hapus grup "${nama}"?\n\nSemua sesi dan data keanggotaan dalam grup ini akan dihapus.`)) return;
  const res = await api('deleteGrupBimbingan', { grupId, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Grup dihapus.', 'info');
  loadDosenGrupBimbingan();
}

// ─────────────────────────────────────────────────────────────
// ── Manajemen Anggota ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

async function openTambahAnggota(grupId) {
  _selectedGrupId = grupId;
  const grup = _grupList.find(g => g.id === grupId);
  if (!grup) return;

  const sel = document.getElementById('tambah-anggota-select');
  document.getElementById('modal-tambah-anggota-grupnama').textContent = grup.nama;
  sel.innerHTML = '<option value="">⏳ Memuat daftar mahasiswa...</option>';
  openModal('modal-tambah-anggota');

  // Selalu fetch anggota terkini dari GAS agar tidak stale
  const detailRes = await api('getGrupDetail', { grupId, token: state.token });
  const sudahAda  = (detailRes.anggota || []).map(a => a.kode);

  // Pastikan state.dosenStudents terisi
  if (!state.dosenStudents || !state.dosenStudents.length) {
    const sRes = await api('getMyStudents', { token: state.token });
    if (sRes.success) state.dosenStudents = sRes.students;
  }

  const tersedia = (state.dosenStudents || []).filter(s => !sudahAda.includes(s.kode));

  if (!tersedia.length) {
    sel.innerHTML = '<option value="">Semua mahasiswa sudah ada di grup ini</option>';
  } else {
    sel.innerHTML = '<option value="">-- Pilih Mahasiswa --</option>' +
      tersedia.map(s => `<option value="${s.kode}">${s.nama} (${s.kode}) — ${STATUS_CONFIG[s.statusSkripsi]?.label || s.statusSkripsi}</option>`).join('');
  }
}

async function confirmTambahAnggota() {
  const kode = document.getElementById('tambah-anggota-select').value;
  if (!kode) return toast('Pilih mahasiswa terlebih dahulu', 'error');

  const btn = document.getElementById('tambah-anggota-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';

  const res = await api('addMhsToGrup', { grupId: _selectedGrupId, mahasiswaKode: kode, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = '+ Tambah ke Grup';

  if (!res.success) return toast(res.message, 'error');
  toast('Mahasiswa berhasil ditambahkan ke grup!', 'success');
  closeModal('modal-tambah-anggota');
  // Refresh grup list & re-open detail
  await loadDosenGrupBimbingan();
  openGrupDetail(_selectedGrupId);
}

async function removeMhsFromGrup(grupId, kode, nama, btn) {
  if (!confirm(`Keluarkan "${nama}" dari grup ini?`)) return;
  const oldHTML  = btn.innerHTML;
  btn.disabled   = true; btn.innerHTML = '...';
  const res = await api('removeMhsFromGrup', { grupId, mahasiswaKode: kode, token: state.token }, 'POST');
  btn.disabled = false; btn.innerHTML = oldHTML;
  if (!res.success) return toast(res.message, 'error');
  toast(`${nama} dikeluarkan dari grup.`, 'info');
  await loadDosenGrupBimbingan();
  openGrupDetail(grupId);
}

// ─────────────────────────────────────────────────────────────
// ── Buat Sesi Grup ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

function openBuatGrupSesi(grupId) {
  _selectedGrupId = grupId;
  document.getElementById('grup-sesi-form-grupid').value    = grupId;
  document.getElementById('grup-sesi-tanggal').value        = '';
  document.getElementById('grup-sesi-jam-mulai').value      = '';
  document.getElementById('grup-sesi-jam-selesai').value    = '';
  document.getElementById('grup-sesi-tipe').value           = 'offline';
  document.getElementById('grup-sesi-topik').value          = '';
  document.getElementById('grup-sesi-max-peserta').value    = '';
  openModal('modal-grup-sesi-form');
}

async function saveGrupSesi() {
  const grupId     = document.getElementById('grup-sesi-form-grupid').value;
  const tanggal    = document.getElementById('grup-sesi-tanggal').value;
  const jamMulai   = document.getElementById('grup-sesi-jam-mulai').value;
  const jamSelesai = document.getElementById('grup-sesi-jam-selesai').value;
  const tipe       = document.getElementById('grup-sesi-tipe').value;
  const topik      = document.getElementById('grup-sesi-topik').value.trim();
  const maxPeserta = document.getElementById('grup-sesi-max-peserta').value;

  if (!tanggal || !jamMulai || !jamSelesai) return toast('Tanggal dan jam wajib diisi', 'error');
  if (jamSelesai <= jamMulai) return toast('Jam selesai harus setelah jam mulai', 'error');

  const btn = document.getElementById('grup-sesi-save-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';

  const res = await api('createGrupSesi', {
    grupId, tanggal, jamMulai, jamSelesai, tipe, topik,
    maxPeserta: maxPeserta ? parseInt(maxPeserta) : null,
    token: state.token
  }, 'POST');

  btn.disabled = false; btn.textContent = 'Jadwalkan Sesi';
  if (!res.success) return toast(res.message, 'error');
  toast('🎉 Sesi grup dijadwalkan! Notifikasi dikirim ke semua anggota.', 'success');
  closeModal('modal-grup-sesi-form');
  openGrupDetail(grupId);
}

async function deleteGrupSesiConfirm(sesiId, grupId) {
  if (!confirm('Hapus sesi grup ini? Semua mahasiswa yang sudah daftar akan dikeluarkan.')) return;
  const res = await api('deleteGrupSesi', { sesiId, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Sesi dihapus.', 'info');
  openGrupDetail(grupId);
}

// ─────────────────────────────────────────────────────────────
// ── Validasi Sesi Grup ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

async function openValidasiGrupSesi(sesiId) {
  const sesi = _grupSesiList.find(s => s.id === sesiId);
  if (!sesi) return;

  const grup = _grupList.find(g => g.id === _selectedGrupId);

  document.getElementById('validasi-grup-sesi-content').innerHTML = `
    <div class="card" style="background:var(--card2);margin-bottom:0">
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px">
        ${grup?.nama || 'Grup'} — ${fmtTgl(sesi.tanggal, { weekday:'long', day:'numeric', month:'long' })}
      </div>
      <div style="font-size:0.82rem;color:var(--text2);margin-bottom:12px">
        ${sesi.jamMulai} – ${sesi.jamSelesai} ·
        <span class="badge badge-${sesi.tipe === 'offline' ? 'blue' : 'teal'}">${sesi.tipe}</span>
        ${sesi.topik ? `· <i>${sesi.topik}</i>` : ''}
      </div>
      <div style="font-weight:600;font-size:0.85rem;margin-bottom:8px;color:var(--text1)">
        Mahasiswa yang Hadir (${(sesi.peserta || []).length}):
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${(sesi.peserta || []).length
          ? sesi.peserta.map(p => `
              <div style="display:flex;align-items:center;gap:5px;
                           background:var(--card);border:1px solid var(--border2);
                           border-radius:16px;padding:3px 10px 3px 4px;font-size:0.8rem">
                ${renderAvatar(p.foto, p.nama, 22)}
                <span>${p.nama}</span>
              </div>`).join('')
          : '<span style="color:var(--text3);font-size:0.82rem">Belum ada mahasiswa yang daftar</span>'}
      </div>
    </div>`;

  document.getElementById('validasi-grup-sesi-catatan').value = '';
  document.getElementById('validasi-grup-sesi-id').value      = sesiId;
  openModal('modal-validasi-grup-sesi');
}

async function doValidasiGrupSesi(status) {
  const sesiId  = document.getElementById('validasi-grup-sesi-id').value;
  const catatan = document.getElementById('validasi-grup-sesi-catatan').value;
  const res = await api('validateGrupSesi', { sesiId, status, catatan, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Sesi grup divalidasi: ' + (status === 'terselenggara' ? '✅ Terselenggara' : '❌ Tidak Terselenggara'), 'success');
  closeModal('modal-validasi-grup-sesi');
  openGrupDetail(_selectedGrupId);
}

// ─────────────────────────────────────────────────────────────
// ── MAHASISWA: Sisi Mahasiswa ─────────────────────────────────
// ─────────────────────────────────────────────────────────────

async function loadMhsGrupBimbingan() {
  const c = document.getElementById('m-grup-container');
  if (!c) return;
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Memuat sesi grup bimbingan...</div>';

  const res = await api('getMhsGrupSesiTersedia', { token: state.token });
  if (!res.success) {
    c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
    return;
  }
  _mhsGrupList = res.data || [];
  renderMhsGrupList();
}

function renderMhsGrupList() {
  const c = document.getElementById('m-grup-container');
  if (!c) return;

  // Pisahkan: grup yang sudah diikuti vs yang tersedia
  const sudahJoin  = _mhsGrupList.filter(g => g.isAnggota);
  const tersedia   = _mhsGrupList.filter(g => !g.isAnggota);

  if (!_mhsGrupList.length) {
    c.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>Dosenmu belum membuat grup bimbingan.</p>
      </div>`;
    return;
  }

  let html = '';

  if (sudahJoin.length) {
    html += `<div style="margin-bottom:20px">
      <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:10px;
                  text-transform:uppercase;letter-spacing:0.06em">
        Grup Saya
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${sudahJoin.map((g, i) => renderMhsGrupCard(g, i, true)).join('')}
      </div>
    </div>`;
  }

  if (tersedia.length) {
    html += `<div>
      <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:10px;
                  text-transform:uppercase;letter-spacing:0.06em">
        Grup dari Dosen Pembimbing
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${tersedia.map((g, i) => renderMhsGrupCard(g, sudahJoin.length + i, false)).join('')}
      </div>
    </div>`;
  }

  c.innerHTML = html;
}

function renderMhsGrupCard(g, colorIdx, isAnggota) {
  const col        = grupColor(colorIdx);
  const sesiMendatang = (g.sesi || []).filter(s => s.tanggal >= new Date().toISOString().substring(0, 10));
  const sudahDaftar   = sesiMendatang.filter(s => s.isJoined);
  const bisa          = state.user?.statusSkripsi !== 'tidak_aktif' && !hasDeadlineBlokir();

  return `
    <div class="card" style="
        background:${col.bg};border:1px solid ${col.border};
        position:relative;overflow:hidden">
      <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${col.dot};border-radius:4px 0 0 4px"></div>
      <div style="padding-left:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <div style="font-weight:700;font-size:0.92rem">${g.nama}</div>
            <div style="font-size:0.74rem;color:var(--text3)">${g.tema || 'Tema umum'}</div>
          </div>
          ${isAnggota
            ? `<span style="background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);
                            font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px">✓ Anggota</span>`
            : `<span style="background:${col.bg};color:${col.dot};border:1px solid ${col.border};
                            font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px">${g.anggotaCount || 0} anggota</span>`}
        </div>

        ${g.deskripsi ? `<div style="font-size:0.79rem;color:var(--text2);margin-bottom:8px;line-height:1.5">${g.deskripsi}</div>` : ''}

        <!-- Sesi mendatang -->
        ${sesiMendatang.length
          ? `<div style="margin-bottom:10px">
              <div style="font-size:0.76rem;font-weight:600;color:var(--text2);margin-bottom:6px">Sesi Mendatang:</div>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${sesiMendatang.slice(0, 3).map(s => `
                  <div style="
                      background:var(--card);border:1px solid var(--border2);
                      border-radius:8px;padding:8px 10px;
                      display:flex;justify-content:space-between;align-items:center;gap:8px">
                    <div>
                      <div style="font-size:0.8rem;font-weight:600">
                        ${fmtTgl(s.tanggal, { weekday:'short', day:'numeric', month:'short' })},
                        ${s.jamMulai}–${s.jamSelesai}
                      </div>
                      <div style="font-size:0.73rem;color:var(--text3)">
                        <span class="badge badge-${s.tipe === 'offline' ? 'blue' : 'teal'}" style="font-size:0.65rem">${s.tipe}</span>
                        ${s.topik ? `· ${s.topik}` : ''}
                        ${s.maxPeserta ? `· Maks ${s.maxPeserta}` : ''}
                      </div>
                    </div>
                    ${s.isJoined
                      ? `<button class="btn btn-sm" style="background:rgba(244,63,94,0.1);color:var(--rose);border:1px solid rgba(244,63,94,0.3);white-space:nowrap;font-size:0.73rem"
                                 onclick="cancelJoinGrupSesi('${s.id}','${g.id}')">✕ Batal</button>`
                      : bisa
                        ? `<button class="btn btn-sm" style="background:${col.bg};color:${col.dot};border:1px solid ${col.border};white-space:nowrap;font-size:0.73rem;font-weight:700"
                                   onclick="joinGrupSesi('${s.id}','${g.id}')">+ Daftar</button>`
                        : `<span style="font-size:0.7rem;color:var(--text3)">Diblokir</span>`}
                  </div>`).join('')}
              </div>
            </div>`
          : `<div style="font-size:0.78rem;color:var(--text3);margin-bottom:10px">Belum ada sesi mendatang.</div>`}

        ${sudahDaftar.length
          ? `<div style="font-size:0.76rem;color:var(--green);font-weight:600">✓ Terdaftar di ${sudahDaftar.length} sesi mendatang</div>`
          : ''}
      </div>
    </div>`;
}

async function joinGrupSesi(sesiId, grupId) {
  if (state.user?.statusSkripsi === 'tidak_aktif') {
    return toast('Akunmu tidak aktif. Hubungi dosen pembimbing.', 'error');
  }
  if (hasDeadlineBlokir()) {
    return toast('Ada deadline terlewat. Konfirmasi ke dosen pembimbing.', 'error');
  }
  const res = await api('joinGrupSesi', { sesiId, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('✅ Berhasil mendaftar ke sesi grup!', 'success');
  loadMhsGrupBimbingan();
}

async function cancelJoinGrupSesi(sesiId, grupId) {
  if (!confirm('Batalkan pendaftaran sesi grup ini?')) return;
  const res = await api('cancelJoinGrupSesi', { sesiId, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Pendaftaran dibatalkan.', 'info');
  loadMhsGrupBimbingan();
}

// ─────────────────────────────────────────────────────────────
// ── HELPER: cek hasDeadlineBlokir (safe fallback) ────────────
// ─────────────────────────────────────────────────────────────
// Fungsi ini sudah ada di deadline.js — wrapper aman jika belum load
function _safeHasDeadlineBlokir() {
  return (typeof hasDeadlineBlokir === 'function') ? hasDeadlineBlokir() : false;
}
