# 📦 PANDUAN UPLOAD FILE KE GITHUB

## 🎯 FILE YANG PERLU DI-UPLOAD

### ✅ **UPLOAD FILE INI (27 file):**

```
laundry-stock-hpp/
│
├── 📄 index.html
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.js
├── 📄 .gitignore
│
├── 📁 src/
│   ├── 📄 App.tsx
│   ├── 📄 main.tsx
│   ├── 📄 store.tsx
│   ├── 📄 types.ts
│   ├── 📄 index.css
│   ├── 📄 env.d.ts
│   │
│   ├── 📁 data/
│   │   └── 📄 initialData.ts
│   │
│   ├── 📁 lib/
│   │   └── 📄 supabase.ts
│   │
│   ├── 📁 services/
│   │   └── 📄 database.ts
│   │
│   └── 📁 pages/
│       ├── 📄 Dashboard.tsx
│       ├── 📄 LaporanHPP.tsx
│       ├── 📄 LaporanStock.tsx
│       ├── 📄 LoginPage.tsx
│       ├── 📄 MasterBarang.tsx
│       ├── 📄 OtherPages.tsx
│       ├── 📄 Pembelian.tsx
│       └── 📄 StockOpname.tsx
│
└── 📁 supabase/
    └── 📁 migrations/
        └── 📄 001_initial_schema.sql
```

---

### ❌ **JANGAN UPLOAD FILE INI:**

```
❌ node_modules/          (folder dependencies - terlalu besar)
❌ dist/                  (folder hasil build)
❌ .env                   (berisi API keys - RAHASIA!)
❌ .env.local             (berisi API keys - RAHASIA!)
❌ package-lock.json      (auto-generated, tidak perlu)
```

---

## 🚀 CARA UPLOAD KE GITHUB

### **METODE 1: Via GitHub Web (PALING MUDAH)**

#### Step 1: Buat Repository
1. Buka https://github.com
2. Login
3. Klik tombol **"+"** (kanan atas) → **"New repository"**
4. Isi:
   ```
   Repository name: laundry-stock-hpp
   Description: Sistem manajemen persediaan laundry
   ✅ Public
   ✅ Add a README file
   ✅ Add .gitignore (pilih "Node")
   ```
5. Klik **"Create repository"**

#### Step 2: Upload File Satu per Satu

**Upload file root (5 file):**
1. Di halaman repo, klik **"Add file"** → **"Upload files"**
2. Drag & drop file ini:
   - `index.html`
   - `package.json`
   - `tsconfig.json`
   - `vite.config.js`
   - `.gitignore`
3. Scroll bawah → **"Commit changes"**

**Upload folder src:**
1. Klik **"Add file"** → **"Create new file"**
2. Ketik nama: `src/App.tsx`
3. Copy isi file `src/App.tsx` dari project Anda
4. Paste ke editor
5. Scroll bawah → **"Commit new file"**
6. Ulangi untuk semua file di folder `src/`

**Upload folder supabase:**
1. Klik **"Add file"** → **"Create new file"**
2. Ketik nama: `supabase/migrations/001_initial_schema.sql`
3. Copy isi file dari project Anda
4. Paste → **"Commit new file"**

---

### **METODE 2: Via Git Command Line (LEBIH CEPAT)**

Jika Anda familiar dengan Git:

```bash
# 1. Masuk ke folder project
cd laundry-stock-hpp

# 2. Inisialisasi Git
git init

# 3. Tambahkan semua file (kecuali yang ada di .gitignore)
git add .

# 4. Commit
git commit -m "Initial commit - Laundry Stock & HPP"

# 5. Buat repository di GitHub, lalu:
git remote add origin https://github.com/USERNAME/laundry-stock-hpp.git
git branch -M main
git push -u origin main
```

---

### **METODE 3: Via GitHub Desktop (PALING MUDAH untuk Pemula)**

1. Download GitHub Desktop: https://desktop.github.com
2. Login dengan akun GitHub
3. Klik **"Add"** → **"Existing Repository"**
4. Pilih folder project Anda
5. Klik **"Create Repository"**
6. Klik **"Publish repository"**
7. Isi nama: `laundry-stock-hpp`
8. Klik **"Publish Repository"**

**Selesai!** ✅

---

## 📋 CHECKLIST FILE

### File Root (5 file):
- [ ] `index.html`
- [ ] `package.json`
- [ ] `tsconfig.json`
- [ ] `vite.config.js`
- [ ] `.gitignore`

### Folder src/ (21 file):
- [ ] `src/App.tsx`
- [ ] `src/main.tsx`
- [ ] `src/store.tsx`
- [ ] `src/types.ts`
- [ ] `src/index.css`
- [ ] `src/env.d.ts`
- [ ] `src/data/initialData.ts`
- [ ] `src/lib/supabase.ts`
- [ ] `src/services/database.ts`
- [ ] `src/pages/Dashboard.tsx`
- [ ] `src/pages/LaporanHPP.tsx`
- [ ] `src/pages/LaporanStock.tsx`
- [ ] `src/pages/LoginPage.tsx`
- [ ] `src/pages/MasterBarang.tsx`
- [ ] `src/pages/OtherPages.tsx`
- [ ] `src/pages/Pembelian.tsx`
- [ ] `src/pages/StockOpname.tsx`

### Folder supabase/ (1 file):
- [ ] `supabase/migrations/001_initial_schema.sql`

**Total: 27 file**

---

## ⚠️ PENTING!

### **JANGAN UPLOAD FILE `.env`!**

File `.env` berisi API keys Supabase Anda. Jika ter-upload:
- ❌ Orang lain bisa akses database Anda
- ❌ Data bisa dihapus/dicuri
- ❌ Biaya bisa membengkak

**Solusi:**
- File `.gitignore` sudah otomatis exclude `.env`
- Buat file `.env` MANUAL di Vercel (bukan upload)

---

## 🎯 SETELAH UPLOAD

### 1. Verifikasi di GitHub
Buka repository Anda di GitHub, pastikan:
- ✅ Semua 27 file ada
- ✅ Folder structure benar
- ✅ Tidak ada file `.env`

### 2. Deploy ke Vercel
1. Buka https://vercel.com
2. Import dari GitHub
3. Pilih repository `laundry-stock-hpp`
4. Tambahkan environment variables:
   ```
   VITE_SUPABASE_URL = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGc...
   ```
5. Deploy!

### 3. Test Aplikasi
Buka URL hasil deploy, test:
- ✅ Login page muncul
- ✅ Bisa register
- ✅ Bisa login
- ✅ Data tersinkron

---

## 🆘 TROUBLESHOOTING

### Problem: File tidak muncul di GitHub
**Solusi:**
- Refresh browser (Ctrl+F5)
- Cek apakah file sudah di-commit
- Cek tab "Code" di repository

### Problem: Error saat deploy di Vercel
**Solusi:**
- Pastikan semua file sudah di-upload
- Cek `package.json` ada
- Cek build command: `npm run build`
- Cek output directory: `dist`

### Problem: `.env` ter-upload
**Solusi:**
1. Segera hapus file `.env` dari GitHub
2. Ganti API keys di Supabase
3. Update environment variables di Vercel

---

## 📞 BUTUH BANTUAN?

Jika bingung upload file:
1. Gunakan **GitHub Desktop** (Metode 3) - paling mudah
2. Atau minta bantuan developer
3. Atau gunakan jasa upload (Rp 50.000 - 100.000)

---

## ✅ RINGKASAN

**Yang perlu di-upload:**
- ✅ 27 file source code
- ✅ Struktur folder yang benar
- ❌ JANGAN upload `node_modules`, `dist`, `.env`

**Waktu upload:**
- Metode 1 (Web): 15-20 menit
- Metode 2 (Git): 2 menit
- Metode 3 (Desktop): 5 menit

**Rekomendasi:** Gunakan **Metode 3 (GitHub Desktop)** untuk pemula!

---

**Selamat! Repository Anda siap untuk di-deploy!** 🚀
