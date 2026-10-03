import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { useBooks } from '../books';
import { postAsset, postDepreciation } from '../lib/accounting';
import { FixedAsset, depreciation, validateAsset } from '../lib/assets';
import { money } from '../lib/finance';
const field = 'border rounded-lg px-3 py-2 w-full';
export default function Assets() {
  const { state } = useApp();
  const {book,changeBook,busy:bookBusy}=useBooks();
  const [payment,setPayment]=useState('1000');
  const [assets,setAssets] = useState<FixedAsset[]>([]);
  const [editing,setEditing] = useState<FixedAsset|null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(true);
  const editable = ['admin','finance'].includes(state.currentUser.role);
  const visible = ['admin','finance','owner'].includes(state.currentUser.role);
  useEffect(()=>{setAssets(book?.assets??[]);setBusy(false);},[book]);
  async function save() {
    if (!editing || !editable) return;
    setBusy(true);setError('');
    try {
      const a = validateAsset(editing);
      const next = [...assets.filter(x => x.id !== a.id),a];
      await changeBook(b=>{if(b.journals.some(j=>j.source===`asset:${a.id}`))throw Error('Aset terposting tidak dapat diubah.');b.assets=next;},'Simpan register aset');
      setAssets(next);setEditing(null);
    } catch(e) {setError(e instanceof Error ? e.message : 'Gagal menyimpan aset.');}
    finally {setBusy(false);}
  }
  if(!book)return <p className="bg-amber-50 p-4 rounded-xl">Aktifkan buku di Jurnal Umum sebelum memasukkan aset.</p>;
  async function post(a:FixedAsset,monthly=false){setError('');try{await changeBook(b=>monthly?postDepreciation(b,a,state.selectedPeriode,state.currentUser.nama):postAsset(b,a,payment,state.currentUser.nama),monthly?'Posting penyusutan':'Posting perolehan aset');}catch(e){setError(e instanceof Error?e.message:'Posting gagal');}}
  if (!visible) return <p>Akses aset tersedia untuk admin, finance, dan owner.</p>;
  const rows = assets.map(a => ({a,d:depreciation(a,state.selectedPeriode)}));
  return <div className="space-y-5"><div className="flex justify-between gap-3"><div><h1 className="text-2xl font-bold">Aset & Penyusutan</h1><p className="text-sm text-gray-500">Garis lurus · {state.selectedPeriode} · Seluruh usaha</p></div>{editable && <button disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={() => setEditing({id:crypto.randomUUID(),name:'',category:'Mesin laundry',location:'',acquired:state.selectedPeriode+'-01',start:state.selectedPeriode,cost:0,residual:0,months:60})}>Tambah aset</button>}</div>
    <p className="bg-blue-50 rounded-xl p-4 text-sm">Penyusutan dimulai penuh pada bulan mulai: (harga perolehan − nilai residu) ÷ masa manfaat. Nilai buku berhenti pada residu. Simpan data aset, posting perolehan, kemudian posting penyusutan hingga bulan yang dipilih. Jurnal yang sama tidak dibuat ulang. Register aset terhubung ke buku perusahaan.</p>
    <label className="block text-sm">Pembayaran perolehan<select value={payment} onChange={e=>setPayment(e.target.value)} className="border rounded-lg px-3 py-2 ml-3">{[['1000','Kas'],['1001','BRI'],['1002','BSI'],['2001','Hutang Usaha'],['3001','Setoran Modal']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</p>}{busy && <p role="status">Memproses aset…</p>}
    <div className="grid gap-3 md:grid-cols-3">{[['Harga perolehan',rows.reduce((s,r)=>s+r.a.cost,0)],['Beban penyusutan bulan ini',rows.reduce((s,r)=>s+r.d.current,0)],['Nilai buku akhir periode',rows.reduce((s,r)=>s+(r.a.acquired.slice(0,7)<=state.selectedPeriode?r.d.book:0),0)]].map(([label,n]) => <div key={String(label)} className="bg-white border rounded-xl p-4"><p className="text-sm text-gray-500">{label}</p><p className="text-xl font-semibold">{money(n as number)}</p></div>)}</div>
    <div className="bg-white border rounded-xl p-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Aset','Harga / Residu','Mulai / Masa manfaat','Beban bulan ini','Akumulasi','Nilai buku',''].map((h,i)=><th key={i} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.map(({a,d})=><tr key={a.id} className="border-t"><td className="p-2">{a.name}<p className="text-xs text-gray-500">{a.category} · {a.location}</p></td><td className="p-2 whitespace-nowrap">{money(a.cost)}<p className="text-xs text-gray-500">Residu {money(a.residual)}</p></td><td className="p-2">{a.start}<p>{a.months} bulan</p></td><td className="p-2 whitespace-nowrap">{money(d.current)}</td><td className="p-2 whitespace-nowrap">{money(d.accumulated)}</td><td className="p-2 whitespace-nowrap">{a.acquired.slice(0,7)>state.selectedPeriode?'Belum diperoleh':money(d.book)}</td><td>{editable&&!book.journals.some(j=>j.source===`asset:${a.id}`)&&<button disabled={busy||bookBusy} className="text-blue-700 underline" onClick={()=>setEditing({...a})}>Edit</button>}{editable&&<button disabled={busy||bookBusy} className="block text-blue-700 underline" onClick={()=>void post(a,book.journals.some(j=>j.source===`asset:${a.id}`))}>{book.journals.some(j=>j.source===`asset:${a.id}`)?'Posting penyusutan':'Posting perolehan'}</button>}</td></tr>)}</tbody></table>{!assets.length&&!busy&&<p className="text-gray-500 py-6">Belum ada aset. Tambahkan mesin cuci, pengering, setrika, atau peralatan lain.</p>}</div>
    {editing&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><form className="bg-white rounded-xl p-5 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto" onSubmit={e=>{e.preventDefault();void save();}}><h2 className="font-semibold">Data aset</h2>{[['name','Nama aset'],['category','Kategori'],['location','Lokasi']].map(([key,label])=><label key={key} className="block text-sm">{label}<input required={key!=='location'} className={field} value={editing[key as 'name'|'category'|'location']} onChange={e=>setEditing({...editing,[key]:e.target.value})}/></label>)}<label className="block text-sm">Tanggal perolehan<input required type="date" className={field} value={editing.acquired} onChange={e=>setEditing({...editing,acquired:e.target.value})}/></label><label className="block text-sm">Bulan mulai penyusutan<input required type="month" className={field} value={editing.start} onChange={e=>setEditing({...editing,start:e.target.value})}/></label>{[['cost','Harga perolehan (Rp)'],['residual','Nilai residu (Rp)'],['months','Masa manfaat (bulan)']].map(([key,label])=><label key={key} className="block text-sm">{label}<input required type="number" min={key==='months'?1:0} step={key==='months'?1:0.01} className={field} value={editing[key as 'cost'|'residual'|'months']} onChange={e=>setEditing({...editing,[key]:Number(e.target.value)})}/></label>)}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setEditing(null)} className="px-4 py-2">Batal</button><button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2">Simpan</button></div></form></div>}
  </div>;
}
