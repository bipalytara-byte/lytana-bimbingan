// ── Helper: parse tanggal deadline dengan aman ───────────────
// Menangani format YYYY-MM-DD maupun dd/mm/yyyy dari GAS
function parseDeadlineTgl(str) {
  if (!str) return new Date(NaN);
  const s = String(str).trim().substring(0, 10);
  // Format YYYY-MM-DD (ISO) — langsung parse dengan append T00:00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  // Format DD/MM/YYYY — balik jadi YYYY-MM-DD dulu
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  }
  return new Date(str);
}

// ============================================================
// deadline.js — Fitur Deadline Skripsi
// Dosen set deadline per mahasiswa, mahasiswa konfirmasi selesai
// + upload link Bitrix24, dosen verifikasi lalu buka blokir.
// ============================================================

// ── Render badge jumlah deadline pending di nav dosen ────────
function updateDeadlineBadge(count) {
  const badge = document.getElementById('d-deadline-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
}

// ============================================================
// SISI DOSEN
// ============================================================

// ── Load daftar deadline yang dibuat dosen ini ────────────────
async function loadDosenDeadlines() {
  const c = document.getElementById('d-deadline-container');
  if (!c) return;
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getDosenDeadlines', { token: state.token });
  if (!res.success) {
    c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
    return;
  }
  state.dosenDeadlines = res.deadlines || [];
  renderDosenDeadlines(state.dosenDeadlines);

  // Update badge di nav
  const pending = state.dosenDeadlines.filter(d => d.status === 'selesai_menunggu').length;
  updateDeadlineBadge(pending);
}

function renderDosenDeadlines(deadlines) {
  const c = document.getElementById('d-deadline-container');
  if (!deadlines.length) {
    c.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada deadline yang dibuat</p></div>`;
    return;
  }

  // Kelompokkan: perlu tindakan dulu, lalu lainnya
  const perluAksi  = deadlines.filter(d => d.status === 'selesai_menunggu');
  const lainnya    = deadlines.filter(d => d.status !== 'selesai_menunggu');

  let html = '';

  if (perluAksi.length) {
    html += `<div style="margin-bottom:8px;font-size:0.78rem;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:0.07em">
      ⏳ Menunggu Verifikasi Dosen (${perluAksi.length})
    </div>`;
    html += perluAksi.map(d => renderDeadlineCardDosen(d, true)).join('');
    html += `<div style="margin:20px 0 8px;font-size:0.78rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.07em">Deadline Lainnya</div>`;
  }

  html += lainnya.map(d => renderDeadlineCardDosen(d, false)).join('');
  c.innerHTML = html;
}

function renderDeadlineCardDosen(d, highlight) {
  const now        = Date.now();
  const dlMhs      = parseDeadlineTgl(d.deadlineMahasiswa);
  const dlDosen    = parseDeadlineTgl(d.deadlineDosen);
  const mhsLewat  = now > dlMhs.getTime();
  const dosenLewat = now > dlDosen.getTime();
  const sisaMhsHari  = Math.ceil((dlMhs.getTime() - now) / 86400000);
  const sisaDosenHari = Math.ceil((dlDosen.getTime() - now) / 86400000);

  const statusLabel = {
    aktif            : { txt: 'Aktif',              bg: 'rgba(56,189,248,0.15)',  color: 'var(--sky)'   },
    selesai_menunggu : { txt: '⏳ Menunggu Verif',   bg: 'rgba(245,158,11,0.15)', color: 'var(--amber)' },
    verified         : { txt: '✅ Terverifikasi',    bg: 'rgba(16,185,129,0.15)', color: 'var(--green)' },
    expired          : { txt: 'Kedaluwarsa',         bg: 'rgba(148,163,184,0.15)',color: 'var(--slate)' },
  };
  const sl = statusLabel[d.status] || statusLabel.aktif;

  const borderStyle = highlight
    ? 'border:1.5px solid rgba(245,158,11,0.5);background:rgba(245,158,11,0.04)'
    : 'border:1px solid var(--border2)';

  let konfirmasiInfo = '';
  if (d.status === 'selesai_menunggu' && d.linkBitrix) {
    konfirmasiInfo = `
      <div style="margin:10px 0;padding:10px 12px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-size:0.82rem">
        <div style="font-weight:700;color:var(--amber);margin-bottom:6px">📋 Konfirmasi Mahasiswa</div>
        <div style="color:var(--text2);margin-bottom:4px">📝 ${d.pernyataanMhs || '—'}</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="color:var(--text3);font-size:0.78rem">🔗 Link Bitrix:</span>
          <a href="${d.linkBitrix}" target="_blank" style="color:var(--blue2);font-size:0.82rem;word-break:break-all">${d.linkBitrix}</a>
        </div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px">Dikonfirmasi: ${d.konfirmasiAt ? new Date(d.konfirmasiAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—'}</div>
      </div>`;
  }

  let aksiHTML = '';
  if (d.status === 'selesai_menunggu') {
    aksiHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-sm" style="background:var(--green);color:white;border:none;font-weight:700"
                onclick="verifikasiDeadline('${d.id}')">✅ Verifikasi & Buka Blokir</button>
        <button class="btn btn-rose btn-sm" onclick="tolakDeadline('${d.id}')">✕ Tolak / Minta Ulang</button>
      </div>`;
  } else if (d.status === 'aktif') {
    aksiHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="openEditDeadline('${d.id}')">✏️ Edit</button>
        <button class="btn btn-rose btn-sm" onclick="hapusDeadline('${d.id}')">Hapus</button>
      </div>`;
  }

  return `<div style="${borderStyle};border-radius:12px;padding:16px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div>
        <div style="font-weight:700;font-size:0.95rem">${d.judul}</div>
        <div style="font-size:0.82rem;color:var(--text2);margin-top:2px">👤 ${d.mahasiswaNama || d.mahasiswaKode}</div>
      </div>
      <span style="background:${sl.bg};color:${sl.color};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap">${sl.txt}</span>
    </div>
    ${d.deskripsi ? `<div style="font-size:0.83rem;color:var(--text2);margin-bottom:10px;line-height:1.5">${d.deskripsi}</div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem">
      <div style="background:var(--card2);border-radius:8px;padding:8px 10px">
        <div style="color:var(--text3);font-size:0.72rem;font-weight:600;text-transform:uppercase;margin-bottom:3px">⏰ Deadline Mahasiswa</div>
        <div style="font-weight:700;color:${mhsLewat && d.status==='aktif' ? 'var(--rose)' : 'var(--text1)'}">${fmtTgl(d.deadlineMahasiswa.substring(0,10),{day:'numeric',month:'long',year:'numeric'})}</div>
        <div style="font-size:0.72rem;margin-top:2px;color:${mhsLewat ? 'var(--rose)' : sisaMhsHari <= 3 ? 'var(--amber)' : 'var(--text3)'}">
          ${mhsLewat ? '⚠️ Sudah lewat' : `Sisa ${sisaMhsHari} hari`}
        </div>
      </div>
      <div style="background:var(--card2);border-radius:8px;padding:8px 10px">
        <div style="color:var(--text3);font-size:0.72rem;font-weight:600;text-transform:uppercase;margin-bottom:3px">📅 Deadline Review Dosen</div>
        <div style="font-weight:700;color:${dosenLewat ? 'var(--rose)' : 'var(--text1)'}">${fmtTgl(d.deadlineDosen.substring(0,10),{day:'numeric',month:'long',year:'numeric'})}</div>
        <div style="font-size:0.72rem;margin-top:2px;color:${dosenLewat ? 'var(--rose)' : sisaDosenHari <= 2 ? 'var(--amber)' : 'var(--text3)'}">
          ${dosenLewat ? '⚠️ Review terlambat' : `Sisa ${sisaDosenHari} hari`}
        </div>
      </div>
    </div>
    ${konfirmasiInfo}
    ${d.konsekuensi ? `<div style="margin-top:10px;font-size:0.78rem;color:var(--rose);background:rgba(244,63,94,0.07);border-radius:6px;padding:6px 10px">🚫 Konsekuensi: ${d.konsekuensi}</div>` : ''}
    ${aksiHTML}
  </div>`;
}

// ── Buka modal set deadline ───────────────────────────────────
function openSetDeadlineModal(prefillKode) {
  // Isi dropdown mahasiswa
  const students = state.dosenStudents || [];
  if (!students.length) {
    toast('Muat data mahasiswa dulu (tab Mahasiswa)', 'error');
    return;
  }
  const sel = document.getElementById('deadline-mhs-sel');
  sel.innerHTML = '<option value="">-- Pilih Mahasiswa --</option>' +
    students.map(s => `<option value="${s.kode}" data-nama="${s.nama}">${s.nama} (${s.kode})</option>`).join('');
  if (prefillKode) sel.value = prefillKode;

  // Reset form
  document.getElementById('deadline-id-edit').value    = '';
  document.getElementById('deadline-judul').value      = '';
  document.getElementById('deadline-deskripsi').value  = '';
  document.getElementById('deadline-konsekuensi').value= '';
  document.getElementById('deadline-tgl-mhs').value    = '';
  document.getElementById('deadline-tgl-dosen').value  = '';
  document.getElementById('modal-deadline-title').textContent = '📋 Set Deadline Mahasiswa';
  document.getElementById('deadline-save-btn').textContent    = 'Simpan Deadline';
  openModal('modal-deadline');
}

function openEditDeadline(id) {
  const d = (state.dosenDeadlines || []).find(x => x.id === id);
  if (!d) return;
  const students = state.dosenStudents || [];
  const sel = document.getElementById('deadline-mhs-sel');
  sel.innerHTML = '<option value="">-- Pilih Mahasiswa --</option>' +
    students.map(s => `<option value="${s.kode}">${s.nama} (${s.kode})</option>`).join('');

  document.getElementById('deadline-id-edit').value     = d.id;
  sel.value = d.mahasiswaKode;
  document.getElementById('deadline-judul').value       = d.judul || '';
  document.getElementById('deadline-deskripsi').value   = d.deskripsi || '';
  document.getElementById('deadline-konsekuensi').value = d.konsekuensi || '';
  document.getElementById('deadline-tgl-mhs').value     = d.deadlineMahasiswa ? d.deadlineMahasiswa.substring(0,10) : '';
  document.getElementById('deadline-tgl-dosen').value   = d.deadlineDosen     ? d.deadlineDosen.substring(0,10)     : '';
  document.getElementById('modal-deadline-title').textContent = '✏️ Edit Deadline';
  document.getElementById('deadline-save-btn').textContent    = 'Update Deadline';
  openModal('modal-deadline');
}

async function saveDeadline() {
  const id          = document.getElementById('deadline-id-edit').value.trim();
  const mhsKode     = document.getElementById('deadline-mhs-sel').value;
  const judul       = document.getElementById('deadline-judul').value.trim();
  const deskripsi   = document.getElementById('deadline-deskripsi').value.trim();
  const konsekuensi = document.getElementById('deadline-konsekuensi').value.trim();
  const tglMhs      = document.getElementById('deadline-tgl-mhs').value;
  const tglDosen    = document.getElementById('deadline-tgl-dosen').value;

  if (!mhsKode)  return toast('Pilih mahasiswa', 'error');
  if (!judul)    return toast('Judul deadline wajib diisi', 'error');
  if (!tglMhs)   return toast('Deadline mahasiswa wajib diisi', 'error');
  if (!tglDosen) return toast('Deadline review dosen wajib diisi', 'error');
  if (tglDosen < tglMhs) return toast('Deadline review dosen tidak boleh sebelum deadline mahasiswa', 'error');

  const btn = document.getElementById('deadline-save-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';

  const action = id ? 'updateDeadline' : 'createDeadline';
  const params = { mahasiswaKode: mhsKode, judul, deskripsi, konsekuensi, deadlineMahasiswa: tglMhs, deadlineDosen: tglDosen, token: state.token };
  if (id) params.id = id;

  const res = await api(action, params, 'POST');
  btn.disabled = false; btn.textContent = id ? 'Update Deadline' : 'Simpan Deadline';
  if (!res.success) return toast(res.message, 'error');
  toast(id ? '✅ Deadline diperbarui!' : '✅ Deadline berhasil dibuat!', 'success');
  closeModal('modal-deadline');
  loadDosenDeadlines();
}

async function verifikasiDeadline(id) {
  if (!confirm('Verifikasi bahwa mahasiswa sudah menyelesaikan tugas ini dan buka kembali akses reservasinya?')) return;
  const res = await api('verifikasiDeadline', { id, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('✅ Deadline terverifikasi! Mahasiswa sudah bisa reservasi kembali.', 'success');
  loadDosenDeadlines();
  loadDosenStudents();
}

async function tolakDeadline(id) {
  const catatan = prompt('Alasan penolakan / apa yang perlu diperbaiki:');
  if (catatan === null) return;
  const res = await api('tolakDeadline', { id, catatan, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Konfirmasi ditolak. Mahasiswa diminta mengirim ulang.', 'info');
  loadDosenDeadlines();
}

async function hapusDeadline(id) {
  if (!confirm('Hapus deadline ini? Blokir reservasi mahasiswa terkait akan dicabut.')) return;
  const res = await api('hapusDeadline', { id, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Deadline dihapus', 'info');
  loadDosenDeadlines();
}

// ── Filter deadline dosen ─────────────────────────────────────
function filterDosenDeadlines(status, btn) {
  document.querySelectorAll('#d-deadline .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = status === 'all'
    ? state.dosenDeadlines
    : (state.dosenDeadlines || []).filter(d => d.status === status);
  renderDosenDeadlines(f);
}

// ============================================================
// SISI MAHASISWA
// ============================================================

// ── Load & render deadline aktif mahasiswa ────────────────────
async function loadMahasiswaDeadlines() {
  const res = await api('getMahasiswaDeadlines', { token: state.token });
  if (!res.success) return;

  const deadlines = res.deadlines || [];
  state.myDeadlines = deadlines;

  // Render banner di halaman reservasi
  renderDeadlineBannerMhs();
}

function renderDeadlineBannerMhs() {
  const container = document.getElementById('m-deadline-banner');
  if (!container) return;

  const deadlines = state.myDeadlines || [];
  // Hanya tampilkan yang status aktif atau selesai_menunggu (bukan verified/expired)
  const aktif = deadlines.filter(d => d.status === 'aktif' || d.status === 'selesai_menunggu');

  if (!aktif.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const now = Date.now();

  container.innerHTML = aktif.map(d => {
    const dl       = parseDeadlineTgl(d.deadlineMahasiswa);
    const lewat    = now > dl.getTime();
    const sisaHari = Math.ceil((dl.getTime() - now) / 86400000);
    const menunggu = d.status === 'selesai_menunggu';

    const borderColor = menunggu ? 'rgba(56,189,248,0.4)' : lewat ? 'rgba(244,63,94,0.4)' : sisaHari <= 3 ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.3)';
    const bgColor     = menunggu ? 'rgba(56,189,248,0.06)' : lewat ? 'rgba(244,63,94,0.06)' : 'rgba(245,158,11,0.05)';
    const icon        = menunggu ? '⏳' : lewat ? '🚫' : sisaHari <= 3 ? '⚠️' : '📋';
    const titleColor  = menunggu ? 'var(--sky)' : lewat ? 'var(--rose)' : 'var(--amber)';

    let statusInfo = '';
    if (menunggu) {
      statusInfo = `<div style="margin-top:8px;padding:8px 10px;background:rgba(56,189,248,0.08);border-radius:7px;font-size:0.8rem;color:var(--sky)">
        ✅ Konfirmasimu sudah diterima dan sedang menunggu verifikasi dosen.
        Akses reservasi akan terbuka setelah dosen memverifikasi.
      </div>`;
    } else if (lewat) {
      statusInfo = `<div style="margin-top:8px;font-size:0.8rem;color:var(--rose)">
        🚫 Deadline sudah lewat. Selesaikan tugasmu dan konfirmasi di bawah untuk membuka kembali akses reservasi.
      </div>`;
    } else {
      statusInfo = `<div style="margin-top:6px;font-size:0.8rem;color:${sisaHari <= 3 ? 'var(--amber)' : 'var(--text3)'}">
        ${sisaHari <= 3 ? `⚠️ Hanya sisa <b>${sisaHari} hari</b> lagi!` : `Sisa <b>${sisaHari} hari</b>`}
      </div>`;
    }

    const konfirmasiBtn = !menunggu
      ? `<button class="btn btn-sm" style="margin-top:10px;background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);font-weight:700"
               onclick="openKonfirmasiDeadline('${d.id}','${(d.judul||'').replace(/'/g,"\\'")}')">
           ✅ Konfirmasi Sudah Selesai
         </button>`
      : '';

    return `<div style="border:1.5px solid ${borderColor};background:${bgColor};border-radius:12px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px">
        <div>
          <div style="font-weight:700;font-size:0.9rem;color:${titleColor}">${icon} Deadline: ${d.judul}</div>
          <div style="font-size:0.8rem;color:var(--text2);margin-top:3px">
            Dari: <b>${d.dosenNama || 'Dosen Pembimbing'}</b> · 
            Batas: <b>${fmtTgl(d.deadlineMahasiswa.substring(0,10),{day:'numeric',month:'long',year:'numeric'})}</b>
          </div>
        </div>
      </div>
      ${d.deskripsi ? `<div style="margin-top:6px;font-size:0.82rem;color:var(--text2);line-height:1.5">${d.deskripsi}</div>` : ''}
      ${d.konsekuensi ? `<div style="margin-top:6px;font-size:0.78rem;color:var(--rose)">🚫 Konsekuensi jika tidak selesai: ${d.konsekuensi}</div>` : ''}
      ${statusInfo}
      ${konfirmasiBtn}
    </div>`;
  }).join('');
}

// ── Modal konfirmasi selesai (mahasiswa) ──────────────────────
function openKonfirmasiDeadline(id, judul) {
  state.pendingDeadlineKonfirmasi = id;
  document.getElementById('konfirmasi-deadline-judul').textContent = judul;
  document.getElementById('konfirmasi-deadline-pernyataan').value  = '';
  document.getElementById('konfirmasi-deadline-link').value        = '';
  const btn = document.getElementById('konfirmasi-deadline-btn');
  btn.disabled = false; btn.textContent = '✅ Kirim Konfirmasi';
  openModal('modal-konfirmasi-deadline');
}

async function submitKonfirmasiDeadline() {
  const id          = state.pendingDeadlineKonfirmasi;
  const pernyataan  = document.getElementById('konfirmasi-deadline-pernyataan').value.trim();
  const linkBitrix  = document.getElementById('konfirmasi-deadline-link').value.trim();

  if (!pernyataan)  return toast('Pernyataan wajib diisi', 'error');
  if (!linkBitrix)  return toast('Link Bitrix24 wajib diisi', 'error');
  if (!linkBitrix.startsWith('http')) return toast('Link harus diawali http:// atau https://', 'error');

  const btn = document.getElementById('konfirmasi-deadline-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Mengirim...';

  const res = await api('konfirmasiDeadline', { id, pernyataan, linkBitrix, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = '✅ Kirim Konfirmasi';

  if (!res.success) return toast(res.message, 'error');
  toast('✅ Konfirmasi terkirim! Menunggu verifikasi dosen pembimbingmu.', 'success');
  closeModal('modal-konfirmasi-deadline');
  state.pendingDeadlineKonfirmasi = null;
  await loadMahasiswaDeadlines();
  // Re-check blokir slot
  loadSlotPreviews();
}

// ── Cek apakah ada deadline yang blokir reservasi ─────────────
function hasDeadlineBlokir() {
  const deadlines = state.myDeadlines || [];
  const now       = Date.now();
  return deadlines.some(d => {
    if (d.status === 'verified' || d.status === 'expired') return false;
    const lewat = now > parseDeadlineTgl(d.deadlineMahasiswa).getTime();
    // Blokir jika: deadline sudah lewat & belum dikonfirmasi
    //           ATAU sudah dikonfirmasi tapi belum diverifikasi dosen & deadline lewat
    if (d.status === 'aktif' && lewat)             return true;
    if (d.status === 'selesai_menunggu' && lewat)  return true;
    return false;
  });
}

// ── Render banner blokir deadline di halaman slot ─────────────
function renderDeadlineBlokirBanner(container) {
  const deadlines  = state.myDeadlines || [];
  const now        = Date.now();
  const blokirList = deadlines.filter(d => {
    if (d.status === 'verified' || d.status === 'expired') return false;
    const lewat = now > parseDeadlineTgl(d.deadlineMahasiswa).getTime();
    return (d.status === 'aktif' && lewat) || (d.status === 'selesai_menunggu' && lewat);
  });

  if (!blokirList.length) return false;

  container.innerHTML = `
    <div style="background:rgba(244,63,94,0.07);border:1.5px solid rgba(244,63,94,0.35);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.8rem">🚫</span>
        <div>
          <div style="font-weight:700;font-size:1rem;color:var(--rose)">Reservasi Diblokir — Ada Deadline Terlewat</div>
          <div style="font-size:0.82rem;color:var(--text2);margin-top:2px">Selesaikan tugas berikut dan konfirmasi ke dosen pembimbingmu.</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${blokirList.map(d => {
          const menunggu = d.status === 'selesai_menunggu';
          return `<div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px">
            <div style="font-weight:700;font-size:0.88rem">${d.judul}</div>
            <div style="font-size:0.8rem;color:var(--text2);margin-top:2px">Deadline: ${fmtTgl(d.deadlineMahasiswa.substring(0,10),{day:'numeric',month:'long',year:'numeric'})}</div>
            ${menunggu
              ? `<div style="margin-top:6px;font-size:0.78rem;color:var(--sky)">⏳ Konfirmasi dikirim — menunggu verifikasi dosen</div>`
              : `<button class="btn btn-sm" style="margin-top:8px;background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);font-weight:700"
                         onclick="openKonfirmasiDeadline('${d.id}','${(d.judul||'').replace(/'/g,"\\'")}')">
                   ✅ Konfirmasi Selesai
                 </button>`
            }
          </div>`;
        }).join('')}
      </div>
    </div>`;
  return true;
}

// ============================================================
// HALAMAN DEADLINE MAHASISWA (tab penuh)
// ============================================================

function renderDeadlinePageMhs() {
  const c = document.getElementById('m-deadline-container');
  if (!c) return;

  const deadlines = state.myDeadlines || [];
  const now       = Date.now();

  // Update badge di nav
  const aktifCount = deadlines.filter(d => d.status === 'aktif' || d.status === 'selesai_menunggu').length;
  const badge = document.getElementById('m-deadline-badge');
  if (badge) { badge.textContent = aktifCount; badge.style.display = aktifCount > 0 ? 'inline' : 'none'; }

  if (!deadlines.length) {
    c.innerHTML = `<div class="empty-state">
      <div class="empty-icon">✅</div>
      <p style="font-weight:600">Tidak ada deadline aktif</p>
      <p style="font-size:0.82rem;color:var(--text3);margin-top:4px">Dosen pembimbingmu belum menetapkan deadline apapun saat ini.</p>
    </div>`;
    return;
  }

  // Pisah per status
  const groups = [
    { key: 'aktif_lewat',       label: '🚫 Deadline Terlewat — Perlu Dikonfirmasi', color: 'var(--rose)',   bg: 'rgba(244,63,94,0.06)',   border: 'rgba(244,63,94,0.3)'   },
    { key: 'selesai_menunggu',  label: '⏳ Sudah Dikonfirmasi — Menunggu Verifikasi Dosen', color: 'var(--sky)', bg: 'rgba(56,189,248,0.05)', border: 'rgba(56,189,248,0.25)' },
    { key: 'aktif_belum_lewat', label: '📋 Deadline Aktif',                         color: 'var(--amber)',  bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.25)' },
    { key: 'verified',          label: '✅ Sudah Terverifikasi',                     color: 'var(--green)',  bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.2)'  },
    { key: 'expired',           label: '🕒 Kedaluwarsa',                             color: 'var(--slate)',  bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.2)' },
  ];

  // Klasifikasi tiap deadline
  function getGroupKey(d) {
    if (d.status === 'verified')          return 'verified';
    if (d.status === 'expired')           return 'expired';
    if (d.status === 'selesai_menunggu')  return 'selesai_menunggu';
    const lewat = now > parseDeadlineTgl(d.deadlineMahasiswa).getTime();
    return lewat ? 'aktif_lewat' : 'aktif_belum_lewat';
  }

  const grouped = {};
  deadlines.forEach(d => {
    const k = getGroupKey(d);
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(d);
  });

  let html = '';

  groups.forEach(g => {
    const items = grouped[g.key];
    if (!items || !items.length) return;

    html += `<div style="margin-bottom:24px">
      <div style="font-size:0.78rem;font-weight:700;color:${g.color};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">${g.label} (${items.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px">`;

    items.forEach(d => {
      const dl        = parseDeadlineTgl(d.deadlineMahasiswa);
      const dlDosen   = d.deadlineDosen ? parseDeadlineTgl(d.deadlineDosen) : null;
      const lewat     = now > dl.getTime();
      const sisaHari  = Math.ceil((dl.getTime() - now) / 86400000);
      const groupKey  = getGroupKey(d);

      // Progress bar visual sisa waktu
      let progressBar = '';
      if (groupKey === 'aktif_belum_lewat' && d.createdAt) {
        const total   = dl.getTime() - parseDeadlineTgl(d.createdAt).getTime();
        const elapsed = now - parseDeadlineTgl(d.createdAt).getTime();
        const pct     = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        const barColor = pct >= 80 ? 'var(--rose)' : pct >= 60 ? 'var(--amber)' : 'var(--green)';
        progressBar = `<div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text3);margin-bottom:3px">
            <span>Waktu terpakai</span><span>${pct}%</span>
          </div>
          <div style="height:4px;background:var(--border2);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.4s"></div>
          </div>
        </div>`;
      }

      // Tombol aksi
      let aksiHTML = '';
      if (groupKey === 'aktif_lewat' || groupKey === 'aktif_belum_lewat') {
        aksiHTML = `<button class="btn btn-sm" style="margin-top:12px;background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);font-weight:700"
          onclick="openKonfirmasiDeadline('${d.id}','${(d.judul||'').replace(/'/g,"\\'")}')">
          ✅ Konfirmasi Sudah Selesai & Upload Bukti
        </button>`;
      } else if (groupKey === 'selesai_menunggu') {
        aksiHTML = `<div style="margin-top:10px;padding:8px 10px;background:rgba(56,189,248,0.08);border-radius:7px;font-size:0.8rem;color:var(--sky)">
          ✅ Konfirmasimu sudah diterima. Menunggu verifikasi dosen.
        </div>`;
        if (d.linkBitrix) {
          aksiHTML += `<div style="margin-top:6px;font-size:0.78rem;color:var(--text3)">
            🔗 Link yang dikirim: <a href="${d.linkBitrix}" target="_blank" style="color:var(--blue2)">${d.linkBitrix.length > 50 ? d.linkBitrix.substring(0,50)+'…' : d.linkBitrix}</a>
          </div>`;
        }
      } else if (groupKey === 'verified') {
        aksiHTML = `<div style="margin-top:10px;font-size:0.78rem;color:var(--green)">
          ✅ Terverifikasi pada ${d.verifikasiAt ? new Date(d.verifikasiAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—'}
        </div>`;
      }

      html += `<div style="border:1px solid ${g.border};background:${g.bg};border-radius:12px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div>
            <div style="font-weight:700;font-size:0.95rem">${d.judul}</div>
            <div style="font-size:0.8rem;color:var(--text2);margin-top:3px">Dari: <b>${d.dosenNama || 'Dosen Pembimbing'}</b></div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;font-size:0.88rem;color:${lewat && groupKey !== 'verified' ? 'var(--rose)' : 'var(--text1)'}">
              ${fmtTgl(d.deadlineMahasiswa.substring(0,10),{day:'numeric',month:'long',year:'numeric'})}
            </div>
            <div style="font-size:0.72rem;margin-top:2px;color:${lewat ? 'var(--rose)' : sisaHari <= 3 ? 'var(--amber)' : 'var(--text3)'}">
              ${groupKey === 'verified' ? '✅ Selesai' : groupKey === 'expired' ? 'Kedaluwarsa' : lewat ? '⚠️ Sudah lewat' : `Sisa ${sisaHari} hari`}
            </div>
          </div>
        </div>
        ${d.deskripsi ? `<div style="font-size:0.83rem;color:var(--text2);margin-bottom:6px;line-height:1.5">${d.deskripsi}</div>` : ''}
        ${d.konsekuensi ? `<div style="font-size:0.78rem;color:var(--rose);margin-bottom:4px">🚫 Konsekuensi: ${d.konsekuensi}</div>` : ''}
        ${dlDosen ? `<div style="font-size:0.75rem;color:var(--text3)">📅 Deadline review dosen: ${fmtTgl(d.deadlineDosen.substring(0,10),{day:'numeric',month:'long',year:'numeric'})}</div>` : ''}
        ${progressBar}
        ${aksiHTML}
        ${d.catatanTolak ? `<div style="margin-top:8px;padding:8px 10px;background:rgba(244,63,94,0.08);border-radius:7px;font-size:0.8rem;color:var(--rose)">
          ⚠️ Catatan dosen: ${d.catatanTolak}
        </div>` : ''}
      </div>`;
    });

    html += `</div></div>`;
  });

  c.innerHTML = html;
}
