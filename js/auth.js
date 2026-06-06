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
// ── Konfigurasi splash per role ───────────────────────────────
const SPLASH_CONFIG = {
  mahasiswa: {
    gradient : 'linear-gradient(135deg,#0d9488,#06b6d4)',
    ringColor: 'rgba(20,184,166,0.35)',
    dotColor : 'var(--teal2)',
    badgeBg  : 'rgba(20,184,166,0.15)',
    badgeColor:'var(--teal2)',
    badgeBorder:'rgba(20,184,166,0.4)',
    label    : 'MAHASISWA',
    greeting : (nama) => `Halo, ${nama.split(' ')[0]}! 👋`,
    msg      : 'Memuat jadwal bimbingan...',
  },
  dosen: {
    gradient : 'linear-gradient(135deg,#2563eb,#7c3aed)',
    ringColor: 'rgba(99,102,241,0.35)',
    dotColor : 'var(--blue2)',
    badgeBg  : 'rgba(37,99,235,0.15)',
    badgeColor:'var(--blue2)',
    badgeBorder:'rgba(37,99,235,0.4)',
    label    : 'DOSEN',
    greeting : (nama) => `Selamat datang, ${nama.split(' ')[0]}! 🎓`,
    msg      : 'Memuat dashboard dosen...',
  },
  admin: {
    gradient : 'linear-gradient(135deg,#b45309,#f97316)',
    ringColor: 'rgba(249,115,22,0.35)',
    dotColor : 'var(--orange)',
    badgeBg  : 'rgba(249,115,22,0.15)',
    badgeColor:'var(--orange)',
    badgeBorder:'rgba(249,115,22,0.4)',
    label    : 'ADMIN',
    greeting : (nama) => `Dashboard Admin 🔑`,
    msg      : 'Memuat data sistem...',
  }
};

// ── Tampilkan splash screen ───────────────────────────────────
function showSplash(user, callback) {
  const cfg = SPLASH_CONFIG[user.role] || SPLASH_CONFIG.admin;
  const el  = document.getElementById('splash-screen');
  if (!el) { callback(); return; }

  // Isi konten
  const avatar = document.getElementById('splash-avatar');
  avatar.textContent      = user.nama.charAt(0).toUpperCase();
  avatar.style.background = cfg.gradient;
  avatar.style.color      = '#fff';
  avatar.style.borderColor= cfg.ringColor.replace('0.35','0.5');

  document.getElementById('splash-rings').querySelectorAll('.splash-ring').forEach(r => {
    r.style.borderColor = cfg.ringColor;
  });
  document.querySelectorAll('.splash-dot').forEach(d => {
    d.style.background = cfg.dotColor;
  });

  document.getElementById('splash-greeting').textContent = cfg.greeting(user.nama);
  document.getElementById('splash-name').textContent     = user.nama;
  document.getElementById('splash-msg').textContent      = cfg.msg;

  const badge = document.getElementById('splash-role-badge');
  badge.textContent     = cfg.label;
  badge.style.background  = cfg.badgeBg;
  badge.style.color       = cfg.badgeColor;
  badge.style.border      = `1px solid ${cfg.badgeBorder}`;

  // Reset class dulu agar animasi bisa trigger ulang
  el.classList.remove('splash-screen-active', 'splash-screen-exit');
  el.style.display   = 'flex';
  el.style.opacity   = '1';
  el.style.transform = 'scale(1)';
  el.style.animation = 'none';

  // Trigger reflow agar browser reset animasi
  void el.offsetWidth;

  // Aktifkan animasi dengan class
  el.classList.add('splash-screen-active');

  // Tutup setelah 1.9 detik
  setTimeout(() => {
    el.classList.add('splash-screen-exit');
    setTimeout(() => {
      el.style.display = 'none';
      el.classList.remove('splash-screen-active', 'splash-screen-exit');
      callback();
    }, 400);
  }, 1900);
}

// ── onLogin ───────────────────────────────────────────────────
function onLogin(token, user) {
  state.token = token;
  state.user  = user;
  localStorage.setItem('lytana_token', token);
  localStorage.setItem('lytana_user', JSON.stringify(user));

  // Tampilkan splash dulu, baru masuk halaman
  showSplash(user, () => {
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
      if (user.statusSkripsi === 'tidak_aktif') {
        setTimeout(() => toast('⚠️ Akunmu tidak aktif karena lebih dari 14 hari tidak bimbingan. Hubungi dosen pembimbingmu.', 'error'), 600);
      }
      // Isi dropdown dosen di modal izin bitrix
      _fillIzinDosenDropdown(user);
      loadMahasiswaDeadlines().then(() => {
        renderDeadlineBannerMhs();
        const aktifCount = (state.myDeadlines || []).filter(d => d.status === 'aktif' || d.status === 'selesai_menunggu').length;
        const badge = document.getElementById('m-deadline-badge');
        if (badge) { badge.textContent = aktifCount; badge.style.display = aktifCount > 0 ? 'inline' : 'none'; }
        loadSlotPreviews();
      });
      // Load izin bitrix untuk badge
      loadMahasiswaIzinBitrix();
    }
  });
}

// ── Isi dropdown dosen di modal izin bitrix ───────────────────
function _fillIzinDosenDropdown(user) {
  const sel = document.getElementById('izin-dosen-sel');
  if (!sel) return;
  const opts = [];
  if (user.dosenKode1) opts.push({ kode: user.dosenKode1, nama: user.dosenNama1 || user.dosenKode1, label: 'Pembimbing 1' });
  if (user.dosenKode2) opts.push({ kode: user.dosenKode2, nama: user.dosenNama2 || user.dosenKode2, label: 'Pembimbing 2' });
  sel.innerHTML = '<option value="">-- Pilih Dosen --</option>' +
    opts.map(o => `<option value="${o.kode}">${o.nama} (${o.label})</option>`).join('');
  if (opts.length === 1) sel.value = opts[0].kode;
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

// ── Auto-login dari localStorage (tanpa splash) ───────────────
(function () {
  const t = localStorage.getItem('lytana_token');
  const u = localStorage.getItem('lytana_user');
  if (!t || !u) return;
  try {
    const user  = JSON.parse(u);
    state.token = t;
    state.user  = user;
    // Langsung masuk tanpa splash
    if (user.role === 'admin') {
      showPage('admin');
      loadAdminDashboard();
    } else if (user.role === 'dosen') {
      updateDosenChip();
      showPage('dosen');
      loadDosenDashboard();
      renderAllInfoPanels();
      loadDosenIzinBitrix(); // badge izin dosen
    } else {
      updateMhsChip();
      showPage('mahasiswa');
      renderAllInfoPanels();
      if (user.statusSkripsi === 'tidak_aktif') {
        setTimeout(() => toast('⚠️ Akunmu tidak aktif. Hubungi dosen pembimbingmu.', 'error'), 800);
      }
      _fillIzinDosenDropdown(user);
      loadMahasiswaDeadlines().then(() => {
        renderDeadlineBannerMhs();
        const aktifCount = (state.myDeadlines || []).filter(d => d.status === 'aktif' || d.status === 'selesai_menunggu').length;
        const badge = document.getElementById('m-deadline-badge');
        if (badge) { badge.textContent = aktifCount; badge.style.display = aktifCount > 0 ? 'inline' : 'none'; }
        loadSlotPreviews();
      });
      loadMahasiswaIzinBitrix(); // badge izin mahasiswa
    }
  } catch (e) {}
})();
