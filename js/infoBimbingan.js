// ============================================================
// infoBimbingan.js — Panel Info Metode & Catatan Bimbingan
// Data disimpan di localStorage, diedit via modal
// ============================================================

const INFO_STORAGE_KEY = 'lytana_info_bimbingan';

const INFO_DEFAULT = {
  metode: [
    { icon: '🏢', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)', judul: 'Bimbingan Tatap Muka (Luring)', isi: 'Dilaksanakan langsung di kampus sesuai kesepakatan reservasi LYTANA.' },
    { icon: '💻', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.22)',  judul: 'Daring Real-Time', isi: 'Melalui media konferensi video (Zoom/Google Meet) + Bitrix.' },
    { icon: '📧', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)',  judul: 'Daring via Email', isi: 'Dengan ketentuan kuota maksimal 40% dari keseluruhan proses bimbingan.' },
    { icon: '📌', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)',  judul: 'Wajib', isi: 'Menggunakan LYTANA untuk reservasi dan Bitrix24 untuk bimbingan Online.' }
  ],
  catatan: [
    'Bagi teman-teman yang akan melakukan bimbingan, mohon melakukan reservasi terlebih dahulu via LYTANA. Hal ini diperlukan untuk memastikan jadwal, mengingat agenda dapat berubah sewaktu-waktu.',
    'Saya terbuka untuk janji temu mendadak, asalkan ada slot waktu yang kosong di jadwal saya di luar Reservasi LYTANA. Mohon cek ketersediaan saya terlebih dahulu.',
    'Mohon untuk membawa berkas bimbingan sebelumnya yang telah dikoreksi sebagai bahan tindak lanjut diskusi kita.',
    'Bagi mahasiswa yang memilih bimbingan daring, silahkan gunakan Bitrix dan memilih reservasi dahulu di sistem LYTANA atau menghubungi via WhatsApp untuk konfirmasi waktu di luar jadwal reservasi.'
  ]
};

const METODE_PRESETS = [
  { icon: '🏢', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)' },
  { icon: '💻', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.22)'  },
  { icon: '📧', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)'  },
  { icon: '📌', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)'  },
  { icon: '📞', bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.22)'   },
  { icon: '📝', bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.22)'   },
];

// ── Load & Save ───────────────────────────────────────────────
function loadInfoBimbingan() {
  try {
    const raw = localStorage.getItem(INFO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INFO_DEFAULT;
}

function saveInfoBimbinganData(data) {
  try { localStorage.setItem(INFO_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}

// ── Render Panel ──────────────────────────────────────────────
function renderInfoPanel(metodeId, catatanId) {
  const info = loadInfoBimbingan();
  const mEl  = document.getElementById(metodeId);
  const cEl  = document.getElementById(catatanId);
  if (!mEl || !cEl) return;

  mEl.innerHTML = info.metode.map(m => `
    <div class="info-metode-item" style="background:${m.bg};border:1px solid ${m.border}">
      <span class="info-metode-icon">${m.icon}</span>
      <div><b>${m.judul}:</b> ${m.isi}</div>
    </div>`).join('');

  cEl.innerHTML = info.catatan.map(c => `
    <div class="info-catatan-item">
      <div class="info-catatan-dot"></div>
      <span>${c}</span>
    </div>`).join('');
}

function renderAllInfoPanels() {
  renderInfoPanel('d-info-metode-list', 'd-info-catatan-list');
  renderInfoPanel('m-info-metode-list', 'm-info-catatan-list');
}

// ── Edit Modal ────────────────────────────────────────────────
function openInfoEdit() {
  const info = loadInfoBimbingan();
  buildMetodeFields(info.metode);
  buildCatatanFields(info.catatan);
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
  const preset = m || METODE_PRESETS[i % METODE_PRESETS.length];
  const div    = document.createElement('div');
  div.className = 'metode-field-row';
  div.dataset.idx = i;
  div.style.cssText = 'display:flex;gap:8px;align-items:flex-start;background:var(--card2);border:1px solid var(--border2);border-radius:9px;padding:12px;';
  div.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0">
      <div style="display:flex;gap:8px">
        <input class="form-input" style="width:52px;text-align:center;font-size:1.2rem;padding:6px;flex-shrink:0"
               placeholder="🏢" value="${preset.icon || ''}"/>
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

function saveInfoBimbingan() {
  const metodeRows = document.querySelectorAll('#modal-metode-fields .metode-field-row');
  const metode = Array.from(metodeRows).map((row, i) => {
    const inputs   = row.querySelectorAll('input.form-input');
    const textarea = row.querySelector('textarea');
    const preset   = METODE_PRESETS[i % METODE_PRESETS.length];
    return {
      icon:   inputs[0]?.value.trim()  || preset.icon,
      bg:     preset.bg,
      border: preset.border,
      judul:  inputs[1]?.value.trim()  || '',
      isi:    textarea?.value.trim()   || ''
    };
  }).filter(m => m.judul || m.isi);

  const catatan = Array.from(document.querySelectorAll('#modal-catatan-fields textarea'))
    .map(t => t.value.trim())
    .filter(Boolean);

  saveInfoBimbinganData({ metode, catatan });
  renderAllInfoPanels();
  closeModal('modal-info-edit');
  toast('Informasi bimbingan berhasil disimpan!', 'success');
}
