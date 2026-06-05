// ============================================================
// helpers.js — Utilitas Inti: API, Toast, Modal, Helper
// ============================================================

// ── API ──────────────────────────────────────────────────────
async function api(action, params = {}, method = 'GET') {
  try {
    let url, options;
    if (method === 'GET') {
      url = GAS_URL + '?' + new URLSearchParams({ action, ...params }).toString();
      options = { method: 'GET', redirect: 'follow' };
    } else {
      url = GAS_URL;
      options = { method: 'POST', redirect: 'follow', body: JSON.stringify({ action, token: state.token, ...params }) };
    }
    const res  = await fetch(url, options);
    const text = await res.text();
    // GAS kadang return HTML error page — deteksi dini
    if (text.trim().startsWith('<')) {
      console.error('[API] GAS returned HTML instead of JSON for action:', action, text.substring(0, 200));
      return { success: false, message: 'GAS error: response bukan JSON. Cek Execution log di GAS Editor.' };
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('[API] JSON parse error for action:', action, 'response:', text.substring(0, 300));
      return { success: false, message: 'Parse error: ' + text.substring(0, 100) };
    }
  } catch (err) {
    console.error('[API] Fetch error for action:', action, err);
    return { success: false, message: 'Koneksi gagal: ' + err.message };
  }
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal ────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); })
  );
});

// ── Date Helper ──────────────────────────────────────────────
function fmtTgl(tglStr, opts) {
  if (!tglStr || tglStr.length < 8) return '—';
  const d = new Date(tglStr + 'T00:00:00');
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString('id-ID', opts || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function daysSinceStr(isoStr) {
  if (!isoStr) return 'Belum ada aktivitas';
  const d = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  return d + ' hari yang lalu';
}

// ── Avatar Fallback Helper (Anti Broken Image) ───────────────
function renderAvatar(foto, nama, size = 28) {
  const letter   = (nama || '?').charAt(0).toUpperCase();
  const fz       = size * 0.4;
  const fallback = `<div class="avatar-ph" style="width:${size}px;height:${size}px;border-radius:50%;font-size:${fz}px;flex-shrink:0">${letter}</div>`;
  if (!foto || foto.trim() === '') return fallback;
  return `<img src="${foto}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border2)" onerror="this.outerHTML='${fallback.replace(/'/g, "\\'")}'"/>`;
}

// ── Image Compressor Helper (Maks 400px, Kualitas 80%) ───────
function compressImage(file, maxSize, callback) {
  if (!file.type.match(/image\/(jpeg|png)/)) {
    return toast('Hanya file JPG dan PNG yang diperbolehkan', 'error');
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > height) {
        if (width > maxSize) { height = Math.round(height *= maxSize / width); width = maxSize; }
      } else {
        if (height > maxSize) { width = Math.round(width *= maxSize / height); height = maxSize; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Status Skripsi Helpers ────────────────────────────────────
function statusBadge(status) {
  const c = STATUS_CONFIG[status] || { label: status || '—', emoji: '?', cls: 'tidak_aktif' };
  return `<span class="status-badge status-${c.cls}">${c.emoji} ${c.label}</span>`;
}

function openSetStatus(kode, nama, currentStatus) {
  state.pendingSetStatus = kode;
  document.getElementById('modal-set-status-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      ${renderAvatar('', nama, 44)}
      <div>
        <div style="font-weight:700">${nama}</div>
        <div style="font-size:0.85rem;color:var(--text2);margin-top:4px">Status saat ini: ${statusBadge(currentStatus)}</div>
      </div>
    </div>`;
  openModal('modal-set-status');
}

async function confirmSetStatus(status) {
  if (!state.pendingSetStatus) return;
  const res = await api('setStudentStatus', { kode: state.pendingSetStatus, status, token: state.token }, 'POST');
  if (!res.success) return toast(res.message, 'error');
  toast('Status diperbarui: ' + STATUS_CONFIG[status].label, 'success');
  closeModal('modal-set-status');
  state.pendingSetStatus = null;
  loadDosenStudents();
}
