# LYTANA — Layanan Reservasi & Tracking Akademik

**v7.0** · Sistem Manajemen Bimbingan Skripsi  
STMIK Bina Patria Magelang — Bidang Akademik

---

## Daftar Isi

- [Tentang LYTANA](#tentang)
- [Arsitektur & Stack](#arsitektur)
- [Struktur File](#struktur-file)
- [Struktur Spreadsheet](#spreadsheet)
- [Instalasi & Setup Awal](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Peran Pengguna](#peran)
- [Fitur Lengkap](#fitur)
- [Sistem Kode Login](#kode-login)
- [Sistem Status Skripsi](#status-skripsi)
- [Sistem Inaktif Otomatis](#inaktif)
- [Notifikasi Email](#notifikasi)
- [Chat Personal](#chat)
- [API Reference](#api)
- [Trigger Terjadwal](#trigger)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Tentang LYTANA

LYTANA (Layanan Reservasi & Tracking Akademik) adalah aplikasi web manajemen bimbingan skripsi berbasis **single-file HTML + Google Apps Script + Google Sheets**. Dirancang untuk memudahkan koordinasi antara mahasiswa dan dosen pembimbing dalam proses bimbingan skripsi, mulai dari reservasi sesi, tracking progress, hingga rekap akademik.

### Filosofi Desain

- **Zero server cost** — seluruh backend berjalan di Google Apps Script (gratis)
- **Zero database cost** — Google Sheets sebagai database
- **Single HTML file** — mudah di-deploy di GitHub Pages atau hosting apapun
- **Mobile-first** — UI responsif untuk akses dari HP

---

## Arsitektur & Stack

```
┌─────────────────────────────────────┐
│           Frontend (GitHub Pages)    │
│                                     │
│  index.html   ← tampilan utama      │
│  style.css    ← styling global      │
│  config.js    ← URL GAS & konstanta │
│  auth.js      ← login/register      │
│  nav.js       ← navigasi halaman    │
│  helpers.js   ← utilitas & API      │
│  mahasiswa.js ← fitur mahasiswa     │
│  dosen.js     ← fitur dosen         │
│  admin.js     ← fitur admin         │
│  shared.js    ← booking & validasi  │
│  rekap.js     ← rekap & export CSV  │
│  chat.js      ← chat personal       │
│  infoBimbingan.js ← panel info      │
│  export.js    ← export rekap dosen  │
└────────────────┬────────────────────┘
                 │ fetch (GET/POST)
                 ▼
┌─────────────────────────────────────┐
│      Backend (Google Apps Script)   │
│                                     │
│  Kode_GS.txt → Code.gs di GAS      │
│  - doGet()  → action via URL param  │
│  - doPost() → action via JSON body  │
└────────────────┬────────────────────┘
                 │ SpreadsheetApp API
                 ▼
┌─────────────────────────────────────┐
│      Database (Google Sheets)       │
│                                     │
│  Sheet: Dosen, Users, Slots,        │
│         Bookings, History,          │
│         Progress, Chat              │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      Storage (Google Drive)         │
│  Folder foto profil dosen/mahasiswa │
└─────────────────────────────────────┘
```

---

## Struktur File

```
lytana/
├── index.html          # Halaman utama (semua UI)
├── style.css           # Stylesheet global
├── config.js           # GAS_URL & konstanta (NIM_LENGTH, KODE_MIN_LEN)
├── auth.js             # Login, register, logout, auto-login
├── nav.js              # showPage, mSwitch, dSwitch, aSwitch
├── helpers.js          # api(), toast(), modal, fmtTgl, renderAvatar
├── mahasiswa.js        # Reservasi, riwayat, progres, profil mahasiswa
├── dosen.js            # Dashboard, sesi, reservasi, mahasiswa, reaktivasi
├── admin.js            # Dashboard admin, kelola dosen & mahasiswa
├── shared.js           # bookingTable, validasi, cancel booking
├── rekap.js            # Rekap akademik & export CSV
├── chat.js             # Chat personal dosen ↔ mahasiswa
├── infoBimbingan.js    # Panel info metode & catatan bimbingan
├── export.js           # Export rekap dosen
└── Kode_GS.txt         # Kode backend → paste ke Google Apps Script
```

---

## Struktur Spreadsheet

Jalankan `setupSpreadsheet()` sekali dari GAS Editor untuk membuat semua sheet otomatis.

### Sheet: `Dosen`
| Kolom | Keterangan |
|---|---|
| `kode` | Kode login unik dosen (min. 4 karakter) |
| `nama` | Nama lengkap |
| `email` | Email untuk notifikasi |
| `foto_url` | URL foto profil (Google Drive) |
| `prodi` | Program studi pengajar |
| `created_at` | Timestamp pendaftaran (ISO) |

### Sheet: `Users` (Mahasiswa)
| Kolom | Keterangan |
|---|---|
| `kode` | Kode login gabungan: `kode_unik` + `NIM` (contoh: `budi2311033`) |
| `nama` | Nama lengkap |
| `email` | Email mahasiswa |
| `foto_url` | URL foto profil |
| `role` | Selalu `mahasiswa` |
| `dosen_kode_1` | Kode Pembimbing 1 |
| `dosen_kode_2` | Kode Pembimbing 2 (opsional) |
| `created_at` | Timestamp pendaftaran (ISO) |
| `status_skripsi` | Lihat [Status Skripsi](#status-skripsi) |
| `last_activity` | Timestamp aktivitas terakhir (ISO) — dipakai hitung inaktif |

### Sheet: `Slots`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik slot (`SL` + timestamp) |
| `tipe` | `offline` / `online` |
| `tanggal` | Tanggal sesi (YYYY-MM-DD) |
| `jam_mulai` | Jam mulai (HH:mm) |
| `jam_selesai` | Jam selesai (HH:mm) |
| `booked_by` | Kode mahasiswa yang memesan (kosong = tersedia) |
| `status_slot` | `draft` / `aktif` / `hangus` |
| `catatan` | Catatan/lokasi |
| `_deleted` | `deleted` jika sudah dihapus (soft delete) |
| `dosen_kode` | Kode dosen pemilik slot |

### Sheet: `Bookings`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik booking (`BK` + timestamp) |
| `kode_mhs` | Kode mahasiswa |
| `slot_id` | ID slot yang dipesan |
| `status` | `menunggu` / `disetujui` / `terselenggara` / `tidak_terselenggara` / `dibatalkan` |
| `catatan` | Catatan validasi / alasan batal |
| `created_at` | Timestamp booking (ISO) |

### Sheet: `History`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik history |
| `kode_mhs` | Kode mahasiswa |
| `slot_id` | ID slot (termasuk virtual `MENDADAK_*`) |
| `status` | Status akhir sesi |
| `catatan` | Catatan bimbingan |
| `tanggal` | Timestamp validasi (ISO) |

### Sheet: `Progress`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik progress |
| `kode_mhs` | Kode mahasiswa |
| `bab` | `Bab 1` s/d `Bab 5`, `Revisi` |
| `persentase` | 0–100 |
| `catatan` | Catatan progress |
| `updated_at` | Timestamp update terakhir (ISO) |

### Sheet: `Chat`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik chat (`CH` + timestamp) |
| `pengirim_kode` | Kode pengirim |
| `penerima_kode` | Kode penerima |
| `pesan` | Isi pesan |
| `created_at` | Timestamp (ISO) |
| `is_read` | `true` / `false` |

---

## Instalasi & Setup Awal

### 1. Deploy Frontend

**Opsi A — GitHub Pages (Rekomendasi):**
```
1. Upload semua file ke repository GitHub
2. Settings → Pages → Branch: main → folder: / (root)
3. Akses via https://username.github.io/nama-repo
```

**Opsi B — Hosting biasa:**
```
Upload semua file ke folder public_html hosting
```

### 2. Setup Google Apps Script

```
1. Buka script.google.com → New Project
2. Hapus kode default, paste seluruh isi Kode_GS.txt
3. Simpan (Ctrl+S)
4. Jalankan setupSpreadsheet() sekali dari Editor
   → Semua sheet akan terbuat otomatis di Spreadsheet
5. Deploy → New Deployment → Web App
   → Execute as: Me
   → Who has access: Anyone
6. Salin URL deployment
```

### 3. Konfigurasi Frontend

Buka `config.js`, ganti URL:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### 4. Setup Trigger Harian

Dari GAS Editor, jalankan sekali:
```javascript
setupDailyTrigger();          // auto-inaktif mahasiswa jam 01.00
setupRateLimitCleanupTrigger(); // bersihkan rate limit setiap 6 jam
```

---

## Konfigurasi

Semua konfigurasi utama ada di `CONFIG` object di `Kode_GS.txt`:

```javascript
const CONFIG = {
  SPREADSHEET_ID  : 'ID_spreadsheet_google_sheets_kamu',
  DRIVE_FOLDER_ID : 'ID_folder_google_drive_untuk_foto',
  ADMIN_CODE      : 'LYTANA_SUPERADMIN',   // kode login admin
  ADMIN_NAME      : 'Super Admin',
  TOKEN_SECRET    : 'lytana-v4-secret',    // ganti dengan string acak unik!
  ADMIN_TOKEN     : 'DOSEN_PASS_2026',     // token rahasia pendaftaran dosen
  INAKTIF_HARI    : 14,                    // hari sebelum auto-inaktif
  BATAS_BATAL_JAM : 24,                    // batas jam pembatalan reservasi
  NIM_LENGTH      : 7,                     // panjang NIM (sesuaikan kampus)
  KODE_MIN_LENGTH : 4,                     // panjang minimum kode unik
};
```

Di `config.js` (frontend):
```javascript
const GAS_URL    = 'https://...';  // URL deployment GAS
const NIM_LENGTH   = 7;            // harus sama dengan GAS
const KODE_MIN_LEN = 4;            // harus sama dengan GAS
```

> ⚠️ **Penting:** `TOKEN_SECRET` dan `ADMIN_TOKEN` harus diganti sebelum production. Jangan gunakan nilai default.

---

## Peran Pengguna

### 👨‍🎓 Mahasiswa
- Register sendiri dengan kode unik + NIM
- Pilih Pembimbing 1 & 2 saat registrasi
- Reservasi sesi bimbingan (offline/online)
- Lihat riwayat & status booking
- Update progress per bab (Bab 1–5, Revisi)
- Chat langsung dengan dosen pembimbing
- Upload foto profil

### 👨‍🏫 Dosen
- Register dengan token khusus (`ADMIN_TOKEN`)
- Buat & kelola sesi bimbingan (draft / publish)
- ACC, tolak, atau batalkan reservasi mahasiswa
- Validasi bimbingan (terselenggara / tidak terselenggara)
- Catat bimbingan mendadak (tanpa reservasi)
- Set status skripsi mahasiswa
- **Reaktivasi mahasiswa tidak aktif** (setelah pertemuan langsung)
- Chat dengan mahasiswa bimbingan
- Export rekap bimbingan (CSV)
- Kirim notifikasi email jadwal ke mahasiswa

### 🔑 Admin
- Login dengan `ADMIN_CODE`
- Dashboard statistik keseluruhan
- Kelola semua data dosen & mahasiswa
- Lihat semua booking & slot
- Rekap akademik lintas dosen
- Export rekap akademik (CSV)
- Reset kode login mahasiswa

---

## Fitur Lengkap

### Reservasi Sesi
- Mahasiswa pilih tipe (offline/online) lalu pilih slot tersedia
- Satu slot hanya bisa dipesan satu mahasiswa
- Mahasiswa hanya melihat slot dari dosen pembimbingnya sendiri
- Pembatalan hanya bisa dilakukan minimal **24 jam** sebelum bimbingan
- Dosen bisa batalkan reservasi dengan wajib mengisi alasan

### Manajemen Slot (Dosen)
- Buat sesi dalam mode **Draft** (tersimpan, belum tampil ke mahasiswa)
- **Publish** satu per satu atau sekaligus semua draft
- Edit & hapus slot (tidak bisa hapus slot yang sudah ada reservasi aktif)
- Slot kosong yang sudah lewat tanggal otomatis menjadi **Hangus**
- Filter slot berdasarkan tipe, status, dan rentang tanggal

### Validasi Bimbingan
- Status booking: `menunggu` → `disetujui` → `terselenggara` / `tidak_terselenggara`
- Dosen tambah catatan saat validasi
- Status `tidak_terselenggara` otomatis memberi **Kartu Merah** ke mahasiswa
- Bimbingan mendadak bisa dicatat langsung tanpa alur reservasi

### Kartu Merah
- Diberikan otomatis setiap booking divalidasi sebagai `tidak_terselenggara`
- Counter akumulatif, ditampilkan di kartu mahasiswa
- Bisa di-backfill dari data historis via `backfillKartuMerah()`

### Progress Skripsi
- 6 item progress: Bab 1, Bab 2, Bab 3, Bab 4, Bab 5, Revisi
- Persentase 0–100% per bab + catatan
- Progress bar & rata-rata keseluruhan
- Riwayat update tersimpan

### Rekap & Export
- Rekap per dosen: jumlah mahasiswa, status, aktivitas terakhir
- Export CSV rekap dosen (per bimbingan)
- Export CSV rekap akademik admin (seluruh mahasiswa lintas dosen)
- Filter rekap berdasarkan status skripsi

---

## Sistem Kode Login

Kode login mahasiswa terdiri dari dua bagian yang digabung:

```
[kode_unik] + [NIM]
Contoh: budi + 2311033 = budi2311033
```

- **Kode unik** — bebas, min. 4 karakter, ditentukan mahasiswa
- **NIM** — tepat 7 digit angka (sesuai konfigurasi `NIM_LENGTH`)
- Sistem cegah NIM yang sama didaftarkan dua kali
- Admin bisa reset kode login mahasiswa jika lupa

Kode login **dosen** bebas, min. 4 karakter, tanpa format NIM.

---

## Sistem Status Skripsi

| Status | Emoji | Keterangan |
|---|---|---|
| `aktif_bimbingan` | ✅ | Default, mahasiswa aktif bimbingan |
| `tidak_aktif` | ⏸ | Otomatis setelah 14 hari tanpa aktivitas |
| `revisi` | ✏️ | Sedang dalam proses revisi |
| `menunggu_sidang` | 🏛 | Sudah lulus, menunggu jadwal sidang |
| `lulus` | 🎓 | Lulus / sudah wisuda |

Status `revisi`, `menunggu_sidang`, `lulus` tidak akan di-override oleh sistem inaktif otomatis.

---

## Sistem Inaktif Otomatis

Mahasiswa dengan status `aktif_bimbingan` akan **otomatis berubah ke `tidak_aktif`** jika tidak ada aktivitas selama **14 hari** (dapat dikonfigurasi di `INAKTIF_HARI`).

### Yang Dimaksud "Aktivitas"
Setiap kali salah satu dari ini terjadi, `last_activity` direset ke sekarang:
- Booking reservasi berhasil
- Bimbingan divalidasi sebagai `terselenggara`
- Bimbingan mendadak dicatat dosen
- Update progress bab

### Dampak Status Tidak Aktif
- ❌ Tidak bisa melakukan reservasi bimbingan (diblokir frontend & backend)
- ⚠️ Toast peringatan muncul saat login
- 📋 Banner merah tampil di halaman reservasi
- 🔴 Kartu mahasiswa di dashboard dosen menampilkan border merah + badge "⏸ TIDAK AKTIF"

### Cara Reaktivasi
**Hanya Pembimbing 1 atau Pembimbing 2** yang bisa mengaktifkan kembali, setelah bertemu langsung dengan mahasiswa:

1. Dosen buka tab **Mahasiswa**
2. Kartu mahasiswa tidak aktif menampilkan tombol **✅ Aktifkan**
3. Konfirmasi di modal — menyatakan sudah bertemu langsung
4. Status kembali ke `aktif_bimbingan`, `last_activity` direset ke sekarang

### Mekanisme Teknis
- `computeStatus(storedStatus, lastActivity)` — dihitung dinamis setiap API call, tidak perlu trigger
- `autoUpdateInaktifStatus()` — trigger harian jam 01.00, menulis perubahan permanen ke sheet
- Status persisten di kolom `status_skripsi` sheet Users

---

## Notifikasi Email

### Notifikasi Otomatis Slot Baru
> ⚠️ Saat ini dikomentari di `createSlot()`. Aktifkan dengan uncomment blok `kirimNotifSlotBaru()`.

Saat dosen membuat slot baru, email dikirim ke semua mahasiswa bimbingannya yang aktif.

### Notifikasi Manual (Tombol Dosen)
Dosen klik tombol **"Kirim Notif Email"** di UI → sistem kirim email ke semua mahasiswa bimbingan yang status `aktif_bimbingan` atau `revisi`, berisi daftar semua slot kosong ke depan.

### Summary Harian
Fungsi `kirimSummaryHarian()` — bisa dipasang sebagai trigger terjadwal (misalnya setiap Senin pagi) untuk mengirim ringkasan slot tersedia ke semua mahasiswa yang relevan.

### Kuota Email GAS
Google Apps Script memiliki batas pengiriman email harian (~100 email/hari untuk akun biasa, ~1500 untuk Google Workspace). Pantau via `MailApp.getRemainingDailyQuota()`.

---

## Chat Personal

- Dosen ↔ Mahasiswa satu-satu (bukan grup)
- Dosen hanya bisa chat ke mahasiswa bimbingannya sendiri
- Mahasiswa hanya bisa chat ke Pembimbing 1 atau 2-nya
- Auto-refresh pesan setiap **8 detik** saat window chat aktif
- Badge unread muncul di tab navigasi
- Akses cepat: dari kartu mahasiswa → tombol 💬 Chat

---

## API Reference

### GET Actions (via URL parameter `?action=...&token=...`)

| Action | Auth | Keterangan |
|---|---|---|
| `getDosenList` | Public | Daftar dosen untuk dropdown registrasi |
| `getSlots` | Mahasiswa | Slot tersedia dari dosen pembimbing |
| `getMyBookings` | Mahasiswa | Reservasi aktif mahasiswa |
| `getMyHistory` | Mahasiswa | Riwayat bimbingan terselenggara |
| `getMyProgress` | Mahasiswa | Progress per bab |
| `getMyStatus` | Mahasiswa | Status skripsi terkini |
| `getMySlots` | Dosen | Slot milik dosen |
| `getMyStudents` | Dosen | Mahasiswa bimbingan + detail |
| `getMyBookingsAll` | Dosen | Semua booking untuk slot dosen ini |
| `getDosenDashboard` | Dosen | Statistik dashboard dosen |
| `exportRekap` | Dosen | Data rekap bimbingan |
| `getAllBookings` | Admin | Semua booking |
| `getAllUsers` | Admin | Semua mahasiswa |
| `getAllSlots` | Admin | Semua slot |
| `getDashboardStats` | Admin | Statistik dashboard admin |
| `getAllDosen` | Admin | Semua dosen |
| `getAkademikRekap` | Admin | Rekap akademik lengkap |
| `getMyChats` | Semua | Riwayat chat dengan seseorang |
| `getChatList` | Semua | Daftar kontak chat |

### POST Actions (via JSON body `{action, token, ...params}`)

| Action | Auth | Keterangan |
|---|---|---|
| `register` | Public | Registrasi mahasiswa baru |
| `registerDosen` | Token | Registrasi dosen (butuh `ADMIN_TOKEN`) |
| `login` | Public | Login semua role |
| `bookSlot` | Mahasiswa | Reservasi slot |
| `cancelBooking` | Mahasiswa | Batalkan reservasi (min. 24 jam sebelumnya) |
| `updateProgress` | Mahasiswa | Update progress bab |
| `uploadPhoto` | Mahasiswa | Upload foto profil |
| `createSlot` | Dosen | Buat sesi baru |
| `updateSlot` | Dosen | Edit sesi |
| `deleteSlot` | Dosen | Hapus sesi |
| `publishSlot` | Dosen | Publish draft sesi |
| `publishAllDrafts` | Dosen | Publish semua draft sekaligus |
| `validateBooking` | Dosen | Validasi hasil bimbingan |
| `setStudentStatus` | Dosen | Set status skripsi mahasiswa |
| `reaktivasiMahasiswa` | Dosen | Aktifkan kembali mahasiswa tidak aktif |
| `dosenCancelBooking` | Dosen | Dosen batalkan reservasi mahasiswa |
| `addBimbinganMendadak` | Dosen | Catat bimbingan tanpa reservasi |
| `kirim_notif_manual` | Dosen | Kirim notif email jadwal ke mahasiswa |
| `uploadPhotoDosen` | Dosen | Upload foto profil dosen |
| `updateDosenProfile` | Dosen | Update kode login dosen |
| `deleteUser` | Admin | Hapus mahasiswa |
| `deleteDosen` | Admin | Hapus dosen |
| `resetStudentCode` | Admin | Reset kode login mahasiswa |
| `sendChat` | Semua | Kirim pesan chat |
| `markChatRead` | Semua | Tandai pesan sudah dibaca |

---

## Trigger Terjadwal

Pasang dari GAS Editor → **Edit > Triggers**:

| Fungsi | Jadwal | Tujuan |
|---|---|---|
| `autoUpdateInaktifStatus()` | Setiap hari jam 01.00 | Update status inaktif + hanguskan slot lama |
| `cleanExpiredRateLimits()` | Setiap 6 jam | Bersihkan data rate limit expired |
| `kirimSummaryHarian()` | Opsional — sesuai kebutuhan | Kirim email summary jadwal tersedia |

Cara cepat pasang dua trigger utama:
```javascript
// Jalankan sekali dari GAS Editor:
setupDailyTrigger();
setupRateLimitCleanupTrigger();
```

---

## Deployment

### Update GAS setelah perubahan kode

Setiap kali `Kode_GS.txt` diperbarui dan dipaste ke GAS:
```
Deploy → Manage Deployments → Edit (ikon pensil) → Version: New version → Deploy
```
> URL deployment **tidak berubah** saat update versi — tidak perlu update `config.js`.

### Update Frontend

Jika menggunakan GitHub Pages, cukup push perubahan ke repository. GitHub Pages otomatis update dalam beberapa menit.

---

## Troubleshooting

### GAS mengembalikan HTML bukan JSON
Biasanya terjadi saat:
- URL deployment belum di-update setelah deploy ulang
- Terjadi error di GAS — cek **Execution logs** di GAS Editor
- Akses quota GAS habis

### Slot tidak muncul di mahasiswa
- Pastikan slot sudah di-**Publish** (bukan Draft)
- Pastikan `dosen_kode` slot sesuai dengan `dosenKode1` atau `dosenKode2` mahasiswa
- Slot hanya tampil untuk tanggal hari ini ke depan

### Email notif tidak terkirim
- Jalankan `pancingOtorisasi()` dari GAS Editor untuk authorize MailApp
- Cek `MailApp.getRemainingDailyQuota()` — pastikan kuota belum habis
- Pastikan email mahasiswa terisi di sheet Users

### Login gagal terus (dikunci)
- Akun dikunci setelah **5 percobaan gagal** dalam 5 menit
- Kunci berlangsung **15 menit**
- Admin bisa reset manual via `clearRateLimit('kode_user')` dari GAS Editor

### Mahasiswa tidak bisa reservasi setelah reaktivasi
- Pastikan `last_activity` sudah terupdate saat reaktivasi (fungsi `reaktivasiMahasiswa` sudah handle ini)
- Minta mahasiswa **logout dan login ulang** agar `state.user.statusSkripsi` di localStorage ter-refresh

### Foto profil tidak tampil
- Pastikan `DRIVE_FOLDER_ID` di CONFIG benar
- Pastikan folder Drive sudah di-set permission: **Anyone with link can view**
- File foto di Drive harus sharing `Anyone with the link`

---

## Changelog

### v7.0 (Current)
- ✅ Notifikasi email via tombol dosen
- ✅ Chat personal dosen ↔ mahasiswa
- ✅ Kartu Merah otomatis saat bimbingan tidak terselenggara
- ✅ Proteksi hapus slot yang sudah ada reservasi aktif
- ✅ Pengurutan reservasi berdasarkan tanggal slot

### v7.0 + Patch Inaktif
- ✅ Sistem auto-inaktif 14 hari dengan blokir reservasi frontend & backend
- ✅ Banner & notifikasi visual status tidak aktif untuk mahasiswa
- ✅ Tombol reaktivasi khusus dosen pembimbing di kartu mahasiswa
- ✅ Modal reaktivasi dengan konfirmasi pertemuan langsung
- ✅ API `reaktivasiMahasiswa` dengan validasi pembimbing

---

## Lisensi & Atribusi

Sistem LYTANA dikembangkan untuk keperluan internal **STMIK Bina Patria Magelang**.  
Hak Kekayaan Intelektual (HAKI) atas sistem terkait: **Ahmad Fauzi Anggi Ariesta Kusuma** (Skuro Production).

---

*Dokumentasi ini dibuat untuk versi LYTANA v7.0 + Patch Inaktif.*
