import React, { useState } from 'react';
import { useApp } from '../store';
import { useBooks } from '../books';
import { stockBalance, monthEnd } from '../lib/accounting';
import { FileDown, AlertCircle } from 'lucide-react';

export default function LaporanHPPPage() {
  const { state } = useApp();
  const {book}=useBooks();
  const [selectedPeriode, setSelectedPeriode] = useState(state.selectedPeriode);
  const [selectedGudang, setSelectedGudang] = useState('all');
  const [selectedKategori, setSelectedKategori] = useState('');

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  // Get stock data for the period
  const getHPPData = () => {
    const gudangIds = selectedGudang === 'all' ? state.gudang.map(g => g.id) : [selectedGudang];
    const results: any[] = [];

    const barangList = state.barang.filter(b => b.statusAktif && (!selectedKategori || b.kategori === selectedKategori));

    barangList.forEach(barang => {
      gudangIds.forEach(gudangId => {
        if(book){
          const from=selectedPeriode+'-01',to=monthEnd(selectedPeriode),d=new Date(from+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);
          const opening=stockBalance(book,barang.id,gudangId,d.toISOString().slice(0,10)),closing=stockBalance(book,barang.id,gudangId,to);
          const movements=book.movements.filter(m=>m.itemId===barang.id&&m.warehouseId===gudangId&&m.date>=from&&m.date<=to);
          const usage=movements.filter(m=>m.type==='usage'),purchases=movements.filter(m=>m.type==='purchase'),ready=to>=book.cutoff;
          results.push({barangId:barang.id,namaBarang:barang.nama,kategori:barang.kategori,gudangId,gudangNama:state.gudang.find(g=>g.id===gudangId)?.nama||'',satuan:barang.satuanDasar,stockAwal:ready?(opening?.balance??0):null,pembelian:ready?purchases.reduce((s,m)=>s+m.inQty,0):null,stockAkhir:ready?(closing?.balance??0):null,pemakaian:ready?usage.reduce((s,m)=>s+m.outQty,0):null,hargaRataRata:closing?.average??0,nilaiStockAkhir:ready?(closing?.valueBalance??0):null,nilaiHPP:ready?usage.reduce((s,m)=>s+m.outValue,0):null,status:ready?'ready':'incomplete',missingComponents:ready?[]:['Periode sebelum awal buku']});
          return;
        }
        // Stock Akhir for this period
        const stockAkhirSnap = state.stockSnapshots
          .filter(s => s.barangId === barang.id && s.gudangId === gudangId && s.periode === selectedPeriode)
          .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];

        // Pembelian for this period
        const pembelianItems = state.pembelian
          .filter(p => p.gudangId === gudangId && p.status === 'active' && p.tanggal.startsWith(selectedPeriode))
          .flatMap(p => p.items.filter(i => i.barangId === barang.id));

        const totalPembelian = pembelianItems.reduce((sum, i) => sum + i.quantityDasar, 0);
        const totalNilaiPembelian = pembelianItems.reduce((sum, i) => sum + i.subtotal, 0);

        // Stock Awal = previous period stock akhir (we don't have it for this demo)
        const hasStockAkhir = stockAkhirSnap !== undefined;
        const hasPembelian = pembelianItems.length > 0;
        const hasStockAwal = false; // We don't have August data

        const stockAkhir = hasStockAkhir ? stockAkhirSnap.quantity : null;
        const pembelian = hasPembelian ? totalPembelian : null;

        const missingComponents: string[] = [];
        if (!hasStockAwal) missingComponents.push('Stock Awal');
        if (!hasPembelian) missingComponents.push('Pembelian');
        if (!hasStockAkhir) missingComponents.push('Stock Akhir');

        const status = missingComponents.length === 0 ? 'ready' : 'incomplete';
        const pemakaian = (hasStockAwal && hasPembelian && hasStockAkhir) ? null : null; // Can't calculate without stock awal
        const nilaiHPP = null;

        results.push({
          barangId: barang.id,
          namaBarang: barang.nama,
          kategori: barang.kategori,
          gudangId,
          gudangNama: state.gudang.find(g => g.id === gudangId)?.nama || '',
          satuan: barang.satuanDasar,
          stockAwal: null, // N/A
          pembelian,
          stockAkhir,
          pemakaian,
          hargaRataRata: barang.hargaRataRata,
          nilaiStockAkhir: hasStockAkhir ? stockAkhirSnap.nilaiTotal : null,
          nilaiHPP,
          status,
          missingComponents,
        });
      });
    });

    return results;
  };

  const data = getHPPData();

  const totalStockAkhir = data.reduce((sum, d) => sum + (d.nilaiStockAkhir || 0), 0);

  const exportCSV = () => {
    const headers = ['Barang', 'Kategori', 'Gudang', 'Satuan', 'Stock Awal', 'Pembelian', 'Stock Akhir', 'Pemakaian', 'Harga Rata-rata', 'Nilai HPP', 'Status'];
    const rows = data.map(d => [
      d.namaBarang, d.kategori, d.gudangNama, d.satuan,
      d.stockAwal === null ? 'N/A' : d.stockAwal,
      d.pembelian === null ? 'N/A' : d.pembelian,
      d.stockAkhir === null ? 'N/A' : d.stockAkhir,
      d.pemakaian === null ? 'N/A' : d.pemakaian,
      d.hargaRataRata,
      d.nilaiHPP === null ? 'N/A' : d.nilaiHPP,
      d.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_HPP_${selectedPeriode}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan HPP Bulanan</h1>
          <p className="text-sm text-gray-500">Periode: {selectedPeriode}</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {book&&<p className="bg-blue-50 p-4 rounded-xl text-sm">HPP bahan berasal dari mutasi pemakaian (moving average). Opname, transfer, dan adjustment tercatat terpisah di Kartu Stok.</p>}
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="month" value={selectedPeriode} onChange={e => setSelectedPeriode(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={selectedGudang} onChange={e => setSelectedGudang(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Semua Gudang</option>
          {state.gudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
        <select value={selectedKategori} onChange={e => setSelectedKategori(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
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

      {/* HPP Status */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="font-semibold text-yellow-800">HPP BELUM SIAP DIHITUNG</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Stock Awal belum tersedia untuk periode ini. Pemakaian = Stock Awal + Pembelian − Stock Akhir.
          Data akan lengkap setelah stock opname bulan sebelumnya tersedia.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Stock Akhir</p>
          <p className="text-xl font-bold text-gray-900">{formatRupiah(totalStockAkhir)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Pembelian</p>
          <p className="text-xl font-bold text-gray-900">N/A</p>
          <p className="text-xs text-gray-500">Belum ada nota</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total HPP</p>
          <p className="text-xl font-bold text-gray-900">N/A</p>
          <p className="text-xs text-gray-500">Menunggu data lengkap</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Barang</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Gudang</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock Awal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pembelian</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock Akhir</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pemakaian</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Rata²</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai HPP</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((d, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-medium text-gray-900">{d.namaBarang}</td>
                  <td className="px-4 py-2 text-gray-600">{d.gudangNama}</td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {d.stockAwal === null ? <span className="text-red-500">N/A</span> : formatNumber(d.stockAwal)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {d.pembelian === null ? <span className="text-gray-400">-</span> : formatNumber(d.pembelian)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {d.stockAkhir === null ? <span className="text-red-500">N/A</span> : formatNumber(d.stockAkhir)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {d.pemakaian === null ? <span className="text-gray-400">-</span> : formatNumber(d.pemakaian)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatRupiah(d.hargaRataRata)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {d.nilaiHPP === null ? <span className="text-gray-400">-</span> : formatRupiah(d.nilaiHPP)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {d.status === 'ready' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">✅ Siap</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs" title={d.missingComponents.join(', ')}>
                        ❌ {d.missingComponents.length} komponen
                      </span>
                    )}
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
