import { supabase } from '../lib/supabase';
import type {
  MasterBarang,
  Gudang,
  StockOpname,
  Pembelian,
  StockSnapshot,
  AuditLog,
  PeriodClosing,
  Transfer,
} from '../types';

// ============================================
// AUTH SERVICE
// ============================================
export const authService = {
  async signUp(email: string, password: string, nama: string, role: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nama, role },
      },
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },
};

// ============================================
// GUDANG SERVICE
// ============================================
export const gudangService = {
  async getAll() {
    const { data, error } = await supabase
      .from('gudang')
      .select('*')
      .order('nama');
    return { data: data as Gudang[] | null, error };
  },

  async create(gudang: Omit<Gudang, 'id'>) {
    const { data, error } = await supabase
      .from('gudang')
      .insert([gudang])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: Partial<Gudang>) {
    const { data, error } = await supabase
      .from('gudang')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================
// MASTER BARANG SERVICE
// ============================================
export const barangService = {
  async getAll() {
    const { data, error } = await supabase
      .from('master_barang')
      .select('*')
      .order('nama');
    return { data: data as MasterBarang[] | null, error };
  },

  async create(barang: Omit<MasterBarang, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('master_barang')
      .insert([{
        ...barang,
        konversi: JSON.stringify(barang.konversi),
      }])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: Partial<MasterBarang>) {
    const { data, error } = await supabase
      .from('master_barang')
      .update({
        ...updates,
        konversi: updates.konversi ? JSON.stringify(updates.konversi) : undefined,
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('master_barang')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// ============================================
// STOCK SNAPSHOT SERVICE
// ============================================
export const stockService = {
  async getAll() {
    const { data, error } = await supabase
      .from('stock_snapshots')
      .select('*')
      .order('tanggal', { ascending: false });
    return { data: data as StockSnapshot[] | null, error };
  },

  async getByPeriode(periode: string, gudangId?: string) {
    let query = supabase
      .from('stock_snapshots')
      .select('*')
      .eq('periode', periode)
      .order('tanggal', { ascending: false });

    if (gudangId) {
      query = query.eq('gudang_id', gudangId);
    }

    const { data, error } = await query;
    return { data: data as StockSnapshot[] | null, error };
  },

  async create(snapshot: Omit<StockSnapshot, 'id'>) {
    const { data, error } = await supabase
      .from('stock_snapshots')
      .insert([snapshot])
      .select()
      .single();
    return { data, error };
  },

  async createMany(snapshots: Omit<StockSnapshot, 'id'>[]) {
    const { data, error } = await supabase
      .from('stock_snapshots')
      .insert(snapshots)
      .select();
    return { data, error };
  },
};

// ============================================
// STOCK OPNAME SERVICE
// ============================================
export const opnameService = {
  async getAll() {
    const { data, error } = await supabase
      .from('stock_opname')
      .select(`
        *,
        items:stock_opname_items(*)
      `)
      .order('tanggal', { ascending: false });
    return { data, error };
  },

  async create(opname: StockOpname) {
    const { data: opnameData, error: opnameError } = await supabase
      .from('stock_opname')
      .insert([{
        id: opname.id,
        periode: opname.periode,
        tanggal: opname.tanggal,
        gudang_id: opname.gudangId,
        petugas: opname.petugas,
        status: opname.status,
      }])
      .select()
      .single();

    if (opnameError) return { data: null, error: opnameError };

    // Insert items
    const items = opname.items.map(item => ({
      opname_id: opname.id,
      barang_id: item.barangId,
      stock_sistem: item.stockSistem,
      stock_fisik: item.stockFisik,
      selisih: item.selisih,
      catatan: item.catatan,
    }));

    const { error: itemsError } = await supabase
      .from('stock_opname_items')
      .insert(items);

    return { data: opnameData, error: itemsError };
  },
};

// ============================================
// PEMBELIAN SERVICE
// ============================================
export const pembelianService = {
  async getAll() {
    const { data, error } = await supabase
      .from('pembelian')
      .select(`
        *,
        items:pembelian_items(*)
      `)
      .order('tanggal', { ascending: false });
    return { data, error };
  },

  async create(pembelian: Pembelian) {
    const { data: pembelianData, error: pembelianError } = await supabase
      .from('pembelian')
      .insert([{
        id: pembelian.id,
        tanggal: pembelian.tanggal,
        nomor_nota: pembelian.nomorNota,
        supplier: pembelian.supplier,
        gudang_id: pembelian.gudangId,
        total_diskon: pembelian.totalDiskon,
        pajak: pembelian.pajak,
        total: pembelian.total,
        foto_nota: pembelian.fotoNota,
        catatan: pembelian.catatan,
        status: pembelian.status,
        created_by: pembelian.createdBy,
      }])
      .select()
      .single();

    if (pembelianError) return { data: null, error: pembelianError };

    // Insert items
    const items = pembelian.items.map(item => ({
      pembelian_id: pembelian.id,
      barang_id: item.barangId,
      quantity: item.quantity,
      satuan: item.satuan,
      quantity_dasar: item.quantityDasar,
      harga_satuan: item.hargaSatuan,
      diskon: item.diskon,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('pembelian_items')
      .insert(items);

    return { data: pembelianData, error: itemsError };
  },

  async void(id: string) {
    const { data, error } = await supabase
      .from('pembelian')
      .update({ status: 'void' })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================
// PERIOD CLOSING SERVICE
// ============================================
export const closingService = {
  async getAll() {
    const { data, error } = await supabase
      .from('period_closings')
      .select('*')
      .order('closed_at', { ascending: false });
    return { data: data as PeriodClosing[] | null, error };
  },

  async create(closing: Omit<PeriodClosing, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('period_closings')
      .insert([closing])
      .select()
      .single();
    return { data, error };
  },

  async isClosed(periode: string, gudangId: string) {
    const { data, error } = await supabase
      .from('period_closings')
      .select('id')
      .eq('periode', periode)
      .eq('gudang_id', gudangId)
      .eq('status', 'closed')
      .single();
    return { isClosed: !!data, error };
  },
};

// ============================================
// AUDIT LOG SERVICE
// ============================================
export const auditService = {
  async create(log: AuditLog) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        id: log.id,
        user_id: log.user,
        user_name: log.user,
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        data_before: log.dataBefore ? JSON.stringify(log.dataBefore) : null,
        data_after: log.dataAfter ? JSON.stringify(log.dataAfter) : null,
        reason: log.reason,
      }])
      .select()
      .single();
    return { data, error };
  },

  async getAll() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    return { data, error };
  },
};

// ============================================
// TRANSFER SERVICE
// ============================================
export const transferService = {
  async getAll() {
    const { data, error } = await supabase
      .from('transfers')
      .select(`
        *,
        items:transfer_items(*)
      `)
      .order('tanggal', { ascending: false });
    return { data, error };
  },

  async create(transfer: Transfer) {
    const { data: transferData, error: transferError } = await supabase
      .from('transfers')
      .insert([{
        id: transfer.id,
        nomor_transfer: transfer.nomorTransfer,
        tanggal: transfer.tanggal,
        gudang_asal_id: transfer.gudangAsalId,
        gudang_tujuan_id: transfer.gudangTujuanId,
        petugas: transfer.petugas,
        status: transfer.status,
        catatan: transfer.catatan,
        created_by: transfer.createdBy,
      }])
      .select()
      .single();

    if (transferError) return { data: null, error: transferError };

    const items = transfer.items.map(item => ({
      transfer_id: transfer.id,
      barang_id: item.barangId,
      quantity: item.quantity,
      satuan: item.satuan,
      quantity_dasar: item.quantityDasar,
      catatan: item.catatan,
    }));

    const { error: itemsError } = await supabase
      .from('transfer_items')
      .insert(items);

    return { data: transferData, error: itemsError };
  },

  async updateStatus(id: string, status: 'pending' | 'in_transit' | 'completed' | 'cancelled') {
    const { data, error } = await supabase
      .from('transfers')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async completeTransfer(id: string) {
    const { data, error } = await supabase.rpc('complete_transfer', { transfer_id_param: id });
    return { data, error };
  },

  async cancel(id: string) {
    const { data, error } = await supabase
      .from('transfers')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};
