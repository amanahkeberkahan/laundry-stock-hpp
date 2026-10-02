export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
}

export interface MasterBarang {
  id: string;
  nama: string;
  kategori: string;
  subkategori: string;
  satuanDasar: string;
  satuanPembelian: string;
  konversi: UnitConversion[];
  minimumStock: number;
  hargaTerakhir: number;
  hargaRataRata: number;
  lokasiGudang: string;
  statusAktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Gudang {
  id: string;
  nama: string;
  kode: string;
  alamat?: string;
  statusAktif: boolean;
}

export interface StockOpnameItem {
  barangId: string;
  stockSistem: number;
  stockFisik: number;
  selisih: number;
  catatan: string;
}

export interface StockOpname {
  id: string;
  periode: string; // YYYY-MM
  tanggal: string;
  gudangId: string;
  petugas: string;
  items: StockOpnameItem[];
  status: 'draft' | 'finalized';
  createdAt: string;
  updatedAt: string;
}

export interface PembelianItem {
  barangId: string;
  quantity: number;
  satuan: string;
  quantityDasar: number;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

export interface Pembelian {
  id: string;
  tanggal: string;
  nomorNota: string;
  supplier: string;
  gudangId: string;
  items: PembelianItem[];
  totalDiskon: number;
  pajak: number;
  total: number;
  fotoNota?: string;
  catatan: string;
  status: 'active' | 'void';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface StockSnapshot {
  barangId: string;
  gudangId: string;
  periode: string;
  quantity: number;
  nilaiTotal: number;
  hargaRataRata: number;
  tanggal: string;
}

export interface HPPCalculation {
  periode: string;
  gudangId: string;
  barangId: string;
  stockAwal: number | null;
  pembelian: number | null;
  stockAkhir: number | null;
  pemakaian: number | null;
  hargaRataRata: number;
  nilaiHPP: number | null;
  status: 'incomplete' | 'ready';
  missingComponents: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore?: any;
  dataAfter?: any;
  reason?: string;
}

export interface PeriodClosing {
  id: string;
  periode: string;
  gudangId: string;
  closedAt: string;
  closedBy: string;
  status: 'closed' | 'open';
}

export interface TransferItem {
  id: string;
  transferId: string;
  barangId: string;
  quantity: number;
  satuan: string;
  quantityDasar: number;
  catatan: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  nomorTransfer: string;
  tanggal: string;
  gudangAsalId: string;
  gudangTujuanId: string;
  petugas: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  items: TransferItem[];
  catatan: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentItem {
  id: string;
  adjustmentId: string;
  barangId: string;
  quantitySebelum: number;
  quantitySesudah: number;
  selisih: number;
  alasan: string;
  catatan: string;
  createdAt: string;
}

export interface Adjustment {
  id: string;
  nomorAdjustment: string;
  tanggal: string;
  gudangId: string;
  tipe: 'stock_opname' | 'kerusakan' | 'kehilangan' | 'kesalahan_catat' | 'lainnya';
  status: 'pending' | 'approved' | 'rejected';
  petugas: string;
  disetujuiOleh?: string;
  tanggalPersetujuan?: string;
  items: AdjustmentItem[];
  catatan: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'staff_gudang' | 'finance' | 'owner';

export interface User {
  id: string;
  nama: string;
  role: UserRole;
  aktif: boolean;
}

export type PageType = 'dashboard' | 'stock' | 'stock-opname' | 'pembelian' | 'transfer' | 'adjustment' | 'master-barang' | 'gudang' | 'laporan-hpp' | 'laporan-stock' | 'closing' | 'settings';
