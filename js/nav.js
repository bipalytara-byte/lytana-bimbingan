// ============================================================
// nav.js — Navigasi Halaman (showPage, mSwitch, dSwitch, aSwitch)
// ============================================================

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
}

function mSwitch(s) {
  document.querySelectorAll('#page-mahasiswa .page-section').forEach(x => x.classList.remove('active'));
  document.getElementById('m-' + s).classList.add('active');
  document.querySelectorAll('#page-mahasiswa .nav-tab').forEach((t, i) =>
    t.classList.toggle('active', ['reservasi', 'riwayat', 'progres', 'chat', 'profil'][i] === s)
  );
  if (s === 'riwayat') loadMyHistory();
  if (s === 'progres') loadMyProgress();
  if (s === 'chat')    loadChatList();
  if (s === 'profil')  fillProfil();
}

function dSwitch(s) {
  document.querySelectorAll('#page-dosen .page-section').forEach(x => x.classList.remove('active'));
  document.getElementById('d-' + s).classList.add('active');
  document.querySelectorAll('#page-dosen .nav-tab').forEach((t, i) =>
    t.classList.toggle('active', ['dashboard', 'sesi', 'reservasi', 'mahasiswa', 'deadline', 'chat', 'profil'][i] === s)
  );
  if (s === 'dashboard') loadDosenDashboard();
  if (s === 'sesi')      loadDosenSlots();
  if (s === 'reservasi') loadDosenBookings();
  if (s === 'mahasiswa') loadDosenStudents();
  if (s === 'deadline')  loadDosenDeadlines();
  if (s === 'chat')      loadChatList();
  if (s === 'profil')    fillDosenProfil();
}

function aSwitch(s) {
  document.querySelectorAll('#page-admin .page-section').forEach(x => x.classList.remove('active'));
  document.getElementById('a-' + s).classList.add('active');
  document.querySelectorAll('#page-admin .nav-tab').forEach((t, i) =>
    t.classList.toggle('active', ['dashboard', 'dosen', 'mahasiswa', 'bookings', 'slots', 'rekap'][i] === s)
  );
  if (s === 'dashboard') loadAdminDashboard();
  if (s === 'dosen')     loadAdminDosen();
  if (s === 'mahasiswa') loadAdminUsers();
  if (s === 'bookings')  loadAdminBookings();
  if (s === 'slots')     loadAdminSlots();
  if (s === 'rekap')     loadAkademikRekap();
}
