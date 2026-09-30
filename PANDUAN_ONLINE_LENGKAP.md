# 🌐 PANDUAN LENGKAP: LAUNDRY STOCK & HPP ONLINE

## 📋 Daftar Isi
1. [Persiapan Tools](#1-persiapan-tools)
2. [Setup Supabase (Database Online)](#2-setup-supabase-database-online)
3. [Setup GitHub (Repository)](#3-setup-github-repository)
4. [Deploy ke Vercel (Hosting)](#4-deploy-ke-vercel-hosting)
5. [Konfigurasi User Pertama](#5-konfigurasi-user-pertama)
6. [Testing Aplikasi](#6-testing-aplikasi)
7. [Troubleshooting](#7-troubleshooting)
8. [Maintenance Harian](#8-maintenance-harian)

**Estimasi waktu: 15-20 menit**
**Biaya: GRATIS** (untuk 50 user aktif)

---

## 1. 🛠️ PERSIAPAN TOOLS

### Yang Dibutuhkan:
- ✅ Laptop/PC dengan browser (Chrome/Firefox)
- ✅ Koneksi internet stabil
- ✅ Email aktif (untuk daftar akun)
- ✅ Nomor HP (untuk verifikasi)

### Yang TIDAK Dibutuhkan:
- ❌ Tidak perlu install software apapun
- ❌ Tidak perlu coding
- ❌ Tidak perlu server/VPS

---

## 2. 🗄️ SETUP SUPABASE (DATABASE ONLINE)

### Step 2.1: Daftar Akun Supabase

1. Buka browser, kunjungi: **https://supabase.com**
2. Klik tombol **"Start your project"** (kanan atas)
3. Klik **"GitHub"** untuk login dengan GitHub
4. Jika belum punya GitHub, klik **"Sign up"** dan ikuti panduannya
5. Authorize Supabase untuk akses GitHub

### Step 2.2: Buat Project Baru

1. Setelah login, klik **"New Project"**
2. Isi form:
   ```
   Organization: [pilih organisasi Anda]
   Name: laundry-stock-hpp
   Database Password: Laundry2026!Secure
   Region: Southeast Asia (Singapore)
   Pricing Plan: Free (selalu pilih ini)
   ```
3. Klik **"Create new project"**
4. ⏳ **TUNGGU 2-3 MENIT** (project sedang dibuat)
5. Akan muncul: "Your project is ready!" ✅

### Step 2.3: Jalankan Database Schema

1. Di menu kiri, klik icon **"SQL Editor"** (📊)
2. Klik tombol **"+ New query"**
3. Buka file `supabase/migrations/001_initial_schema.sql` di project Anda
4. **Copy SEMUA isi file** tersebut
5. **Paste** ke SQL Editor di Supabase
6. Klik tombol **"Run"** (kanan bawah) atau tekan `Ctrl+Enter`
7. Tunggu sampai muncul: **"Success. No rows returned"** ✅

### Step 2.4: Ambil API Keys

1. Klik icon **"Settings"** (⚙️) di menu kiri
2. Klik **"API"**
3. Copy 2 nilai ini (simpan di Notepad):
   ```
   Project URL: https://xxxxxxxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 2.5: Matikan Verifikasi Email (untuk testing)

1. Masih di Settings, klik **"Authentication"**
2. Klik **"Providers"** → **"Email"**
3. **Matikan** toggle "Confirm email"
4. Klik **"Save"**

> 💡 **Tips:** Simpan API Keys di Notepad, akan dipakai di Step 4

---

## 3. 📦 SETUP GITHUB (REPOSITORY)

### Step 3.1: Daftar GitHub (jika belum punya)

1. Buka: **https://github.com**
2. Klik **"Sign up"**
3. Isi: email, password, username
4. Verifikasi email
5. Login ke GitHub

### Step 3.2: Buat Repository Baru

1. Klik tombol **"+"** (kanan atas) → **"New repository"**
2. Isi form:
   ```
   Repository name: laundry-stock-hpp
   Description: Sistem manajemen persediaan laundry
   Public: ✅ (pilih Public)
   Add a README: ✅ (centang)
   ```
3. Klik **"Create repository"**

### Step 3.3: Upload File Project

**Cara Mudah (via Web):**

1. Di halaman repository, klik **"Add file"** → **"Upload files"**
2. Drag & drop SEMUA file project Anda (kecuali folder `node_modules`)
3. Scroll ke bawah, klik **"Commit changes"**

**Cara Developer (via Git):**
```bash
# Di folder project Anda
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/laundry-stock-hpp.git
git push -u origin main
```

---

## 4. 🚀 DEPLOY KE VERCEL (HOSTING)

### Step 4.1: Daftar Vercel

1. Buka: **https://vercel.com**
2. Klik **"Sign Up"**
3. Pilih **"Continue with GitHub"**
4. Authorize Vercel akses GitHub

### Step 4.2: Import Project

1. Klik **"Add New..."** → **"Project"**
2. Di daftar repository, cari **"laundry-stock-hpp"**
3. Klik **"Import"**

### Step 4.3: Konfigurasi Build

Vercel akan otomatis detect. Pastikan setting:
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Klik **"Deploy"**

### Step 4.4: Tunggu Deploy

- ⏳ Tunggu 2-3 menit
- Akan muncul: **"Congratulations!"** dengan URL
- Contoh URL: `https://laundry-stock-hpp.vercel.app`

### Step 4.5: Tambahkan Environment Variables

1. Di project Vercel, klik **"Settings"**
2. Klik **"Environment Variables"**
3. Tambahkan 2 variabel:

**Variabel 1:**
```
Name: VITE_SUPABASE_URL
Value: https://xxxxxxxx.supabase.co (dari Step 2.4)
Environment: ✅ Production ✅ Preview ✅ Development
```

**Variabel 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (dari Step 2.4)
Environment: ✅ Production ✅ Preview ✅ Development
```

4. Klik **"Save"**

### Step 4.6: Redeploy

1. Klik tab **"Deployments"**
2. Klik **"..."** di deployment terakhir
3. Klik **"Redeploy"**
4. Tunggu 1-2 menit

### Step 4.7: Test URL

Buka URL aplikasi Anda:
```
https://laundry-stock-hpp.vercel.app
```

**Harusnya muncul halaman login!** ✅

---

## 5. 👤 KONFIGURASI USER PERTAMA

### Step 5.1: Buat Akun Admin

1. Buka URL aplikasi Anda
2. Klik **"Register"**
3. Isi form:
   ```
   Nama: Admin Utama
   Email: admin@laundry.com
   Password: Admin123!
   Role: Admin
   ```
4. Klik **"Register"**
5. Login dengan akun tersebut

### Step 5.2: Buat User Staff Gudang

1. Buka tab baru, buka URL yang sama
2. Klik **"Register"**
3. Isi:
   ```
   Nama: Budi (Staff)
   Email: budi@laundry.com
   Password: Staff123!
   Role: Staff Gudang
   ```

### Step 5.3: Buat User Finance

1. Buka tab baru
2. Register dengan:
   ```
   Nama: Sari (Finance)
   Email: sari@laundry.com
   Password: Finance123!
   Role: Finance
   ```

### Step 5.4: Buat User Owner

1. Buka tab baru
2. Register dengan:
   ```
   Nama: Pak Owner
   Email: owner@laundry.com
   Password: Owner123!
   Role: Owner
   ```

---

## 6. 🧪 TESTING APLIKASI

### Test 1: Login Multi-Device

1. Buka laptop 1 → Login sebagai Admin
2. Buka laptop 2 → Login sebagai Staff
3. **Test:**
   - Admin input stock opname di laptop 1
   - Staff lihat di laptop 2 → **Data harus muncul!** ✅

### Test 2: Input Data Lengkap

**Sebagai Admin:**
1. Tambah barang baru di Master Barang
2. Cek di Master Barang → barang muncul ✅

**Sebagai Staff:**
1. Input Stock Opname
2. Cek di Dashboard → stock update ✅

**Sebagai Finance:**
1. Input Pembelian
2. Cek di Laporan HPP → data muncul ✅

### Test 3: Export Data

1. Login sebagai Admin
2. Buka Settings → Export Backup
3. File JSON terdownload ✅

### Test 4: Mobile Access

1. Buka URL di HP
2. Login dengan akun Staff
3. Input stock opname via HP
4. **Harus responsive & mudah dipakai!** ✅

---

## 7. 🔧 TROUBLESHOOTING

### Problem 1: Halaman Login Tidak Muncul

**Solusi:**
- Cek URL sudah benar
- Clear cache browser (Ctrl+Shift+R)
- Cek di Vercel → Deployments → apakah deploy sukses

### Problem 2: Error "Invalid API key"

**Solusi:**
- Cek Environment Variables di Vercel sudah benar
- Pastikan tidak ada spasi di awal/akhir
- Redeploy setelah update env vars

### Problem 3: Data Tidak Tersinkron

**Solusi:**
- Klik icon Cloud di sidebar untuk manual sync
- Refresh browser (F5)
- Cek koneksi internet

### Problem 4: Tidak Bisa Login

**Solusi:**
- Cek email & password benar
- Cek di Supabase → Authentication → Users → user ada
- Reset password via Supabase Dashboard

### Problem 5: Error "relation does not exist"

**Solusi:**
- SQL migration belum dijalankan
- Ulangi Step 2.3

### Problem 6: Lambat Loading

**Solusi:**
- Normal untuk first load (1-2 detik)
- Setelah itu akan cepat
- Jika tetap lambat, cek Supabase usage di Dashboard

---

## 8. 📊 MAINTENANCE HARIAN

### Harian:
- ✅ Cek dashboard untuk alert stock menipis
- ✅ Review stock opname hari ini
- ✅ Backup data (Settings → Export)

### Mingguan:
- ✅ Review laporan HPP
- ✅ Cek audit log untuk aktivitas mencurigakan
- ✅ Backup database manual

### Bulanan:
- ✅ Closing periode
- ✅ Export laporan untuk owner
- ✅ Review user access
- ✅ Cek Supabase usage (jika mendekati limit)

---

## 📞 CUSTOM DOMAIN (OPSIONAL)

Jika ingin domain sendiri (misal: `laundry.perusahaan.com`):

### Step 1: Beli Domain
- Niagahoster, RumahWeb, atau Namecheap
- Harga: Rp 150.000 - 300.000/tahun

### Step 2: Setup di Vercel
1. Vercel → Project → Settings → Domains
2. Tambahkan domain Anda
3. Ikuti instruksi DNS setup
4. Tunggu 1-24 jam untuk propagasi

### Step 3: SSL Otomatis
- Vercel otomatis setup SSL (HTTPS)
- Gratis! ✅

---

## 💰 BIAYA TOTAL

| Item | Biaya |
|------|-------|
| Supabase (Free Tier) | Rp 0 |
| Vercel (Hobby Plan) | Rp 0 |
| GitHub (Free) | Rp 0 |
| Domain (opsional) | Rp 150.000/tahun |
| **TOTAL** | **Rp 0** (tanpa domain) |

**Cukup untuk:**
- 50.000 monthly active users
- 500 MB database
- 1 GB file storage
- Unlimited bandwidth

---

## ✅ CHECKLIST FINAL

Sebelum aplikasi dipakai production:

### Setup:
- [ ] Supabase project created
- [ ] SQL migration executed
- [ ] API keys copied
- [ ] GitHub repository created
- [ ] Files uploaded to GitHub
- [ ] Vercel deployment successful
- [ ] Environment variables set
- [ ] Redeploy done

### Testing:
- [ ] Login page accessible
- [ ] Admin account created
- [ ] Staff account created
- [ ] Finance account created
- [ ] Owner account created
- [ ] Multi-device sync working
- [ ] Stock opname working
- [ ] Pembelian working
- [ ] Laporan HPP working
- [ ] Export backup working
- [ ] Mobile responsive

### Documentation:
- [ ] User manual dibuat
- [ ] SOP input data
- [ ] Contact person ditentukan
- [ ] Backup strategy documented

### Security:
- [ ] Password kuat untuk semua user
- [ ] 2FA enabled untuk Supabase
- [ ] RLS policies verified
- [ ] Audit log monitoring

---

## 🎯 NEXT STEPS

Setelah aplikasi live:

1. **Training User** (1 jam)
   - Kumpulkan semua user
   - Demo cara pakai
   - Bagikan user manual

2. **Go Live**
   - Mulai pakai untuk data real
   - Monitor 1 minggu pertama
   - Collect feedback

3. **Improvement**
   - Tambah fitur berdasarkan feedback
   - Optimize performance
   - Scale jika perlu

---

## 📞 SUPPORT

Jika ada masalah:
1. Baca troubleshooting di atas
2. Cek Supabase logs: Dashboard → Logs
3. Cek Vercel logs: Dashboard → Deployments → View logs
4. Hubungi developer

---

## 🎉 SELAMAT!

Aplikasi Laundry Stock & HPP Anda sekarang **LIVE** dan siap dipakai!

**URL Aplikasi:** `https://laundry-stock-hpp.vercel.app`

**Akses dari mana saja:**
- Laptop
- HP
- Tablet
- Asalkan ada internet!

---

**Dibuat dengan ❤️ untuk bisnis laundry Indonesia**

*Last updated: 2026*
