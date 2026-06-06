// ============================================================
// infoBimbingan.js — Panel Info Metode & Catatan Bimbingan
// v2 — Data disimpan di GAS per dosen (bukan localStorage)
// Mahasiswa melihat info dari dosen pembimbing 1-nya
// ============================================================

const METODE_PRESETS = [
  { icon: '🏢', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)' },
  { icon: '💻', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.22)'  },
  { icon: '📧', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)'  },
  { icon: '📌', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)'  },
  { icon: '📞', bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.22)'   },
  { icon: '📝', bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.22)'   },
];

const INFO_DEFAULT = {
  metode: [
    { icon: '🏢', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)', judul: 'Bimbingan Tatap Muka (Luring)', isi: 'Dilaksanakan langsung di kampus sesuai kesepakatan reservasi LYTANA.' },
    { icon: '💻', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.22)',  judul: 'Daring Real-Time', isi: 'Melalui media konferensi video (Zoom/Google Meet) + Bitrix.' },
    { icon: '📧', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)',  judul: 'Daring via Email', isi: 'Dengan ketentuan kuota maksimal 40% dari keseluruhan proses bimbingan.' },
    { icon: '📌', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)',  judul: 'Wajib', isi: 'Menggunakan LYTANA untuk reservasi dan Bitrix24 untuk bimbingan Online.' }
  ],
  catatan: [
    'Bagi teman-teman yang akan melakukan bimbingan, mohon melakukan reservasi terlebih dahulu via LYTANA.',
    'Mohon untuk membawa berkas bimbingan sebelumnya yang telah dikoreksi sebagai bahan tindak lanjut diskusi kita.',
  ]
};

// Cache in-memory agar tidak perlu fetch ulang setiap render
let _infoBimbinganCache = null; // untuk dosen (milik sendiri)

// ── Load info milik dosen yang sedang login ───────────────────
async function loadInfoBimbinganDosen() {
  if (!state.token || state.user?.role !== 'dosen') return INFO_DEFAULT;
  // Cek cache
  if (_infoBimbinganCache) return _infoBimbinganCache;
  const res = await api('getInfoBimbingan', { token: state.token });
  if (res.success && res.info) {
    _infoBimbinganCache = res.info;
    return res.info;
  }
  return INFO_DEFAULT;
}

// ── Load info dari dosen pembimbing tertentu (untuk mahasiswa) ─
async function loadInfoBimbinganByDosen(dosenKode) {
  if (!dosenKode) return INFO_DEFAULT;
  const res = await api('getInfoBimbinganByDosen', { dosenKode, token: state.token });
  if (res.success && res.info) return res.info;
  return INFO_DEFAULT;
}

// ── Render panel HTML dari objek info ────────────────────────
function renderInfoPanelFromData(info, metodeId, catatanId) {
  const mEl = document.getElementById(metodeId);
  const cEl = document.getElementById(catatanId);
  if (!mEl || !cEl) return;

  if (!info || (!info.metode?.length && !info.catatan?.length)) {
    mEl.innerHTML = '<div style="color:var(--text3);font-size:0.82rem;padding:8px 0">Belum ada informasi metode bimbingan.</div>';
    cEl.innerHTML = '';
    return;
  }

  mEl.innerHTML = (info.metode || []).map(m => `
    <div class="info-metode-item" style="background:${m.bg};border:1px solid ${m.border}">
      <span class="info-metode-icon">${m.icon}</span>
      <div><b>${m.judul}:</b> ${m.isi}</div>
    </div>`).join('');

  cEl.innerHTML = (info.catatan || []).map(c => `
    <div class="info-catatan-item">
      <div class="info-catatan-dot"></div>
      <span>${c}</span>
    </div>`).join('');
}

// ── Render panel dosen (data milik dosen login) ───────────────
async function renderDosenInfoPanel() {
  const info = await loadInfoBimbinganDosen();
  renderInfoPanelFromData(info, 'd-info-metode-list', 'd-info-catatan-list');
}

// ── Render panel mahasiswa (data dari dosbing 1) ──────────────
async function renderMhsInfoPanel() {
  const dosenKode = state.user?.dosenKode1 || '';
  const info      = await loadInfoBimbinganByDosen(dosenKode);
  renderInfoPanelFromData(info, 'm-info-metode-list', 'm-info-catatan-list');
}

// ── renderAllInfoPanels — dipanggil saat login ────────────────
async function renderAllInfoPanels() {
  if (state.user?.role === 'dosen') {
    await renderDosenInfoPanel();
  } else if (state.user?.role === 'mahasiswa') {
    await renderMhsInfoPanel();
  }
}

// ── Edit Modal — buka dengan data terkini dari server ─────────
async function openInfoEdit() {
  const info = await loadInfoBimbinganDosen();
  buildMetodeFields(info.metode || []);
  buildCatatanFields(info.catatan || []);
  openModal('modal-info-edit');
}

function buildMetodeFields(metodeArr) {
  const c = document.getElementById('modal-metode-fields');
  c.innerHTML = '';
  metodeArr.forEach((m, i) => addMetodeField(m, i));
}

function addMetodeField(m, idx) {
  const c      = document.getElementById('modal-metode-fields');
  const i      = idx !== undefined ? idx : c.children.length;
  const preset = METODE_PRESETS[i % METODE_PRESETS.length];
  const div    = document.createElement('div');
  div.className = 'metode-field-row';
  div.dataset.idx = i;
  div.style.cssText = 'display:flex;gap:8px;align-items:flex-start;background:var(--card2);border:1px solid var(--border2);border-radius:9px;padding:12px;';
  div.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0">
      <div style="display:flex;gap:8px">
        <input class="form-input" style="width:52px;text-align:center;font-size:1.2rem;padding:6px;flex-shrink:0"
               placeholder="🏢" value="${(m && m.icon) || preset.icon}"/>
        <input class="form-input" style="flex:1" placeholder="Judul metode" value="${(m && m.judul) || ''}"/>
      </div>
      <textarea class="form-textarea" style="min-height:56px;font-size:0.85rem" placeholder="Deskripsi metode...">${(m && m.isi) || ''}</textarea>
    </div>
    <button onclick="removeField(this.parentElement,'modal-metode-fields')"
            style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:1.2rem;padding:4px;flex-shrink:0;margin-top:2px" title="Hapus">✕</button>`;
  c.appendChild(div);
}

function buildCatatanFields(catatanArr) {
  const c = document.getElementById('modal-catatan-fields');
  c.innerHTML = '';
  catatanArr.forEach(ct => addCatatanField(ct));
}

function addCatatanField(val) {
  const c   = document.getElementById('modal-catatan-fields');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
  div.innerHTML = `
    <textarea class="form-textarea" style="flex:1;min-height:54px;font-size:0.85rem" placeholder="Isi catatan...">${typeof val === 'string' ? val : ''}</textarea>
    <button onclick="removeField(this.parentElement,'modal-catatan-fields')"
            style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:1.2rem;padding:4px;flex-shrink:0;margin-top:6px" title="Hapus">✕</button>`;
  c.appendChild(div);
}

function removeField(rowEl, containerId) {
  document.getElementById(containerId).removeChild(rowEl);
}

// ── Simpan ke GAS ─────────────────────────────────────────────
async function saveInfoBimbingan() {
  const btn = document.getElementById('info-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Menyimpan...'; }

  const metodeRows = document.querySelectorAll('#modal-metode-fields .metode-field-row');
  const metode = Array.from(metodeRows).map((row, i) => {
    const inputs   = row.querySelectorAll('input.form-input');
    const textarea = row.querySelector('textarea');
    const preset   = METODE_PRESETS[i % METODE_PRESETS.length];
    return {
      icon:   inputs[0]?.value.trim() || preset.icon,
      bg:     preset.bg,
      border: preset.border,
      judul:  inputs[1]?.value.trim() || '',
      isi:    textarea?.value.trim()  || ''
    };
  }).filter(m => m.judul || m.isi);

  const catatan = Array.from(document.querySelectorAll('#modal-catatan-fields textarea'))
    .map(t => t.value.trim())
    .filter(Boolean);

  const res = await api('saveInfoBimbingan', { info: JSON.stringify({ metode, catatan }), token: state.token }, 'POST');

  if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }

  if (!res.success) { toast(res.message || 'Gagal menyimpan', 'error'); return; }

  // Invalidate cache lalu re-render
  _infoBimbinganCache = { metode, catatan };
  await renderDosenInfoPanel();
  closeModal('modal-info-edit');
  toast('Informasi bimbingan berhasil disimpan!', 'success');
}
