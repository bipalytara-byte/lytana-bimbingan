# LYTANA v9.0
### Layanan Reservasi & Tracking Akademik

**STMIK Bina Patria Magelang — Bidang Akademik**  
Hak Kekayaan Intelektual: **Ahmad Fauzi Anggi Ariesta Kusuma** (Skuro Production)

---

## Daftar Isi

1. [Tentang LYTANA](#tentang-lytana)
2. [Arsitektur & Stack](#arsitektur--stack)
3. [Struktur File](#struktur-file)
4. [Struktur Spreadsheet](#struktur-spreadsheet)
5. [Instalasi & Setup](#instalasi--setup)
6. [Konfigurasi](#konfigurasi)
7. [Peran Pengguna](#peran-pengguna)
8. [Fitur Lengkap](#fitur-lengkap)
9. [Sistem Kode Login](#sistem-kode-login)
10. [Sistem Status Skripsi](#sistem-status-skripsi)
11. [Sistem Inaktif Otomatis](#sistem-inaktif-otomatis)
12. [Deadline Skripsi](#deadline-skripsi)
13. [Izin Bimbingan via Bitrix](#izin-bimbingan-via-bitrix)
14. [Info Bimbingan Per Dosen](#info-bimbingan-per-dosen)
15. [Notifikasi Email](#notifikasi-email)
16. [Chat Personal](#chat-personal)
17. [Splash Screen Login](#splash-screen-login)
18. [API Reference](#api-reference)
19. [Trigger Terjadwal](#trigger-terjadwal)
20. [Deployment](#deployment)
21. [Troubleshooting](#troubleshooting)
22. [Changelog](#changelog)

---

## Tentang LYTANA

LYTANA (**L**ayanan Reservasi & **T**racking **A**kademik) adalah sistem manajemen bimbingan skripsi berbasis web untuk STMIK Bina Patria Magelang. Dibangun di atas stack zero-cost: **single-file HTML + Google Apps Script + Google Sheets**, dapat di-deploy di GitHub Pages tanpa biaya server.

### Filosofi Desain
- **Zero server cost** — backend berjalan sepenuhnya di Google Apps Script
- **Zero database cost** — Google Sheets sebagai database relasional sederhana
- **Single HTML file** — mudah di-deploy, update, dan di-maintain
- **Mobile-first** — UI responsif untuk akses dari perangkat apapun

---

## Arsitektur & Stack

```
┌──────────────────────────────────────────┐
│         Frontend (GitHub Pages)           │
│                                          │
│  index.html      ← UI utama (semua page) │
│  css/style.css   ← Stylesheet global     │
│  js/config.js    ← URL GAS & konstanta   │
│  js/helpers.js   ← API, toast, modal     │
│  js/nav.js       ← Routing navigasi      │
│  js/auth.js      ← Login/register/logout │
│  js/mahasiswa.js ← Fitur mahasiswa       │
│  js/dosen.js     ← Fitur dosen           │
│  js/admin.js     ← Fitur admin           │
│  js/shared.js    ← Booking & validasi    │
│  js/rekap.js     ← Rekap & export CSV    │
│  js/chat.js      ← Chat personal         │
│  js/deadline.js  ← Deadline skripsi      │
│  js/izinBitrix.js← Izin bimbingan Bitrix │
│  js/infoBimbingan.js ← Info per dosen    │
│  js/export.js    ← Export PDF arsip      │
└──────────────────┬───────────────────────┘
                   │ fetch GET / POST
                   ▼
┌──────────────────────────────────────────┐
│      Backend (Google Apps Script)         │
│                                          │
│  Code.gs  ←  isi dari Kode_GS.txt       │
│  doGet()  ← action via URL param         │
│  doPost() ← action via JSON body         │
└──────────────────┬───────────────────────┘
                   │ SpreadsheetApp API
                   ▼
┌──────────────────────────────────────────┐
│       Database (Google Sheets)            │
│                                          │
│  Dosen · Users · Slots · Bookings        │
│  History · Progress · Chat               │
│  Deadlines · InfoBimbingan · IzinBitrix  │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│       Storage (Google Drive)              │
│  Folder foto profil dosen & mahasiswa    │
└──────────────────────────────────────────┘
```

---

## Struktur File

```
lytana/
├── index.html              # Halaman utama — semua UI ada di sini
├── css/
│   └── style.css           # Stylesheet global + animasi splash
├── js/
│   ├── config.js           # GAS_URL, NIM_LENGTH, KODE_MIN_LEN, STATUS_CONFIG
│   ├── helpers.js          # api(), toast(), modal, fmtTgl, renderAvatar
│   ├── nav.js              # showPage, mSwitch, dSwitch, aSwitch
│   ├── auth.js             # Login, register, logout, auto-login, splash screen
│   ├── mahasiswa.js        # Reservasi, riwayat, progres, profil
│   ├── dosen.js            # Dashboard, sesi, reservasi, mahasiswa, reaktivasi
│   ├── admin.js            # Dashboard admin, kelola dosen & mahasiswa
│   ├── shared.js           # bookingTable, validasi, cancel booking
│   ├── rekap.js            # Rekap akademik & export CSV
│   ├── chat.js             # Chat personal dosen ↔ mahasiswa
│   ├── deadline.js         # Deadline skripsi per mahasiswa
│   ├── izinBitrix.js       # Izin bimbingan via Bitrix24
│   ├── infoBimbingan.js    # Panel info metode bimbingan per dosen
│   └── export.js           # Export PDF arsip mahasiswa
└── Kode_GS.txt             # Kode backend → paste ke Google Apps Script
```

---

## Struktur Spreadsheet

Jalankan `setupSpreadsheet()` dari GAS Editor untuk membuat semua sheet otomatis.

### Sheet: `Dosen`
| Kolom | Keterangan |
|---|---|
| `kode` | Kode login unik dosen |
| `nama` | Nama lengkap |
| `email` | Email untuk notifikasi |
| `foto_url` | URL foto profil (Google Drive) |
| `prodi` | Program studi |
| `created_at` | Timestamp pendaftaran (ISO) |

### Sheet: `Users` (Mahasiswa)
| Kolom | Keterangan |
|---|---|
| `kode` | Kode login gabungan: `kode_unik` + `NIM` |
| `nama` | Nama lengkap |
| `email` | Email mahasiswa |
| `foto_url` | URL foto profil |
| `role` | Selalu `mahasiswa` |
| `dosen_kode_1` | Kode Pembimbing 1 |
| `dosen_kode_2` | Kode Pembimbing 2 (opsional) |
| `created_at` | Timestamp pendaftaran (ISO) |
| `status_skripsi` | Lihat [Status Skripsi](#sistem-status-skripsi) |
| `last_activity` | Timestamp aktivitas terakhir — dasar perhitungan inaktif |

### Sheet: `Slots`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik (`SL` + timestamp) |
| `tipe` | `offline` / `online` |
| `tanggal` | Tanggal sesi (YYYY-MM-DD) |
| `jam_mulai` | Jam mulai (HH:mm) |
| `jam_selesai` | Jam selesai (HH:mm) |
| `booked_by` | Kode mahasiswa pemesan (kosong = tersedia) |
| `status_slot` | `draft` / `aktif` / `hangus` |
| `catatan` | Catatan/lokasi |
| `_deleted` | `deleted` = soft delete |
| `dosen_kode` | Kode dosen pemilik slot |

### Sheet: `Bookings`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik (`BK` + timestamp) |
| `kode_mhs` | Kode mahasiswa |
| `slot_id` | ID slot yang dipesan |
| `status` | `menunggu` / `disetujui` / `terselenggara` / `tidak_terselenggara` / `dibatalkan` |
| `catatan` | Catatan validasi / alasan batal |
| `created_at` | Timestamp booking (ISO) |

### Sheet: `History`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik |
| `kode_mhs` | Kode mahasiswa |
| `slot_id` | ID slot (termasuk `MENDADAK_*`) |
| `status` | Status akhir |
| `catatan` | Catatan bimbingan |
| `tanggal` | Timestamp validasi (ISO) |

### Sheet: `Progress`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik |
| `kode_mhs` | Kode mahasiswa |
| `bab` | `Bab 1` – `Bab 5`, `Revisi` |
| `persentase` | 0–100 |
| `catatan` | Catatan progress |
| `updated_at` | Timestamp update (ISO) |

### Sheet: `Chat`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik (`CH` + timestamp) |
| `pengirim_kode` | Kode pengirim |
| `penerima_kode` | Kode penerima |
| `pesan` | Isi pesan |
| `created_at` | Timestamp (ISO) |
| `is_read` | `true` / `false` |

### Sheet: `Deadlines`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik (`DL` + timestamp) |
| `mahasiswa_kode` | Kode mahasiswa target |
| `dosen_kode` | Kode dosen pembuat |
| `judul` | Judul tugas/deadline |
| `deskripsi` | Penjelasan detail (opsional) |
| `konsekuensi` | Konsekuensi jika tidak selesai (opsional) |
| `deadline_mahasiswa` | Tanggal batas mahasiswa (YYYY-MM-DD) |
| `deadline_dosen` | Tanggal batas review dosen (YYYY-MM-DD) |
| `status` | `aktif` / `selesai_menunggu` / `verified` / `expired` |
| `link_bitrix` | Link file Bitrix24 dari mahasiswa |
| `pernyataan_mhs` | Pernyataan konfirmasi mahasiswa |
| `konfirmasi_at` | Timestamp konfirmasi mahasiswa (ISO) |
| `verifikasi_at` | Timestamp verifikasi dosen (ISO) |
| `catatan_tolak` | Catatan jika konfirmasi ditolak |
| `created_at` | Timestamp pembuatan (ISO) |

### Sheet: `InfoBimbingan`
| Kolom | Keterangan |
|---|---|
| `dosen_kode` | Kode dosen pemilik info |
| `data_json` | Data info dalam format JSON (`{metode:[], catatan:[]}`) |
| `updated_at` | Timestamp update terakhir (ISO) |

### Sheet: `IzinBitrix`
| Kolom | Keterangan |
|---|---|
| `id` | ID unik (`IB` + timestamp) |
| `mahasiswa_kode` | Kode mahasiswa pengaju |
| `dosen_kode` | Kode dosen yang dituju |
| `topik` | Topik bimbingan |
| `deskripsi` | Detail topik (opsional) |
| `file_deskripsi` | Deskripsi file yang akan dikirim (opsional) |
| `status` | `menunggu` / `disetujui` / `sudah_kirim` / `selesai` / `ditolak` |
| `link_bitrix` | Link file yang sudah dikirim mahasiswa |
| `catatan_mhs` | Catatan mahasiswa saat konfirmasi kirim |
| `catatan_dosen` | Feedback dosen saat tandai selesai |
| `alasan_tolak` | Alasan jika ditolak |
| `acc_at` | Timestamp ACC dosen (ISO) |
| `kirim_at` | Timestamp konfirmasi kirim mahasiswa (ISO) |
| `selesai_at` | Timestamp tandai selesai dosen (ISO) |
| `created_at` | Timestamp pengajuan (ISO) |

---

## Instalasi & Setup

### 1. Deploy Frontend

**Opsi A — GitHub Pages (Rekomendasi)**
```
1. Upload semua file ke repository GitHub
2. Settings → Pages → Branch: main → folder: / (root)
3. Akses via https://username.github.io/nama-repo
```

**Opsi B — Hosting biasa**
```
Upload semua file ke folder public_html
```

### 2. Setup Google Apps Script

```
1. Buka script.google.com → New Project
2. Hapus kode default, paste seluruh isi Kode_GS.txt
3. Simpan (Ctrl+S), beri nama project (misal: "Lytana Backend")
4. Jalankan setupSpreadsheet() dari Editor → semua sheet terbuat otomatis
5. Deploy → New Deployment → Web App
   - Execute as: Me
   - Who has access: Anyone
6. Salin URL deployment
```

### 3. Konfigurasi Frontend

Edit `js/config.js`:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### 4. Setup Trigger Terjadwal

Jalankan sekali dari GAS Editor:
```javascript
setupDailyTrigger();            // auto-inaktif + reminder deadline jam 01.00
setupRateLimitCleanupTrigger(); // bersihkan rate limit setiap 6 jam
```

### 5. Otorisasi Email

Jalankan sekali untuk autorisasi `MailApp`:
```javascript
pancingOtorisasi();
```

---

## Konfigurasi

Semua konfigurasi ada di objek `CONFIG` di `Kode_GS.txt`:

```javascript
const CONFIG = {
  SPREADSHEET_ID  : 'ID_spreadsheet_google_sheets',   // ← wajib diganti
  DRIVE_FOLDER_ID : 'ID_folder_google_drive_foto',    // ← wajib diganti
  ADMIN_CODE      : 'LYTANA_SUPERADMIN',              // kode login admin
  ADMIN_NAME      : 'Super Admin',
  TOKEN_SECRET    : 'lytana-v4-secret',               // ← ganti dengan string acak!
  ADMIN_TOKEN     : 'DOSEN_PASS_2026',                // ← token rahasia daftar dosen
  INAKTIF_HARI    : 14,                               // hari sebelum auto tidak_aktif
  BATAS_BATAL_JAM : 24,                               // batas jam pembatalan reservasi
  NIM_LENGTH      : 7,                                // panjang NIM (sesuaikan kampus)
  KODE_MIN_LENGTH : 4,                                // panjang minimum kode unik
};
```

Di `js/config.js` (frontend), nilai `NIM_LENGTH` dan `KODE_MIN_LEN` **harus sama** dengan GAS.

> ⚠️ **Keamanan:** Ganti `TOKEN_SECRET` dan `ADMIN_TOKEN` sebelum production. Jangan gunakan nilai default.

---

## Peran Pengguna

### 👨‍🎓 Mahasiswa
- Register dengan kode unik + NIM, pilih Pembimbing 1 & 2
- Reservasi sesi bimbingan offline/online dari dosen pembimbing
- Lihat riwayat bimbingan & status booking
- Update progress skripsi per bab (Bab 1–5, Revisi)
- Lihat & konfirmasi deadline dari dosen
- Ajukan izin bimbingan via Bitrix24
- Chat langsung dengan dosen pembimbing
- Upload foto profil

### 👨‍🏫 Dosen
- Register dengan token khusus (`ADMIN_TOKEN`)
- Buat & kelola sesi bimbingan (draft → publish)
- ACC, tolak, atau batalkan reservasi
- Validasi bimbingan (terselenggara / tidak)
- Catat bimbingan mendadak tanpa reservasi
- Set & pantau deadline skripsi per mahasiswa
- Verifikasi konfirmasi penyelesaian deadline
- Kelola izin bimbingan via Bitrix24
- Set status skripsi mahasiswa
- Reaktivasi mahasiswa tidak aktif (setelah pertemuan langsung)
- Edit info metode bimbingan (tersimpan per dosen di server)
- Chat dengan mahasiswa bimbingan
- Export rekap bimbingan CSV
- Kirim notifikasi email jadwal ke mahasiswa

### 🔑 Admin
- Login dengan `ADMIN_CODE`
- Dashboard statistik keseluruhan sistem
- Kelola semua data dosen & mahasiswa
- Lihat semua booking & slot
- Rekap akademik lintas dosen
- Export rekap akademik CSV
- Reset kode login mahasiswa

---

## Fitur Lengkap

### Reservasi Sesi
- Mahasiswa pilih tipe (offline/online) → pilih slot dari dosen pembimbingnya
- Satu slot hanya bisa dipesan satu mahasiswa
- Pembatalan minimal **24 jam** sebelum jadwal
- Dosen bisa batalkan dengan wajib mengisi alasan
- Blokir otomatis jika mahasiswa `tidak_aktif` atau ada deadline terlewat

### Manajemen Slot
- Draft mode — slot tersimpan tapi belum tampil ke mahasiswa
- Publish satu per satu atau semua draft sekaligus
- Filter slot: tipe, status (tersedia/terisi), rentang tanggal
- Slot kosong yang lewat tanggal otomatis jadi **Hangus**

### Validasi Bimbingan
- Alur: `menunggu` → `disetujui` → `terselenggara` / `tidak_terselenggara`
- Status `tidak_terselenggara` otomatis beri **Kartu Merah** ke mahasiswa
- Bimbingan mendadak bisa dicatat langsung tanpa reservasi

### Progress Skripsi
- 6 item: Bab 1–5 + Revisi, persentase 0–100% per bab
- Progress bar visual + rata-rata keseluruhan
- Riwayat update tersimpan

---

## Sistem Kode Login

Kode login mahasiswa terdiri dari dua bagian yang digabung:

```
[kode_unik] + [NIM]
Contoh:  budi  +  2311033  =  budi2311033
```

- **Kode unik** — bebas, min. 4 karakter, ditentukan sendiri saat registrasi
- **NIM** — tepat 7 digit angka (sesuai `NIM_LENGTH` di config)
- Sistem mencegah NIM yang sama didaftarkan dua kali
- Admin bisa reset kode login jika lupa

Kode dosen bebas, min. 4 karakter, tanpa format NIM.

---

## Sistem Status Skripsi

| Status | Emoji | Keterangan |
|---|---|---|
| `aktif_bimbingan` | ✅ | Default — mahasiswa aktif bimbingan |
| `tidak_aktif` | ⏸ | Otomatis setelah 14 hari tanpa aktivitas |
| `revisi` | ✏️ | Sedang dalam proses revisi |
| `menunggu_sidang` | 🏛 | Menunggu jadwal sidang |
| `lulus` | 🎓 | Lulus / sudah wisuda |

Status `revisi`, `menunggu_sidang`, dan `lulus` tidak akan di-override oleh sistem inaktif otomatis.

---

## Sistem Inaktif Otomatis

Mahasiswa `aktif_bimbingan` otomatis berubah ke `tidak_aktif` jika tidak ada aktivitas selama **14 hari** (konfigurasi: `INAKTIF_HARI`).

### Yang Dimaksud "Aktivitas"
Setiap kejadian berikut mereset `last_activity` ke sekarang:
- Booking reservasi berhasil
- Bimbingan divalidasi sebagai `terselenggara`
- Bimbingan mendadak dicatat dosen
- Update progress bab
- Dosen tandai selesai di Izin Bitrix (`selesaiIzinBitrix`)

### Dampak Status Tidak Aktif
- Tidak bisa reservasi — diblokir di frontend dan backend
- Banner merah muncul di halaman reservasi
- Kartu mahasiswa di dashboard dosen menampilkan border merah + badge "⏸ TIDAK AKTIF"

### Cara Reaktivasi
Hanya **Pembimbing 1 atau 2** yang bisa mengaktifkan kembali setelah bertemu langsung:

```
Tab Mahasiswa → kartu mahasiswa tidak aktif → tombol "✅ Aktifkan" → konfirmasi modal
```

Sistem: set `status_skripsi = aktif_bimbingan` + reset `last_activity` ke sekarang.

---

## Deadline Skripsi

Fitur untuk dosen menetapkan tugas/deadline per mahasiswa. Jika deadline terlewat dan belum dikonfirmasi, akses reservasi mahasiswa diblokir.

### Alur Lengkap

```
Dosen set deadline
  ↓ (email otomatis ke mahasiswa)
Mahasiswa lihat deadline di tab "Deadline"
  ↓ (selesaikan tugas, upload ke Bitrix)
Mahasiswa klik "Konfirmasi Selesai" + isi pernyataan + link Bitrix
  ↓ (email otomatis ke dosen)
Dosen verifikasi di tab "Deadline"
  ↓ (email otomatis ke mahasiswa)
Akses reservasi terbuka kembali
```

### Status Deadline
| Status | Keterangan |
|---|---|
| `aktif` | Deadline berjalan, mahasiswa belum konfirmasi |
| `selesai_menunggu` | Mahasiswa sudah konfirmasi, menunggu verifikasi dosen |
| `verified` | Dosen sudah verifikasi, blokir dicabut |
| `expired` | Deadline lewat (auto) |

### Reminder Email Dosen
Trigger harian mengirim email ke dosen jika:
- Ada konfirmasi mahasiswa yang belum diverifikasi
- Deadline review dosen tinggal ≤ 2 hari

---

## Izin Bimbingan via Bitrix

Untuk bimbingan via Bitrix24 **di luar jalur reservasi LYTANA**. Mahasiswa wajib minta izin dulu sebelum mengirim file — jika tidak di-ACC, dosen tidak akan mengecek file di Bitrix.

### Alur Lengkap

```
Mahasiswa ajukan izin (topik + deskripsi + nama file)
  ↓ email notif ke dosen
Dosen ACC atau Tolak
  ↓ email notif ke mahasiswa
Jika ACC → mahasiswa kirim file ke Bitrix
  ↓ mahasiswa konfirmasi di LYTANA + tempel link
  ↓ email notif ke dosen
Dosen tandai "Sudah Dicek" + tulis feedback (opsional)
  ↓ email notif ke mahasiswa + touchActivity() (reset timer inaktif)
```

### Status Izin
| Status | Keterangan |
|---|---|
| `menunggu` | Pengajuan baru, belum ada respon dosen |
| `disetujui` | Di-ACC, mahasiswa boleh kirim ke Bitrix |
| `sudah_kirim` | Mahasiswa sudah konfirmasi kirim, menunggu dosen cek |
| `selesai` | Dosen sudah cek, selesai |
| `ditolak` | Ditolak dosen |

### Badge di Nav
- **Mahasiswa** — badge hijau jika ada izin yang di-ACC (menunggu konfirmasi kirim)
- **Dosen** — badge biru jika ada yang menunggu ACC atau file sudah dikirim

---

## Info Bimbingan Per Dosen

Panel "Informasi Metode Bimbingan" di dashboard tersimpan **per dosen di server** (bukan di localStorage). Setiap dosen bisa punya informasi metode bimbingan yang berbeda.

- **Dosen** — edit via tombol "✏️ Edit" di dashboard, tersimpan ke sheet `InfoBimbingan`
- **Mahasiswa** — otomatis tampil info dari Pembimbing 1 saat masuk halaman Reservasi

---

## Notifikasi Email

### Notifikasi Otomatis (event-driven)
| Event | Penerima |
|---|---|
| Slot baru dibuat dosen | Semua mahasiswa bimbingan aktif |
| Deadline baru dibuat dosen | Mahasiswa target |
| Mahasiswa konfirmasi deadline | Dosen |
| Dosen verifikasi/tolak deadline | Mahasiswa |
| Mahasiswa ajukan izin Bitrix | Dosen |
| Dosen ACC/tolak izin Bitrix | Mahasiswa |
| Mahasiswa konfirmasi kirim ke Bitrix | Dosen |
| Dosen tandai selesai Bitrix | Mahasiswa |

### Notifikasi Manual
- Dosen klik tombol **"📢 Kirim Notif ke Semua"** di tab Sesi → email ke semua mahasiswa bimbingan aktif berisi daftar slot tersedia

### Reminder Harian (Trigger)
Fungsi `autoUpdateInaktifStatus()` yang dijalankan setiap hari jam 01.00 juga memanggil `kirimReminderDeadlineDosen()` untuk mengirim reminder ke dosen jika ada deadline review yang perlu perhatian.

### Kuota Email
Google Apps Script: ~100 email/hari (akun biasa), ~1500/hari (Google Workspace). Pantau via `MailApp.getRemainingDailyQuota()`.

---

## Chat Personal

- Komunikasi satu-satu: dosen ↔ mahasiswa (bukan grup)
- Dosen hanya bisa chat ke mahasiswa bimbingannya
- Mahasiswa hanya bisa chat ke Pembimbing 1 atau 2
- Auto-refresh pesan setiap **8 detik**
- Badge unread di tab navigasi
- Akses cepat dari kartu mahasiswa → tombol 💬

---

## Splash Screen Login

Animasi transisi saat login manual (tidak muncul saat auto-login/refresh):

| Role | Warna | Greeting |
|---|---|---|
| Mahasiswa | Teal–Cyan | "Halo, [Nama]! 👋" |
| Dosen | Biru–Ungu | "Selamat datang, [Nama]! 🎓" |
| Admin | Coklat–Orange | "Dashboard Admin 🔑" |

Durasi: 1.9 detik → fade out → masuk halaman utama.

---

## API Reference

### GET Actions (`?action=...&token=...`)

| Action | Auth | Keterangan |
|---|---|---|
| `getDosenList` | Public | Daftar dosen untuk dropdown registrasi |
| `getSlots` | Mahasiswa | Slot tersedia dari dosen pembimbing |
| `getMyBookings` | Mahasiswa | Reservasi aktif |
| `getMyHistory` | Mahasiswa | Riwayat bimbingan |
| `getMyProgress` | Mahasiswa | Progress per bab |
| `getMyStatus` | Mahasiswa | Status skripsi terkini |
| `getMahasiswaDeadlines` | Mahasiswa | Deadline aktif mahasiswa |
| `getMahasiswaIzinBitrix` | Mahasiswa | Daftar izin Bitrix mahasiswa |
| `getMySlots` | Dosen | Slot milik dosen |
| `getMyStudents` | Dosen | Mahasiswa bimbingan + detail |
| `getMyBookingsAll` | Dosen | Semua booking untuk slot dosen |
| `getDosenDashboard` | Dosen | Statistik dashboard dosen |
| `getDosenDeadlines` | Dosen | Deadline yang dibuat dosen |
| `getDosenIzinBitrix` | Dosen | Pengajuan izin Bitrix untuk dosen |
| `getInfoBimbingan` | Dosen | Info bimbingan milik dosen |
| `getInfoBimbinganByDosen` | Semua | Info bimbingan dosen tertentu |
| `exportRekap` | Dosen | Data rekap bimbingan |
| `getAllBookings` | Admin | Semua booking |
| `getAllUsers` | Admin | Semua mahasiswa |
| `getAllSlots` | Admin | Semua slot |
| `getDashboardStats` | Admin | Statistik dashboard admin |
| `getAllDosen` | Admin | Semua dosen |
| `getAkademikRekap` | Admin | Rekap akademik lengkap |
| `getMyChats` | Semua | Riwayat chat |
| `getChatList` | Semua | Daftar kontak chat |

### POST Actions (JSON body `{action, token, ...}`)

| Action | Auth | Keterangan |
|---|---|---|
| `register` | Public | Registrasi mahasiswa |
| `registerDosen` | Token | Registrasi dosen |
| `login` | Public | Login semua role |
| `bookSlot` | Mahasiswa | Reservasi slot |
| `cancelBooking` | Mahasiswa | Batalkan reservasi |
| `updateProgress` | Mahasiswa | Update progress bab |
| `uploadPhoto` | Mahasiswa | Upload foto profil |
| `konfirmasiDeadline` | Mahasiswa | Konfirmasi deadline selesai |
| `ajukanIzinBitrix` | Mahasiswa | Ajukan izin bimbingan Bitrix |
| `konfirmasiKirimBitrix` | Mahasiswa | Konfirmasi sudah kirim ke Bitrix |
| `createSlot` | Dosen | Buat sesi baru |
| `updateSlot` | Dosen | Edit sesi |
| `deleteSlot` | Dosen | Hapus sesi |
| `publishSlot` | Dosen | Publish draft sesi |
| `publishAllDrafts` | Dosen | Publish semua draft |
| `validateBooking` | Dosen | Validasi hasil bimbingan |
| `setStudentStatus` | Dosen | Set status skripsi |
| `reaktivasiMahasiswa` | Dosen | Aktifkan kembali mahasiswa tidak aktif |
| `dosenCancelBooking` | Dosen | Batalkan reservasi mahasiswa |
| `addBimbinganMendadak` | Dosen | Catat bimbingan tanpa reservasi |
| `createDeadline` | Dosen | Buat deadline baru |
| `updateDeadline` | Dosen | Edit deadline |
| `hapusDeadline` | Dosen | Hapus deadline |
| `verifikasiDeadline` | Dosen | Verifikasi konfirmasi mahasiswa |
| `tolakDeadline` | Dosen | Tolak konfirmasi mahasiswa |
| `accIzinBitrix` | Dosen | ACC pengajuan izin Bitrix |
| `tolakIzinBitrix` | Dosen | Tolak pengajuan izin Bitrix |
| `selesaiIzinBitrix` | Dosen | Tandai sudah cek file di Bitrix |
| `saveInfoBimbingan` | Dosen | Simpan info metode bimbingan |
| `uploadPhotoDosen` | Dosen | Upload foto profil dosen |
| `updateDosenProfile` | Dosen | Update kode login dosen |
| `kirim_notif_manual` | Dosen | Kirim notif email jadwal |
| `deleteUser` | Admin | Hapus mahasiswa |
| `deleteDosen` | Admin | Hapus dosen |
| `resetStudentCode` | Admin | Reset kode login mahasiswa |
| `sendChat` | Semua | Kirim pesan chat |
| `markChatRead` | Semua | Tandai pesan dibaca |

---

## Trigger Terjadwal

Pasang dari **Edit > Triggers** di GAS Editor, atau jalankan fungsi setup:

| Fungsi | Jadwal | Fungsi |
|---|---|---|
| `autoUpdateInaktifStatus()` | Setiap hari jam 01.00 | Update status inaktif + hanguskan slot + kirim reminder deadline |
| `cleanExpiredRateLimits()` | Setiap 6 jam | Bersihkan data rate limit expired |

```javascript
// Jalankan sekali di GAS Editor:
setupDailyTrigger();
setupRateLimitCleanupTrigger();
```

---

## Deployment

### Update GAS setelah perubahan kode

```
Deploy → Manage Deployments → Edit (✏️) → Version: New version → Deploy
```

URL deployment tidak berubah — tidak perlu update `config.js`.

### Update Frontend

Push perubahan ke GitHub → GitHub Pages otomatis update dalam beberapa menit.

---

## Troubleshooting

### GAS mengembalikan HTML bukan JSON
- Deploy ulang GAS dan buat versi baru
- Cek **Execution logs** di GAS Editor untuk error detail
- Pastikan quota harian GAS belum habis

### Slot tidak muncul untuk mahasiswa
- Pastikan slot sudah di-**Publish** (bukan Draft)
- Pastikan `dosen_kode` slot sesuai `dosenKode1` atau `dosenKode2` mahasiswa
- Slot hanya tampil untuk tanggal hari ini ke depan

### Email tidak terkirim
- Jalankan `pancingOtorisasi()` untuk autorisasi ulang `MailApp`
- Cek `MailApp.getRemainingDailyQuota()` — pastikan kuota belum habis
- Pastikan kolom `email` di sheet Dosen/Users terisi

### Login dikunci
- Akun terkunci setelah **5 percobaan gagal** dalam 5 menit
- Kunci berlangsung **15 menit** otomatis terbuka
- Admin bisa reset manual: `clearRateLimit('kode_user')` dari GAS Editor

### Mahasiswa tidak bisa reservasi setelah reaktivasi
- Minta mahasiswa **logout dan login ulang** agar status di localStorage ter-refresh

### Foto profil tidak tampil
- Pastikan `DRIVE_FOLDER_ID` di CONFIG benar
- Folder Drive harus permission: **Anyone with the link can view**

### Panel info bimbingan kosong di dosen
- Klik tombol **"✏️ Edit"** dan isi informasi, lalu simpan
- Data akan tersimpan di sheet `InfoBimbingan` di server (bukan localStorage)

### Splash screen tidak muncul
- Pastikan file `index.html` yang terbaru sudah di-upload (ada `<style>` animasi di `<head>`)
- Splash hanya muncul saat login manual, tidak saat auto-login/refresh

---

## Changelog

### v9.0 (Juni 2026) — Current
- ✅ **Izin Bimbingan via Bitrix** — mahasiswa ajukan izin dulu, dosen ACC, baru boleh kirim file
- ✅ **Splash Screen Login** — animasi transisi berbeda per role (mahasiswa/dosen/admin)
- ✅ **Info Bimbingan Per Dosen** — migrasi dari localStorage ke GAS, tiap dosen punya info sendiri
- ✅ Tab **"Izin Bitrix"** di nav mahasiswa dan dosen dengan badge notifikasi
- ✅ Email notifikasi lengkap di seluruh alur izin Bitrix
- ✅ `touchActivity()` dipanggil saat dosen tandai selesai izin Bitrix

### v8.0
- ✅ **Deadline Skripsi** — dosen set deadline per mahasiswa, blokir reservasi jika terlewat
- ✅ **Konfirmasi Deadline** — mahasiswa konfirmasi selesai + link Bitrix, dosen verifikasi
- ✅ **Tab Deadline** di nav mahasiswa dengan progress bar sisa waktu
- ✅ Reminder email harian ke dosen untuk deadline review
- ✅ **Auto-Inaktif 14 Hari** — `computeStatus()` otomatis, blokir frontend + backend
- ✅ **Reaktivasi Mahasiswa** — hanya Pembimbing 1 atau 2 yang bisa mengaktifkan kembali

### v7.0
- ✅ Notifikasi email manual via tombol dosen
- ✅ Chat personal dosen ↔ mahasiswa
- ✅ Kartu Merah otomatis saat bimbingan tidak terselenggara
- ✅ Proteksi hapus slot yang sudah ada reservasi aktif
- ✅ Pengurutan reservasi berdasarkan tanggal slot

---

*Dokumentasi ini dibuat untuk LYTANA v9.0*  
*© 2026 Skuro Production — Ahmad Fauzi Anggi Ariesta Kusuma*
