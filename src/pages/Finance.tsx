import { useEffect, useState } from 'react';
import { useApp } from '../store';
import BankPosting from './BankPosting';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { FinanceData, BankTransaction, money, parseFinance, profit, reconcile } from '../lib/finance';

const titles = { 'finance-transactions': 'Transaksi & Review', 'finance-reconciliation': 'Rekonsiliasi Bank', 'finance-reports': 'Pembanding Draft Excel', 'finance-coa': 'Daftar Akun (COA)' };
type FinancePage = keyof typeof titles;
const box = 'bg-white border border-gray-200 rounded-xl p-4';
const input = 'border rounded-lg px-3 py-2 text-sm bg-white';
function download(data: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export default function Finance({ page }: { page: FinancePage }) {
  const { state } = useApp();
  const cloud = isSupabaseConfigured();
  const [data, setData] = useState<FinanceData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [period, setPeriod] = useState('');
  const [bank, setBank] = useState('all');
  const [query, setQuery] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [provisional, setProvisional] = useState(true);
  const [editing, setEditing] = useState<BankTransaction | null>(null);
  const [offset, setOffset] = useState(0);
  const canEdit = ['admin', 'finance'].includes(state.currentUser.role);
  const canView = ['admin', 'finance', 'owner'].includes(state.currentUser.role);
  async function load() {
    setBusy(true); setError('');
    try {
      if (cloud) {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw Error('Silakan login kembali.');
        const result = await supabase.from('finance_imports').select('payload').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(1);
        if (result.error) throw Error('Data keuangan belum dapat dibaca: '+result.error.message+'. Jalankan supabase/finance_setup.sql jika tabel belum tersedia.');
        setData(result.data?.[0] ? parseFinance(result.data[0].payload) : null);
      } else {
        const saved = localStorage.getItem('laundry-finance-v1');
        setData(saved ? parseFinance(JSON.parse(saved)) : null);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal membaca data.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (canView) void load(); else setBusy(false); }, [cloud, state.currentUser.id, canView]);
  const periods = data ? [...new Set([...data.transactions.flatMap(t => [t.period,t.bankPeriod]), ...data.pos.map(p => p.period)])].sort() : [];
  const activePeriod = periods.includes(period) ? period : periods[periods.length-1] ?? '';
  async function save(next: FinanceData, action: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (!canEdit) throw Error('Hanya admin atau finance yang dapat mengubah data.');
      if (cloud) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw Error('Silakan login kembali.');
        const result = await supabase.from('finance_imports').insert({ user_id: auth.user.id, payload: next, action });
        if (result.error) throw Error('Penyimpanan Supabase gagal: '+result.error.message);
      } else localStorage.setItem('laundry-finance-v1', JSON.stringify(next));
      setData(next); setEditing(null); setOffset(0); setMessage('Tersimpan. '+(cloud ? 'Snapshot baru disimpan di akun Supabase kamu.' : 'Data disimpan di browser ini.'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan.'); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw Error('Ukuran impor maksimal 10 MB.');
      const next = parseFinance(JSON.parse(await file.text()));
      await save(next, `Impor ${file.name}`);
      setPeriod(''); setBank('all'); setQuery('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Impor gagal.'); }
  }
  if (!canView) return <div className={box}>Akses keuangan tersedia untuk admin, finance, dan owner.</div>;
  const rows = data?.transactions.filter(t => (page === 'finance-reconciliation' ? t.bankPeriod : t.period) === activePeriod && (bank === 'all' || t.bank === bank) && (!pendingOnly || t.pending) && `${t.id} ${t.description} ${t.gl} ${t.reference}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const report = data ? profit(data, activePeriod, provisional) : null;
  const controls = data ? reconcile(data, activePeriod) : [];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">{titles[page]}</h1><p className="text-sm text-gray-500">Pradhana Laundry · Pembukuan draft · Seluruh usaha</p></div>
      <div className="flex gap-2 flex-wrap">
        <button disabled={busy} className={input} onClick={() => void load()}>Muat ulang</button>
        {canEdit && <label className={`${input} cursor-pointer text-blue-700`}>Impor pembukuan JSON<input aria-label="Impor pembukuan JSON" className="hidden" type="file" accept=".json" disabled={busy} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>}
        {data && <button className={input} onClick={() => download(JSON.stringify(data,null,2),'backup-keuangan.json','application/json')}>Backup JSON</button>}
      </div>
    </div>
    <div className="bg-blue-50 text-blue-900 border border-blue-100 rounded-xl p-4 text-sm">{cloud ? 'Ruang kerja privat per akun. Impor dan review disimpan sebagai snapshot di Supabase. Akun lain belum berbagi data ini.' : 'Mode lokal: data keuangan disimpan di browser ini. Gunakan Backup JSON sebelum berpindah perangkat.'} Impor mengganti tampilan dataset aktif; impor ulang mengembalikan klasifikasi dari file.</div>
    {error && <div role="alert" className="bg-red-50 text-red-800 rounded-lg p-4">{error}</div>}
    {message && <div role="status" className="bg-green-50 text-green-800 rounded-lg p-4">{message}</div>}
    {busy && <p role="status">Memproses data keuangan…</p>}
    {!data ? <div className={box}><h2 className="font-semibold mb-2">Mulai dari draft pembukuan</h2><p className="text-sm text-gray-600">Impor file finance-import.json hasil konversi workbook. File memuat transaksi bank, COA, saldo sumber, ringkasan POS, dan snapshot neraca. Panduan tersedia di PANDUAN_KEUANGAN.md.</p></div> : <>
      <div className="flex flex-wrap gap-3 items-center"><label className="text-sm">Periode <select aria-label="Periode keuangan" className={input} value={activePeriod} onChange={e => {setPeriod(e.target.value);setOffset(0);}}>{periods.map(p => <option key={p}>{p}</option>)}</select></label><span className="text-xs text-gray-500">Sumber: {data.source}. Filter gudang di header berlaku untuk persediaan.</span></div>
      {page === 'finance-coa' && <div className={`${box} overflow-x-auto`}><table className="w-full text-sm text-left"><thead><tr>{['Akun','Laporan','Kelompok','Saldo normal'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{data.coa.map(c => <tr key={c.code} className="border-t"><td className="p-2">{c.code}</td><td>{c.report}</td><td>{c.group}</td><td>{c.normal}</td></tr>)}</tbody></table></div>}
      {page === 'finance-reconciliation' && <>
        <BankPosting data={data} period={activePeriod} />
        <p className="text-sm text-gray-600">Kontrol kelengkapan mutasi: saldo awal + kredit masuk − debit keluar = saldo akhir rekening koran. Menggunakan bulan rekening, termasuk transaksi pending dan transfer.</p>
        <div className="grid gap-4 md:grid-cols-2">{controls.map(c => <div key={c.bank} className={box}><h2 className="font-semibold mb-3">Bank {c.bank}</h2>{[['Saldo awal sumber',c.opening],['Uang masuk',c.credit],['Uang keluar',c.debit],['Saldo akhir hitung',c.computed],['Saldo akhir sumber',c.closing],['Selisih',c.difference]].map(([label,n]) => <div key={String(label)} className="flex justify-between gap-3 py-1 text-sm"><span>{label}</span><span>{money(n as number|null)}</span></div>)}<p className={`mt-3 font-medium ${c.difference === 0 ? 'text-green-700':'text-amber-700'}`}>{c.difference === null ? 'Belum ada kontrol saldo' : c.difference === 0 ? 'Saldo mutasi cocok' : 'Selisih perlu diperiksa'}</p></div>)}</div>
        <div className={box}><h2 className="font-semibold">Kontrol penerimaan POS</h2><p className="text-sm mt-2">Pendapatan bank {money(report?.bankRevenue)} · Non-tunai POS {money(report?.pos?.noncash)} · Selisih {money(report?.pos ? report.bankRevenue-report.pos.noncash : null)}</p><p className="text-xs text-gray-500 mt-2">Selisih dapat berasal dari waktu settlement, biaya, atau piutang. Saldo cocok belum membuktikan pencocokan setiap transaksi dengan POS/buku besar.</p></div>
      </>}
      {page === 'finance-reports' && report && <>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={provisional} onChange={e => setProvisional(e.target.checked)} />Sertakan transaksi pending/provisional sesuai formula draft Excel</label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Pendapatan jasa',report.revenue],['HPP teridentifikasi',report.hpp],['Beban operasional',report.expenses],['Laba bersih sementara',report.net]].map(([label,n]) => <div key={String(label)} className={box}><p className="text-sm text-gray-500">{label}</p><p className="text-xl font-semibold mt-2">{money(n as number)}</p></div>)}</div>
        <div className="bg-amber-50 text-amber-900 rounded-xl p-4 text-sm">{data.transactions.filter(t => t.period === activePeriod && t.pending).length} transaksi perlu review. Draft Excel memasukkan semua akun yang terpetakan meskipun pending. Matikan opsi provisional untuk mengeluarkan pending dan akun 5999. Pendapatan jasa ditambatkan ke neto POS; penyesuaian POS mencakup tunai dan selisih timing. HPP di sini mengikuti klasifikasi bank draft dan belum terhubung otomatis dengan HPP persediaan.</div>
        <div className={box}><div className="flex justify-between"><h2 className="font-semibold">Laba rugi draft</h2><button className={input} onClick={() => download(['Akun,Kelompok,Nilai',...report.lines.map(l => `"${l.code.replaceAll('"','""')}","${l.group}",${l.amount ?? ''}`)].join('\r\n'),`laba-rugi-${activePeriod}.csv`,'text/csv;charset=utf-8')}>Export CSV</button></div>{report.lines.map(l => <div key={l.code} className="flex justify-between gap-4 border-b py-2 text-sm"><span>{l.code}</span><span className="whitespace-nowrap">{money(l.amount)}</span></div>)}</div>
        <div className={box}><h2 className="font-semibold">Neraca draft dari Excel (snapshot)</h2><p className="text-sm text-amber-800 my-3">Snapshot asli, tidak berubah saat review transaksi. Kas fisik, persediaan, aset tetap, utang, dan modal historis belum lengkap. Akun PLUG menampung saldo yang belum teridentifikasi.</p>{data.balanceSnapshot.map((l,i) => <div key={i} className="flex justify-between gap-4 py-2 border-b text-sm"><span>{l.label}</span><span className="whitespace-nowrap">{money(l.values[activePeriod])}</span></div>)}</div>
      </>}
      {(page === 'finance-transactions' || page === 'finance-reconciliation') && <div className={box}>
        <div className="flex gap-3 flex-wrap mb-4"><input className={input} aria-label="Cari transaksi" placeholder="Cari uraian, akun, referensi…" value={query} onChange={e => {setQuery(e.target.value);setOffset(0);}}/><select aria-label="Filter bank" className={input} value={bank} onChange={e => {setBank(e.target.value);setOffset(0);}}><option value="all">Semua bank</option>{[...new Set(data.transactions.map(t => t.bank))].map(b => <option key={b}>{b}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pendingOnly} onChange={e => {setPendingOnly(e.target.checked);setOffset(0);}}/>Perlu review</label></div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Tanggal / ID','Bank','Uraian / sumber','Keluar','Masuk','Akun / review'].map(h => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.slice(offset,offset+50).map(t => <tr key={t.id} className="border-t align-top"><td className="p-2 whitespace-nowrap">{t.date}<br/><span className="text-xs text-gray-500">{t.id}</span></td><td className="p-2">{t.bank}<br/><span className="text-xs">••••{t.account.slice(-4)}</span></td><td className="p-2 min-w-64">{t.description}<details className="text-xs text-gray-500"><summary>Sumber</summary>{t.source}, halaman {t.page ?? '—'}<br/>Ref: {t.reference}<br/>Periode akuntansi: {t.period}<br/>{t.note}</details></td><td className="p-2 whitespace-nowrap">{money(t.debit)}</td><td className="p-2 whitespace-nowrap">{money(t.credit)}</td><td className="p-2 min-w-48">{t.gl}<p className={t.pending ? 'text-amber-700':'text-gray-500'}>{t.pending ? 'Perlu review':'Terklasifikasi'}</p>{canEdit && <button disabled={busy} className="text-blue-700 underline" onClick={() => setEditing({...t})}>Review</button>}</td></tr>)}</tbody></table></div>
        <div className="flex justify-between items-center mt-4 text-sm"><span>{rows.length} transaksi · {rows.length ? offset+1 : 0}–{Math.min(offset+50,rows.length)}</span><div className="flex gap-2"><button className={input} disabled={offset === 0} onClick={() => setOffset(Math.max(0,offset-50))}>Sebelumnya</button><button className={input} disabled={offset+50 >= rows.length} onClick={() => setOffset(offset+50)}>Berikutnya</button></div></div>
      </div>}
    </>}
    {editing && data && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><form aria-label="Review transaksi" className={`${box} w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto`} onSubmit={e => { e.preventDefault(); void save({...data,transactions:data.transactions.map(t => t.id === editing.id ? editing : t)},`Review ${editing.id}: ${editing.note}`); }}><h2 className="font-semibold">Review {editing.id}</h2><p className="text-sm">{editing.description}</p><label className="block text-sm">Akun GL<select required className={`${input} w-full`} value={editing.gl} onChange={e => setEditing({...editing,gl:e.target.value})}>{data.coa.filter(c => !['1001','1002','3001','4003'].some(code => c.code.startsWith(code))).map(c => <option key={c.code}>{c.code}</option>)}</select></label><label className="block text-sm">Periode akuntansi<input required type="month" className={`${input} w-full`} value={editing.period} onChange={e => setEditing({...editing,period:e.target.value})}/></label><label className="block text-sm">Alasan / catatan review<textarea required className={`${input} w-full`} value={editing.note} onChange={e => setEditing({...editing,note:e.target.value})}/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={editing.pending} onChange={e => setEditing({...editing,pending:e.target.checked})}/>Masih perlu konfirmasi</label><div className="flex justify-end gap-2"><button type="button" disabled={busy} className={input} onClick={() => setEditing(null)}>Batal</button><button disabled={busy || !editing.note.trim()} className="bg-blue-600 text-white rounded-lg px-4 py-2">Simpan review</button></div></form></div>}
  </div>;
}
