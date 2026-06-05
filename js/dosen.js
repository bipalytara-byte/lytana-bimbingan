// ============================================================
// dosen.js — Halaman Dosen: Dashboard, Sesi, Reservasi, Mahasiswa, Profil
// ============================================================

// ── Dashboard ─────────────────────────────────────────────────
async function loadDosenDashboard() {
  const res = await api('getDosenDashboard', { token: state.token });
  if (res.success) {
    const s = res.stats;
    document.getElementById('d-stat-mhs').textContent      = s.totalMahasiswa;
    document.getElementById('d-stat-sesi').textContent     = s.totalSesi;
    document.getElementById('d-stat-pending').textContent  = s.pendingCount;
    document.getElementById('d-stat-tersedia').textContent = s.sesiTersedia;
    document.getElementById('d-stat-terisi').textContent   = s.sesiTerisi;
    document.getElementById('d-stat-done').textContent     = s.terselenggaraCount;
    if (document.getElementById('d-stat-hangus'))
      document.getElementById('d-stat-hangus').textContent = s.sesiHangus || 0;
    if (s.statusCount) {
      document.getElementById('d-s-aktif').textContent   = s.statusCount.aktif_bimbingan || 0;
      document.getElementById('d-s-inaktif').textContent = s.statusCount.tidak_aktif     || 0;
      document.getElementById('d-s-revisi').textContent  = s.statusCount.revisi          || 0;
      document.getElementById('d-s-sidang').textContent  = s.statusCount.menunggu_sidang || 0;
      document.getElementById('d-s-lulus').textContent   = s.statusCount.lulus           || 0;
    }
  }
  const bRes    = await api('getMyBookingsAll', { token: state.token });
  const c       = document.getElementById('d-recent-bookings');
  const pending = (bRes.bookings || []).filter(b => b.status === 'menunggu' || b.status === 'disetujui').slice(0, 5);
  if (!pending.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>Tidak ada reservasi yang menunggu tindakan</p></div>'; return; }
  c.innerHTML = bookingTable(pending, false);
}

// ── Sesi ──────────────────────────────────────────────────────
async function loadDosenSlots() {
  const c = document.getElementById('d-slots-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getMySlots', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.dosenSlots = res.slots;
  renderDosenSlots(state.dosenSlots);
}

function renderDosenSlots(slots) {
  const c = document.getElementById('d-slots-container');
  const draftCount = (state.dosenSlots || []).filter(s => s.statusSlot === 'draft').length;

  if (!slots.length) {
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Belum ada sesi. Klik "+ Tambah Sesi".</p></div>';
    return;
  }
  const now      = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  const draftBanner = draftCount > 0 ? `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;
                background:rgba(245,158,11,0.09);border:1px solid rgba(245,158,11,0.28);
                border-radius:10px;padding:12px 16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.3rem">📝</span>
        <div>
          <div style="font-weight:700;font-size:0.9rem;color:var(--amber)">${draftCount} Sesi dalam Draft</div>
          <div style="font-size:0.78rem;color:var(--text2);margin-top:2px">Sesi ini belum tampil ke mahasiswa. Publish jika sudah siap dibuka reservasinya.</div>
        </div>
      </div>
      <button class="btn btn-sm" style="background:rgba(245,158,11,0.18);color:var(--amber);border:1px solid rgba(245,158,11,0.35);white-space:nowrap;font-weight:700"
              onclick="publishAllDrafts()">🚀 Publish Semua Draft</button>
    </div>` : '';

  c.innerHTML = draftBanner + `<div class="table-wrap"><table>
    <thead><tr><th>Jenis</th><th>Tanggal</th><th>Sesi</th><th>Status</th><th>Dipesan Oleh</th><th>Catatan</th><th>Aksi</th></tr></thead>
    <tbody>${slots.map(s => {
      const terisi   = s.bookedBy && s.bookedBy !== '';
      const isDraft  = s.statusSlot === 'draft';
      const isHangus = !isDraft && (s.statusSlot === 'hangus' || (!terisi && s.tanggal < todayStr));

      let badgeStatus = '';
      if (isDraft)       badgeStatus = '<span class="badge" style="background:rgba(245,158,11,0.18);color:var(--amber);border:1px solid rgba(245,158,11,0.3)">📝 Draft</span>';
      else if (terisi)   badgeStatus = '<span class="badge badge-rose">Terisi</span>';
      else if (isHangus) badgeStatus = '<span class="badge badge-slate" style="opacity:0.7">Hangus</span>';
      else               badgeStatus = '<span class="badge badge-green">Tersedia</span>';

      let aksiHTML = '';
      if (isHangus) {
        aksiHTML = '<span style="font-size:0.8rem;color:var(--text3);font-style:italic;line-height:1.2;display:inline-block">Terkunci<br><small style="color:var(--rose);font-weight:600">Slot kadaluarsa</small></span>';
      } else if (isDraft) {
        aksiHTML = `
          <button class="btn btn-sm" style="background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);font-weight:700;white-space:nowrap"
                  onclick="publishSingleSlot('${s.id}')">🚀 Publish</button>
          <button class="btn btn-ghost btn-sm" onclick='editSlot(${JSON.stringify(s).replace(/'/g, "\\'")})'>Edit</button>
          <button class="btn btn-rose btn-sm" onclick="deleteSlotConfirm('${s.id}')">Hapus</button>`;
      } else {
        aksiHTML = `
          <button class="btn btn-ghost btn-sm" onclick='editSlot(${JSON.stringify(s).replace(/'/g, "\\'")})'>Edit</button>
          <button class="btn btn-rose btn-sm" onclick="deleteSlotConfirm('${s.id}')">Hapus</button>`;
      }

      const rowStyle = isDraft ? 'background:rgba(245,158,11,0.04);border-left:3px solid var(--amber)' : isHangus ? 'background:var(--card);opacity:0.65' : '';
      return `<tr style="${rowStyle}">
        <td><span class="badge badge-${s.tipe === 'offline' ? 'blue' : 'teal'}">${s.tipe}</span></td>
        <td>${fmtTgl(s.tanggal, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td style="font-family:var(--font2);font-weight:600">${s.jamMulai} – ${s.jamSelesai}</td>
        <td>${badgeStatus}</td>
        <td style="font-size:0.82rem">${terisi ? `<code style="background:var(--card2);padding:2px 7px;border-radius:4px">${s.bookedBy}</code>` : isDraft ? '<span style="color:var(--amber);font-size:0.78rem">—</span>' : '—'}</td>
        <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2)">${s.catatan || '—'}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">${aksiHTML}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

let _slotFilterMode = 'all';

function filterDosenSlots(f, btn) {
  document.querySelectorAll('#d-sesi .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _slotFilterMode = f;
  applyDateRangeSlots();
}

function applyDateRangeSlots() {
  const from = document.getElementById('dslot-date-from')?.value || '';
  const to   = document.getElementById('dslot-date-to')?.value   || '';
  const wrap = document.getElementById('dslot-date-wrap');
  if (wrap) { if (from || to) wrap.classList.add('date-range-active'); else wrap.classList.remove('date-range-active'); }

  let filtered = state.dosenSlots || [];
  if (_slotFilterMode === 'offline')  filtered = filtered.filter(s => s.tipe === 'offline');
  else if (_slotFilterMode === 'online')   filtered = filtered.filter(s => s.tipe === 'online');
  else if (_slotFilterMode === 'tersedia') filtered = filtered.filter(s => !s.bookedBy || s.bookedBy === '');
  else if (_slotFilterMode === 'terisi')   filtered = filtered.filter(s => s.bookedBy && s.bookedBy !== '');

  if (from) filtered = filtered.filter(s => s.tanggal >= from);
  if (to)   filtered = filtered.filter(s => s.tanggal <= to);

  if (from && to && from > to) {
    document.getElementById('dslot-date-from').style.borderColor = 'var(--rose)';
    document.getElementById('dslot-date-to').style.borderColor   = 'var(--rose)';
    return;
  }
  document.getElementById('dslot-date-from').style.borderColor = '';
  document.getElementById('dslot-date-to').style.borderColor   = '';

  renderDosenSlots(filtered);
  updateSlotFilterLabel(filtered.length, state.dosenSlots.length, from, to);
}

function clearDateRangeSlots() {
  const fromEl = document.getElementById('dslot-date-from');
  const toEl   = document.getElementById('dslot-date-to');
  if (fromEl) { fromEl.value = ''; fromEl.style.borderColor = ''; }
  if (toEl)   { toEl.value   = ''; toEl.style.borderColor   = ''; }
  const wrap = document.getElementById('dslot-date-wrap');
  if (wrap) wrap.classList.remove('date-range-active');
  applyDateRangeSlots();
}

function updateSlotFilterLabel(shown, total, from, to) {
  let el = document.getElementById('dslot-filter-info');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dslot-filter-info';
    el.style.cssText = 'font-size:0.78rem;color:var(--text2);margin-bottom:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap';
    const container = document.getElementById('d-slots-container');
    if (container) container.parentNode.insertBefore(el, container);
  }
  if (from || to) {
    const fmtFrom = from ? fmtTgl(from, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const fmtTo   = to   ? fmtTgl(to,   { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    el.innerHTML = `<span style="background:rgba(37,99,235,0.12);color:var(--blue2);padding:2px 10px;border-radius:20px;font-weight:600">📅 ${fmtFrom} &nbsp;→&nbsp; ${fmtTo} &nbsp;·&nbsp; ${shown} dari ${total} sesi</span>`;
  } else {
    el.innerHTML = '';
  }
}

function openSlotModal() {
  document.getElementById('modal-slot-title').textContent = 'Tambah Sesi Baru';
  ['slot-edit-id', 'slot-tanggal', 'slot-jam-mulai', 'slot-jam-selesai', 'slot-catatan'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('slot-tipe').value = 'offline';
  document.getElementById('slot-save-btn').textContent = 'Simpan Sesi';
  const publishOpt = document.getElementById('slot-publish-option');
  if (publishOpt) publishOpt.style.display = 'block';
  const draftRadio = document.getElementById('slot-publish-draft');
  if (draftRadio) draftRadio.checked = true;
  openModal('modal-slot');
}

function editSlot(s) {
  document.getElementById('modal-slot-title').textContent = 'Edit Sesi';
  document.getElementById('slot-edit-id').value     = s.id;
  document.getElementById('slot-tipe').value        = s.tipe;
  document.getElementById('slot-tanggal').value     = s.tanggal;
  document.getElementById('slot-jam-mulai').value   = s.jamMulai  || '';
  document.getElementById('slot-jam-selesai').value = s.jamSelesai || '';
  document.getElementById('slot-catatan').value     = s.catatan   || '';
  document.getElementById('slot-save-btn').textContent = 'Update Sesi';
  const publishOpt = document.getElementById('slot-publish-option');
  if (publishOpt) publishOpt.style.display = 'none';
  openModal('modal-slot');
}

async function saveSlot() {
  const id         = document.getElementById('slot-edit-id').value;
  const tipe       = document.getElementById('slot-tipe').value;
  const tanggal    = document.getElementById('slot-tanggal').value;
  const jamMulai   = document.getElementById('slot-jam-mulai').value;
  const jamSelesai = document.getElementById('slot-jam-selesai').value;
  const catatan    = document.getElementById('slot-catatan').value;

  if (!tanggal || !jamMulai || !jamSelesai) return toast('Tanggal dan jam wajib diisi', 'error');
  if (jamSelesai <= jamMulai) return toast('Jam selesai harus setelah jam mulai', 'error');

  const isDuplicate = state.dosenSlots.some(s => s.tanggal === tanggal && s.jamMulai === jamMulai && s.id !== id);
  if (isDuplicate) return toast('Sesi pada Tanggal dan Jam Mulai ini sudah ada!', 'error');

  const btn    = document.getElementById('slot-save-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';

  const action = id ? 'updateSlot' : 'createSlot';
  const params = { tipe, tanggal, jamMulai, jamSelesai, catatan, token: state.token };
  if (id) params.id = id;
  if (!id) {
    const publishRadio = document.querySelector('input[name="slot-publish"]:checked');
    params.publishMode = publishRadio ? publishRadio.value : 'draft';
  }

  const res = await api(action, params, 'POST');
  btn.disabled = false; btn.textContent = id ? 'Update Sesi' : 'Simpan Sesi';
  if (!res.success) return toast(res.message, 'error');

  const isDraft = !id && params.publishMode === 'draft';
  toast(id ? 'Sesi diperbarui!' : isDraft ? '📝 Sesi disimpan sebagai Draft — belum tampil ke mahasiswa.' : '🚀 Sesi dipublish dan sudah tampil ke mahasiswa!', isDraft ? 'info' : 'success');
  closeModal('modal-slot');
  loadDosenSlots();
}

async function publishSingleSlot(id) {
  const res = await api('publishSlot', { id, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('🚀 Sesi berhasil dipublish! Mahasiswa sudah bisa melihat dan reservasi.', 'success');
  loadDosenSlots();
}

async function publishAllDrafts() {
  const draftCount = (state.dosenSlots || []).filter(s => s.statusSlot === 'draft').length;
  if (!draftCount) return toast('Tidak ada draft untuk dipublish.', 'info');
  if (!confirm(`Publish ${draftCount} sesi draft sekaligus? Semua sesi akan langsung tampil ke mahasiswa.`)) return;
  const res = await api('publishAllDrafts', { token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast(`🚀 ${res.count} sesi berhasil dipublish ke mahasiswa!`, 'success');
  loadDosenSlots();
}

async function deleteSlotConfirm(id) {
  if (!confirm('Hapus sesi ini?')) return;
  const res = await api('deleteSlot', { id, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Sesi dihapus', 'info'); loadDosenSlots();
}

// ── Reservasi & Validasi ──────────────────────────────────────
async function loadDosenBookings() {
  const c = document.getElementById('d-bookings-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getMyBookingsAll', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.dosenBookings = res.bookings;
  renderDosenBookings(state.dosenBookings);
}

function renderDosenBookings(bookings) {
  const c = document.getElementById('d-bookings-container');
  if (!bookings.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada reservasi</p></div>'; return; }
  c.innerHTML = bookingTable(bookings, true);
}

function filterDosenBookings(status, btn) {
  document.querySelectorAll('#d-reservasi .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = status === 'all' ? state.dosenBookings : state.dosenBookings.filter(b => b.status === status);
  renderDosenBookings(f);
}

// ── Mahasiswa ─────────────────────────────────────────────────
async function loadDosenStudents() {
  const c = document.getElementById('d-students-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res = await api('getMyStudents', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  state.dosenStudents = res.students;
  renderDosenStudents(state.dosenStudents);
}

function renderDosenStudents(students) {
  const c = document.getElementById('d-students-container');
  if (!students.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Belum ada mahasiswa bimbingan</p></div>'; return; }
  c.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">${students.map(s => {
    const daysSince  = s.lastActivity ? Math.floor((Date.now() - new Date(s.lastActivity).getTime()) / 86400000) : 999;
    const warnClass  = daysSince >= 10 && s.statusSkripsi === 'aktif_bimbingan' ? 'inaktif-warn' : '';
    return `<div class="student-card" style="position:relative">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        ${renderAvatar(s.foto, s.nama, 48)}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.nama}</div>
          <code style="font-size:0.75rem;color:var(--text3);background:var(--card2);padding:1px 6px;border-radius:4px">${s.kode}</code>
        </div>
      </div>
      <div style="margin-bottom:10px">${statusBadge(s.statusSkripsi)}</div>
      ${daysSince >= 10 && s.statusSkripsi === 'aktif_bimbingan' ? `<div class="${warnClass}" style="font-size:0.75rem;color:var(--amber);margin-bottom:8px">⚠️ Tidak aktif ${daysSince} hari</div>` : ''}
      ${s.kartuMerahCount > 0 ? `<div style="margin-bottom:8px"><span class="kartu-merah">🔴 KARTU MERAH ×${s.kartuMerahCount}</span>${s.kartuMerahLastAt ? `<span style="font-size:0.7rem;color:var(--text3);margin-left:6px">${daysSinceStr(s.kartuMerahLastAt)}</span>` : ''}</div>` : ''}
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
          <span style="color:var(--text2)">Progress</span>
          <span style="font-weight:700;color:${s.avgProgress >= 75 ? 'var(--green)' : s.avgProgress >= 40 ? 'var(--amber)' : 'var(--rose)'}">${s.avgProgress}%</span>
        </div>
        <div class="prog-bar"><div class="prog-fill" style="width:${s.avgProgress}%"></div></div>
      </div>
      <div style="font-size:0.75rem;color:var(--text3);margin-bottom:12px">✓ ${s.bimbinganCount}x terselenggara · Aktif ${daysSinceStr(s.lastActivity)}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick='openStudentDetail(${JSON.stringify(s).replace(/'/g, "\\'")})'>Detail</button>
        <button class="btn btn-sm" style="flex:1;background:rgba(56,189,248,0.1);color:var(--sky);border:1px solid rgba(56,189,248,0.25)" onclick="openChatWith('${s.kode}','${s.nama.replace(/'/g, "\\'")}')">💬 Chat</button>
        <button class="btn btn-sm" style="flex:1;background:rgba(249,115,22,0.12);color:var(--orange);border:1px solid rgba(249,115,22,0.25)" onclick="openSetStatus('${s.kode}','${s.nama.replace(/'/g, "\\'")}','${s.statusSkripsi}')">Set Status</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function filterDosenStudents(q) {
  const f = state.dosenStudents.filter(s => s.nama.toLowerCase().includes(q.toLowerCase()) || s.kode.toLowerCase().includes(q.toLowerCase()));
  renderDosenStudents(f);
}

function switchMhsFilter(mode, btn) {
  document.querySelectorAll('#d-mahasiswa .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const semuaPanel = document.getElementById('d-semua-mhs-panel');
  const belumPanel = document.getElementById('d-belum-bimbingan-panel');
  if (mode === 'belum') {
    semuaPanel.style.display = 'none';
    belumPanel.style.display = 'block';
    renderBelumBimbingan();
  } else {
    belumPanel.style.display = 'none';
    semuaPanel.style.display = 'block';
  }
}

function renderBelumBimbingan() {
  const c    = document.getElementById('d-belum-bimbingan-container');
  const belum = (state.dosenStudents || []).filter(s => !s.bimbinganCount || s.bimbinganCount === 0);
  if (!belum.length) {
    c.innerHTML = '<div class="empty-state" style="padding:32px"><div class="empty-icon">🎉</div><p style="color:var(--green);font-weight:600">Semua mahasiswamu sudah pernah bimbingan!</p></div>';
    return;
  }
  c.innerHTML = `
    <div style="margin-bottom:10px;font-size:0.82rem;color:var(--text2)">Ditemukan <b style="color:var(--rose)">${belum.length} mahasiswa</b> yang belum pernah bimbingan.</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nama</th><th>Kode</th><th>Status Skripsi</th><th>Terakhir Aktif</th><th>Terdaftar Sejak</th><th>Aksi</th></tr></thead>
      <tbody>${belum.map(s => {
        const days     = s.lastActivity ? Math.floor((Date.now() - new Date(s.lastActivity).getTime()) / 86400000) : 999;
        const tglDaftar = s.createdAt ? new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:10px">${renderAvatar(s.foto, s.nama, 36)}
            <div><div style="font-weight:700;font-size:0.9rem">${s.nama}</div><div style="font-size:0.72rem;color:var(--rose);font-weight:600;margin-top:2px">0x bimbingan</div></div>
          </div></td>
          <td><code style="font-size:0.78rem;background:var(--card2);padding:2px 6px;border-radius:4px">${s.kode}</code></td>
          <td>${statusBadge(s.statusSkripsi)}</td>
          <td style="font-size:0.82rem;color:${days >= 14 ? 'var(--rose)' : days >= 7 ? 'var(--amber)' : 'var(--text2)'}">${daysSinceStr(s.lastActivity)}</td>
          <td style="font-size:0.82rem;color:var(--text3)">${tglDaftar}</td>
          <td><button class="btn btn-sm" style="background:rgba(56,189,248,0.1);color:var(--sky);border:1px solid rgba(56,189,248,0.25)" onclick="openChatWith('${s.kode}','${s.nama.replace(/'/g, "\\'")}')">💬 Chat</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function openStudentDetail(s) {
  document.getElementById('modal-student-title').textContent = 'Detail — ' + s.nama;
  const babs = ['Bab 1', 'Bab 2', 'Bab 3', 'Bab 4', 'Bab 5', 'Revisi'];
  const pm   = {}; (s.progress || []).forEach(p => pm[p.bab] = p);
  document.getElementById('modal-student-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      ${renderAvatar(s.foto, s.nama, 64)}
      <div>
        <div style="font-weight:700;font-size:1.1rem">${s.nama}</div>
        <div style="color:var(--text2);font-size:0.85rem">${s.email}</div>
        <code style="font-size:0.78rem;color:var(--text3);background:var(--card2);padding:2px 6px;border-radius:4px">${s.kode}</code>
      </div>
    </div>
    <h3 style="margin-bottom:12px;font-size:0.95rem">Progress per Bab</h3>
    <div class="prog-bab-grid" style="margin-bottom:20px">${babs.map(bab => {
      const p = pm[bab], pct = p?.persentase || 0;
      return `<div class="prog-bab-item">
        <div style="font-weight:600;font-size:0.85rem">${bab}</div>
        <div style="font-size:1.1rem;font-weight:700;color:${pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--blue2)' : 'var(--text2)'}">${pct}%</div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
        ${p?.catatan ? `<div style="font-size:0.75rem;color:var(--text3)">${p.catatan}</div>` : ''}
      </div>`;
    }).join('')}</div>
    <div style="display:flex;gap:8px;font-size:0.85rem;color:var(--text2)"><span>✓ ${s.bimbinganCount}x bimbingan terselenggara</span></div>`;
  openModal('modal-student-detail');
}

// ── Bimbingan Mendadak ────────────────────────────────────────
function openMendadakModal() {
  const students = state.dosenStudents || [];
  if (!students.length) { toast('Muat data mahasiswa dulu (tab Mahasiswa)', 'error'); return; }
  const sel = document.getElementById('mendadak-mhs');
  sel.innerHTML = '<option value="">-- Pilih Mahasiswa --</option>' +
    students.map(s => `<option value="${s.kode}">${s.nama} (${s.kode})</option>`).join('');
  document.getElementById('mendadak-tanggal').value    = new Date().toISOString().substring(0, 10);
  document.getElementById('mendadak-jam-mulai').value  = '';
  document.getElementById('mendadak-jam-selesai').value = '';
  document.getElementById('mendadak-catatan').value    = '';
  document.getElementById('mendadak-tipe').value       = 'offline';
  openModal('modal-mendadak');
}

async function saveBimbinganMendadak() {
  const mhsKode   = document.getElementById('mendadak-mhs').value;
  const tipe      = document.getElementById('mendadak-tipe').value;
  const tanggal   = document.getElementById('mendadak-tanggal').value;
  const jamMulai  = document.getElementById('mendadak-jam-mulai').value;
  const jamSelesai = document.getElementById('mendadak-jam-selesai').value;
  const catatan   = document.getElementById('mendadak-catatan').value;

  if (!mhsKode) return toast('Pilih mahasiswa dulu', 'error');
  if (!tanggal) return toast('Tanggal wajib diisi', 'error');
  if (!jamMulai || !jamSelesai) return toast('Jam mulai dan selesai wajib diisi', 'error');
  if (jamSelesai <= jamMulai) return toast('Jam selesai harus setelah jam mulai', 'error');
  if (tanggal > new Date().toISOString().substring(0, 10)) return toast('Tanggal tidak boleh di masa depan', 'error');

  const btn = document.getElementById('mendadak-save-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Menyimpan...';
  const res = await api('addBimbinganMendadak', { mahasiswaKode: mhsKode, tipe, tanggal, jamMulai, jamSelesai, catatan, token: state.token }, 'POST');
  btn.disabled = false; btn.innerHTML = '⚡ Catat Bimbingan';
  if (!res.success) return toast(res.message, 'error');
  toast('Bimbingan mendadak berhasil dicatat! Riwayat mahasiswa sudah diperbarui.', 'success');
  closeModal('modal-mendadak');
  loadDosenStudents();
}

// ── Profil & Foto ─────────────────────────────────────────────
function fillDosenProfil() {
  const u = state.user;
  document.getElementById('d-profil-kode').value  = u.kode  || '';
  document.getElementById('d-profil-nama').value  = u.nama  || '';
  document.getElementById('d-profil-email').value = u.email || '';
  document.getElementById('d-profil-prodi').value = u.prodi || '';
  document.getElementById('d-profil-foto-wrap').innerHTML = renderAvatar(u.foto, u.nama, 80);
}

function previewDosenFoto(event) {
  const file = event.target.files[0]; if (!file) return;
  compressImage(file, 400, (dataUrl) => {
    document.getElementById('d-foto-preview').src = dataUrl;
    document.getElementById('d-foto-preview-wrap').style.display = 'flex';
    document.getElementById('d-profil-foto-wrap').style.display  = 'none';
  });
}

async function uploadDosenFoto() {
  const dataUrl = document.getElementById('d-foto-preview').src;
  if (!dataUrl || !dataUrl.startsWith('data:')) return toast('Pilih foto dulu', 'error');
  toast('Mengupload foto...', 'info');
  const res = await api('uploadPhotoDosen', { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Foto berhasil diupload!', 'success');
  state.user.foto = res.url; localStorage.setItem('lytana_user', JSON.stringify(state.user));
  document.getElementById('d-foto-preview-wrap').style.display = 'none';
  document.getElementById('d-profil-foto-wrap').style.display  = 'flex';
  fillDosenProfil(); updateDosenChip();
}

async function updateKodeDosen(btn) {
  const newKode = document.getElementById('d-profil-kode').value.trim();
  if (!newKode || newKode.length < 4) return toast('Kode Dosen minimal 4 karakter', 'error');
  if (newKode === state.user.kode) return toast('Tidak ada perubahan kode', 'info');
  if (!confirm('Yakin ingin merubah kode login Anda? Jika iya, Anda akan diminta login kembali.')) return;
  const oldText = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
  const res = await api('updateDosenProfile', { newKode, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = oldText;
  if (!res.success) return toast(res.message, 'error');
  toast('Kode berhasil diupdate! Silakan login kembali.', 'success');
  setTimeout(() => doLogout(), 2500);
}
