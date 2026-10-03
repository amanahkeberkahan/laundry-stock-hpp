import React from 'react';
import { useApp } from '../store';
import { useBooks } from '../books';
import { inventoryCheck, monthEnd } from '../lib/accounting';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { state, dispatch, getCurrentStock } = useApp();
  const {book}=useBooks();
  const periode = state.selectedPeriode;

  // Calculate dashboard metrics
  const getStockAwalTotal = () => {
    // Stock awal = stock akhir bulan sebelumnya (we don't have Aug data, so show N/A)
    if(book){const d=new Date(periode+'-01T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return inventoryCheck(book,d.toISOString().slice(0,10)).stock;}
    return null;
  };

  const getPembelianTotal = () => {
    return state.pembelian
      .filter(p => p.status === 'active' && p.tanggal.startsWith(periode))
      .reduce((sum, p) => sum + p.total, 0);
  };

  const getStockAkhirTotal = () => {
    if(book)return inventoryCheck(book,monthEnd(periode)).stock;
    const snapshots = state.stockSnapshots.filter(s => s.periode === periode);
    return snapshots.reduce((sum, s) => sum + s.nilaiTotal, 0);
  };

  const getItemsHabis = () => {
    return state.barang.filter(b => {
      const stock = getCurrentStock(b.id, b.lokasiGudang);
      return stock !== null && stock === 0;
    });
  };

  const getItemsMenipis = () => {
    return state.barang.filter(b => {
      const stock = getCurrentStock(b.id, b.lokasiGudang);
      return stock !== null && stock > 0 && stock <= b.minimumStock;
    });
  };

  const getPembelianCount = () => {
    return state.pembelian.filter(p => p.status === 'active' && p.tanggal.startsWith(periode)).length;
  };

  const itemsHabis = getItemsHabis();
  const itemsMenipis = getItemsMenipis();
  const stockAkhirTotal = getStockAkhirTotal();
  const pembelianTotal = getPembelianTotal();
  const pembelianCount = getPembelianCount();

  // Chart data - stock by category
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    state.stockSnapshots.filter(s => s.periode === periode).forEach(s => {
      const barang = state.barang.find(b => b.id === s.barangId);
      if (barang) {
        categories[barang.kategori] = (categories[barang.kategori] || 0) + s.nilaiTotal;
      }
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [state.stockSnapshots, state.barang, periode]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  // Top items by stock value
  const topItemsByValue = React.useMemo(() => {
    return state.stockSnapshots
      .filter(s => s.periode === periode && s.nilaiTotal > 0)
      .sort((a, b) => b.nilaiTotal - a.nilaiTotal)
      .slice(0, 10)
      .map(s => {
        const barang = state.barang.find(b => b.id === s.barangId);
        return { name: barang?.nama || s.barangId, value: s.nilaiTotal };
      });
  }, [state.stockSnapshots, state.barang, periode]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const stockAwalTotal = getStockAwalTotal();
  const usageTotal=book?book.movements.filter(m=>m.type==='usage'&&m.date.startsWith(periode)).reduce((s,m)=>s+m.outValue,0):null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Periode: {periode}</p>
        </div>
        <select
          value={periode}
          onChange={(e) => dispatch({ type: 'SET_SELECTED_PERIODE', payload: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="2026-09">September 2026</option>
          <option value="2026-08">Agustus 2026</option>
        </select>
      </div>

      {/* HPP Status Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="font-semibold text-yellow-800">{book?'HPP BAHAN TERINTEGRASI':'HPP BELUM SIAP DIHITUNG'}</span>
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          <span className={stockAwalTotal === null ? 'text-red-600' : 'text-green-600'}>
            Stock Awal {stockAwalTotal === null ? '❌' : '✅'}
          </span>
          <span className={!book&&pembelianCount === 0 ? 'text-red-600' : 'text-green-600'}>
            Pembelian {!book&&pembelianCount === 0 ? '❌' : '✅'}
          </span>
          <span className="text-green-600">
            Stock Akhir ✅
          </span>
        </div>
        <p className="mt-1 text-xs text-yellow-700">
          {book?'HPP bahan dihitung dari mutasi pemakaian dengan moving average. Verifikasi saldo awal sebelum laporan final.':'Data stock awal belum tersedia. Aktifkan buku terintegrasi untuk HPP berdasarkan mutasi pemakaian.'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Stock Awal</p>
              <p className="text-lg font-bold text-gray-900">
                {stockAwalTotal === null ? 'N/A' : formatRupiah(stockAwalTotal)}
              </p>
              {stockAwalTotal === null && <p className="text-xs text-red-500">Data belum tersedia</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Pembelian</p>
              <p className="text-lg font-bold text-gray-900">
                {pembelianCount === 0 ? 'N/A' : formatRupiah(pembelianTotal)}
              </p>
              {pembelianCount === 0 && <p className="text-xs text-gray-500">Belum ada nota</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Stock Akhir</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(stockAkhirTotal)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Estimasi HPP</p>
              <p className="text-lg font-bold text-gray-900">{usageTotal===null?'N/A':formatRupiah(usageTotal)}</p>
              <p className="text-xs text-gray-500">{book?'Pemakaian tercatat':'Menunggu aktivasi buku'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-800">Stock Habis ({itemsHabis.length})</h3>
          </div>
          {itemsHabis.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada barang habis</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {itemsHabis.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{b.nama}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">HABIS</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-yellow-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-yellow-800">Stock Menipis ({itemsMenipis.length})</h3>
          </div>
          {itemsMenipis.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada barang menipis</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {itemsMenipis.map(b => {
                const stock = getCurrentStock(b.id, b.lokasiGudang);
                return (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{b.nama}</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                      {stock} {b.satuanDasar}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Nilai Stock per Kategori</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatRupiah(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
              Tidak ada data stock
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Top 10 Barang (Nilai Stock)</h3>
          {topItemsByValue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topItemsByValue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}jt`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatRupiah(value)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
              Tidak ada data stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
