import React, { useState } from 'react';
import { useApp } from '../store';
import { StockOpnameItem } from '../types';
import { ClipboardCheck, Save, AlertTriangle } from 'lucide-react';

export default function StockOpnamePage() {
  const { state, dispatch, addAuditLog, getCurrentStock, isPeriodClosed } = useApp();
  const [selectedGudang, setSelectedGudang] = useState(state.gudang[0]?.id || '');
  const [selectedPeriode, setSelectedPeriode] = useState('2026-09');
  const [petugas, setPetugas] = useState('');
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const gudangBarang = state.barang.filter(b => b.lokasiGudang === selectedGudang && b.statusAktif);

  const startOpname = () => {
    const existingItems: StockOpnameItem[] = gudangBarang.map(b => {
      const currentStock = getCurrentStock(b.id, selectedGudang);
      return {
        barangId: b.id,
        stockSistem: currentStock ?? 0,
        stockFisik: currentStock ?? 0,
        selisih: 0,
        catatan: '',
      };
    });
    setItems(existingItems);
    setIsEditing(true);
  };

  const updateItem = (index: number, field: keyof StockOpnameItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === 'stockFisik') {
      newItems[index].selisih = value - newItems[index].stockSistem;
    }
    setItems(newItems);
  };

  const saveOpname = () => {
    if (!petugas) {
      alert('Masukkan nama petugas!');
      return;
    }
    const now = new Date().toISOString();
    const opname = {
      id: 'so-' + Date.now(),
      periode: selectedPeriode,
      tanggal: now.split('T')[0],
      gudangId: selectedGudang,
      petugas,
      items,
      status: 'finalized' as const,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_STOCK_OPNAME', payload: opname });
    addAuditLog('CREATE', 'stock_opname', opname.id, null, opname);

    // Update stock snapshots
    items.forEach(item => {
      const barang = state.barang.find(b => b.id === item.barangId);
      if (barang) {
        dispatch({
          type: 'ADD_STOCK_SNAPSHOT',
          payload: {
            barangId: item.barangId,
            gudangId: selectedGudang,
            periode: selectedPeriode,
            quantity: item.stockFisik,
            nilaiTotal: item.stockFisik * barang.hargaRataRata,
            hargaRataRata: barang.hargaRataRata,
            tanggal: now.split('T')[0],
          }
        });
      }
    });

    setIsEditing(false);
    alert('Stock Opname berhasil disimpan!');
  };

  const getSelisihColor = (selisih: number, stockSistem: number) => {
    if (selisih === 0) return 'bg-green-50 text-green-700';
    if (Math.abs(selisih) <= Math.max(stockSistem * 0.05, 1)) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  };

  const closed = isPeriodClosed(selectedPeriode, selectedGudang);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock Opname</h1>
        <ClipboardCheck className="w-6 h-6 text-blue-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
            <input type="month" value={selectedPeriode} onChange={e => setSelectedPeriode(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
            <select value={selectedGudang} onChange={e => setSelectedGudang(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {state.gudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Petugas</label>
            <input type="text" value={petugas} onChange={e => setPetugas(e.target.value)} placeholder="Nama petugas" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            {!isEditing ? (
              <button onClick={startOpname} disabled={closed} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {closed ? 'Periode Ditutup' : 'Mulai Stock Opname'}
              </button>
            ) : (
              <button onClick={saveOpname} className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
            )}
          </div>
        </div>
      </div>

      {closed && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 text-sm">Periode ini sudah ditutup. Tidak dapat melakukan stock opname.</span>
        </div>
      )}

      {/* Stock Opname Table */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Barang</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Satuan</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Stock Sistem</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Stock Fisik</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Selisih</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => {
                  const barang = state.barang.find(b => b.id === item.barangId);
                  return (
                    <tr key={item.barangId}>
                      <td className="px-4 py-2 font-medium text-gray-900">{barang?.nama}</td>
                      <td className="px-4 py-2 text-gray-600">{barang?.satuanDasar}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{item.stockSistem}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={item.stockFisik}
                          onChange={e => updateItem(index, 'stockFisik', Number(e.target.value))}
                          className="w-20 border rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className={`px-4 py-2 text-right font-medium ${getSelisihColor(item.selisih, item.stockSistem)}`}>
                        {item.selisih > 0 ? '+' : ''}{item.selisih}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.catatan}
                          onChange={e => updateItem(index, 'catatan', e.target.value)}
                          placeholder="Catatan..."
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500 flex justify-between">
            <span>Total: {items.length} barang</span>
            <span>Selisih: {items.filter(i => i.selisih !== 0).length} item</span>
          </div>
        </div>
      )}

      {/* Previous Opname History */}
      {!isEditing && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Riwayat Stock Opname</h3>
          {state.stockOpname.filter(so => so.gudangId === selectedGudang).length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada riwayat stock opname</p>
          ) : (
            <div className="space-y-2">
              {state.stockOpname
                .filter(so => so.gudangId === selectedGudang)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                .map(so => (
                  <div key={so.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{so.periode}</span>
                      <span className="text-gray-500 text-sm ml-2">- {so.tanggal}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Petugas: {so.petugas}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${so.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {so.status === 'finalized' ? 'Finalized' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
