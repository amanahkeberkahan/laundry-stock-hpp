# 🧺 Laundry Stock & HPP - Multi-User

Sistem manajemen persediaan laundry dengan perhitungan HPP otomatis, mendukung multi-user dengan Supabase.

![Version](https://img.shields.io/badge/Version-2.0-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Supabase](https://img.shields.io/badge/Supabase-Ready-green)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Fitur Utama

- 📊 **Dashboard** - Ringkasan stock, HPP, dan alert
- 📦 **Master Barang** - Kelola data barang dengan konversi satuan
- 🏪 **Multi Gudang** - Support multiple lokasi gudang
- 📋 **Stock Opname** - Input stock fisik dengan auto-calculate selisih
- 🛒 **Pembelian** - Input nota pembelian multi-item
- 💰 **Perhitungan HPP** - Formula: Stock Awal + Pembelian - Stock Akhir
- 🔐 **Multi-User** - Role: Admin, Staff Gudang, Finance, Owner
- 🔒 **Closing Bulanan** - Kunci periode untuk audit
- 📈 **Laporan** - Export CSV, filter by periode/gudang/kategori
- ☁️ **Cloud Sync** - Data tersinkron real-time via Supabase

---

## 🚀 Quick Start

### 1. Setup Supabase (Database)

```bash
# 1. Buat project di https://supabase.com
# 2. Jalankan SQL di supabase/migrations/001_initial_schema.sql
# 3. Copy Project URL dan anon key
```

### 2. Setup Environment

Buat file `.env` di root project:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Buka http://localhost:5173

---

## 📁 Struktur Project

```
laundry-stock-hpp/
├── src/
│   ├── App.tsx              # Main app component
│   ├── store.tsx            # State management
│   ├── types.ts             # TypeScript types
│   ├── lib/
│   │   └── supabase.ts      # Supabase client
│   ├── services/
│   │   └── database.ts      # Database service
│   ├── data/
│   │   └── initialData.ts   # Demo data
│   └── pages/
│       ├── Dashboard.tsx
│       ├── MasterBarang.tsx
│       ├── StockOpname.tsx
│       ├── Pembelian.tsx
│       ├── LaporanHPP.tsx
│       ├── LaporanStock.tsx
│       ├── LoginPage.tsx
│       └── OtherPages.tsx
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── package.json
└── README.md
```

---

## 👥 User Roles

| Role | Akses |
|------|-------|
| **Admin** | Full access - semua fitur |
| **Staff Gudang** | Stock opname, input pembelian |
| **Finance** | Pembelian, closing, laporan HPP |
| **Owner** | View only - dashboard & laporan |

---

## 💰 Formula HPP

```
Pemakaian = Stock Awal + Pembelian - Stock Akhir
Nilai HPP = Pemakaian × Harga Rata-rata Tertimbang
```

---

## 🌐 Deploy ke Production

### Via Vercel (Recommended)

1. Push code ke GitHub
2. Import repository di https://vercel.com
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Biaya: **GRATIS** 🎉

- Supabase Free Tier: 50K users, 500 MB database
- Vercel Hobby: Unlimited deployments
- GitHub: Free for public repos

---

## 📚 Dokumentasi

- 📘 [Panduan Online Lengkap](PANDUAN_ONLINE_LENGKAP.md) - Step-by-step deploy
- 📗 [Setup Supabase](SETUP_SUPABASE.md) - Detail konfigurasi database
- 📙 [Upload Guide](UPLOAD_GUIDE.md) - Cara upload ke GitHub
- 📕 [Quick Start](QUICKSTART.md) - 5 menit setup

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Hosting**: Vercel

---

## 🔒 Security

- ✅ Row Level Security (RLS) di Supabase
- ✅ JWT Authentication
- ✅ Role-based access control
- ✅ Audit trail lengkap
- ✅ Environment variables untuk secrets

---

## 📊 Database Schema

10 tabel dengan relasi:
- `profiles` - User data
- `gudang` - Data gudang
- `master_barang` - Master barang
- `stock_snapshots` - Snapshot stock
- `stock_opname` - Stock opname
- `pembelian` - Pembelian
- `period_closings` - Closing periode
- `audit_logs` - Audit trail

---

## 🤝 Kontribusi

Pull requests welcome! Untuk perubahan besar, buka issue dulu.

---

## 📝 License

MIT License - Bebas digunakan untuk komersial maupun non-komersial.

---

## 📞 Support

- 📖 Baca dokumentasi di folder project
- 🐛 Bug? Buka issue di GitHub
- 💡 Feature request? Buka issue dengan label "enhancement"

---

**Dibuat dengan ❤️ untuk bisnis laundry Indonesia**

*Version 2.0 - Multi-User with Supabase*
