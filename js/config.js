// ============================================================
// config.js — Konfigurasi Global LYTARA
// Ganti GAS_URL dengan URL deployment Google Apps Script-mu
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw6pBW3mvuDY045_aq86yuSoXaSZuW33DnZQAPnkpvSC6-G4U724Ys8RQiizNz4rwZVLg/exec';

// ── State aplikasi global ────────────────────────────────────
let state = {
  user: null, token: null, selectedType: null,
  slots: [], allBookings: [], allSlots: [], allUsers: [], allDosen: [],
  dosenSlots: [], dosenBookings: [], dosenStudents: [],
  pendingSlot: null, pendingValidateId: null, pendingResetKode: null, pendingSetStatus: null,
  chatContacts: [], activeChatKode: null, chatAutoRefresh: null
};

// ── Konfigurasi Status Skripsi ───────────────────────────────
const STATUS_CONFIG = {
  aktif_bimbingan : { label: 'Aktif Bimbingan', emoji: '✅', cls: 'aktif_bimbingan' },
  tidak_aktif     : { label: 'Tidak Aktif',     emoji: '⏸', cls: 'tidak_aktif'     },
  revisi          : { label: 'Revisi',          emoji: '✏️', cls: 'revisi'          },
  menunggu_sidang : { label: 'Menunggu Sidang', emoji: '🏛', cls: 'menunggu_sidang' },
  lulus           : { label: 'Lulus / Wisuda',  emoji: '🎓', cls: 'lulus'           },
};

// ── Validasi panjang NIM & kode unik (harus sinkron dengan backend GAS) ──
const NIM_LENGTH   = 7;
const KODE_MIN_LEN = 4;
