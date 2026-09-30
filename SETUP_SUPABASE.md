# 🚀 Panduan Setup Supabase untuk Laundry Stock & HPP

Panduan lengkap untuk mengintegrasikan Supabase sebagai backend database untuk aplikasi multi-user.

---

## 📋 Langkah 1: Buat Project Supabase

1. Kunjungi https://supabase.com
2. Klik "Start your project" atau "Sign in"
3. Login dengan GitHub
4. Klik "New Project"
5. Isi detail project:
   - **Name**: `laundry-stock-hpp`
   - **Database Password**: (simpan password ini dengan aman!)
   - **Region**: Pilih yang terdekat (Singapore/ap-southeast-1)
   - **Pricing Plan**: Free (cukup untuk development)
6. Klik "Create new project"
7. Tunggu 1-2 menit hingga project siap

---

## 🔑 Langkah 2: Dapatkan API Keys

1. Di dashboard Supabase, klik **Settings** → **API**
2. Copy nilai berikut:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon public key** (dimulai dengan `eyJhbGc...`)

3. Buat file `.env` di root project:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

⚠️ **PENTING**: Jangan commit file `.env` ke Git!

---

## 🗄️ Langkah 3: Setup Database Schema

1. Di dashboard Supabase, klik **SQL Editor** (icon di sidebar kiri)
2. Klik **New query**
3. Copy seluruh isi file `supabase/migrations/001_initial_schema.sql`
4. Paste ke SQL Editor
5. Klik **Run** (atau tekan Ctrl+Enter)
6. Tunggu hingga selesai (akan muncul "Success. No rows returned")

✅ Schema database berhasil dibuat!

---

## 🔐 Langkah 4: Setup Authentication

1. Di dashboard Supabase, klik **Authentication** → **Providers**
2. Pastikan **Email** provider enabled
3. (Opsional) Disable "Confirm email" untuk testing:
   - Klik **Email** provider
   - Uncheck "Confirm email"
   - Klik **Save**

---

## 👥 Langkah 5: Buat User Pertama (Admin)

### Opsi A: Via Supabase Dashboard
1. Klik **Authentication** → **Users**
2. Klik **Add user** → **Create new user**
3. Isi:
   - Email: `admin@laundry.com`
   - Password: `admin123` (min 6 karakter)
   - Auto Confirm User: ✅ (centang)
4. Klik **Create user**

5. Setelah user dibuat, jalankan SQL ini di SQL Editor:

```sql
UPDATE public.profiles 
SET role = 'admin', nama = 'Admin Utama'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@laundry.com');
```

### Opsi B: Via Aplikasi
1. Jalankan aplikasi: `npm run dev`
2. Klik "Register"
3. Isi form dengan role "Admin"
4. Verifikasi email (jika enabled)
5. Login dengan akun yang baru dibuat

---

## 📊 Langkah 6: Import Data Awal (Opsional)

Jika ingin import data demo yang sudah ada, jalankan SQL ini di SQL Editor:

```sql
-- Import Master Barang (contoh)
INSERT INTO public.master_barang (id, nama, kategori, satuan_dasar, satuan_pembelian, minimum_stock, harga_rata_rata, lokasi_gudang) VALUES
('soft-ungu', 'Soft Ungu', 'Chemical', 'pcs', 'pcs', 5, 25000, 'gudang-jemur'),
('det-biru', 'Det Biru', 'Chemical', 'pcs', 'pcs', 5, 20000, 'gudang-jemur'),
('hanger-baju', 'Hanger Baju', 'Hanger', 'pcs', 'gross', 100, 1500, 'gudang-jemur');

-- Import Stock Snapshots (contoh)
INSERT INTO public.stock_snapshots (barang_id, gudang_id, periode, quantity, nilai_total, harga_rata_rata, tanggal, sumber) VALUES
('soft-ungu', 'gudang-jemur', '2026-09', 37, 925000, 25000, '2026-09-28', 'opname'),
('det-biru', 'gudang-jemur', '2026-09', 38, 760000, 20000, '2026-09-28', 'opname');
```

---

## 🔄 Langkah 7: Update Store untuk Menggunakan Supabase

File `src/store.tsx` perlu diupdate untuk menggunakan Supabase services. Saya akan membuat versi baru yang mendukung mode offline (localStorage) dan online (Supabase).

### Fitur yang Sudah Diimplementasi:

✅ **Authentication**
- Login/Register dengan email & password
- Role-based access (Admin, Staff Gudang, Finance, Owner)
- Auto-create profile saat signup

✅ **Database Schema**
- Master Barang
- Gudang
- Stock Snapshots
- Stock Opname
- Pembelian
- Period Closings
- Audit Logs

✅ **Row Level Security (RLS)**
- User hanya bisa akses data yang diizinkan
- Admin bisa manage semua
- Staff Gudang bisa manage stock & opname
- Finance bisa manage pembelian & closing
- Owner hanya bisa view

✅ **Real-time Sync** (siap diimplementasi)
- Data tersinkron antar device
- Multiple users bisa kerja bersamaan

---

## 🎯 Langkah 8: Testing

1. Jalankan aplikasi: `npm run dev`
2. Login dengan akun admin
3. Test fitur:
   - ✅ Tambah barang baru
   - ✅ Input stock opname
   - ✅ Input pembelian
   - ✅ Lihat laporan
   - ✅ Closing periode

4. Buka tab baru, login dengan user berbeda
5. Verifikasi data tersinkron

---

## 🚨 Troubleshooting

### Error: "relation does not exist"
- Pastikan sudah menjalankan SQL migration
- Cek di Supabase Dashboard → Table Editor

### Error: "new row violates row-level security policy"
- Cek RLS policies di Supabase Dashboard → Authentication → Policies
- Pastikan user memiliki role yang sesuai

### Error: "Invalid API key"
- Cek file `.env` sudah benar
- Restart dev server setelah edit `.env`

### Data tidak tersinkron
- Pastikan menggunakan Supabase services, bukan localStorage
- Cek console browser untuk error

---

## 📈 Next Steps

Setelah Supabase berhasil diintegrasikan:

1. **Real-time Subscriptions**
   - Tambahkan listener untuk auto-refresh data
   - User lain akan lihat update secara real-time

2. **File Storage**
   - Upload foto nota pembelian
   - Gunakan Supabase Storage

3. **Backup Otomatis**
   - Supabase sudah include daily backup
   - Bisa export manual via Dashboard

4. **Custom Domain**
   - Deploy ke Vercel/Netlify
   - Connect custom domain

5. **Monitoring**
   - Track usage di Supabase Dashboard
   - Monitor database performance

---

## 💰 Biaya Supabase Free Tier

- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50,000 monthly active users
- ✅ 500 MB bandwidth
- ✅ 2 million edge function invocations

**Cukup untuk 10-50 user aktif!**

Jika butuh lebih, upgrade ke Pro plan ($25/bulan).

---

## 📞 Support

Jika ada masalah:
1. Cek dokumentasi Supabase: https://supabase.com/docs
2. Cek console browser untuk error
3. Cek Supabase Dashboard → Logs

---

**Selamat! Aplikasi Anda sekarang siap untuk multi-user! 🎉**
