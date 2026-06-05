// ============================================================
// mahasiswa.js — Halaman Mahasiswa: Reservasi, Riwayat, Progres, Profil
// ============================================================

// ── Slot Preview (ringkasan di kartu Offline/Online) ──────────
async function loadSlotPreviews() {
  const todayLocal = new Date();
  const today = todayLocal.getFullYear() + '-' +
    String(todayLocal.getMonth() + 1).padStart(2, '0') + '-' +
    String(todayLocal.getDate()).padStart(2, '0');

  const render = (tipe, slots) => {
    const el = document.getElementById('preview-' + tipe);
    if (!el) return;
    const now   = new Date();
    const valid = (slots || []).filter(s => {
      if (!s.tanggal) return false;
      const slotDateTime = new Date(s.tanggal + 'T' + (s.jamMulai || '23:59') + ':00');
      return slotDateTime > now;
    });
    const tersedia  = valid.filter(s => !s.bookedBy || s.bookedBy === '');
    const sudahSaya = valid.find(s => s.bookedBy === state.user?.kode);

    if (!valid.length) {
      el.innerHTML = `<div class="type-card-stat"><span style="color:var(--text3);font-size:0.76rem">Belum ada sesi terjadwal</span></div>`;
      return;
    }
    const nearest = tersedia.sort((a, b) => (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai))[0];
    let html = '';
    if (sudahSaya) {
      const tgl = fmtTgl(sudahSaya.tanggal, { day: 'numeric', month: 'short' });
      html = `<div class="type-card-stat"><span style="color:var(--blue2);font-size:1rem">✓</span><span style="color:var(--blue2);font-weight:700;font-size:0.8rem">Sudah reservasi · ${tgl} ${sudahSaya.jamMulai}</span></div>`;
    } else {
      const warna = tersedia.length === 0 ? 'var(--rose)' : tersedia.length <= 2 ? 'var(--amber)' : 'var(--green)';
      const label = tersedia.length === 0 ? 'Penuh' : tersedia.length + ' sesi tersedia';
      html = `<div class="type-card-stat"><span style="color:${warna};font-size:0.9rem">●</span><span class="type-card-avail" style="color:${warna}">${label}</span></div>`;
      if (nearest) {
        const tglNearest = fmtTgl(nearest.tanggal, { weekday: 'short', day: 'numeric', month: 'short' });
        html += `<div class="type-card-next">📅 Terdekat: ${tglNearest}, ${nearest.jamMulai}–${nearest.jamSelesai}</div>`;
      }
    }
    el.innerHTML = html;
  };

  try {
    const [resOff, resOn] = await Promise.all([
      api('getSlots', { tipe: 'offline', token: state.token }),
      api('getSlots', { tipe: 'online',  token: state.token }),
    ]);
    render('offline', resOff.slots || []);
    render('online',  resOn.slots  || []);
  } catch (e) {
    ['offline', 'online'].forEach(t => {
      const el = document.getElementById('preview-' + t);
      if (el) el.innerHTML = '';
    });
  }
}

// ── Pilih Jenis Bimbingan & Load Slot ────────────────────────
function selectType(type) {
  state.selectedType = type;
  ['offline', 'online'].forEach(t => {
    document.getElementById('type-' + t).classList.toggle('selected', t === type);
    document.getElementById('type-' + t).classList.add(t);
  });
  loadSlots(type);
}

async function loadSlots(tipe) {
  const c = document.getElementById('slots-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Memuat sesi dari dosen pembimbing...</div>';
  const res = await api('getSlots', { tipe, token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  const today    = new Date().toISOString().substring(0, 10);
  const filtered = (res.slots || []).filter(s =>
    s.tanggal >= today || (s.bookedBy && s.bookedBy === state.user?.kode)
  );
  state.slots = filtered;
  renderSlots(filtered);
  if (state.user?.dosenKode1 || state.user?.dosenKode2) {
    const dr = await api('getDosenList');
    const d1 = (dr.dosen || []).find(x => x.kode === state.user.dosenKode1);
    const d2 = (dr.dosen || []).find(x => x.kode === state.user.dosenKode2);
    const names = [d1?.nama, d2?.nama].filter(Boolean).join(' & ');
    if (names) document.getElementById('m-dosen-label').textContent = 'Sesi dari ' + names;
  }
}

function renderSlots(slots) {
  const c = document.getElementById('slots-container');
  if (!slots.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Belum ada sesi tersedia dari dosen pembimbingmu</p></div>'; return; }
  const byDate = {};
  slots.forEach(s => { const k = s.tanggal || 'lainnya'; if (!byDate[k]) byDate[k] = []; byDate[k].push(s); });
  let html = '';
  Object.keys(byDate).sort().forEach(tgl => {
    html += `<div style="margin-bottom:24px">
      <div style="font-size:0.78rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">📅 ${fmtTgl(tgl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="slot-grid">${byDate[tgl].map(renderSlotCard).join('')}</div></div>`;
  });
  c.innerHTML = html;
}

function renderSlotCard(s) {
  const taken = s.bookedBy && s.bookedBy !== '';
  const isMe  = taken && s.bookedBy === state.user?.kode;
  let badge, btn;
  if (isMe)        { badge = `<span class="badge badge-blue">✓ Kamu</span>`;   btn = `<span style="font-size:0.78rem;color:var(--blue2)">Sudah dipesan</span>`; }
  else if (taken)  { badge = `<span class="badge badge-rose">Terisi</span>`;   btn = `<span class="badge badge-slate">Tidak tersedia</span>`; }
  else             { badge = `<span class="badge badge-green">Tersedia</span>`; btn = `<button class="btn btn-primary btn-sm" onclick='openBookingModal(${JSON.stringify(s).replace(/'/g, "\\'")})'>Reservasi</button>`; }
  return `<div class="slot-card ${taken && !isMe ? 'full' : ''}" style="${isMe ? 'border-color:var(--blue);background:rgba(37,99,235,0.07)' : ''}">
    <div class="slot-card-header">
      <div>
        <div class="slot-type-badge ${s.tipe}">${s.tipe.toUpperCase()}</div>
        <div style="margin-top:10px;font-size:1.35rem;font-weight:700;font-family:var(--font2);line-height:1">${s.jamMulai} <span style="font-size:0.9rem;color:var(--text2);font-weight:400">–</span> ${s.jamSelesai}</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:6px;display:flex;align-items:center;gap:4px">👨‍🏫 ${s.dosenNama || s.dosenKode}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${badge}</div>
    </div>
    <div class="slot-quota-bar"><div class="slot-quota-fill ${taken ? 'high' : 'low'}" style="width:${taken ? 100 : 0}%"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span style="font-size:0.78rem;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.catatan || ''}</span>
      ${btn}
    </div>
  </div>`;
}

// ── Booking Modal ─────────────────────────────────────────────
function openBookingModal(slot) {
  state.pendingSlot = slot;
  document.getElementById('modal-booking-content').innerHTML = `
    <div class="card" style="margin-bottom:0;background:var(--card2)">
      <div style="display:grid;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text2)">Dosen</span><span style="font-weight:600;font-size:0.85rem">${slot.dosenNama || slot.dosenKode}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text2)">Jenis</span><span class="badge badge-${slot.tipe === 'offline' ? 'blue' : 'teal'}">${slot.tipe.toUpperCase()}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text2)">Tanggal</span><b>${fmtTgl(slot.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text2)">Sesi</span><b style="font-family:var(--font2)">${slot.jamMulai} – ${slot.jamSelesai}</b></div>
        ${slot.catatan ? `<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text2)">Lokasi</span><span>${slot.catatan}</span></div>` : ''}
      </div>
    </div>
    <div style="margin-top:14px;padding:10px 12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;font-size:0.85rem;color:var(--text2)">
      ✅ Sesi ini masih <b style="color:var(--green)">tersedia</b>. Setelah reservasi, sesi terkunci untukmu.
    </div>`;
  openModal('modal-booking');
}

async function confirmBooking() {
  if (!state.pendingSlot) return;
  const btn = document.getElementById('modal-booking-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
  const res = await api('bookSlot', { slotId: state.pendingSlot.id, token: state.token }, 'POST');
  btn.disabled = false; btn.textContent = 'Konfirmasi Reservasi';
  if (!res.success) return toast(res.message, 'error');
  toast('Reservasi berhasil! 🎉', 'success');
  closeModal('modal-booking'); state.pendingSlot = null;
  loadSlots(state.selectedType);
  loadSlotPreviews();
}

// ── Riwayat ───────────────────────────────────────────────────
function sisaJamBimbingan(tanggal, jamMulai) {
  if (!tanggal || !jamMulai) return 9999;
  return (new Date(tanggal + 'T' + jamMulai + ':00').getTime() - Date.now()) / 3600000;
}

function labelSisaWaktu(jam) {
  if (jam <= 0) return '⏱ Sudah lewat';
  if (jam < 1)  return '⏱ Kurang dari 1 jam lagi';
  if (jam < 24) return '⏱ ' + Math.floor(jam) + ' jam lagi';
  return '⏱ ' + Math.floor(jam / 24) + ' hari lagi';
}

async function loadMyHistory() {
  const c = document.getElementById('history-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Memuat...</div>';
  const [hRes, bRes] = await Promise.all([
    api('getMyHistory', { token: state.token }),
    api('getMyBookings', { token: state.token })
  ]);

  const seenSlotIds = new Set(), seenSessionKeys = new Set();
  const terselenggara = (hRes.history || [])
    .filter(h => h.status === 'terselenggara')
    .filter(h => {
      if (seenSlotIds.has(h.slotId)) return false;
      seenSlotIds.add(h.slotId);
      const slot = h.slot || {};
      const key = (slot.tanggal || '') + '_' + (slot.jamMulai || '') + '_' + (slot.dosenKode || '');
      if (key !== '__' && seenSessionKeys.has(key)) return false;
      seenSessionKeys.add(key);
      return true;
    })
    .sort((a, b) => (b.slot?.tanggal || b.tanggal || '').localeCompare(a.slot?.tanggal || a.tanggal || ''));

  const aktif = (bRes.bookings || [])
    .filter(b => b.status === 'menunggu' || b.status === 'disetujui')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const totalTerselenggara = terselenggara.length;
  let html = '';

  if (aktif.length > 0) {
    html += `<div style="margin-bottom:28px">
      <div style="font-size:0.8rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">📌 Reservasi Aktif</div>
      <div style="display:flex;flex-direction:column;gap:10px">`;
    aktif.forEach(item => {
      const slot = item.slot || {}, dosen = item.dosen || {};
      const sisa = sisaJamBimbingan(slot.tanggal, slot.jamMulai);
      const bisaBatal    = sisa >= 24;
      const warnaInfo    = sisa < 24 ? 'var(--rose)' : sisa < 48 ? 'var(--amber)' : 'var(--sky)';
      const badgeColor   = item.status === 'disetujui' ? 'var(--blue2)' : 'var(--amber)';
      const badgeBg      = item.status === 'disetujui' ? 'rgba(37,99,235,0.15)' : 'rgba(245,158,11,0.15)';
      const badgeLabel   = item.status === 'disetujui' ? '👍 Telah Di-ACC' : '⏳ Menunggu ACC';
      const tipeIcon     = slot.tipe === 'online' ? '💻' : '🏢';
      html += `<div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--radius);padding:16px 18px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px">
          <div style="font-weight:700;font-size:0.95rem">${tipeIcon} ${slot.tipe ? slot.tipe.charAt(0).toUpperCase() + slot.tipe.slice(1) : 'Bimbingan'} — ${fmtTgl(slot.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${badgeBg};color:${badgeColor}">${badgeLabel}</span>
        </div>
        <div style="font-size:0.85rem;color:var(--text2)">⏰ ${slot.jamMulai || ''}–${slot.jamSelesai || ''} · ${dosen.nama || '—'}</div>
        <div style="font-size:0.78rem;color:${warnaInfo};font-weight:600">${labelSisaWaktu(sisa)}</div>
        ${bisaBatal
          ? `<button class="btn btn-rose btn-sm" style="width:fit-content;margin-top:4px" onclick="cancelMyBooking('${item.id}')">Batalkan Reservasi</button>`
          : `<button class="btn btn-rose btn-sm" style="width:fit-content;margin-top:4px;opacity:0.4;cursor:not-allowed" disabled title="Pembatalan harus dilakukan minimal 24 jam sebelum bimbingan">Tidak bisa dibatalkan</button>`
        }
      </div>`;
    });
    html += `</div></div>`;
  }

  html += `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="font-size:0.8rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em">✅ Bimbingan Terselenggara</div>
      <span style="background:rgba(16,185,129,0.15);color:var(--green);padding:3px 12px;border-radius:20px;font-size:0.8rem;font-weight:700">${totalTerselenggara}× Bimbingan</span>
    </div>`;
  if (!terselenggara.length) {
    html += `<div class="empty-state" style="padding:32px 16px"><div class="empty-icon">📋</div><p>Belum ada bimbingan yang terselenggara</p></div>`;
  } else {
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">`;
    terselenggara.forEach((item, idx) => {
      const slot = item.slot || {}, dosen = item.dosen || {};
      const tipeIcon   = slot.tipe === 'online' ? '💻' : '🏢';
      const tipeColor  = slot.tipe === 'online' ? 'var(--sky)' : 'var(--purple)';
      const tipeLabel  = slot.tipe ? slot.tipe.charAt(0).toUpperCase() + slot.tipe.slice(1) : 'Bimbingan';
      const nomor      = totalTerselenggara - idx;
      const isMendadak = item.isMendadak || (item.slotId && item.slotId.startsWith && item.slotId.startsWith('MENDADAK_'));
      const cardBorder     = isMendadak ? 'rgba(245,158,11,0.35)'  : 'rgba(16,185,129,0.25)';
      const watermarkColor = isMendadak ? 'rgba(245,158,11,0.08)'  : 'rgba(16,185,129,0.08)';
      const badgeBg        = isMendadak ? 'rgba(245,158,11,0.18)'  : 'rgba(16,185,129,0.15)';
      const badgeColor     = isMendadak ? 'var(--amber)' : 'var(--green)';
      const badgeLabel     = isMendadak ? '⚡ Mendadak · Ke-' + nomor : '✓ Ke-' + nomor;
      html += `<div style="background:var(--card);border:1px solid ${cardBorder};border-radius:var(--radius);padding:18px;position:relative;overflow:hidden">
        <div style="position:absolute;top:12px;right:14px;font-size:2rem;font-weight:900;color:${watermarkColor};font-family:var(--font2);line-height:1">${nomor}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:1.1rem">${tipeIcon}</span>
          <span style="font-weight:700;color:${tipeColor};font-size:0.88rem;text-transform:uppercase;letter-spacing:0.05em">${tipeLabel}</span>
          <span style="margin-left:auto;background:${badgeBg};color:${badgeColor};padding:2px 8px;border-radius:20px;font-size:0.7rem;font-weight:700">${badgeLabel}</span>
        </div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">${fmtTgl(slot.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div style="font-size:0.85rem;color:var(--text2);margin-bottom:6px">⏰ ${slot.jamMulai || ''}–${slot.jamSelesai || ''}</div>
        <div style="font-size:0.82rem;color:var(--text3)">👨‍🏫 ${dosen.nama || '—'}</div>
        ${item.catatan ? `<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:0.78rem;color:var(--text2)">📝 ${item.catatan}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  c.innerHTML = html;
}

async function cancelMyBooking(bookId) {
  if (!confirm('Batalkan reservasi ini?')) return;
  const res = await api('cancelBooking', { bookId, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Reservasi berhasil dibatalkan', 'info');
  loadMyHistory();
}

// ── Progres ───────────────────────────────────────────────────
async function loadMyProgress() {
  const c = document.getElementById('progres-container');
  c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const res  = await api('getMyProgress', { token: state.token });
  if (!res.success) return c.innerHTML = `<p style="color:var(--rose);padding:20px">${res.message}</p>`;
  const babs = ['Bab 1', 'Bab 2', 'Bab 3', 'Bab 4', 'Bab 5', 'Revisi'];
  const pm   = {}; (res.progress || []).forEach(p => pm[p.bab] = p);
  const avg  = Math.round(babs.reduce((s, b) => s + (pm[b]?.persentase || 0), 0) / babs.length);
  c.innerHTML = `<div class="card" style="margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div><div style="font-size:0.85rem;color:var(--text2)">Keseluruhan Progress</div>
        <div style="font-size:2rem;font-weight:700;font-family:var(--font2);color:var(--blue2)">${avg}%</div></div>
      <div style="text-align:right;color:var(--text2);font-size:0.85rem">${babs.filter(b => (pm[b]?.persentase || 0) >= 100).length}/${babs.length} bab selesai</div>
    </div><div class="prog-bar"><div class="prog-fill" style="width:${avg}%"></div></div></div>
  <div class="prog-bab-grid">${babs.map(bab => {
    const p = pm[bab], pct = p?.persentase || 0;
    return `<div class="prog-bab-item">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:600;font-size:0.88rem">${bab}</div>
        ${pct >= 100 ? '<span class="badge badge-green">✓ Selesai</span>' : ''}
      </div>
      <div style="font-size:1.2rem;font-weight:700;color:${pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--blue2)' : 'var(--text2)'}">${pct}%</div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      ${p?.catatan ? `<div style="font-size:0.78rem;color:var(--text3)">${p.catatan}</div>` : ''}
      <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px" onclick="openProgresModal('${bab}','${pct}','${(p?.catatan || '').replace(/'/g, "\\'")}')">Edit</button>
    </div>`;
  }).join('')}</div>`;
}

function openProgresModal(bab = '', pct = 50, catatan = '') {
  if (bab) {
    const s = document.getElementById('prog-bab');
    for (let i = 0; i < s.options.length; i++) if (s.options[i].value === bab) s.selectedIndex = i;
  }
  document.getElementById('prog-pct').value         = pct;
  document.getElementById('prog-pct-label').textContent = pct + '%';
  document.getElementById('prog-catatan').value     = catatan;
  openModal('modal-progres');
}

async function saveProgress() {
  const bab        = document.getElementById('prog-bab').value;
  const persentase = document.getElementById('prog-pct').value;
  const catatan    = document.getElementById('prog-catatan').value;
  const res = await api('updateProgress', { bab, persentase, catatan, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Progress diperbarui!', 'success'); closeModal('modal-progres'); loadMyProgress();
}

// ── Profil & Foto ─────────────────────────────────────────────
async function fillProfil() {
  const u = state.user;
  document.getElementById('profil-kode').value  = u.kode  || '';
  document.getElementById('profil-nama').value  = u.nama  || '';
  document.getElementById('profil-email').value = u.email || '';
  document.getElementById('profil-foto-wrap').innerHTML = renderAvatar(u.foto, u.nama, 80);
  if (u.dosenKode1 || u.dosenKode2) {
    const dr = await api('getDosenList');
    const d1 = (dr.dosen || []).find(x => x.kode === u.dosenKode1);
    const d2 = (dr.dosen || []).find(x => x.kode === u.dosenKode2);
    document.getElementById('profil-dosen1').value = d1 ? d1.nama : '—';
    document.getElementById('profil-dosen2').value = d2 ? d2.nama : '—';
  } else {
    document.getElementById('profil-dosen1').value = 'Belum dipilih';
    document.getElementById('profil-dosen2').value = 'Belum dipilih';
  }
}

function previewFoto(event) {
  const file = event.target.files[0]; if (!file) return;
  compressImage(file, 400, (dataUrl) => {
    document.getElementById('foto-preview').src = dataUrl;
    document.getElementById('foto-preview-wrap').style.display = 'flex';
    document.getElementById('profil-foto-wrap').style.display  = 'none';
  });
}

async function uploadFoto() {
  const dataUrl = document.getElementById('foto-preview').src;
  if (!dataUrl || !dataUrl.startsWith('data:')) return toast('Pilih foto dulu', 'error');
  toast('Mengupload foto...', 'info');
  const res = await api('uploadPhoto', { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Foto berhasil diupload!', 'success');
  state.user.foto = res.url; localStorage.setItem('lytana_user', JSON.stringify(state.user));
  document.getElementById('foto-preview-wrap').style.display = 'none';
  document.getElementById('profil-foto-wrap').style.display  = 'flex';
  fillProfil(); updateMhsChip();
}
