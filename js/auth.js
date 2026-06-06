// ============================================================
// auth.js — Autentikasi: Login, Register, Logout
// ============================================================

// ── Tab Login / Register ─────────────────────────────────────
function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach((t, i) =>
    t.classList.toggle('active', ['login', 'register'][i] === tab)
  );
  document.getElementById('login-form').classList.toggle('active', tab === 'login');
  document.getElementById('register-form').classList.toggle('active', tab === 'register');
  if (tab === 'register') loadDosenDropdown();
}

function switchRegisterRole(role) {
  document.getElementById('rtab-mhs').className   = 'role-tab' + (role === 'mahasiswa' ? ' active-mhs'  : '');
  document.getElementById('rtab-dosen').className = 'role-tab' + (role === 'dosen'     ? ' active-dosen' : '');
  document.getElementById('reg-mhs-form').style.display   = role === 'mahasiswa' ? 'flex' : 'none';
  document.getElementById('reg-dosen-form').style.display = role === 'dosen'     ? 'flex' : 'none';
}

// ── Preview kode login gabungan (kode unik + NIM) ────────────
function previewKodeLogin() {
  const kodeUnik = document.getElementById('reg-kode-unik').value.trim();
  const nim      = document.getElementById('reg-nim').value.trim();
  const preview  = document.getElementById('kode-login-preview');
  const gabungan = document.getElementById('kode-login-gabungan');
  const warn     = document.getElementById('warn-kode-login');

  // Hanya angka untuk NIM
  document.getElementById('reg-nim').value = nim.replace(/[^0-9]/g, '');
  const nimClean = document.getElementById('reg-nim').value;

  warn.style.display = 'none';
  warn.textContent   = '';

  if (!kodeUnik && !nimClean) { preview.style.display = 'none'; return; }

  if (kodeUnik && kodeUnik.length < KODE_MIN_LEN) {
    warn.textContent   = '⚠️ Kode unik minimal ' + KODE_MIN_LEN + ' karakter';
    warn.style.display = 'block';
  }
  if (nimClean && nimClean.length !== NIM_LENGTH) {
    warn.textContent   = '⚠️ NIM harus tepat ' + NIM_LENGTH + ' digit angka';
    warn.style.display = 'block';
  }

  if (kodeUnik && nimClean) {
    gabungan.textContent  = kodeUnik + nimClean;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

// ── Validasi dropdown pembimbing ─────────────────────────────
function validatePembimbing() {
  const kode1 = document.getElementById('reg-dosen1').value;
  const kode2 = document.getElementById('reg-dosen2').value;
  const warn  = document.getElementById('warn-pembimbing');
  if (!warn) return;
  warn.style.display = (kode1 && kode2 && kode1 === kode2) ? 'block' : 'none';
}

async function loadDosenDropdown() {
  const res  = await api('getDosenList');
  const sel1 = document.getElementById('reg-dosen1');
  const sel2 = document.getElementById('reg-dosen2');
  if (!res.success || !res.dosen.length) {
    sel1.innerHTML = '<option value="">Belum ada dosen terdaftar</option>';
    sel2.innerHTML = '<option value="">Belum ada dosen terdaftar</option>';
    return;
  }
  const opts1 = '<option value="">-- Pilih Pembimbing 1 --</option>' +
    res.dosen.map(d => `<option value="${d.kode}">${d.nama}${d.prodi ? ' (' + d.prodi + ')' : ''}</option>`).join('');
  const opts2 = '<option value="">-- Pilih Pembimbing 2 (Opsional) --</option>' +
    res.dosen.map(d => `<option value="${d.kode}">${d.nama}${d.prodi ? ' (' + d.prodi + ')' : ''}</option>`).join('');
  sel1.innerHTML = opts1;
  sel2.innerHTML = opts2;
  sel1.addEventListener('change', validatePembimbing);
  sel2.addEventListener('change', validatePembimbing);
}

// ── Login ─────────────────────────────────────────────────────
async function doLogin() {
  const kode = document.getElementById('login-kode').value.trim();
  if (!kode) return toast('Masukkan kode unikmu', 'error');
  const btn = document.getElementById('login-btn-text');
  btn.innerHTML = '<div class="spinner"></div>';
  const res = await api('login', { kode }, 'POST');
  btn.textContent = 'Masuk';
  if (!res.success) return toast(res.message, 'error');
  onLogin(res.token, res.user);
}

// ── Register Mahasiswa ────────────────────────────────────────
async function doRegister() {
  const kodeUnik   = document.getElementById('reg-kode-unik').value.trim();
  const nim        = document.getElementById('reg-nim').value.trim();
  const nama       = document.getElementById('reg-nama').value.trim();
  const email      = document.getElementById('reg-email').value.trim();
  const dosenKode1 = document.getElementById('reg-dosen1').value;
  const dosenKode2 = document.getElementById('reg-dosen2').value;

  if (!kodeUnik || !nim || !nama || !email) return toast('Semua field wajib diisi', 'error');
  if (kodeUnik.length < KODE_MIN_LEN) return toast('Kode unik minimal ' + KODE_MIN_LEN + ' karakter', 'error');
  if (!/^\d{7}$/.test(nim)) return toast('NIM harus tepat 7 digit angka. Contoh: 2311033', 'error');
  if (dosenKode1 && dosenKode1 === dosenKode2) return toast('Pembimbing 1 dan Pembimbing 2 tidak boleh sama', 'error');

  const kode = kodeUnik + nim;
  const btn  = document.getElementById('reg-btn-text');
  btn.innerHTML = '<div class="spinner"></div>';
  const res = await api('register', { kode, nama, email, dosenKode1, dosenKode2 }, 'POST');
  btn.textContent = 'Buat Akun Mahasiswa';
  if (!res.success) return toast(res.message, 'error');
  toast('Akun berhasil dibuat! Kode login kamu: ' + kode, 'success');
  onLogin(res.token, res.user);
}

// ── Register Dosen ────────────────────────────────────────────
async function doRegisterDosen() {
  const kode  = document.getElementById('dreg-kode').value.trim();
  const nama  = document.getElementById('dreg-nama').value.trim();
  const email = document.getElementById('dreg-email').value.trim();
  const prodi = document.getElementById('dreg-prodi').value;
  const token = document.getElementById('dreg-token').value.trim();

  if (!kode || !nama || !email || !token) return toast('Semua field wajib diisi, termasuk Token!', 'error');

  const btn = document.getElementById('dreg-btn-text');
  btn.innerHTML = '<div class="spinner"></div>';
  const res = await api('registerDosen', { kode, nama, email, prodi, token }, 'POST');
  btn.textContent = 'Buat Akun Dosen';

  if (!res.success) {
    document.getElementById('dreg-token').value = '';
    return toast(res.message, 'error');
  }
  toast('Akun dosen berhasil dibuat!', 'success');
  onLogin(res.token, res.user);
}

// ── onLogin & Logout ──────────────────────────────────────────
function onLogin(token, user) {
  state.token = token;
  state.user  = user;
  localStorage.setItem('lytana_token', token);
  localStorage.setItem('lytana_user', JSON.stringify(user));

  if (user.role === 'admin') {
    showPage('admin');
    loadAdminDashboard();
  } else if (user.role === 'dosen') {
    updateDosenChip();
    showPage('dosen');
    loadDosenDashboard();
    renderAllInfoPanels();
  } else {
    updateMhsChip();
    showPage('mahasiswa');
    renderAllInfoPanels();
    // Status skripsi sudah dihitung GAS (computeStatus) saat login/auto-login.
    // Tampilkan toast jika status tidak_aktif agar mahasiswa langsung tahu.
    if (user.statusSkripsi === 'tidak_aktif') {
      setTimeout(() => toast('⚠️ Akunmu tidak aktif karena lebih dari 14 hari tidak bimbingan. Hubungi dosen pembimbingmu.', 'error'), 800);
    }
    loadSlotPreviews();
  }
  toast('Selamat datang, ' + user.nama + '!', 'success');
}

function updateMhsChip() {
  const u = state.user;
  document.getElementById('m-nama-chip').textContent = u.nama;
  document.getElementById('m-avatar-wrap').innerHTML = renderAvatar(u.foto, u.nama, 28);
}

function updateDosenChip() {
  const u = state.user;
  document.getElementById('d-nama-chip').textContent  = u.nama;
  document.getElementById('d-prodi-label').textContent = u.prodi || 'Program Studi';
  document.getElementById('d-avatar-wrap').innerHTML  = renderAvatar(u.foto, u.nama, 28);
}

function doLogout() {
  if (chatRefreshInterval) { clearInterval(chatRefreshInterval); chatRefreshInterval = null; }
  chatActiveKode = null;
  state = {
    user: null, token: null, selectedType: null,
    slots: [], allBookings: [], allSlots: [], allUsers: [], allDosen: [],
    dosenSlots: [], dosenBookings: [], dosenStudents: [],
    pendingSlot: null, pendingValidateId: null, pendingResetKode: null, pendingSetStatus: null,
    chatContacts: [], activeChatKode: null, chatAutoRefresh: null
  };
  localStorage.removeItem('lytana_token');
  localStorage.removeItem('lytana_user');
  showPage('login');
  toast('Kamu telah keluar', 'info');
}

// ── Auto-login dari localStorage ─────────────────────────────
(function () {
  const t = localStorage.getItem('lytana_token');
  const u = localStorage.getItem('lytana_user');
  if (t && u) try { onLogin(t, JSON.parse(u)); } catch (e) {}
})();
