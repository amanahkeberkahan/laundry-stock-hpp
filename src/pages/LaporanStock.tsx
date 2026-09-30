import React, { useState } from 'react';
import { useApp } from '../store';
import { Package } from 'lucide-react';

export default function LaporanStockPage() {
  const { state, getCurrentStock } = useApp();
  const [selectedGudang, setSelectedGudang] = useState('all');
  const [filterKategori, setFilterKategori] = useState('');

  const formatNumber = (val: number) => new Intl.NumberFormat('id-ID').format(val);
  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const getStockData = () => {
    return state.barang.filter(b => b.statusAktif && (!filterKategori || b.kategori === filterKategori)).map(b => {
      const stockByGudang: Record<string, number | null> = {};
      let totalStock = 0;
      let hasData = false;

      state.gudang.forEach(g => {
        const stock = getCurrentStock(b.id, g.id);
        stockByGudang[g.id] = stock;
        if (stock !== null) {
          totalStock += stock;
          hasData = true;
        }
      });

      const status = !hasData ? 'no-data' : totalStock === 0 ? 'habis' : totalStock <= b.minimumStock ? 'menipis' : 'aman';

      return {
        ...b,
        stockByGudang,
        totalStock: hasData ? totalStock : null,
        status,
      };
    });
  };

  const data = getStockData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Stock Position</h1>
        <Package className="w-6 h-6 text-blue-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={selectedGudang} onChange={e => setSelectedGudang(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Semua Gudang</option>
          {state.gudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
        <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Semua Kategori</option>
          <option value="Chemical">Chemical</option>
          <option value="Hanger">Hanger</option>
          <option value="Plastik">Plastik</option>
          <option value="ATK">ATK</option>
          <option value="Peralatan">Peralatan</option>
          <option value="Packaging">Packaging</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Barang</p>
          <p className="text-xl font-bold">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase">Stock Aman</p>
          <p className="text-xl font-bold text-green-700">{data.filter(d => d.status === 'aman').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <p className="text-xs text-yellow-600 uppercase">Stock Menipis</p>
          <p className="text-xl font-bold text-yellow-700">{data.filter(d => d.status === 'menipis').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-600 uppercase">Stock Habis</p>
          <p className="text-xl font-bold text-red-700">{data.filter(d => d.status === 'habis').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Barang</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Satuan</th>
                {state.gudang.map(g => (
                  <th key={g.id} className="text-right px-4 py-3 font-medium text-gray-600">{g.nama}</th>
                ))}
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min. Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(d => (
                <tr key={d.id} className={d.status === 'habis' ? 'bg-red-50' : d.status === 'menipis' ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-900">{d.nama}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{d.kategori}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{d.satuanDasar}</td>
                  {state.gudang.map(g => (
                    <td key={g.id} className="px-4 py-2 text-right text-gray-600">
                      {d.stockByGudang[g.id] === null ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        formatNumber(d.stockByGudang[g.id]!)
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium">
                    {d.totalStock === null ? <span className="text-gray-400">-</span> : formatNumber(d.totalStock)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">{d.minimumStock}</td>
                  <td className="px-4 py-2 text-center">
                    {d.status === 'aman' && <span className="text-green-600">🟢 AMAN</span>}
                    {d.status === 'menipis' && <span className="text-yellow-600">🟡 MENIPIS</span>}
                    {d.status === 'habis' && <span className="text-red-600">🔴 HABIS</span>}
                    {d.status === 'no-data' && <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
