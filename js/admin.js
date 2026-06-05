// ============================================================
// admin.js — Halaman Admin: Dashboard, Dosen, Mahasiswa, Bookings, Slots
// ============================================================

// ── Dashboard ─────────────────────────────────────────────────
async function loadAdminDashboard() {
  const res = await api('getDashboardStats', { token: state.token });
  if (res.success) {
    const s = res.stats;
    document.getElementById('a-stat-dosen').textContent   = s.totalDosen;
    document.getElementById('a-stat-mhs').textContent     = s.totalMahasiswa;
    document.getElementById('a-stat-sesi').textContent    = s.totalSlots;
    document.getElementById('a-stat-book').textContent    = s.totalBookings;
    document.getElementById('a-stat-pending').textContent = s.pendingCount;
    document.getElementById('a-stat-done').textContent    = s.confirmedCount;
    if (s.statusCount) {
      document.getElementById('a-s-aktif').textContent   = s.statusCount.aktif_bimbingan || 0;
      document.getElementById('a-s-inaktif').textContent = s.statusCount.tidak_aktif     || 0;
      document.getElementById('a-s-revisi').textContent  = s.statusCount.revisi          || 0;
      document.getElementById('a-s-sidang').textContent  = s.statusCount.menunggu_sidang || 0;
      document.getElementById('a-s-lulus').textContent   = s.statusCount.lulus           || 0;
    }
  }
  const bRes    = await api('getAllBookings', { token: state.token });
  const c       = document.getElementById('a-recent-bookings');
  const pending = (bRes.bookings || []).filter(b => b.status === 'menunggu' || b.status === 'disetujui').slice(0, 5);
  if (!pending.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>Tidak ada reservasi yang menunggu</p></div>'; return; }
  c.innerHTML = bookingTable(pending, true);
}

// ── Dosen ─────────────────────────────────────────────────────
async function loadAdminDosen() {
  const c = document.getElementById('a-dosen-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getAllDosen', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.allDosen = res.dosen;
  if (!state.allDosen.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍🏫</div><p>Belum ada dosen terdaftar</p></div>'; return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Foto</th><th>Nama</th><th>Kode</th><th>Prodi</th><th>Email</th><th>Terdaftar</th><th>Aksi</th></tr></thead>
    <tbody>${state.allDosen.map(d => `<tr>
      <td>${renderAvatar(d.foto, d.nama, 36)}</td>
      <td style="font-weight:600">${d.nama}</td>
      <td><code style="background:var(--card2);padding:2px 8px;border-radius:4px;font-size:0.8rem">${d.kode}</code></td>
      <td style="color:var(--text2)">${d.prodi || '—'}</td>
      <td style="color:var(--text2)">${d.email}</td>
      <td style="color:var(--text3);font-size:0.8rem">${d.createdAt ? new Date(d.createdAt).toLocaleDateString('id-ID') : '—'}</td>
      <td><button class="btn btn-rose btn-sm" onclick="deleteDosenConfirm('${d.kode}','${d.nama.replace(/'/g, "\\'")}')">Hapus</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function deleteDosenConfirm(kode, nama) {
  if (!confirm(`Hapus dosen "${nama}" (${kode})?\n\nSemua slot dan datanya tetap ada di spreadsheet.`)) return;
  const res = await api('deleteDosen', { kode, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Dosen dihapus', 'info'); loadAdminDosen();
}

// ── Mahasiswa ─────────────────────────────────────────────────
async function loadAdminUsers() {
  const c = document.getElementById('a-users-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getAllUsers', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.allUsers = res.users;
  renderAdminUsers(state.allUsers);
}

function renderAdminUsers(users) {
  const c = document.getElementById('a-users-container');
  if (!users.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Belum ada mahasiswa</p></div>'; return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Foto</th><th>Nama</th><th>Kode</th><th>Status Skripsi</th><th>Pembimbing 1 & 2</th><th>Terakhir Aktif</th><th>Aksi</th></tr></thead>
    <tbody>${users.map(u => `<tr>
      <td>${renderAvatar(u.foto, u.nama, 36)}</td>
      <td style="font-weight:600">${u.nama}</td>
      <td><code style="background:var(--card2);padding:2px 8px;border-radius:4px;font-size:0.8rem">${u.kode}</code></td>
      <td>${statusBadge(u.statusSkripsi)}</td>
      <td style="font-size:0.85rem;color:var(--text2)">
        <div style="margin-bottom:2px"><span style="color:var(--text3)">1:</span> ${u.dosenNama1 || '<span style="color:var(--text3)">Belum dipilih</span>'}</div>
        <div><span style="color:var(--text3)">2:</span> ${u.dosenNama2 || '<span style="color:var(--text3)">Belum dipilih</span>'}</div>
      </td>
      <td style="font-size:0.78rem;color:var(--text3)">${daysSinceStr(u.lastActivity)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-amber btn-sm" onclick="openResetKode('${u.kode}')">Reset Kode</button>
        <button class="btn btn-rose btn-sm" onclick="deleteUserConfirm('${u.kode}','${u.nama.replace(/'/g, "\\'")}')">Hapus</button>
      </td>
    </tr>`).join('')}</tbody></table></div>`;
}

function filterAdminUsers(q) {
  const f = state.allUsers.filter(u =>
    u.nama.toLowerCase().includes(q.toLowerCase()) ||
    u.kode.toLowerCase().includes(q.toLowerCase()) ||
    (u.dosenNama1 || '').toLowerCase().includes(q.toLowerCase()) ||
    (u.dosenNama2 || '').toLowerCase().includes(q.toLowerCase())
  );
  renderAdminUsers(f);
}

async function deleteUserConfirm(kode, nama) {
  if (!confirm(`Hapus mahasiswa "${nama}" (${kode})? Tindakan tidak dapat dibatalkan.`)) return;
  const res = await api('deleteUser', { kode, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Mahasiswa dihapus', 'info'); loadAdminUsers();
}

function openResetKode(kode) {
  state.pendingResetKode = kode;
  document.getElementById('reset-kode-lama').value = kode;
  document.getElementById('reset-kode-baru').value = '';
  openModal('modal-reset-kode');
}

async function doResetKode() {
  const newKode = document.getElementById('reset-kode-baru').value.trim();
  if (!newKode) return toast('Masukkan kode baru', 'error');
  const res = await api('resetStudentCode', { kode: state.pendingResetKode, newKode, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Kode berhasil direset! Mahasiswa harus login ulang.', 'success');
  closeModal('modal-reset-kode'); state.pendingResetKode = null; loadAdminUsers();
}

// ── Bookings ──────────────────────────────────────────────────
async function loadAdminBookings() {
  const c = document.getElementById('a-bookings-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getAllBookings', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.allBookings = res.bookings;
  renderAdminBookings(state.allBookings);
}

function renderAdminBookings(bookings) {
  const c = document.getElementById('a-bookings-container');
  if (!bookings.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada reservasi</p></div>'; return; }
  c.innerHTML = bookingTable(bookings, true);
}

function filterAdminBookings(status, btn) {
  document.querySelectorAll('#a-bookings .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = status === 'all' ? state.allBookings : state.allBookings.filter(b => b.status === status);
  renderAdminBookings(f);
}

// ── Slots ─────────────────────────────────────────────────────
async function loadAdminSlots() {
  const c = document.getElementById('a-slots-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getAllSlots', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.allSlots = res.slots;
  if (!state.allSlots.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Belum ada sesi</p></div>'; return; }

  const dr = await api('getAllDosen', { token: state.token });
  const dm = {}; (dr.dosen || []).forEach(d => dm[d.kode] = d.nama);

  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Dosen</th><th>Jenis</th><th>Tanggal</th><th>Sesi</th><th>Status</th><th>Dipesan Oleh</th><th>Catatan</th></tr></thead>
    <tbody>${state.allSlots.map(s => {
      const terisi = s.bookedBy && s.bookedBy !== '';
      return `<tr>
        <td style="font-size:0.82rem;color:var(--text2)">${dm[s.dosenKode] || s.dosenKode || '—'}</td>
        <td><span class="badge badge-${s.tipe === 'offline' ? 'blue' : 'teal'}">${s.tipe}</span></td>
        <td>${fmtTgl(s.tanggal, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td style="font-family:var(--font2);font-weight:600">${s.jamMulai} – ${s.jamSelesai}</td>
        <td>${terisi ? '<span class="badge badge-rose">Terisi</span>' : '<span class="badge badge-green">Tersedia</span>'}</td>
        <td style="font-size:0.82rem">${terisi ? `<code style="background:var(--card2);padding:2px 7px;border-radius:4px">${s.bookedBy}</code>` : '—'}</td>
        <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2)">${s.catatan || '—'}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}
