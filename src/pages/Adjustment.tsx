import React, { useState } from 'react';
import { useApp } from '../store';
import { useBooks } from '../books';
import { Adjustment, AdjustmentItem } from '../types';
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';

export default function AdjustmentPage() {
  const { state, dispatch, addAuditLog, getCurrentStock } = useApp();
  const {commitAction,busy}=useBooks();
  const [showForm, setShowForm] = useState(false);
  const [nomorAdjustment, setNomorAdjustment] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [gudangId, setGudangId] = useState('');
  const [tipe, setTipe] = useState<'stock_opname' | 'kerusakan' | 'kehilangan' | 'kesalahan_catat' | 'lainnya'>('stock_opname');
  const [petugas, setPetugas] = useState('');
  const [catatan, setCatatan] = useState('');
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipe, setFilterTipe] = useState<string>('all');

  const addItem = () => {
    setItems([...items, {
      id: 'item-' + Date.now(),
      adjustmentId: '',
      barangId: '',
      quantitySebelum: 0,
      quantitySesudah: 0,
      selisih: 0,
      alasan: '',
      catatan: '',
      createdAt: '',
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    // Auto-calculate selisih
    if (field === 'quantitySebelum' || field === 'quantitySesudah') {
      newItems[index].selisih = newItems[index].quantitySesudah - newItems[index].quantitySebelum;
    }
    
    // Auto-fill quantitySebelum when barang selected
    if (field === 'barangId') {
      const currentStock = getCurrentStock(value, gudangId);
      if (currentStock !== null) {
        newItems[index].quantitySebelum = currentStock;
        newItems[index].selisih = newItems[index].quantitySesudah - currentStock;
      }
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!nomorAdjustment || !gudangId || !petugas || items.length === 0) {
      alert('Lengkapi semua data adjustment!');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.barangId || !item.alasan) {
        alert('Lengkapi data barang dan alasan untuk setiap item!');
        return;
      }
    }

    const now = new Date().toISOString();
    const adjustment: Adjustment = {
      id: 'adj-' + Date.now(),
      nomorAdjustment,
      tanggal,
      gudangId,
      tipe,
      status: 'pending',
      petugas,
      items: items.map(item => ({
        ...item,
        adjustmentId: 'adj-' + Date.now(),
        createdAt: now,
      })),
      catatan,
      createdBy: state.currentUser.nama,
      createdAt: now,
      updatedAt: now,
    };

    try { await commitAction({ type: 'ADD_ADJUSTMENT', payload: adjustment }); } catch(e) {alert(e instanceof Error?e.message:'Posting gagal');return;}
    addAuditLog('CREATE', 'adjustment', adjustment.id, null, adjustment);

    // Reset form
    setShowForm(false);
    setNomorAdjustment('');
    setGudangId('');
    setPetugas('');
    setCatatan('');
    setItems([]);

    alert('Adjustment berhasil dibuat! Menunggu persetujuan.');
  };

  const handleApprove = async (adjustmentId: string) => {
    if (!confirm('Setujui adjustment ini? Stock akan disesuaikan.')) return;

    const adjustment = state.adjustments.find(a => a.id === adjustmentId);
    if (!adjustment) return;


    try { await commitAction({
      type: 'APPROVE_ADJUSTMENT',
      payload: { id: adjustmentId, approvedBy: state.currentUser.nama }
    }); } catch(e) {alert(e instanceof Error?e.message:'Posting gagal');return;}

    addAuditLog('APPROVE', 'adjustment', adjustmentId, { status: 'pending' }, { status: 'approved' });
    alert('Adjustment disetujui! Stock sudah disesuaikan.');
  };

  const handleReject = async (adjustmentId: string) => {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;

    try { await commitAction({
      type: 'REJECT_ADJUSTMENT',
      payload: { id: adjustmentId, rejectedBy: state.currentUser.nama, reason }
    }); } catch(e) {alert(e instanceof Error?e.message:'Posting gagal');return;}

    addAuditLog('REJECT', 'adjustment', adjustmentId, { status: 'pending' }, { status: 'rejected', reason });
    alert('Adjustment ditolak.');
  };

  const formatNumber = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu Persetujuan';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  const getTipeLabel = (tipe: string) => {
    switch (tipe) {
      case 'stock_opname': return 'Selisih Stock Opname';
      case 'kerusakan': return 'Kerusakan';
      case 'kehilangan': return 'Kehilangan';
      case 'kesalahan_catat': return 'Kesalahan Catat';
      case 'lainnya': return 'Lainnya';
      default: return tipe;
    }
  };

  const getTipeColor = (tipe: string) => {
    switch (tipe) {
      case 'stock_opname': return 'bg-blue-100 text-blue-700';
      case 'kerusakan': return 'bg-orange-100 text-orange-700';
      case 'kehilangan': return 'bg-red-100 text-red-700';
      case 'kesalahan_catat': return 'bg-purple-100 text-purple-700';
      case 'lainnya': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredAdjustments = state.adjustments.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchTipe = filterTipe === 'all' || a.tipe === filterTipe;
    return matchStatus && matchTipe;
  });

  const getGudangName = (id: string) => state.gudang.find(g => g.id === id)?.nama || '-';

  // Summary stats
  const totalPending = state.adjustments.filter(a => a.status === 'pending').length;
  const totalApproved = state.adjustments.filter(a => a.status === 'approved').length;
  const totalRejected = state.adjustments.filter(a => a.status === 'rejected').length;

  const canApprove = state.currentUser.role === 'admin' || state.currentUser.role === 'finance';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Adjustment Stock</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Buat Adjustment
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">Penting: Adjustment untuk Akurasi HPP</p>
            <p className="text-sm text-blue-700 mt-1">
              Adjustment digunakan untuk memisahkan selisih stock opname dari perhitungan HPP.
              Dengan adjustment, HPP hanya menghitung pemakaian sebenarnya, bukan kehilangan/kerusakan.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Menunggu Persetujuan</p>
              <p className="text-2xl font-bold text-yellow-700">{totalPending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Disetujui</p>
              <p className="text-2xl font-bold text-green-700">{totalApproved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Ditolak</p>
              <p className="text-2xl font-bold text-red-700">{totalRejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu Persetujuan</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
        <select
          value={filterTipe}
          onChange={(e) => setFilterTipe(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Semua Tipe</option>
          <option value="stock_opname">Selisih Stock Opname</option>
          <option value="kerusakan">Kerusakan</option>
          <option value="kehilangan">Kehilangan</option>
          <option value="kesalahan_catat">Kesalahan Catat</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </div>

      {/* Adjustment List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredAdjustments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Belum ada data adjustment</p>
            <p className="text-sm mt-1">Klik "Buat Adjustment" untuk memulai</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAdjustments.map(adjustment => (
              <div key={adjustment.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-gray-900">{adjustment.nomorAdjustment}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(adjustment.status)}`}>
                        {getStatusLabel(adjustment.status)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getTipeColor(adjustment.tipe)}`}>
                        {getTipeLabel(adjustment.tipe)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {adjustment.tanggal} • {getGudangName(adjustment.gudangId)} • Petugas: {adjustment.petugas}
                    </p>
                    {adjustment.disetujuiOleh && (
                      <p className="text-xs text-gray-500 mt-1">
                        {adjustment.status === 'approved' ? 'Disetujui' : 'Ditolak'} oleh: {adjustment.disetujuiOleh}
                      </p>
                    )}
                  </div>
                  {adjustment.status === 'pending' && canApprove && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(adjustment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3" /> Setujui
                      </button>
                      <button
                        onClick={() => handleReject(adjustment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                      >
                        <XCircle className="w-3 h-3" /> Tolak
                      </button>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Item Adjustment ({adjustment.items.length})</p>
                  <div className="space-y-2">
                    {adjustment.items.map((item, idx) => {
                      const barang = state.barang.find(b => b.id === item.barangId);
                      return (
                        <div key={idx} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{barang?.nama || item.barangId}</span>
                            <span className={`font-medium ${item.selisih < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {item.selisih > 0 ? '+' : ''}{formatNumber(item.selisih)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>Sebelum: {formatNumber(item.quantitySebelum)}</span>
                            <span>→</span>
                            <span>Sesudah: {formatNumber(item.quantitySesudah)}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1 italic">
                            Alasan: {item.alasan}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {adjustment.catatan && (
                  <p className="text-xs text-gray-500 mt-2 italic">Catatan: {adjustment.catatan}</p>
                )}
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
              <h2 className="text-lg font-bold">Buat Adjustment Baru</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Perhatian:</strong> Adjustment perlu disetujui oleh Admin/Finance sebelum stock disesuaikan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Adjustment *</label>
                <input
                  type="text"
                  value={nomorAdjustment}
                  onChange={(e) => setNomorAdjustment(e.target.value)}
                  placeholder="ADJ-001"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gudang *</label>
                <select
                  value={gudangId}
                  onChange={(e) => setGudangId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Pilih gudang</option>
                  {state.gudang.map(g => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Adjustment *</label>
                <select
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="stock_opname">Selisih Stock Opname</option>
                  <option value="kerusakan">Kerusakan</option>
                  <option value="kehilangan">Kehilangan</option>
                  <option value="kesalahan_catat">Kesalahan Catat</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Petugas *</label>
                <input
                  type="text"
                  value={petugas}
                  onChange={(e) => setPetugas(e.target.value)}
                  placeholder="Nama petugas"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan tambahan"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Items */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Barang</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Sebelum</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Sesudah</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">Selisih</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Alasan</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <select
                          value={item.barangId}
                          onChange={(e) => updateItem(index, 'barangId', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Pilih barang</option>
                          {state.barang.filter(b => b.statusAktif).map(b => (
                            <option key={b.id} value={b.id}>{b.nama}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantitySebelum}
                          onChange={(e) => updateItem(index, 'quantitySebelum', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantitySesudah}
                          onChange={(e) => updateItem(index, 'quantitySesudah', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${item.selisih < 0 ? 'text-red-600' : item.selisih > 0 ? 'text-green-600' : ''}`}>
                        {item.selisih > 0 ? '+' : ''}{formatNumber(item.selisih)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.alasan}
                          onChange={(e) => updateItem(index, 'alasan', e.target.value)}
                          placeholder="Alasan adjustment"
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(index)} className="p-1 hover:bg-red-50 rounded">
                          <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
              <Plus className="w-4 h-4" /> Tambah Item
            </button>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Simpan Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
