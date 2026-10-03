# Persediaan dan pembukuan laundry

Pengembangan melanjutkan aplikasi React/Vite existing di `src/`. Form pembelian, opname, transfer, adjustment, master barang, gudang, dashboard, HPP, closing dan pengaturan tetap digunakan. Menu tambahan: Jurnal Umum, Buku Besar, Neraca Saldo, Master Akun, Mutasi Stok, Kartu Stok, Pemakaian Bahan, Rekonsiliasi Bank, serta Aset & Penyusutan.

## Aktivasi dan kelengkapan data

1. Backup data existing melalui Pengaturan. Tanpa konfigurasi Supabase, stok bawaan aplikasi adalah **data demo**, bukan inventaris perusahaan terverifikasi.
2. Buka Jurnal Umum dan pilih tanggal awal buku. Data workbook dimulai Juni 2026. Aktivasi sekali membuat saldo awal dari snapshot terakhir setiap barang/gudang pada tanggal snapshot atau tanggal awal buku, mana yang lebih akhir. Snapshot September tidak digunakan untuk mengarang stok Juni.
3. Verifikasi barang, satuan, konversi, qty dan nilai awal. Barang tanpa histori dapat diisi lewat Mutasi Stok → Input saldo awal. Barang berhistori dikoreksi melalui opname/adjustment.
4. Isi saldo awal kas, piutang, hutang, modal dan laba ditahan melalui jurnal dengan bukti sumber; aset melalui register. Persediaan/aset tidak boleh dimasukkan ulang melalui jurnal manual.
5. Selesaikan transaksi dan review bank. Periksa neraca saldo, neraca, persediaan versus akun 1200, serta bank versus rekening koran sebelum closing.

Aktivasi dan posting data bisnis tidak dijalankan otomatis pada preview demo. Migrasi database sudah diterapkan. Semua fixture pengujian di-rollback, sehingga jurnal/mutasi produksi tetap kosong. Preview belum diterbitkan ulang ke Vercel; kode belum di-commit/push.

## Integrasi transaksi dan jurnal

Laporan utama memakai **Transaksi → Jurnal → Buku Besar → Laporan Keuangan**, bukan agregasi langsung tabel transaksi.

| Sumber | Mutasi | Jurnal otomatis |
| --- | --- | --- |
| Saldo awal bahan | Qty/nilai masuk | Debit Persediaan 1200 / Kredit Modal 3001 |
| Pembelian existing | Qty/nilai bertambah, termasuk alokasi pajak | Debit 1200 / Kredit Kas 1000, BRI 1001, BSI 1002, atau Hutang Usaha 2001 |
| Pemakaian bahan | Qty/nilai keluar moving average | Debit Beban Bahan 5001 / Kredit 1200 |
| Opname/adjustment disetujui | Penyesuaian qty/nilai | Kekurangan: Debit Beban Lain 5901 / Kredit 1200; kelebihan sebaliknya |
| Transfer selesai | Keluar asal / masuk tujuan, nilai sama | Tidak mengubah total persediaan perusahaan |
| Void nota | Mutasi pembalik | Jurnal pembalik nota sumber |
| Perolehan aset | Register aset | Debit Peralatan 1300 / Kredit pembayaran atau hutang |
| Penyusutan | Jadwal bulanan | Debit Beban Penyusutan 5601 / Kredit Akumulasi 1301 |

Jurnal minimal dua baris, satu sisi per baris, maksimal dua desimal, total debit = kredit. Nomor dan sumber unik; posting ulang tidak menggandakan jurnal. Jurnal terposting tidak diedit/dihapus. Jurnal umum menyediakan pendapatan, pengeluaran, pembayaran hutang, penerimaan piutang dan penyesuaian. Koreksi memakai pembalik pada periode terbuka; stok/aset harus melalui dokumen sumber agar register konsisten.

Moving average dihitung per barang/gudang: nilai saldo / qty saldo. Pemakaian seluruh saldo mengambil seluruh nilai tersisa agar tidak menyisakan residu pembulatan. Stok minus, tanggal sebelum mutasi terakhir barang/gudang, periode ditutup, konversi salah dan opname dengan stok sistem basi ditolak. Void ditolak bila nota sudah diikuti mutasi lain; gunakan koreksi terkontrol agar biaya historis tidak berubah.

Opname disimpan draft; **Setujui & posting** memperbarui stok, mutasi dan jurnal bersama. Transfer pending belum mengurangi stok. Closing mengunci seluruh jurnal dan mutasi perusahaan pada bulan tersebut, bukan hanya gudang pada dokumen closing. Draft opname, adjustment dan transfer harus diselesaikan dahulu. Penyimpanan/posting membutuhkan admin/finance; owner dapat melihat laporan.

## Buku besar dan laporan

COA memuat kode, nama, kelompok, saldo normal dan status aktif. Kelompok/saldo normal akun yang sudah digunakan tidak diubah. Akun/barang berhistori dinonaktifkan, bukan dihapus. Buku besar memiliki filter akun, bulan/tahun dan rentang tanggal, termasuk saldo sebelum rentang.

Neraca saldo kumulatif sampai tanggal akhir. Laba rugi memakai pendapatan dan beban dalam rentang. Neraca memasukkan aset, liabilitas, ekuitas, prive sebagai pengurang, akumulasi penyusutan sebagai pengurang aset, dan laba berjalan kumulatif. Validasi: **Aset = Liabilitas + Ekuitas**, serta debit = kredit. Selisih selalu ditampilkan.

HPP bahan berasal dari nilai mutasi **pemakaian**, sehingga opname/transfer tidak tercampur sebagai pemakaian. Kartu stok menampilkan saldo awal, masuk/keluar, saldo, harga rata-rata dan nilai saldo. Akun sementara 1109/kliring 9991 yang belum nol ditandai untuk review. Balance matematis tidak membuktikan kelengkapan bisnis; saldo awal dan semua transaksi tetap perlu diverifikasi.

## Data Excel dan rekening BRI/BSI

Workbook dan PDF asli dibaca tanpa diubah. Konversi menghasilkan file privat `outputs/finance-import.json`: 682 transaksi Juni–Agustus 2026, COA sumber, enam kontrol saldo, POS dan snapshot draft.

```powershell
python scripts/prepare-finance.py "C:/path/pembukuan.xlsx"
python scripts/check-bank-pdfs.py "C:/path/BRI.pdf" "C:/path/BSI.pdf"
```

Memerlukan openpyxl/pypdf. Pemeriksaan PDF disesuaikan dengan format BRI/BSI Agustus 2026 yang diberikan, bukan parser universal. Seluruh 206 baris BRI dan 22 baris BSI cocok terhadap tanggal, keluar/masuk, saldo berjalan dan jumlah duplikat. Satu mutasi Agustus ditempatkan pada periode akuntansi Juli dalam draft.

Impor JSON melalui Transaksi & Review. Impor mengganti dataset review aktif; backup sebelum impor ulang. Review cloud privat per akun dan setiap simpan membuat snapshot baru. Buku terposting dibagikan lewat keanggotaan terpisah.

Rekonsiliasi:

1. Kontrol mutasi memeriksa saldo awal + masuk − keluar = saldo akhir berdasarkan bulan bank. Selisih nol belum berarti seluruh transaksi cocok dengan jurnal/POS.
2. Cocokkan pembayaran nota, aset atau jurnal existing dengan mutasi bernilai/berarah sama **sebelum posting bank**, agar pembayaran tidak dicatat dua kali. Satu jurnal tidak dicocokkan ulang.
3. **Posting mutasi belum tercatat** memproses seluruh periode dalam file sejak awal buku. Saldo awal bank berasal dari kontrol bulan awal dengan lawan Modal yang perlu verifikasi. Jika bank sudah memiliki jurnal sebelum impor, isi/verifikasi saldo awal sendiri dan cocokkan jurnal existing dahulu.
4. Pending/5999 masuk akun sementara 1109. Setelah klasifikasi dan alasan review lengkap, **Posting hasil review akun sementara** membuat reklasifikasi pada tanggal hari ini. Jurnal bank asli tetap tersimpan. Perubahan akun definitif memerlukan jurnal koreksi tersendiri.
5. Posting mengikuti tanggal bank aktual. Penyesuaian tunai/POS, settlement, piutang dan akrual lintas bulan dibuat berdasarkan bukti melalui jurnal penyesuaian; neto POS tidak dipaksakan menjadi pendapatan jurnal.

**Pembanding Draft Excel** terpisah dari laporan utama. Formula draft memasukkan sebagian pending yang terpetakan, walaupun catatan treatment menyatakan sebaliknya. Opsi provisional memperjelas perbedaan. Snapshot neraca Excel bukan laporan final dari buku besar dan tidak berubah saat review.

## Aset

Input nama, kategori, lokasi, tanggal perolehan, bulan mulai, harga, residu dan masa manfaat. Metode garis lurus bulanan penuh, belum prorata harian/tabel pajak. Beban = (harga − residu) / masa manfaat; nilai buku berhenti pada residu. Posting perolehan sekali, kemudian penyusutan hingga bulan terpilih; bulan terposting dilewati. Aset sebelum awal buku membawa biaya bruto, akumulasi sebelum bulan awal, serta nilai buku awal dengan lawan Modal. Aset terposting tidak diedit agar jurnal historis tetap konsisten.

## Penyimpanan dan deployment

Mode lokal: satu penulisan `laundry-accounting-v1` menyimpan dokumen, jurnal, mutasi dan aset atomik. Perubahan dari tab lain ditolak sampai buku dimuat ulang. Backup terintegrasi di Jurnal Umum/Pengaturan; restore hanya ke buku kosong. Import/reset legacy ditolak saat buku aktif agar histori tidak tertimpa.

Konfigurasi Vite existing memakai `.env.local` lokal dan environment Vercel:

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Jangan gunakan service-role key di frontend. Env dan keluaran privat diabaikan Git. PDF/workbook tidak disalin ke repository.

Tabel baru: `accounting_books`, `accounting_members`, `coa_accounts`, `journal_entries`, `journal_lines`, `stock_movements`, `accounting_documents`, dan `finance_imports`. Aset aktif berada di register buku; tabel `fixed_assets` awal tidak menjadi sumber laporan.

RPC `commit_accounting_book` mengunci revision, memeriksa keanggotaan admin/finance, double-entry, moving average, histori immutable, periode ditutup, dan nilai persediaan versus GL per tanggal. Dokumen/jurnal/mutasi tersimpan satu transaksi. `accounting_books.payload` merupakan state terintegrasi aplikasi; tabel operasional legacy tetap sebagai sumber migrasi awal. Client lama yang hanya menulis legacy tidak digunakan bersamaan setelah buku aktif.

RLS aktif pada seluruh tabel baru. Client hanya membaca tabel buku; posting melalui RPC. Keanggotaan dikelola server dan tidak mengikuti perubahan role UI profil. Admin existing menjadi anggota awal; tambahan akses belum diberikan otomatis. Perluasan akses draft staff tidak diterapkan setelah ditolak review persetujuan otomatis.

Advisor tidak menemukan masalah pada objek baru, tetapi menandai objek/config lama: [search_path fungsi legacy](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [fungsi SECURITY DEFINER legacy dapat dipanggil anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), dan [pemeriksaan password bocor](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Perbaikan legacy perlu pemeriksaan tersendiri agar fungsi existing tetap terjaga.

## Pengujian

```powershell
npm run typecheck
npm run build
node scripts/test-accounting.mjs
node scripts/test-finance.mjs
node scripts/prepare-supabase-test.mjs
```

Test accounting/finance membutuhkan file konversi privat. Pengujian meliputi moving average/conversion, pembelian/pemakaian, transfer/opname/void, stok minus/backdate/closing, saldo awal ledger, double-entry, 682 posting bank + enam kontrol saldo, penyusutan idempotent dan histori rusak. SQL fixture dari prepare-supabase-test memverifikasi atomic commit, penolakan jurnal tidak balance/revisi basi/perubahan histori/direct write/akses nonanggota. Semua fixture di-rollback.

## Pembukuan mulai 1 Oktober 2026
Aktivasi baru mempertahankan qty snapshot existing dan mengabaikan harga lama. Verifikasi harga per satuan dasar melalui Mutasi Stok. Verifikasi membuat mutasi nilai tanpa perubahan qty serta jurnal Persediaan / Modal. Transaksi stok dengan harga awal belum terverifikasi ditolak. Laporan masih sementara sampai harga dan saldo awal lain lengkap. Rekening koran Agustus tetap pembanding historis, bukan transaksi Oktober.
