# 📊 MODUL ADJUSTMENT - PANDUAN LENGKAP

## 🎯 APA ITU ADJUSTMENT?

**Adjustment** adalah fitur untuk **memisahkan selisih stock opname dari perhitungan HPP**, sehingga HPP menjadi lebih akurat.

### **Masalah Tanpa Adjustment:**
```
Stock Awal: 20 pcs
Pembelian: 5 pcs
Stock Fisik (opname): 18 pcs

Pemakaian = 20 + 5 - 18 = 7 pcs ❌
```

**Masalah:** Selisih 2 pcs (kehilangan/kerusakan) ikut dihitung sebagai pemakaian, padahal bukan!

### **Solusi Dengan Adjustment:**
```
Stock Awal: 20 pcs
Pembelian: 5 pcs
Stock Fisik (opname): 18 pcs
Adjustment (kehilangan): -2 pcs

Pemakaian Sebenarnya = 20 + 5 - 18 - (-2) = 5 pcs ✅
```

**Hasil:** HPP hanya menghitung pemakaian sebenarnya (5 pcs), bukan kehilangan (2 pcs).

---

## ✨ FITUR UTAMA

### 1. **Kategori Adjustment**
- ✅ **Selisih Stock Opname** - Perbedaan stock sistem vs fisik
- ✅ **Kerusakan** - Barang rusak/tidak bisa dipakai
- ✅ **Kehilangan** - Barang hilang (dicuri, misplaced)
- ✅ **Kesalahan Catat** - Salah input data
- ✅ **Lainnya** - Alasan lain

### 2. **Sistem Approval**
- **Staff** bisa buat adjustment (status: pending)
- **Admin/Finance** harus approve/reject
- Stock hanya berubah setelah approved
- Audit trail lengkap

### 3. **Auto-Calculate**
- Otomatis hitung selisih (sebelum - sesudah)
- Auto-fill stock saat ini saat pilih barang
- Validasi data otomatis

### 4. **Filter & Tracking**
- Filter by status (pending/approved/rejected)
- Filter by tipe adjustment
- History lengkap dengan detail

---

## 🗄️ DATABASE SCHEMA

### Tabel `adjustments`
```sql
- id (TEXT, PRIMARY KEY)
- nomor_adjustment (TEXT, UNIQUE)
- tanggal (DATE)
- gudang_id (TEXT, FK ke gudang)
- tipe (TEXT: stock_opname/kerusakan/kehilangan/kesalahan_catat/lainnya)
- status (TEXT: pending/approved/rejected)
- petugas (TEXT)
- disetujui_oleh (TEXT)
- tanggal_persetujuan (TIMESTAMP)
- catatan (TEXT)
- created_by (UUID, FK ke users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabel `adjustment_items`
```sql
- id (UUID, PRIMARY KEY)
- adjustment_id (TEXT, FK ke adjustments)
- barang_id (TEXT, FK ke master_barang)
- quantity_sebelum (NUMERIC)
- quantity_sesudah (NUMERIC)
- selisih (NUMERIC)
- alasan (TEXT)
- catatan (TEXT)
- created_at (TIMESTAMP)
```

---

## 🚀 CARA MENGGUNAKAN

### **STEP 1: Jalankan SQL Migration**

Di **Supabase** → **SQL Editor**:

1. Copy isi file `supabase/migrations/004_adjustment_schema.sql`
2. Paste ke SQL Editor
3. Klik **"Run"**
4. Tunggu sampai **"Success"** ✅

### **STEP 2: Buat Adjustment**

1. Login ke aplikasi
2. Klik menu **"Adjustment"** di sidebar (icon ⚙️)
3. Klik **"Buat Adjustment"**
4. Isi form:

```
Nomor Adjustment: ADJ-001
Tanggal: (hari ini)
Gudang: Gudang Jemur
Tipe: Selisih Stock Opname
Petugas: Budi
Catatan: Selisih dari stock opname 28 September 2026
```

5. Klik **"Tambah Item"**
6. Pilih barang (contoh: Soft Ungu)
   - **Quantity Sebelum**: otomatis terisi (stock saat ini)
   - **Quantity Sesudah**: isi dengan stock fisik yang benar
   - **Selisih**: otomatis terhitung
   - **Alasan**: isi alasan (contoh: "Kehilangan 2 pcs saat opname")
7. Klik **"Simpan Adjustment"**

### **STEP 3: Approve Adjustment (Admin/Finance)**

1. Login sebagai Admin atau Finance
2. Buka menu **"Adjustment"**
3. Cari adjustment dengan status **"Menunggu Persetujuan"** (kuning)
4. Klik **"Setujui"** (hijau)
5. Konfirmasi
6. Stock otomatis disesuaikan! ✅

### **STEP 4: Cek Hasil**

1. Buka menu **"Stock"**
2. Lihat stock barang yang di-adjust
3. Stock sudah sesuai dengan quantity_sesudah ✅

---

## 📊 CONTOH KASUS

### **Kasus 1: Selisih Stock Opname**

**Kondisi:**
- Stock Sistem Soft Ungu: 37 pcs
- Stock Fisik (opname): 35 pcs
- Selisih: -2 pcs (kehilangan)

**Langkah:**
1. Buat Adjustment ADJ-001
2. Tipe: "Selisih Stock Opname"
3. Item:
   - Barang: Soft Ungu
   - Sebelum: 37 pcs
   - Sesudah: 35 pcs
   - Selisih: -2 pcs
   - Alasan: "Kehilangan 2 pcs saat stock opname"
4. Simpan → Approve

**Hasil:**
- Stock Soft Ungu: 35 pcs ✅
- HPP tidak terpengaruh oleh kehilangan ✅

### **Kasus 2: Kerusakan Barang**

**Kondisi:**
- Det Biru rusak 3 botol karena bocor

**Langkah:**
1. Buat Adjustment ADJ-002
2. Tipe: "Kerusakan"
3. Item:
   - Barang: Det Biru
   - Sebelum: 38 pcs
   - Sesudah: 35 pcs
   - Selisih: -3 pcs
   - Alasan: "3 botol bocor/rusak"
4. Simpan → Approve

**Hasil:**
- Stock Det Biru: 35 pcs ✅
- Kerusakan tercatat terpisah dari pemakaian ✅

### **Kasus 3: Kesalahan Catat**

**Kondisi:**
- Salah input pembelian, seharusnya 20 pcs tapi terinput 25 pcs

**Langkah:**
1. Buat Adjustment ADJ-003
2. Tipe: "Kesalahan Catat"
3. Item:
   - Barang: Parfum Florence
   - Sebelum: 30000 ml (salah)
   - Sesudah: 25000 ml (benar)
   - Selisih: -5000 ml
   - Alasan: "Koreksi kesalahan input pembelian"
4. Simpan → Approve

**Hasil:**
- Stock Parfum Florence: 25000 ml ✅
- Data sudah benar ✅

---

## 🔒 KEAMANAN & VALIDASI

### **Validasi Otomatis:**
- ✅ Nomor adjustment harus unik
- ✅ Semua field wajib diisi
- ✅ Alasan harus diisi untuk setiap item
- ✅ Gudang harus dipilih

### **Keamanan:**
- ✅ Hanya Admin/Finance yang bisa approve
- ✅ Audit trail lengkap (siapa, kapan, apa)
- ✅ Stock hanya berubah setelah approved
- ✅ Tidak bisa edit adjustment yang sudah approved/rejected

---

## 📈 DAMPAK KE HPP

### **Sebelum Ada Adjustment:**
```
Pemakaian = Stock Awal + Pembelian - Stock Akhir
         = 20 + 5 - 18 = 7 pcs
         
Nilai HPP = 7 × Rp20.000 = Rp140.000 ❌
```

**Masalah:** Kehilangan 2 pcs ikut dihitung sebagai pemakaian.

### **Setelah Ada Adjustment:**
```
Stock Akhir (sebelum adjustment) = 18 pcs
Adjustment (kehilangan) = -2 pcs
Stock Akhir (sesudah adjustment) = 18 - (-2) = 20 pcs

Pemakaian = 20 + 5 - 20 = 5 pcs ✅
Nilai HPP = 5 × Rp20.000 = Rp100.000 ✅
```

**Hasil:** HPP hanya menghitung pemakaian sebenarnya!

---

## 🎯 BEST PRACTICES

### 1. **Lakukan Adjustment Rutin**
- Setelah stock opname → buat adjustment untuk selisih
- Saat ada kerusakan → buat adjustment segera
- Saat ada kesalahan catat → koreksi dengan adjustment

### 2. **Isi Alasan yang Jelas**
- ❌ "Selisih"
- ✅ "Kehilangan 2 pcs saat stock opname 28 September 2026"

### 3. **Approve Segera**
- Jangan biarkan adjustment pending terlalu lama
- Review dan approve/reject dalam 1-2 hari

### 4. **Tracking Kehilangan**
- Monitor adjustment tipe "kehilangan" setiap bulan
- Jika terlalu banyak → investigasi penyebab
- Ambil tindakan pencegahan

### 5. **Nomor Adjustment**
Gunakan format konsisten:
- `ADJ-YYYYMM-001` (contoh: ADJ-202609-001)
- Atau auto-increment: ADJ-001, ADJ-002, dst

---

## 📊 LAPORAN YANG BISA DIBUAT

### **Laporan Adjustment Bulanan**
- Total adjustment per tipe
- Breakdown by gudang
- Trend adjustment per bulan
- Top barang yang sering di-adjust

### **Laporan Kehilangan**
- Total kehilangan per bulan
- Nilai rupiah kehilangan
- Barang yang paling sering hilang
- Perbandingan dengan bulan sebelumnya

### **Laporan HPP yang Sudah Disesuaikan**
- HPP sebelum adjustment
- HPP sesudah adjustment
- Selisih (dampak adjustment)
- Akurasi HPP

---

## 🐛 TROUBLESHOOTING

### Problem: "Tidak bisa approve adjustment"
**Penyebab:** Bukan Admin/Finance

**Solusi:**
- Login sebagai Admin atau Finance
- Hanya role tersebut yang bisa approve

### Problem: "Stock tidak berubah setelah approve"
**Penyebab:** Bug atau error

**Solusi:**
- Cek browser console untuk error
- Cek di Supabase → Table Editor → stock_snapshots
- Hubungi developer

### Problem: "Tidak bisa edit adjustment yang sudah approved"
**Penyebab:** Ini by design (keamanan)

**Solusi:**
- Buat adjustment baru untuk koreksi
- Atau hubungi admin untuk revert (butuh SQL manual)

---

## 📋 CHECKLIST

### Sebelum Buat Adjustment:
- [ ] Stock opname sudah dilakukan
- [ ] Selisih sudah diidentifikasi
- [ ] Alasan selisih sudah diketahui
- [ ] Barang yang affected sudah dicatat

### Saat Buat Adjustment:
- [ ] Nomor adjustment unik
- [ ] Gudang dipilih dengan benar
- [ ] Tipe adjustment sesuai
- [ ] Semua item lengkap (barang, sebelum, sesudah, alasan)
- [ ] Catatan diisi (jika perlu)

### Setelah Buat Adjustment:
- [ ] Notification ke Admin/Finance
- [ ] Review oleh Admin/Finance
- [ ] Approve atau Reject
- [ ] Cek stock sudah sesuai
- [ ] Cek laporan HPP sudah akurat

---

## 🎉 KESIMPULAN

Modul Adjustment memberikan:
- ✅ **HPP lebih akurat** - hanya hitung pemakaian sebenarnya
- ✅ **Tracking kehilangan** - tahu berapa barang hilang/rusak
- ✅ **Audit trail** - semua perubahan tercatat
- ✅ **Approval system** - kontrol oleh Admin/Finance
- ✅ **Laporan detail** - analisis kehilangan & kerusakan

**Aplikasi sekarang punya sistem inventory yang profesional dan akurat!** 🚀

---

## 📞 SUPPORT

Jika ada masalah:
1. Baca dokumentasi ini
2. Cek Supabase logs
3. Cek browser console
4. Hubungi developer

---

**Last updated: 2026**
