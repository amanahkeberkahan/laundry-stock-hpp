# 📥 CARA DOWNLOAD & UPLOAD FILE

## 🎯 RINGKASAN

**Total file yang perlu di-upload: 27 file**
**Waktu upload: 5-20 menit (tergantung metode)**

---

## 📋 DAFTAR LENGKAP FILE

### ✅ File yang PERLU di-upload (27 file):

```
📁 ROOT (5 file):
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.js
└── .gitignore

📁 src/ (21 file):
├── App.tsx
├── main.tsx
├── store.tsx
├── types.ts
├── index.css
├── env.d.ts
├── 📁 data/
│   └── initialData.ts
├── 📁 lib/
│   └── supabase.ts
├── 📁 services/
│   └── database.ts
└── 📁 pages/
    ├── Dashboard.tsx
    ├── LaporanHPP.tsx
    ├── LaporanStock.tsx
    ├── LoginPage.tsx
    ├── MasterBarang.tsx
    ├── OtherPages.tsx
    ├── Pembelian.tsx
    └── StockOpname.tsx

📁 supabase/ (1 file):
└── 📁 migrations/
    └── 001_initial_schema.sql
```

### ❌ File yang JANGAN di-upload:

```
❌ node_modules/          (auto-generated, terlalu besar)
❌ dist/                  (hasil build, auto-generated)
❌ .env                   (berisi API keys - RAHASIA!)
❌ package-lock.json      (auto-generated)
```

---

## 🚀 CARA DOWNLOAD FILE

### **METODE 1: Copy-Paste Manual (PALING MUDAH)**

#### Step 1: Buat Folder di Komputer

1. Buat folder baru di komputer: `laundry-stock-hpp`
2. Buka folder tersebut

#### Step 2: Download File Satu per Satu

Untuk setiap file di daftar atas:

1. **Buka file di project ini** (klik nama file)
2. **Copy SEMUA isi file** (Ctrl+A, Ctrl+C)
3. **Buat file baru** di folder `laundry-stock-hpp` dengan nama yang sama
4. **Paste isi file** (Ctrl+V)
5. **Save** (Ctrl+S)

**Contoh:**
- Buka `src/App.tsx` di project
- Copy semua isi
- Buat file `src/App.tsx` di folder Anda
- Paste → Save

#### Step 3: Buat Folder Structure

Pastikan struktur folder seperti ini:

```
laundry-stock-hpp/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.js
├── .gitignore
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── store.tsx
│   ├── types.ts
│   ├── index.css
│   ├── env.d.ts
│   ├── data/
│   │   └── initialData.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── services/
│   │   └── database.ts
│   └── pages/
│       ├── Dashboard.tsx
│       ├── LaporanHPP.tsx
│       ├── LaporanStock.tsx
│       ├── LoginPage.tsx
│       ├── MasterBarang.tsx
│       ├── OtherPages.tsx
│       ├── Pembelian.tsx
│       └── StockOpname.tsx
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

### **METODE 2: Download via Browser (JIKA ADA)**

Jika platform ini menyediakan tombol download:

1. Cari tombol **"Download"** atau **"Export"**
2. Klik → File ZIP akan terdownload
3. Extract ZIP ke folder `laundry-stock-hpp`
4. Selesai! ✅

---

### **METODE 3: Via Git Clone (UNTUK DEVELOPER)**

Jika project sudah di GitHub:

```bash
git clone https://github.com/USERNAME/laundry-stock-hpp.git
cd laundry-stock-hpp
npm install
npm run dev
```

---

## 📤 CARA UPLOAD KE GITHUB

### **METODE A: Via GitHub Web (PALING MUDAH)**

#### Step 1: Buat Repository

1. Buka https://github.com
2. Login
3. Klik **"+"** (kanan atas) → **"New repository"**
4. Isi:
   ```
   Repository name: laundry-stock-hpp
   Description: Sistem manajemen persediaan laundry
   ✅ Public
   ✅ Add a README file
   ✅ Add .gitignore (pilih "Node")
   ```
5. Klik **"Create repository"**

#### Step 2: Upload File

**Upload file root (5 file):**

1. Di halaman repo, klik **"Add file"** → **"Upload files"**
2. Drag & drop file dari folder Anda:
   - `index.html`
   - `package.json`
   - `tsconfig.json`
   - `vite.config.js`
   - `.gitignore`
3. Scroll bawah → **"Commit changes"**

**Upload folder src (21 file):**

1. Klik **"Add file"** → **"Create new file"**
2. Ketik path: `src/App.tsx`
3. Copy isi file `src/App.tsx` dari folder Anda
4. Paste ke editor
5. Scroll bawah → **"Commit new file"**
6. **Ulangi** untuk semua file di folder `src/`

**Upload folder supabase (1 file):**

1. Klik **"Add file"** → **"Create new file"**
2. Ketik path: `supabase/migrations/001_initial_schema.sql`
3. Copy isi file dari folder Anda
4. Paste → **"Commit new file"**

#### Step 3: Verifikasi

Cek di GitHub, pastikan:
- ✅ 27 file sudah ter-upload
- ✅ Struktur folder benar
- ✅ Tidak ada file `.env`

---

### **METODE B: Via GitHub Desktop (RECOMMENDED)**

#### Step 1: Install GitHub Desktop

1. Download: https://desktop.github.com
2. Install
3. Login dengan akun GitHub

#### Step 2: Add Repository

1. Klik **"Add"** → **"Existing Repository"**
2. Pilih folder `laundry-stock-hpp` di komputer Anda
3. Klik **"Create Repository"**

#### Step 3: Publish

1. Klik **"Publish repository"**
2. Isi:
   ```
   Name: laundry-stock-hpp
   Description: Sistem manajemen persediaan laundry
   ✅ Keep this code private (atau Public)
   ```
3. Klik **"Publish Repository"**

**Selesai!** ✅ Semua file otomatis ter-upload!

---

### **METODE C: Via Git Command Line (UNTUK DEVELOPER)**

```bash
# 1. Masuk ke folder project
cd laundry-stock-hpp

# 2. Inisialisasi Git
git init

# 3. Tambahkan semua file
git add .

# 4. Commit
git commit -m "Initial commit - Laundry Stock & HPP"

# 5. Buat repository di GitHub, lalu:
git remote add origin https://github.com/USERNAME/laundry-stock-hpp.git
git branch -M main
git push -u origin main
```

---

## ✅ CHECKLIST UPLOAD

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

**Total: 27 file ✅**

---

## 🎯 SETELAH UPLOAD

### 1. Deploy ke Vercel

1. Buka https://vercel.com
2. Login dengan GitHub
3. Klik **"Import Project"**
4. Pilih repository `laundry-stock-hpp`
5. Add environment variables:
   ```
   VITE_SUPABASE_URL = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGc...
   ```
6. Klik **"Deploy"**
7. Tunggu 2-3 menit
8. Buka URL hasil deploy!

### 2. Test Aplikasi

- ✅ Login page muncul
- ✅ Bisa register
- ✅ Bisa login
- ✅ Data tersinkron

---

## ⚠️ PENTING!

### JANGAN Upload File `.env`!

File `.env` berisi API keys Supabase Anda. Jika ter-upload:
- ❌ Orang lain bisa akses database Anda
- ❌ Data bisa dihapus/dicuri
- ❌ Biaya bisa membengkak

**Solusi:**
- File `.gitignore` sudah otomatis exclude `.env`
- Buat file `.env` MANUAL di Vercel (bukan upload)

---

## 🆘 TROUBLESHOOTING

### Problem: Tidak tahu cara download file
**Solusi:** Gunakan **Metode 1 (Copy-Paste)** - paling mudah!

### Problem: File tidak muncul di GitHub
**Solusi:**
- Refresh browser (Ctrl+F5)
- Cek apakah file sudah di-commit
- Cek tab "Code" di repository

### Problem: Error saat deploy di Vercel
**Solusi:**
- Pastikan semua 27 file sudah di-upload
- Cek `package.json` ada
- Cek build command: `npm run build`
- Cek output directory: `dist`

---

## 💡 TIPS

### Rekomendasi Metode:

**Untuk Pemula:**
→ Gunakan **METODE B (GitHub Desktop)** - paling mudah!

**Untuk Developer:**
→ Gunakan **METODE C (Git Command Line)** - paling cepat!

**Untuk Non-Tech:**
→ Gunakan **METODE A (GitHub Web)** - tidak perlu install apapun!

---

## 📞 BUTUH BANTUAN?

Jika bingung:
1. Baca file `UPLOAD_GUIDE.md` untuk detail lengkap
2. Tonton tutorial YouTube: "Upload project ke GitHub"
3. Minta bantuan developer (Rp 50.000 - 100.000)
4. Gunakan jasa upload file

---

## ✅ RINGKASAN

**Yang perlu dilakukan:**
1. ✅ Download 27 file dari project ini
2. ✅ Upload ke GitHub repository
3. ✅ Deploy ke Vercel
4. ✅ Setup environment variables
5. ✅ Test aplikasi

**Waktu total:** 15-30 menit

**Biaya:** GRATIS! 🎉

---

**Selamat! Aplikasi Anda siap online!** 🚀
