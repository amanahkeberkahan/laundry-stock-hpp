import React, { useState } from 'react';
import { useApp } from '../store';
import { PembelianItem } from '../types';
import { Plus, Trash2, FileText, X, Save } from 'lucide-react';

export default function PembelianPage() {
  const { state, dispatch, addAuditLog, isPeriodClosed } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [nomorNota, setNomorNota] = useState('');
  const [supplier, setSupplier] = useState('');
  const [gudangId, setGudangId] = useState(state.gudang[0]?.id || '');
  const [catatan, setCatatan] = useState('');
  const [items, setItems] = useState<PembelianItem[]>([]);
  const [filterPeriode, setFilterPeriode] = useState('');

  const addItem = () => {
    setItems([...items, {
      barangId: '', quantity: 0, satuan: '', quantityDasar: 0,
      hargaSatuan: 0, diskon: 0, subtotal: 0,
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    if (field === 'barangId') {
      const barang = state.barang.find(b => b.id === value);
      if (barang) {
        newItems[index].satuan = barang.satuanPembelian;
        newItems[index].hargaSatuan = barang.hargaTerakhir;
      }
    }
    
    if (field === 'quantity' || field === 'barangId') {
      const barang = state.barang.find(b => b.id === newItems[index].barangId);
      if (barang) {
        const konv = barang.konversi.find(k => k.fromUnit === newItems[index].satuan);
        if (konv) {
          newItems[index].quantityDasar = newItems[index].quantity * konv.factor;
        } else {
          newItems[index].quantityDasar = newItems[index].quantity;
        }
      }
    }
    
    newItems[index].subtotal = newItems[index].quantity * newItems[index].hargaSatuan - newItems[index].diskon;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAll = items.reduce((sum, i) => sum + i.subtotal, 0);

  const savePembelian = () => {
    if (!nomorNota || !supplier || items.length === 0) {
      alert('Lengkapi data pembelian!');
      return;
    }
    const periode = tanggal.substring(0, 7);
    if (isPeriodClosed(periode, gudangId)) {
      alert('Periode ini sudah ditutup!');
      return;
    }
    const now = new Date().toISOString();
    const pembelian = {
      id: 'pb-' + Date.now(),
      tanggal,
      nomorNota,
      supplier,
      gudangId,
      items,
      totalDiskon: items.reduce((s, i) => s + i.diskon, 0),
      pajak: 0,
      total: totalAll,
      catatan,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
      createdBy: state.currentUser.nama,
    };
    dispatch({ type: 'ADD_PEMBELIAN', payload: pembelian });
    addAuditLog('CREATE', 'pembelian', pembelian.id, null, pembelian);

    // Update stock snapshots
    items.forEach(item => {
      const barang = state.barang.find(b => b.id === item.barangId);
      if (barang) {
        dispatch({
          type: 'ADD_STOCK_SNAPSHOT',
          payload: {
            barangId: item.barangId,
            gudangId: gudangId,
            periode: periode,
            quantity: item.quantityDasar,
            nilaiTotal: item.subtotal,
            hargaRataRata: item.hargaSatuan,
            tanggal: tanggal,
          }
        });
      }
    });

    // Reset form
    setShowForm(false);
    setNomorNota('');
    setSupplier('');
    setItems([]);
    setCatatan('');
    alert('Pembelian berhasil disimpan!');
  };

  const voidPembelian = (id: string) => {
    if (confirm('Void nota ini? Data tidak akan dihapus permanen.')) {
      dispatch({ type: 'VOID_PEMBELIAN', payload: id });
      addAuditLog('VOID', 'pembelian', id);
    }
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const filteredPembelian = state.pembelian
    .filter(p => !filterPeriode || p.tanggal.startsWith(filterPeriode))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pembelian</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Input Nota Baru
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <input type="month" value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => setFilterPeriode('')} className="text-sm text-blue-600 hover:underline">Reset</button>
      </div>

      {/* Purchase List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredPembelian.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Belum ada data pembelian</p>
            <p className="text-sm mt-1">Klik "Input Nota Baru" untuk menambahkan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPembelian.map(p => (
              <div key={p.id} className={`p-4 ${p.status === 'void' ? 'opacity-50 bg-red-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{p.nomorNota}</span>
                      {p.status === 'void' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">VOID</span>}
                    </div>
                    <p className="text-sm text-gray-500">{p.tanggal} • {p.supplier} • {state.gudang.find(g => g.id === p.gudangId)?.nama}</p>
                    <p className="text-sm text-gray-600 mt-1">{p.items.length} item • {p.items.map(i => state.barang.find(b => b.id === i.barangId)?.nama).join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatRupiah(p.total)}</p>
                    {p.status === 'active' && (
                      <button onClick={() => voidPembelian(p.id)} className="text-xs text-red-500 hover:underline mt-1">Void</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Input Nota Pembelian</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Nota *</label>
                <input type="text" value={nomorNota} onChange={e => setNomorNota(e.target.value)} placeholder="NOTA-001" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Nama supplier" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
                <select value={gudangId} onChange={e => setGudangId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {state.gudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <input type="text" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Catatan tambahan" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Items */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Barang</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Qty</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Satuan</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Harga</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Diskon</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <select value={item.barangId} onChange={e => updateItem(index, 'barangId', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                          <option value="">Pilih barang</option>
                          {state.barang.filter(b => b.statusAktif).map(b => (
                            <option key={b.id} value={b.id}>{b.nama}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-right text-sm" />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.satuan}</td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.hargaSatuan} onChange={e => updateItem(index, 'hargaSatuan', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-right text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.diskon} onChange={e => updateItem(index, 'diskon', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-right text-sm" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(index)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
              <Plus className="w-4 h-4" /> Tambah Item
            </button>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-lg font-bold">TOTAL: {formatRupiah(totalAll)}</div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
                <button onClick={savePembelian} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  <Save className="w-4 h-4" /> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
