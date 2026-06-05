// ============================================================
// chat.js — Fitur Chat Personal & Notifikasi Email Manual
// ============================================================

let chatActiveKode     = null;
let chatRefreshInterval = null;

// ── Helper: ambil elemen chat sesuai role user aktif ──────────
function chatEl(id) {
  const prefix = (state.user && state.user.role === 'dosen') ? 'd-' : 'm-';
  return document.getElementById(prefix + id);
}

// ── Load daftar kontak chat ───────────────────────────────────
async function loadChatList() {
  const listEl = chatEl('chat-contact-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 12000);

  try {
    const url = GAS_URL + '?' + new URLSearchParams({ action: 'getChatList', token: state.token }).toString();
    const raw = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    const text = await raw.text();
    let res;
    try { res = JSON.parse(text); }
    catch (e) {
      console.error('[Chat] Parse error:', text.substring(0, 300));
      listEl.innerHTML = `<div style="padding:16px;color:var(--rose);font-size:0.82rem">
        ⚠️ Response tidak valid dari GAS<br>
        <small style="color:var(--text3);margin-top:4px;display:block">Buka Console (F12) untuk detail. Klik 🔄 coba lagi.</small>
      </div>`;
      return;
    }
    if (!res.success) {
      listEl.innerHTML = `<div style="padding:16px;color:var(--rose);font-size:0.82rem">
        ⚠️ ${res.message || 'Gagal memuat kontak'}<br>
        <small style="color:var(--text3);margin-top:4px;display:block">Klik 🔄 untuk coba lagi</small>
      </div>`;
      return;
    }
    state.chatContacts = res.contacts || [];
    renderChatContactList(state.chatContacts);

    const totalUnread = state.chatContacts.reduce((s, c) => s + (c.unread || 0), 0);
    const dBadge = document.getElementById('d-chat-badge');
    const mBadge = document.getElementById('m-chat-badge');
    if (dBadge) { dBadge.textContent = totalUnread; dBadge.style.display = totalUnread > 0 ? 'inline' : 'none'; }
    if (mBadge) { mBadge.textContent = totalUnread; mBadge.style.display = totalUnread > 0 ? 'inline' : 'none'; }

  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err.name === 'AbortError';
    listEl.innerHTML = `<div style="padding:16px;color:var(--rose);font-size:0.82rem">
      ⚠️ ${isTimeout ? 'Timeout — GAS terlalu lama merespons' : 'Koneksi gagal: ' + err.message}<br>
      <small style="color:var(--text3);margin-top:4px;display:block">Klik 🔄 untuk coba lagi</small>
    </div>`;
  }
}

function renderChatContactList(contacts) {
  const listEl = chatEl('chat-contact-list');
  if (!listEl) return;
  if (!contacts.length) { listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:0.82rem">Belum ada kontak</div>'; return; }
  listEl.innerHTML = contacts.map(c => `
    <div class="chat-contact ${chatActiveKode === c.kode ? 'active' : ''}" onclick="openChatWith('${c.kode}','${(c.nama || c.kode).replace(/'/g, "\\'")}')">
      <div style="flex-shrink:0">${renderAvatar(c.foto, c.nama, 38)}</div>
      <div style="flex:1;min-width:0">
        <div class="chat-contact-name">${c.nama || c.kode}</div>
        <div class="chat-contact-last">${c.lastMessage || 'Belum ada pesan'}</div>
      </div>
      ${c.unread > 0 ? `<span class="chat-unread-badge">${c.unread}</span>` : ''}
    </div>
  `).join('');
}

// ── Buka percakapan dengan seseorang ─────────────────────────
async function openChatWith(kode, nama) {
  chatActiveKode = kode;

  const dChatSection = document.getElementById('d-chat');
  const mChatSection = document.getElementById('m-chat');
  const chatSectionActive = (dChatSection && dChatSection.classList.contains('active')) ||
                            (mChatSection && mChatSection.classList.contains('active'));

  if (!chatSectionActive) {
    if (state.user?.role === 'dosen') dSwitch('chat');
    else mSwitch('chat');
    setTimeout(() => openChatWith(kode, nama), 1500);
    return;
  }

  const headerEl = chatEl('chat-main-header');
  if (headerEl) headerEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px">${renderAvatar('', nama, 32)} <span style="font-weight:700">${nama}</span></div>`;

  const inputArea = chatEl('chat-input-area');
  if (inputArea) inputArea.style.display = 'flex';

  renderChatContactList(state.chatContacts);
  await loadChatMessages(kode);
  await api('markChatRead', { withKode: kode, token: state.token }, 'POST');

  if (chatRefreshInterval) clearInterval(chatRefreshInterval);
  chatRefreshInterval = setInterval(async () => {
    if (chatActiveKode === kode) await loadChatMessages(kode);
  }, 8000);
}

async function loadChatMessages(kode) {
  const messagesEl = chatEl('chat-messages');
  if (!messagesEl) return;
  const res = await api('getMyChats', { token: state.token, withKode: kode });
  if (!res.success) return;
  const chats = res.chats || [];
  if (!chats.length) {
    messagesEl.innerHTML = '<div class="chat-empty">Belum ada pesan. Mulai percakapan!</div>';
    return;
  }
  const wasAtBottom = messagesEl.scrollTop + messagesEl.clientHeight >= messagesEl.scrollHeight - 20;
  messagesEl.innerHTML = chats.map(c => {
    const time = c.createdAt ? new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
    return `<div style="display:flex;flex-direction:column;align-items:${c.isMine ? 'flex-end' : 'flex-start'}">
      <div class="chat-bubble ${c.isMine ? 'mine' : 'theirs'}">${c.pesan.replace(/\n/g, '<br/>')}
        <div class="chat-time">${date} ${time}</div>
      </div>
    </div>`;
  }).join('');
  if (wasAtBottom || chats.length < 5) messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendChatMsg() {
  if (!chatActiveKode) return;
  const textEl = chatEl('chat-input-text');
  const pesan  = (textEl?.value || '').trim();
  if (!pesan) return;
  textEl.value = '';
  textEl.style.height = 'auto';
  const res = await api('sendChat', { toKode: chatActiveKode, pesan, token: state.token }, 'POST');
  if (!res.success) { toast(res.message, 'error'); return; }
  await loadChatMessages(chatActiveKode);
  await loadChatList();
}

function chatInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); }
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
}

// Quick access: dari kartu mahasiswa → buka chat
function openChatWithFromCard(kode, nama) {
  openChatWith(kode, nama);
}

// ── Test koneksi chat API (debug) ─────────────────────────────
async function testChatConnection() {
  const listEl = chatEl('chat-contact-list');
  if (listEl) listEl.innerHTML = '<div style="padding:16px;font-size:0.82rem;color:var(--text2)">🔍 Testing koneksi...</div>';
  try {
    const url  = GAS_URL + '?' + new URLSearchParams({ action: 'getChatList', token: state.token }).toString();
    const res  = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    console.log('[ChatTest] Raw response:', text.substring(0, 500));
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    if (listEl) {
      if (parsed && parsed.success) {
        listEl.innerHTML = `<div style="padding:16px;font-size:0.82rem;color:var(--green)">✅ Koneksi OK! ${parsed.contacts?.length || 0} kontak ditemukan.</div>`;
        setTimeout(() => loadChatList(), 1000);
      } else {
        listEl.innerHTML = `<div style="padding:16px;font-size:0.82rem;color:var(--rose)">❌ Error: ${parsed?.message || text.substring(0, 200)}</div>`;
      }
    }
  } catch (e) {
    if (listEl) listEl.innerHTML = `<div style="padding:16px;font-size:0.82rem;color:var(--rose)">❌ Fetch error: ${e.message}</div>`;
  }
}

// ── Kirim Notif Email ke Semua Mahasiswa (Manual) ─────────────
async function kirimNotifKeSemuaMhs(btn) {
  if (!confirm('Kirim notifikasi email jadwal terbaru ke semua mahasiswa bimbinganmu?')) return;
  const oldText = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner"></div> Mengirim...';
  const res = await api('kirim_notif_manual', { token: state.token }, 'POST');
  btn.disabled  = false;
  btn.innerHTML = oldText;
  if (res.success) toast(res.message, 'success');
  else toast(res.message || 'Gagal mengirim notifikasi', 'error');
}
