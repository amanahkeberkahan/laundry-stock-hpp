# 🚀 Quick Start Guide - Laundry Stock & HPP

Panduan cepat untuk menjalankan aplikasi dengan Supabase (multi-user).

---

## ⚡ 5 Menit Setup

### 1️⃣ Buat Supabase Project (2 menit)

1. Buka https://supabase.com
2. Login dengan GitHub
3. Klik **"New Project"**
4. Isi:
   - Name: `laundry-stock-hpp`
   - Password: (simpan baik-baik!)
   - Region: Singapore
5. Klik **"Create new project"**
6. Tunggu 1-2 menit

### 2️⃣ Copy API Keys (30 detik)

1. Di dashboard Supabase, klik **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (contoh: `https://abc123.supabase.co`)
   - **anon public key** (dimulai dengan `eyJ...`)

### 3️⃣ Setup Environment (30 detik)

Buat file `.env` di root project:

```bash
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4️⃣ Run Database Migration (1 menit)

1. Di Supabase Dashboard, klik **SQL Editor** (icon database)
2. Klik **"New query"**
3. Buka file `supabase/migrations/001_initial_schema.sql`
4. Copy semua isinya
5. Paste ke SQL Editor
6. Klik **"Run"** (atau Ctrl+Enter)
7. Tunggu sampai selesai ✅

### 5️⃣ Disable Email Confirmation (15 detik)

1. Supabase Dashboard → **Authentication** → **Providers**
2. Klik **Email**
3. Uncheck **"Confirm email"**
4. Klik **"Save"**

### 6️⃣ Run Aplikasi (30 detik)

```bash
# Install dependencies (jika belum)
npm install

# Jalankan
npm run dev
```

Buka http://localhost:5173

### 7️⃣ Register Admin (30 detik)

1. Klik **"Register"**
2. Isi:
   - Nama: `Admin Utama`
   - Email: `admin@laundry.com`
   - Password: `admin123`
   - Role: `Admin`
3. Klik **"Register"**
4. Login dengan akun tersebut

**Selesai! 🎉 Aplikasi siap digunakan!**

---

## 📋 Checklist

- [ ] Supabase project created
- [ ] API keys copied to `.env`
- [ ] SQL migration executed
- [ ] Email confirmation disabled
- [ ] App running (`npm run dev`)
- [ ] Admin account created
- [ ] Login berhasil

---

## 🎯 Next Steps

### Tambah User Lain

1. Login sebagai Admin
2. Buka halaman baru (incognito)
3. Register user baru dengan role berbeda:
   - **Staff Gudang**: Input stock opname & pembelian
   - **Finance**: Kelola pembelian & closing
   - **Owner**: View only

### Import Data Awal

Jika punya data existing, import via SQL:

```sql
-- Contoh import barang
INSERT INTO public.master_barang (id, nama, kategori, satuan_dasar, minimum_stock, harga_rata_rata, lokasi_gudang) VALUES
('soft-ungu', 'Soft Ungu', 'Chemical', 'pcs', 5, 25000, 'gudang-jemur'),
('det-biru', 'Det Biru', 'Chemical', 'pcs', 5, 20000, 'gudang-jemur');
```

### Deploy ke Production

**Opsi 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
```

**Opsi 2: Netlify**
```bash
# Build
npm run build

# Drag folder 'dist' ke https://app.netlify.com/drop
```

---

## 🔍 Verifikasi Setup

### Cek Database
Supabase Dashboard → **Table Editor** → Harus ada tabel:
- profiles
- gudang
- master_barang
- stock_snapshots
- stock_opname
- pembelian
- period_closings
- audit_logs

### Cek Authentication
Supabase Dashboard → **Authentication** → **Users** → Harus ada user admin

### Cek RLS Policies
Supabase Dashboard → **Authentication** → **Policies** → Semua tabel harus punya policies

---

## ❓ Troubleshooting

### "Cannot read properties of null"
- Pastikan `.env` sudah benar
- Restart dev server: `Ctrl+C` lalu `npm run dev`

### "relation does not exist"
- Jalankan SQL migration lagi
- Cek di Table Editor

### Login tidak bisa
- Cek email sudah terdaftar di Authentication → Users
- Reset password via Supabase Dashboard

### Data tidak tersinkron
- Pastikan menggunakan Supabase (bukan localStorage)
- Cek console browser untuk error
- Klik icon Cloud di top bar untuk manual sync

---

## 📞 Butuh Bantuan?

1. Baca `SETUP_SUPABASE.md` untuk detail lengkap
2. Baca `README.md` untuk overview fitur
3. Cek Supabase docs: https://supabase.com/docs

---

**Happy Coding! 🚀**
