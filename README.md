# 🧺 Laundry Stock & HPP

Sistem manajemen persediaan laundry dengan perhitungan HPP (Harga Pokok Produksi) otomatis untuk multi-user.

![Laundry Stock & HPP](https://img.shields.io/badge/Version-2.0-blue) ![React](https://img.shields.io/badge/React-18-blue) ![Supabase](https://img.shields.io/badge/Supabase-Ready-green)

---

## ✨ Fitur Utama

### 📊 Dashboard
- Ringkasan stock awal, pembelian, stock akhir
- Estimasi HPP/pemakaian bulanan
- Alert stock menipis & habis
- Grafik nilai stock per kategori
- Top 10 barang berdasarkan nilai

### 📦 Master Barang
- Kelola data barang dengan konversi satuan otomatis
- Support berbagai satuan: pcs, gross, lusin, liter, ml, dll
- Kategori: Chemical, Hanger, Plastik, ATK, Peralatan, Packaging
- Minimum stock alert

### 🏪 Multi Gudang
- Support multiple gudang (Gudang Jemur, Pradhana, dll)
- Stock terpisah per gudang
- Laporan per gudang atau semua gudang

### 📋 Stock Opname
- Input stock fisik dengan perhitungan selisih otomatis
- Indikator warna: Hijau (sesuai), Kuning (selisih kecil), Merah (selisih besar)
- History stock opname
- Stock akhir otomatis menjadi stock awal bulan berikutnya

### 🛒 Pembelian
- Input nota pembelian multi-item
- Upload foto nota (coming soon)
- Void nota (bukan delete, untuk audit trail)
- Auto-update stock

### 💰 Perhitungan HPP
- Formula: **Pemakaian = Stock Awal + Pembelian − Stock Akhir**
- Metode: Weighted Average (Harga Rata-rata Tertimbang)
- Status kelengkapan data (N/A vs 0)
- Export laporan ke CSV

### 🔐 Multi-User dengan Role
- **Admin**: Full access
- **Staff Gudang**: Stock opname, input pembelian
- **Finance**: Pembelian, closing, laporan HPP
- **Owner**: View only, dashboard & laporan

### 🔒 Closing Bulanan
- Kunci periode agar tidak bisa diedit
- Audit trail lengkap
- Adjustment untuk koreksi

### 📈 Laporan
- Laporan HPP Bulanan
- Laporan Stock Position
- Filter by periode, gudang, kategori
- Export CSV

---

## 🚀 Quick Start

### Mode 1: Demo (LocalStorage)

Cocok untuk testing single-user tanpa setup database.

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:5173
```

Data akan tersimpan di browser (localStorage).

### Mode 2: Production (Supabase)

Cocok untuk multi-user dengan data tersinkron.

#### 1. Setup Supabase

```bash
# Copy environment file
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 2. Create Database Schema

1. Buka https://supabase.com/dashboard
2. Buat project baru
3. Buka **SQL Editor**
4. Copy & paste isi file `supabase/migrations/001_initial_schema.sql`
5. Klik **Run**

#### 3. Setup Authentication

1. Di Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Email** provider
3. (Opsional) Disable "Confirm email" untuk testing

#### 4. Create First User

**Via Dashboard:**
1. Authentication → Users → Add user
2. Email: `admin@laundry.com`
3. Password: `admin123`
4. Auto confirm: ✅

**Via SQL:**
```sql
UPDATE public.profiles 
SET role = 'admin', nama = 'Admin Utama'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@laundry.com');
```

#### 5. Run Application

```bash
npm install
npm run dev
```

Login dengan akun yang sudah dibuat!

---

## 📁 Struktur Project

```
laundry-stock-hpp/
├── src/
│   ├── App.tsx                 # Main app component
│   ├── store.tsx               # State management (hybrid)
│   ├── types.ts                # TypeScript types
│   ├── lib/
│   │   └── supabase.ts         # Supabase client
│   ├── services/
│   │   └── database.ts         # Database service layer
│   ├── data/
│   │   └── initialData.ts      # Demo data
│   └── pages/
│       ├── Dashboard.tsx
│       ├── MasterBarang.tsx
│       ├── StockOpname.tsx
│       ├── Pembelian.tsx
│       ├── LaporanHPP.tsx
│       ├── LaporanStock.tsx
│       ├── OtherPages.tsx
│       └── LoginPage.tsx
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── SETUP_SUPABASE.md           # Panduan lengkap setup
└── README.md
```

---

## 🔧 Konversi Satuan

Sistem mendukung konversi satuan otomatis:

| Satuan | Konversi |
|--------|----------|
| 1 gross | 144 pcs |
| 1 lusin | 12 pcs |
| 1 liter | 1000 ml |
| 1 pack | varies |

Contoh:
- Hanger Baju: 6 gross = 864 pcs
- Oxy Boost: 5 liter = 5000 ml

---

## 💾 Backup & Restore

### Export Data
Settings → Export Backup → Download JSON

### Import Data
Settings → Import Backup → Upload JSON

### Supabase Backup
Supabase otomatis backup harian. Bisa restore via Dashboard.

---

## 🎯 Prinsip Desain

1. **Input sesederhana mungkin** - Staff hanya perlu input stock opname & nota pembelian
2. **Laporan seakurat mungkin** - Finance mendapat data HPP yang presisi
3. **Data tidak boleh hilang** - Void bukan delete, audit trail lengkap
4. **N/A ≠ 0** - Bedakan data belum ada dengan memang kosong

---

## 📊 Formula HPP

```
Pemakaian = Stock Awal + Pembelian − Stock Akhir

Nilai HPP = Pemakaian × Harga Rata-rata Tertimbang
```

**Contoh:**
- Stock Awal: 10 pcs × Rp20.000 = Rp200.000
- Pembelian: 20 pcs × Rp22.000 = Rp440.000
- Total: 30 pcs = Rp640.000
- Harga Rata-rata: Rp640.000 / 30 = Rp21.333/unit
- Stock Akhir: 5 pcs
- Pemakaian: 10 + 20 − 5 = 25 pcs
- Nilai HPP: 25 × Rp21.333 = Rp533.325

---

## 🚨 Troubleshooting

### Data tidak tersinkron antar device
- Pastikan sudah setup Supabase
- Cek file `.env` sudah benar
- Restart dev server

### Error "relation does not exist"
- Jalankan SQL migration di Supabase
- Cek di Table Editor

### Login tidak bisa
- Cek email sudah terverifikasi
- Reset password via Supabase Dashboard

---

## 📈 Roadmap

- [ ] Upload foto nota pembelian
- [ ] Real-time notifications
- [ ] Forecasting kebutuhan barang
- [ ] Purchase request & approval
- [ ] Supplier management
- [ ] Mobile app (React Native)
- [ ] Barcode/QR scanner
- [ ] Integration dengan POS

---

## 💰 Biaya

### Development (Free)
- Supabase Free Tier: 500 MB database, 50K users
- Vercel/Netlify: Free hosting
- **Total: Rp0**

### Production (Small Business)
- Supabase Pro: $25/bulan
- Custom domain: ~Rp150.000/tahun
- **Total: ~Rp350.000/bulan**

### Production (Medium Business)
- Supabase Team: $599/bulan
- Multiple environments
- Priority support
- **Total: ~Rp9.000.000/bulan**

---

## 🤝 Kontribusi

Pull requests welcome! Untuk perubahan besar, buka issue dulu untuk diskusi.

---

## 📝 License

MIT License - Bebas digunakan untuk keperluan komersial maupun non-komersial.

---

## 📞 Support

Untuk pertanyaan dan bantuan:
- Baca `SETUP_SUPABASE.md` untuk panduan lengkap
- Cek Supabase docs: https://supabase.com/docs
- Buka issue di GitHub

---

**Dibuat dengan ❤️ untuk membantu bisnis laundry Indonesia**
