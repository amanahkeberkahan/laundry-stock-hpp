import React, { useState } from 'react';
import { useApp } from '../store';
import { Transfer, TransferItem } from '../types';
import { ArrowRightLeft, Plus, Truck, CheckCircle, XCircle, Package } from 'lucide-react';

export default function TransferPage() {
  const { state, dispatch, addAuditLog, getCurrentStock } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [nomorTransfer, setNomorTransfer] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [gudangAsalId, setGudangAsalId] = useState('');
  const [gudangTujuanId, setGudangTujuanId] = useState('');
  const [petugas, setPetugas] = useState('');
  const [catatan, setCatatan] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const addItem = () => {
    setItems([...items, {
      id: 'item-' + Date.now(),
      transferId: '',
      barangId: '',
      quantity: 0,
      satuan: '',
      quantityDasar: 0,
      catatan: '',
      createdAt: '',
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    if (field === 'barangId') {
      const barang = state.barang.find(b => b.id === value);
      if (barang) {
        newItems[index].satuan = barang.satuanDasar;
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
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!nomorTransfer || !gudangAsalId || !gudangTujuanId || !petugas || items.length === 0) {
      alert('Lengkapi semua data transfer!');
      return;
    }

    if (gudangAsalId === gudangTujuanId) {
      alert('Gudang asal dan tujuan tidak boleh sama!');
      return;
    }

    // Check stock availability
    for (const item of items) {
      const currentStock = getCurrentStock(item.barangId, gudangAsalId);
      if (currentStock === null || currentStock < item.quantityDasar) {
        const barang = state.barang.find(b => b.id === item.barangId);
        alert(`Stock ${barang?.nama} di gudang asal tidak mencukupi!`);
        return;
      }
    }

    const now = new Date().toISOString();
    const transfer: Transfer = {
      id: 'trf-' + Date.now(),
      nomorTransfer,
      tanggal,
      gudangAsalId,
      gudangTujuanId,
      petugas,
      status: 'pending',
      items: items.map(item => ({
        ...item,
        transferId: 'trf-' + Date.now(),
        createdAt: now,
      })),
      catatan,
      createdBy: state.currentUser.nama,
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'ADD_TRANSFER', payload: transfer });
    addAuditLog('CREATE', 'transfer', transfer.id, null, transfer);

    // Reset form
    setShowForm(false);
    setNomorTransfer('');
    setGudangAsalId('');
    setGudangTujuanId('');
    setPetugas('');
    setCatatan('');
    setItems([]);

    alert('Transfer berhasil dibuat!');
  };

  const handleComplete = async (transferId: string) => {
    if (!confirm('Selesaikan transfer ini? Stock akan otomatis dipindahkan.')) return;

    const transfer = state.transfers.find(t => t.id === transferId);
    if (!transfer) return;

    // Update stock snapshots
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const periode = today.substring(0, 7);

    for (const item of transfer.items) {
      const barang = state.barang.find(b => b.id === item.barangId);
      if (!barang) continue;

      // Reduce stock at source
      const stockAsal = getCurrentStock(item.barangId, transfer.gudangAsalId);
      if (stockAsal !== null) {
        dispatch({
          type: 'ADD_STOCK_SNAPSHOT',
          payload: {
            barangId: item.barangId,
            gudangId: transfer.gudangAsalId,
            periode,
            quantity: stockAsal - item.quantityDasar,
            nilaiTotal: (stockAsal - item.quantityDasar) * barang.hargaRataRata,
            hargaRataRata: barang.hargaRataRata,
            tanggal: today,
          }
        });
      }

      // Increase stock at destination
      const stockTujuan = getCurrentStock(item.barangId, transfer.gudangTujuanId);
      const newStockTujuan = (stockTujuan || 0) + item.quantityDasar;
      dispatch({
        type: 'ADD_STOCK_SNAPSHOT',
        payload: {
          barangId: item.barangId,
          gudangId: transfer.gudangTujuanId,
          periode,
          quantity: newStockTujuan,
          nilaiTotal: newStockTujuan * barang.hargaRataRata,
          hargaRataRata: barang.hargaRataRata,
          tanggal: today,
        }
      });
    }

    dispatch({
      type: 'UPDATE_TRANSFER',
      payload: { ...transfer, status: 'completed', updatedAt: now }
    });

    addAuditLog('COMPLETE', 'transfer', transferId, { status: transfer.status }, { status: 'completed' });
    alert('Transfer berhasil diselesaikan!');
  };

  const handleCancel = (transferId: string) => {
    if (!confirm('Batalkan transfer ini?')) return;

    const transfer = state.transfers.find(t => t.id === transferId);
    if (!transfer) return;

    dispatch({
      type: 'UPDATE_TRANSFER',
      payload: { ...transfer, status: 'cancelled', updatedAt: new Date().toISOString() }
    });

    addAuditLog('CANCEL', 'transfer', transferId, { status: transfer.status }, { status: 'cancelled' });
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_transit': return 'Dalam Perjalanan';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const filteredTransfers = state.transfers.filter(t => 
    filterStatus === 'all' || t.status === filterStatus
  );

  const getGudangName = (id: string) => state.gudang.find(g => g.id === id)?.nama || '-';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transfer Antar Gudang</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Buat Transfer
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="in_transit">Dalam Perjalanan</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {/* Transfer List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredTransfers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Belum ada data transfer</p>
            <p className="text-sm mt-1">Klik "Buat Transfer" untuk memulai</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTransfers.map(transfer => (
              <div key={transfer.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{transfer.nomorTransfer}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(transfer.status)}`}>
                        {getStatusLabel(transfer.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {transfer.tanggal} • Petugas: {transfer.petugas}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">{getGudangName(transfer.gudangAsalId)}</span>
                      <ArrowRightLeft className="w-4 h-4 inline mx-2 text-blue-500" />
                      <span className="font-medium">{getGudangName(transfer.gudangTujuanId)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {transfer.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleComplete(transfer.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3" /> Selesaikan
                        </button>
                        <button
                          onClick={() => handleCancel(transfer.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                        >
                          <XCircle className="w-3 h-3" /> Batalkan
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Item Transfer ({transfer.items.length})</p>
                  <div className="space-y-1">
                    {transfer.items.map((item, idx) => {
                      const barang = state.barang.find(b => b.id === item.barangId);
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{barang?.nama || item.barangId}</span>
                          <span className="text-gray-600">{formatNumber(item.quantity)} {item.satuan}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {transfer.catatan && (
                  <p className="text-xs text-gray-500 mt-2 italic">Catatan: {transfer.catatan}</p>
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
              <h2 className="text-lg font-bold">Buat Transfer Baru</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Transfer *</label>
                <input
                  type="text"
                  value={nomorTransfer}
                  onChange={(e) => setNomorTransfer(e.target.value)}
                  placeholder="TRF-001"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Gudang Asal *</label>
                <select
                  value={gudangAsalId}
                  onChange={(e) => setGudangAsalId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Pilih gudang asal</option>
                  {state.gudang.map(g => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gudang Tujuan *</label>
                <select
                  value={gudangTujuanId}
                  onChange={(e) => setGudangTujuanId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Pilih gudang tujuan</option>
                  {state.gudang.filter(g => g.id !== gudangAsalId).map(g => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
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
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Qty</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Satuan</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Catatan</th>
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
                          {state.barang.filter(b => b.statusAktif).map(b => {
                            const stock = getCurrentStock(b.id, gudangAsalId);
                            return (
                              <option key={b.id} value={b.id}>
                                {b.nama} (Stock: {stock ?? 'N/A'})
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.satuan}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.catatan}
                          onChange={(e) => updateItem(index, 'catatan', e.target.value)}
                          placeholder="Catatan"
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
                Simpan Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
