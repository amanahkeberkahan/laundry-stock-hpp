import React, { useState } from 'react';
import { useApp } from '../store';
import { useBooks } from '../books';
import { isSupabaseConfigured } from '../lib/supabase';
import { Warehouse, Lock, Unlock, Settings as SettingsIcon, Upload, Download, RefreshCw } from 'lucide-react';

export function GudangPage() {
  const { state, dispatch, addAuditLog } = useApp();
  const {commitAction}=useBooks();
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');

  const handleSave = async () => {
    if (!nama || !kode) { alert('Lengkapi data gudang!'); return; }
    const gudang = { id: 'gudang-' + Date.now(), nama, kode, alamat: '', statusAktif: true };
    try{await commitAction({type:'ADD_GUDANG',payload:gudang});}catch(e){alert(e instanceof Error?e.message:'Simpan gagal');return;}
    addAuditLog('CREATE', 'gudang', gudang.id, null, gudang);
    setShowForm(false);
    setNama('');
    setKode('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Gudang</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          <Warehouse className="w-4 h-4" /> Tambah Gudang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.gudang.map(g => (
          <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{g.nama}</h3>
                <p className="text-sm text-gray-500">Kode: {g.kode}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {state.barang.filter(b => b.lokasiGudang === g.id && b.statusAktif).length} barang aktif
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${g.statusAktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {g.statusAktif ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Tambah Gudang Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Gudang *</label>
                <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode *</label>
                <input type="text" value={kode} onChange={e => setKode(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClosingPage() {
  const { state, dispatch, addAuditLog, isPeriodClosed } = useApp();
  const {commitAction}=useBooks();
  const [selectedPeriode, setSelectedPeriode] = useState(state.selectedPeriode);
  const [selectedGudang, setSelectedGudang] = useState(state.gudang[0]?.id || '');

  const handleClosing = async () => {
    if (isPeriodClosed(selectedPeriode, selectedGudang)) {
      alert('Periode ini sudah ditutup!');
      return;
    }
    if (!confirm(`Tutup seluruh jurnal dan mutasi perusahaan pada ${selectedPeriode}?\n\nSetelah ditutup, data tidak dapat diubah.`)) return;

    const closing = {
      id: 'close-' + Date.now(),
      periode: selectedPeriode,
      gudangId: selectedGudang,
      closedAt: new Date().toISOString(),
      closedBy: state.currentUser.nama,
      status: 'closed' as const,
    };
    try{await commitAction({type:'CLOSE_PERIOD',payload:closing});}catch(e){alert(e instanceof Error?e.message:'Closing gagal');return;}
    addAuditLog('CLOSE_PERIOD', 'period_closing', closing.id, null, closing);
    alert('Periode ditutup untuk seluruh jurnal perusahaan dan mutasi stok.');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Closing Bulanan</h1>
        <Lock className="w-6 h-6 text-red-600" />
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-700">
          <strong>Peringatan:</strong> Closing mengunci seluruh jurnal dan mutasi stok perusahaan pada bulan terpilih. Stock opname dan pembelian tidak dapat diedit.
          Selesaikan rekonsiliasi dan draft terlebih dahulu. Koreksi memakai periode terbuka melalui Adjustment atau jurnal pembalik.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="flex items-end">
            <button onClick={handleClosing} className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Tutup Periode
            </button>
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-3">Riwayat Closing</h3>
        {state.periodClosings.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada periode yang ditutup</p>
        ) : (
          <div className="space-y-2">
            {state.periodClosings.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{c.periode}</span>
                  <span className="text-gray-500 text-sm ml-2">- {state.gudang.find(g => g.id === c.gudangId)?.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{new Date(c.closedAt).toLocaleDateString('id-ID')}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" /> CLOSED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { state, dispatch } = useApp();
  const {book,exportBackup,restoreBackup}=useBooks();
  const [userName, setUserName] = useState(state.currentUser.nama);
  const [userRole, setUserRole] = useState(state.currentUser.role);

  const handleSaveUser = () => {
    dispatch({type:'SET_USER',payload:{nama:userName,role:isSupabaseConfigured()?state.currentUser.role:userRole as any}});
    alert('Pengaturan disimpan!');
  };

  const handleResetData = () => {
    if(book){alert('Buku aktif harus dipertahankan. Gunakan jurnal koreksi dan backup terintegrasi.');return;}
    if (confirm('Reset semua data ke kondisi awal? Semua data yang sudah diinput akan hilang!')) {
      localStorage.removeItem('laundry-stock-hpp');
      window.location.reload();
    }
  };

  const handleExportData = () => {
    if(book){exportBackup();return;}
    const data = {
      barang: state.barang,
      gudang: state.gudang,
      stockOpname: state.stockOpname,
      pembelian: state.pembelian,
      stockSnapshots: state.stockSnapshots,
      auditLogs: state.auditLogs,
      periodClosings: state.periodClosings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laundry-stock-backup.json';
    a.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(book){alert('Impor stok lama tidak boleh mengganti histori buku aktif. Gunakan transaksi pembelian / saldo awal / penyesuaian.');e.target.value='';return;}
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if(data.books){void restoreBackup(data).then(()=>alert('Backup terintegrasi berhasil dipulihkan.')).catch(e=>alert(e.message));return;}
        dispatch({ type: 'LOAD_DATA', payload: Object.fromEntries(['barang','gudang','stockOpname','pembelian','stockSnapshots','auditLogs','periodClosings'].filter(k=>Array.isArray(data[k])).map(k=>[k,data[k]])) });
        alert('Data berhasil diimport!');
      } catch {
        alert('File tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>

      {/* User Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" /> Profil User
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select disabled={isSupabaseConfigured()} value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="admin">Admin</option>
              <option value="staff_gudang">Staff Gudang</option>
              <option value="finance">Finance</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>
        <button onClick={handleSaveUser} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Simpan</button>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" /> Manajemen Data
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportData} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            <Download className="w-4 h-4" /> Export Backup
          </button>
          <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 cursor-pointer">
            <Upload className="w-4 h-4" /> Import Backup
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
          <button onClick={handleResetData} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
            <RefreshCw className="w-4 h-4" /> Reset Data
          </button>
        </div>
      </div>

      {/* Import CSV */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" /> Import Stock Awal (CSV)
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Format CSV: Gudang, Barang, Qty, Satuan, Tanggal
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 mb-3">
          Gudang,Barang,Qty,Satuan,Tanggal<br/>
          Gudang Jemur,Soft Ungu,37,pcs,2026-09-28<br/>
          Gudang Jemur,Det Biru,38,pcs,2026-09-28
        </div>
        <p className="text-xs text-yellow-600">
          * Fitur import CSV akan memvalidasi data dan menampilkan peringatan jika ada ketidakcocokan.
        </p>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Audit Trail</h2>
        {state.auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada aktivitas tercatat</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {state.auditLogs.slice(-20).reverse().map(log => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <span className="font-medium">{log.action}</span>
                  <span className="text-gray-500 ml-2">{log.entityType} - {log.entityId}</span>
                </div>
                <div className="text-gray-500 text-xs">
                  {log.user} • {new Date(log.timestamp).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
