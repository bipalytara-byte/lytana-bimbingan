// ============================================================
// shared.js — Booking Table, Validasi, Cancel Booking
// Dipakai bersama oleh halaman Dosen dan Admin
// ============================================================

// ── Booking Table ─────────────────────────────────────────────
function bookingTable(bookings, withFoto = false) {
  const sl = { menunggu: 'badge-amber', disetujui: 'badge-blue', terselenggara: 'badge-green', tidak_terselenggara: 'badge-rose', dibatalkan: 'badge-slate' };
  const ll = { menunggu: 'Menunggu ACC', disetujui: 'Di-ACC', terselenggara: 'Terselenggara', tidak_terselenggara: 'Tidak Terjadi', dibatalkan: 'Dibatalkan' };
  const sorted = [...bookings].sort((a, b) => {
    const tA = (a.slot?.tanggal || '') + 'T' + (a.slot?.jamMulai || '');
    const tB = (b.slot?.tanggal || '') + 'T' + (b.slot?.jamMulai || '');
    return tA.localeCompare(tB);
  });
  return `<div class="table-wrap"><table>
    <thead><tr><th>Mahasiswa</th>${withFoto ? '<th>Foto</th>' : ''}<th>Sesi ↑ Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${sorted.map(b => {
      const slot = b.slot || {}, mhs = b.mahasiswa || {};
      const tgl       = fmtTgl(slot.tanggal, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const fotoCell  = withFoto ? `<td>${renderAvatar(mhs.foto, mhs.nama, 36)}</td>` : '';
      const kartuBadge = (mhs.kartuMerahCount > 0) ? `<span class="kartu-merah" style="font-size:0.65rem;margin-left:4px">🔴×${mhs.kartuMerahCount}</span>` : '';

      let aksiHTML = '';
      if (b.status === 'menunggu') {
        aksiHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm" style="background:var(--blue);color:white;border:none" onclick="doAcc('${b.id}')">✓ ACC</button>
          <button class="btn btn-ghost btn-sm" onclick="doTolak('${b.id}')">Tolak</button>
          <button class="btn btn-rose btn-sm" onclick='openDosenCancel(${JSON.stringify(b).replace(/'/g, "\\'")})' title="Batalkan reservasi">🚫 Cancel</button>
        </div>`;
      } else if (b.status === 'disetujui') {
        aksiHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-teal btn-sm" onclick='openValidasi(${JSON.stringify(b).replace(/'/g, "\\'")})'>Selesai Bimbingan</button>
          <button class="btn btn-rose btn-sm" onclick='openDosenCancel(${JSON.stringify(b).replace(/'/g, "\\'")})' title="Batalkan reservasi">🚫 Cancel</button>
        </div>`;
      } else {
        aksiHTML = `<span style="font-size:0.8rem;color:var(--text3)">Selesai</span>`;
      }

      return `<tr>
        <td><div style="font-weight:600;display:flex;align-items:center;gap:4px">${mhs.nama || b.kode}${kartuBadge}</div><div style="font-size:0.78rem;color:var(--text3)">${b.kode}</div></td>
        ${fotoCell}
        <td><span class="badge badge-${slot.tipe === 'offline' ? 'blue' : 'teal'}" style="margin-bottom:4px;display:inline-block">${slot.tipe || '—'}</span>
          <div style="font-size:0.82rem;font-weight:600">${tgl}</div>
          <div style="font-size:0.78rem;color:var(--text3)">${slot.jamMulai || ''}${slot.jamSelesai ? '–' + slot.jamSelesai : ''}</div></td>
        <td><span class="badge ${sl[b.status] || 'badge-slate'}">${ll[b.status] || b.status}</span></td>
        <td>${aksiHTML}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

// ── Validasi Booking ──────────────────────────────────────────
function openValidasi(b) {
  state.pendingValidateId = b.id;
  const slot = b.slot || {}, mhs = b.mahasiswa || {};
  const tgl  = fmtTgl(slot.tanggal, { weekday: 'long', day: 'numeric', month: 'long' });
  const sesi = slot.jamMulai ? `${slot.jamMulai} – ${slot.jamSelesai}` : '—';
  document.getElementById('validasi-content').innerHTML = `
    <div class="card" style="background:var(--card2);margin-bottom:0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        ${renderAvatar(mhs.foto, mhs.nama, 48)}
        <div><div style="font-weight:700">${mhs.nama || b.kode}</div><div style="font-size:0.82rem;color:var(--text2)">${b.kode}</div></div>
      </div>
      <div style="display:grid;gap:8px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Jenis</span><span class="badge badge-${slot.tipe === 'offline' ? 'blue' : 'teal'}">${slot.tipe || '—'}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Tanggal</span><b>${tgl}</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Sesi</span><b style="font-family:var(--font2)">${sesi}</b></div>
      </div>
    </div>`;
  document.getElementById('validasi-catatan').value = '';
  openModal('modal-validasi');
}

async function doValidate(status) {
  const catatan = document.getElementById('validasi-catatan').value;
  const res = await api('validateBooking', { bookId: state.pendingValidateId, status, catatan, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Reservasi divalidasi: ' + status.replace('_', ' '), 'success');
  closeModal('modal-validasi'); state.pendingValidateId = null;
  if (state.user?.role === 'dosen') { loadDosenBookings(); loadDosenDashboard(); }
  else { loadAdminBookings(); loadAdminDashboard(); }
}

async function doAcc(bookId) {
  if (!confirm('Setujui (ACC) reservasi ini?')) return;
  const res = await api('validateBooking', { bookId, status: 'disetujui', catatan: '', token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Reservasi berhasil di-ACC!', 'success');
  if (state.user?.role === 'dosen') { loadDosenBookings(); loadDosenDashboard(); }
  else { loadAdminBookings(); loadAdminDashboard(); }
}

async function doTolak(bookId) {
  const catatan = prompt('Alasan menolak (opsional):');
  if (catatan === null) return;
  const res = await api('validateBooking', { bookId, status: 'dibatalkan', catatan, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Reservasi telah ditolak', 'info');
  if (state.user?.role === 'dosen') { loadDosenBookings(); loadDosenDashboard(); }
  else { loadAdminBookings(); loadAdminDashboard(); }
}

// ── Dosen Cancel Booking ──────────────────────────────────────
let _dosenCancelBookId = null;

function openDosenCancel(b) {
  _dosenCancelBookId = b.id;
  const slot = b.slot || {}, mhs = b.mahasiswa || {};
  const tgl  = fmtTgl(slot.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const statusLabel = b.status === 'disetujui' ? '👍 Sudah Di-ACC' : '⏳ Menunggu ACC';
  document.getElementById('dosen-cancel-info').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
        <b style="font-size:0.95rem">${mhs.nama || b.kode}</b>
        <span style="font-size:0.75rem;background:rgba(244,63,94,0.12);color:var(--rose);padding:2px 8px;border-radius:20px">${statusLabel}</span>
      </div>
      <div style="font-size:0.85rem;color:var(--text2)">📅 ${tgl}</div>
      <div style="font-size:0.85rem;color:var(--text2)">⏰ ${slot.jamMulai || ''}–${slot.jamSelesai || ''} · <span class="badge badge-${slot.tipe === 'offline' ? 'blue' : 'teal'}" style="font-size:0.7rem">${slot.tipe || ''}</span></div>
    </div>`;
  document.getElementById('dosen-cancel-alasan').value = '';
  const btn = document.getElementById('dosen-cancel-confirm-btn');
  btn.disabled = false; btn.textContent = '🚫 Ya, Batalkan Reservasi';
  openModal('modal-dosen-cancel');
}

async function confirmDosenCancel() {
  const bookId = _dosenCancelBookId; if (!bookId) return;
  const alasan = document.getElementById('dosen-cancel-alasan').value.trim();
  if (!alasan) {
    document.getElementById('dosen-cancel-alasan').style.borderColor = 'var(--rose)';
    document.getElementById('dosen-cancel-alasan').placeholder = '⚠️ Alasan wajib diisi sebelum membatalkan...';
    return;
  }
  document.getElementById('dosen-cancel-alasan').style.borderColor = '';
  const btn = document.getElementById('dosen-cancel-confirm-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Membatalkan...';
  const res = await api('dosenCancelBooking', { bookId, alasan, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = '🚫 Ya, Batalkan Reservasi';
  if (!res.success) return toast(res.message, 'error');
  toast(`✅ Reservasi ${res.mahasiswaNama || ''} berhasil dibatalkan. Slot kembali terbuka.`, 'success');
  closeModal('modal-dosen-cancel'); _dosenCancelBookId = null;
  loadDosenBookings(); loadDosenSlots(); loadSlotPreviews();
}
