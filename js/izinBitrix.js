// ============================================================
// izinBitrix.js — Izin Bimbingan via Bitrix
// Mahasiswa ajukan izin → Dosen ACC/Tolak →
// Mahasiswa kirim file ke Bitrix → konfirmasi link →
// Dosen tandai sudah dicek
// ============================================================

// ============================================================
// SISI MAHASISWA
// ============================================================

async function loadMahasiswaIzinBitrix() {
  const c = document.getElementById('m-izin-container');
  if (!c) return;
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getMahasiswaIzinBitrix', { token: state.token });
  if (!res.success) { c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`; return; }
  state.myIzinBitrix = res.izin || [];
  renderMahasiswaIzinBitrix(state.myIzinBitrix);
  updateIzinBadgeMhs();
}

function updateIzinBadgeMhs() {
  const badge = document.getElementById('m-izin-badge');
  if (!badge) return;
  // Badge merah jika ada yang di-ACC (menunggu mahasiswa kirim)
  const acc = (state.myIzinBitrix || []).filter(i => i.status === 'disetujui').length;
  badge.textContent   = acc;
  badge.style.display = acc > 0 ? 'inline' : 'none';
}

function renderMahasiswaIzinBitrix(list) {
  const c = document.getElementById('m-izin-container');
  if (!c) return;

  const now = Date.now();

  // Pisah: menunggu ACC, di-ACC (bisa kirim), selesai, ditolak
  const groups = [
    { key: 'disetujui',       label: '✅ Di-ACC — Silakan Kirim ke Bitrix',      color: 'var(--green)',  bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.3)'  },
    { key: 'menunggu',        label: '⏳ Menunggu Persetujuan Dosen',             color: 'var(--amber)',  bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.25)' },
    { key: 'sudah_kirim',     label: '📨 Sudah Kirim — Menunggu Dosen Cek',      color: 'var(--sky)',    bg: 'rgba(56,189,248,0.05)',  border: 'rgba(56,189,248,0.2)'  },
    { key: 'selesai',         label: '🎯 Selesai Dicek Dosen',                    color: 'var(--purple)', bg: 'rgba(139,92,246,0.05)',  border: 'rgba(139,92,246,0.2)'  },
    { key: 'ditolak',         label: '❌ Ditolak',                                color: 'var(--rose)',   bg: 'rgba(244,63,94,0.05)',   border: 'rgba(244,63,94,0.2)'   },
  ];

  const grouped = {};
  list.forEach(i => {
    if (!grouped[i.status]) grouped[i.status] = [];
    grouped[i.status].push(i);
  });

  if (!list.length) {
    c.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📤</div>
      <p style="font-weight:600">Belum ada pengajuan izin Bitrix</p>
      <p style="font-size:0.82rem;color:var(--text3);margin-top:4px">Klik tombol di atas untuk mengajukan izin bimbingan via Bitrix.</p>
    </div>`;
    return;
  }

  let html = '';
  groups.forEach(g => {
    const items = grouped[g.key];
    if (!items || !items.length) return;
    html += `<div style="margin-bottom:22px">
      <div style="font-size:0.78rem;font-weight:700;color:${g.color};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">${g.label} (${items.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px">`;

    items.forEach(i => {
      const tglAjuan = i.createdAt ? new Date(i.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—';
      const tglAcc   = i.accAt     ? new Date(i.accAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})     : null;

      let aksiHTML = '';
      if (i.status === 'disetujui') {
        aksiHTML = `
          <div style="margin-top:10px;padding:10px 12px;background:rgba(16,185,129,0.08);border-radius:8px;font-size:0.82rem;color:var(--green);line-height:1.5">
            ✅ Dosenmu sudah menyetujui pengajuan ini pada <b>${tglAcc || '—'}</b>.<br>
            Silakan kirim file ke Bitrix24, lalu konfirmasi di bawah dengan menempelkan linknya.
          </div>
          <button class="btn btn-sm" style="margin-top:10px;background:rgba(56,189,248,0.15);color:var(--sky);border:1px solid rgba(56,189,248,0.3);font-weight:700"
            onclick="openKonfirmasiKirimBitrix('${i.id}','${(i.topik||'').replace(/'/g,"\\'")}')">
            📨 Konfirmasi Sudah Kirim ke Bitrix
          </button>`;
      } else if (i.status === 'sudah_kirim') {
        aksiHTML = `
          <div style="margin-top:8px;font-size:0.8rem;color:var(--sky)">
            📨 File sudah dikonfirmasi dikirim. Menunggu dosen membuka dan mengecek.
          </div>
          ${i.linkBitrix ? `<div style="margin-top:4px;font-size:0.77rem;color:var(--text3)">
            🔗 <a href="${i.linkBitrix}" target="_blank" style="color:var(--blue2)">${i.linkBitrix.length>55?i.linkBitrix.substring(0,55)+'…':i.linkBitrix}</a>
          </div>` : ''}`;
      } else if (i.status === 'selesai') {
        aksiHTML = `
          <div style="margin-top:8px;font-size:0.8rem;color:var(--purple)">
            🎯 Dosen sudah mengecek filenya${i.catatanDosen ? ` dengan catatan:` : '.'}
          </div>
          ${i.catatanDosen ? `<div style="margin-top:6px;padding:8px 10px;background:rgba(139,92,246,0.08);border-radius:7px;font-size:0.82rem;color:var(--text2)">"${i.catatanDosen}"</div>` : ''}`;
      } else if (i.status === 'ditolak') {
        aksiHTML = `
          <div style="margin-top:8px;padding:8px 10px;background:rgba(244,63,94,0.08);border-radius:7px;font-size:0.82rem;color:var(--rose)">
            ❌ ${i.alasanTolak || 'Pengajuan ditolak. Silakan hubungi dosen via Chat untuk informasi lebih lanjut.'}
          </div>`;
      }

      html += `<div style="border:1px solid ${g.border};background:${g.bg};border-radius:12px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div style="font-weight:700;font-size:0.92rem">${i.topik}</div>
          <div style="font-size:0.72rem;color:var(--text3)">${tglAjuan}</div>
        </div>
        ${i.deskripsi ? `<div style="font-size:0.82rem;color:var(--text2);margin-bottom:6px;line-height:1.5">${i.deskripsi}</div>` : ''}
        ${i.fileDeskripsi ? `<div style="font-size:0.78rem;color:var(--text3);margin-bottom:4px">📎 File: ${i.fileDeskripsi}</div>` : ''}
        <div style="font-size:0.75rem;color:var(--text3)">Dosen: <b>${i.dosenNama || 'Pembimbing'}</b></div>
        ${aksiHTML}
      </div>`;
    });

    html += `</div></div>`;
  });

  c.innerHTML = html;
}

// ── Buka modal ajukan izin ────────────────────────────────────
function openAjukanIzinBitrix() {
  document.getElementById('izin-topik').value       = '';
  document.getElementById('izin-deskripsi').value   = '';
  document.getElementById('izin-file-desk').value   = '';
  document.getElementById('izin-dosen-sel').value   = state.user?.dosenKode1 || '';
  const btn = document.getElementById('izin-submit-btn');
  btn.disabled = false; btn.textContent = '📤 Ajukan Izin';
  openModal('modal-izin-bitrix');
}

async function submitIzinBitrix() {
  const topik      = document.getElementById('izin-topik').value.trim();
  const deskripsi  = document.getElementById('izin-deskripsi').value.trim();
  const fileDeskripsi = document.getElementById('izin-file-desk').value.trim();
  const dosenKode  = document.getElementById('izin-dosen-sel').value;

  if (!topik)     return toast('Topik wajib diisi', 'error');
  if (!dosenKode) return toast('Pilih dosen pembimbing', 'error');

  const btn = document.getElementById('izin-submit-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Mengajukan...';

  const res = await api('ajukanIzinBitrix', { topik, deskripsi, fileDeskripsi, dosenKode, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = '📤 Ajukan Izin';

  if (!res.success) return toast(res.message, 'error');
  toast('✅ Pengajuan izin terkirim! Tunggu persetujuan dosen.', 'success');
  closeModal('modal-izin-bitrix');
  loadMahasiswaIzinBitrix();
}

// ── Modal konfirmasi sudah kirim ke Bitrix ────────────────────
function openKonfirmasiKirimBitrix(id, topik) {
  state.pendingIzinKonfirmasi = id;
  document.getElementById('konfirmasi-bitrix-topik').textContent = topik;
  document.getElementById('konfirmasi-bitrix-link').value        = '';
  document.getElementById('konfirmasi-bitrix-catatan').value     = '';
  const btn = document.getElementById('konfirmasi-bitrix-btn');
  btn.disabled = false; btn.textContent = '📨 Konfirmasi Sudah Kirim';
  openModal('modal-konfirmasi-bitrix');
}

async function submitKonfirmasiKirimBitrix() {
  const id      = state.pendingIzinKonfirmasi;
  const link    = document.getElementById('konfirmasi-bitrix-link').value.trim();
  const catatan = document.getElementById('konfirmasi-bitrix-catatan').value.trim();

  if (!link) return toast('Link Bitrix24 wajib diisi', 'error');
  if (!link.startsWith('http')) return toast('Link harus diawali http:// atau https://', 'error');

  const btn = document.getElementById('konfirmasi-bitrix-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Mengirim...';

  const res = await api('konfirmasiKirimBitrix', { id, linkBitrix: link, catatan, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = '📨 Konfirmasi Sudah Kirim';

  if (!res.success) return toast(res.message, 'error');
  toast('✅ Konfirmasi terkirim! Dosen akan segera mengecek filenya.', 'success');
  closeModal('modal-konfirmasi-bitrix');
  state.pendingIzinKonfirmasi = null;
  loadMahasiswaIzinBitrix();
}

// ============================================================
// SISI DOSEN
// ============================================================

async function loadDosenIzinBitrix() {
  const c = document.getElementById('d-izin-container');
  if (!c) return;
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getDosenIzinBitrix', { token: state.token });
  if (!res.success) { c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`; return; }
  state.dosenIzinBitrix = res.izin || [];
  renderDosenIzinBitrix(state.dosenIzinBitrix);
  updateIzinBadgeDosen();
}

function updateIzinBadgeDosen() {
  const badge = document.getElementById('d-izin-badge');
  if (!badge) return;
  const pending = (state.dosenIzinBitrix || []).filter(i => i.status === 'menunggu' || i.status === 'sudah_kirim').length;
  badge.textContent   = pending;
  badge.style.display = pending > 0 ? 'inline' : 'none';
}

function renderDosenIzinBitrix(list) {
  const c = document.getElementById('d-izin-container');
  if (!c) return;

  if (!list.length) {
    c.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada pengajuan izin Bitrix</p></div>`;
    return;
  }

  const groups = [
    { key: 'sudah_kirim', label: '📨 File Sudah Dikirim — Perlu Dicek',       color: 'var(--sky)',    bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.3)'  },
    { key: 'menunggu',    label: '⏳ Menunggu Persetujuan',                    color: 'var(--amber)',  bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.25)' },
    { key: 'disetujui',   label: '✅ Sudah Di-ACC — Menunggu Mahasiswa Kirim', color: 'var(--green)',  bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.2)'  },
    { key: 'selesai',     label: '🎯 Selesai',                                  color: 'var(--purple)', bg: 'rgba(139,92,246,0.05)',  border: 'rgba(139,92,246,0.2)'  },
    { key: 'ditolak',     label: '❌ Ditolak',                                  color: 'var(--rose)',   bg: 'rgba(244,63,94,0.05)',   border: 'rgba(244,63,94,0.2)'   },
  ];

  const grouped = {};
  list.forEach(i => {
    if (!grouped[i.status]) grouped[i.status] = [];
    grouped[i.status].push(i);
  });

  let html = '';
  groups.forEach(g => {
    const items = grouped[g.key];
    if (!items || !items.length) return;
    html += `<div style="margin-bottom:22px">
      <div style="font-size:0.78rem;font-weight:700;color:${g.color};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">${g.label} (${items.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px">`;

    items.forEach(i => {
      const tglAjuan = i.createdAt ? new Date(i.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—';

      let aksiHTML = '';
      if (i.status === 'menunggu') {
        aksiHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-sm" style="background:var(--green);color:white;border:none;font-weight:700"
            onclick="accIzinBitrix('${i.id}')">✅ ACC — Boleh Kirim ke Bitrix</button>
          <button class="btn btn-rose btn-sm"
            onclick="tolakIzinBitrix('${i.id}')">❌ Tolak</button>
        </div>`;
      } else if (i.status === 'sudah_kirim') {
        aksiHTML = `
          ${i.linkBitrix ? `<div style="margin-top:8px;padding:8px 10px;background:rgba(56,189,248,0.08);border-radius:7px;font-size:0.82rem">
            🔗 Link Bitrix: <a href="${i.linkBitrix}" target="_blank" style="color:var(--blue2);word-break:break-all">${i.linkBitrix}</a>
          </div>` : ''}
          ${i.catatanMhs ? `<div style="margin-top:6px;font-size:0.8rem;color:var(--text2)">📝 Catatan mahasiswa: ${i.catatanMhs}</div>` : ''}
          <button class="btn btn-sm" style="margin-top:10px;background:rgba(139,92,246,0.15);color:var(--purple);border:1px solid rgba(139,92,246,0.3);font-weight:700"
            onclick="openSelesaiIzinBitrix('${i.id}','${(i.topik||'').replace(/'/g,"\\'")}')">
            🎯 Tandai Sudah Dicek
          </button>`;
      } else if (i.status === 'selesai') {
        aksiHTML = `
          ${i.linkBitrix ? `<div style="margin-top:6px;font-size:0.77rem;color:var(--text3)">🔗 <a href="${i.linkBitrix}" target="_blank" style="color:var(--blue2)">${i.linkBitrix.length>55?i.linkBitrix.substring(0,55)+'…':i.linkBitrix}</a></div>` : ''}
          ${i.catatanDosen ? `<div style="margin-top:6px;padding:6px 10px;background:rgba(139,92,246,0.08);border-radius:6px;font-size:0.8rem;color:var(--text2)">Catatanmu: "${i.catatanDosen}"</div>` : ''}`;
      } else if (i.status === 'ditolak') {
        aksiHTML = `<div style="margin-top:6px;font-size:0.8rem;color:var(--rose)">${i.alasanTolak || 'Ditolak'}</div>`;
      }

      html += `<div style="border:1px solid ${g.border};background:${g.bg};border-radius:12px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div>
            <div style="font-weight:700;font-size:0.92rem">${i.topik}</div>
            <div style="font-size:0.8rem;color:var(--text2);margin-top:3px">
              👤 <b>${i.mahasiswaNama || i.mahasiswaKode}</b>
              <code style="font-size:0.72rem;background:var(--card2);padding:1px 5px;border-radius:4px;margin-left:4px">${i.mahasiswaKode}</code>
            </div>
          </div>
          <div style="font-size:0.72rem;color:var(--text3)">${tglAjuan}</div>
        </div>
        ${i.deskripsi ? `<div style="font-size:0.82rem;color:var(--text2);margin-bottom:6px;line-height:1.5">${i.deskripsi}</div>` : ''}
        ${i.fileDeskripsi ? `<div style="font-size:0.78rem;color:var(--text3)">📎 File yang akan dikirim: <b>${i.fileDeskripsi}</b></div>` : ''}
        ${aksiHTML}
      </div>`;
    });

    html += `</div></div>`;
  });

  c.innerHTML = html;
}

// ── ACC pengajuan ─────────────────────────────────────────────
async function accIzinBitrix(id) {
  if (!confirm('Setujui pengajuan ini? Mahasiswa akan mendapat notifikasi bahwa boleh mengirim file ke Bitrix.')) return;
  const res = await api('accIzinBitrix', { id, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('✅ Pengajuan di-ACC! Mahasiswa boleh kirim ke Bitrix.', 'success');
  loadDosenIzinBitrix();
}

// ── Tolak pengajuan ───────────────────────────────────────────
async function tolakIzinBitrix(id) {
  const alasan = prompt('Alasan penolakan (akan dikirim ke mahasiswa):');
  if (alasan === null) return;
  const res = await api('tolakIzinBitrix', { id, alasan: alasan || 'Pengajuan ditolak oleh dosen.', token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Pengajuan ditolak.', 'info');
  loadDosenIzinBitrix();
}

// ── Modal tandai sudah dicek ──────────────────────────────────
function openSelesaiIzinBitrix(id, topik) {
  state.pendingIzinSelesai = id;
  document.getElementById('selesai-bitrix-topik').textContent = topik;
  document.getElementById('selesai-bitrix-catatan').value     = '';
  const btn = document.getElementById('selesai-bitrix-btn');
  btn.disabled = false; btn.textContent = '🎯 Tandai Selesai';
  openModal('modal-selesai-bitrix');
}

async function submitSelesaiIzinBitrix() {
  const id      = state.pendingIzinSelesai;
  const catatan = document.getElementById('selesai-bitrix-catatan').value.trim();

  const btn = document.getElementById('selesai-bitrix-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Menyimpan...';

  const res = await api('selesaiIzinBitrix', { id, catatan, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = '🎯 Tandai Selesai';

  if (!res.success) return toast(res.message, 'error');
  toast('🎯 Ditandai selesai! Mahasiswa mendapat notifikasi.', 'success');
  closeModal('modal-selesai-bitrix');
  state.pendingIzinSelesai = null;
  loadDosenIzinBitrix();
}

// ── Filter ────────────────────────────────────────────────────
function filterDosenIzinBitrix(status, btn) {
  document.querySelectorAll('#d-izin .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = status === 'all'
    ? state.dosenIzinBitrix
    : (state.dosenIzinBitrix || []).filter(i => i.status === status);
  renderDosenIzinBitrix(f);
}
