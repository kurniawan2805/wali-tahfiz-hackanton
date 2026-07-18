# Wali Tahfiz

Pendamping hafalan Al-Qur'an yang hangat untuk keluarga. Wali Tahfiz membantu Ayah dan Bunda membangun kebiasaan hafalan secara pelan, terarah, dan menyenangkan—mulai dari Al-Fatihah hingga Juz 30.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-ready-47775C)

## Yang bisa dilakukan

- Membuat profil keluarga dan profil hafalan terpisah untuk setiap anak.
- Menetapkan target hafalan baru dan menjalani tiga tahap latihan: **talaqqi**, **tikrar**, dan **rabt**.
- Menjadwalkan murojaah dengan pengulangan berjarak `1 → 3 → 7 → 14 → 30` hari.
- Mendengarkan murattal Al-Fatihah dan Juz 30 dengan kontrol rentang serta pengulangan ayat.
- Mendapatkan saran latihan ringan melalui Teman Hafalan.
- Menyimpan data keluarga dan kemajuan hafalan di perangkat menggunakan IndexedDB.

## Menjalankan secara lokal

Prasyarat: Node.js 18 atau lebih baru.

```bash
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite di peramban. Untuk memastikan build produksi berhasil:

```bash
npm run build
```

## Konfigurasi opsional: Teman Hafalan

Fitur saran berbantuan AI menggunakan endpoint server di `api/daily-coach.js`. Salin konfigurasi contoh dan isi kunci hanya pada environment server/deployment:

```bash
cp .env.example .env.local
```

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Jangan pernah memasukkan kunci API ke kode frontend atau melakukan commit pada berkas `.env*`.

Saat menjalankan `npm run dev`, route lokal `/api/daily-coach` dijalankan oleh middleware Vite. Dengan begitu Teman Hafalan dapat memakai `OPENAI_API_KEY` dari `.env.local` tanpa mengeksposnya ke browser. Pada deployment, route yang sama tetap dilayani oleh fungsi server `api/daily-coach.js`.

## Teknologi

- React + Vite
- Tailwind CSS
- Dexie / IndexedDB untuk penyimpanan lokal
- Lucide React untuk ikon
- Web App Manifest dan service worker untuk pengalaman PWA

## Prinsip produk

Wali Tahfiz dirancang untuk mendukung kehadiran wali, bukan menggantikannya: target kecil, bahasa yang lembut, dan progres yang mudah dipahami bersama anak.

Lihat [design.md](design.md) untuk arah pengalaman dan desain yang lebih lengkap.
