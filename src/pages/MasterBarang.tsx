import React, { useState } from 'react';
import { useApp } from '../store';
import { useBooks } from '../books';
import { MasterBarang } from '../types';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const KATEGORI_OPTIONS = ['Chemical', 'Hanger', 'Plastik', 'ATK', 'Peralatan', 'Packaging', 'Lainnya'];

export default function MasterBarangPage() {
  const { state, dispatch, addAuditLog } = useApp();
  const {commitAction}=useBooks();
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterBarang | null>(null);
  const [formData, setFormData] = useState<Partial<MasterBarang>>({});

  const filteredBarang = state.barang.filter(b => {
    const matchSearch = b.nama.toLowerCase().includes(search.toLowerCase());
    const matchKategori = !filterKategori || b.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({
      nama: '', kategori: 'Chemical', subkategori: '', satuanDasar: 'pcs',
      satuanPembelian: 'pcs', konversi: [], minimumStock: 0, hargaTerakhir: 0,
      hargaRataRata: 0, lokasiGudang: state.gudang[0]?.id || '', statusAktif: true,
    });
    setShowForm(true);
  };

  const openEditForm = (item: MasterBarang) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    if (editingItem) {
      const updated = { ...editingItem, ...formData, updatedAt: now } as MasterBarang;
      try{await commitAction({ type: 'UPDATE_BARANG', payload: updated });}catch(e){alert(e instanceof Error?e.message:'Simpan gagal');return;}
      addAuditLog('UPDATE', 'barang', updated.id, editingItem, updated);
    } else {
      const newItem: MasterBarang = {
        id: 'brg-' + Date.now(),
        nama: formData.nama || '',
        kategori: formData.kategori || 'Lainnya',
        subkategori: formData.subkategori || '',
        satuanDasar: formData.satuanDasar || 'pcs',
        satuanPembelian: formData.satuanPembelian || 'pcs',
        konversi: formData.konversi || [],
        minimumStock: formData.minimumStock || 0,
        hargaTerakhir: formData.hargaTerakhir || 0,
        hargaRataRata: formData.hargaRataRata || 0,
        lokasiGudang: formData.lokasiGudang || '',
        statusAktif: formData.statusAktif !== false,
        createdAt: now,
        updatedAt: now,
      };
      try{await commitAction({ type: 'ADD_BARANG', payload: newItem });}catch(e){alert(e instanceof Error?e.message:'Simpan gagal');return;}
      addAuditLog('CREATE', 'barang', newItem.id, null, newItem);
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Nonaktifkan barang ini?')) {
      const item = state.barang.find(b => b.id === id);
      if (item) {
        try{await commitAction({ type: 'UPDATE_BARANG', payload: { ...item, statusAktif: false, updatedAt: new Date().toISOString() } });}catch(e){alert(e instanceof Error?e.message:'Simpan gagal');return;}
        addAuditLog('DEACTIVATE', 'barang', id, item, { ...item, statusAktif: false });
      }
    }
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Master Barang</h1>
        <button onClick={openAddForm} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Tambah Barang
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Kategori</option>
          {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Barang</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Satuan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min. Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Rata²</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Gudang</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBarang.map(b => (
                <tr key={b.id} className={!b.statusAktif ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.nama}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{b.kategori}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.satuanDasar}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{b.minimumStock}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatRupiah(b.hargaRataRata)}</td>
                  <td className="px-4 py-3 text-gray-600">{state.gudang.find(g => g.id === b.lokasiGudang)?.nama || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${b.statusAktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {b.statusAktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEditForm(b)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
          Total: {filteredBarang.length} barang
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang *</label>
                <input type="text" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={formData.kategori || ''} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subkategori</label>
                <input type="text" value={formData.subkategori || ''} onChange={e => setFormData({...formData, subkategori: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Dasar</label>
                <input type="text" value={formData.satuanDasar || ''} onChange={e => setFormData({...formData, satuanDasar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Pembelian</label>
                <input type="text" value={formData.satuanPembelian || ''} onChange={e => setFormData({...formData, satuanPembelian: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                <input type="number" value={formData.minimumStock || 0} onChange={e => setFormData({...formData, minimumStock: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Terakhir</label>
                <input type="number" value={formData.hargaTerakhir || 0} onChange={e => setFormData({...formData, hargaTerakhir: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Rata-rata</label>
                <input type="number" value={formData.hargaRataRata || 0} onChange={e => setFormData({...formData, hargaRataRata: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Gudang</label>
                <select value={formData.lokasiGudang || ''} onChange={e => setFormData({...formData, lokasiGudang: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {state.gudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={formData.statusAktif !== false} onChange={e => setFormData({...formData, statusAktif: e.target.checked})} className="rounded" />
                <label className="text-sm text-gray-700">Aktif</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
