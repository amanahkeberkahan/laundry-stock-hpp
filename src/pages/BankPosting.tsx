import { useState } from 'react';
import { useBooks } from '../books';
import { useApp } from '../store';
import { bankKey, ledger, linkBank, monthEnd, postBankData, postBankReview } from '../lib/accounting';
import { FinanceData, money } from '../lib/finance';

export default function BankPosting({data,period}:{data:FinanceData;period:string}) {
  const {book,busy,changeBook}=useBooks(),{state}=useApp();
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const editable=['admin','finance'].includes(state.currentUser.role);
  if(!book)return <p className="bg-amber-50 p-4 rounded-lg">Aktifkan buku di Jurnal Umum untuk rekonsiliasi ke pembukuan.</p>;
  const rows=data.transactions.filter(t=>t.bankPeriod===period);
  const matched=(key:string)=>book.journals.some(j=>j.source===key)||book.bankLinks.some(l=>l.key===key);
  async function run(fn:()=>Promise<void>){setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Posting gagal');}}
  return <section className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-semibold">Rekonsiliasi rekening dengan buku besar</h2><p className="text-sm text-gray-600">Cocokkan pembayaran pembelian, aset, atau jurnal existing terlebih dahulu. Posting mutasi yang belum tercatat membuat jurnal pada tanggal bank. Pending masuk akun sementara 1109. Penyesuaian POS dan perbedaan periode akuntansi dibuat melalui jurnal penyesuaian setelah review.</p>
    {['BRI','BSI'].map(bank=>{const control=data.controls.find(c=>c.bank===bank&&c.period===period),gl=ledger(book,bank==='BRI'?'1001':'1002',book.cutoff,monthEnd(period)).closing;return <p key={bank} className="text-sm">{bank}: buku besar {money(gl)} · rekening koran {money(control?.closing)} · <span className={!control||Math.abs(gl-control.closing)>0.005?'text-red-700':'text-green-700'}>Selisih {money(control?gl-control.closing:null)}</span></p>;})}
    <p className="text-sm">{rows.filter(t=>matched(bankKey(t))).length} dari {rows.length} mutasi periode ini terhubung.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}{message&&<p role="status" className="text-green-700">{message}</p>}
    {editable&&<button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2" onClick={()=>void run(async()=>{let count=0;await changeBook(b=>{count=postBankData(b,data,state.currentUser.nama);},'Posting mutasi bank yang belum terhubung');setMessage(`${count} transaksi diposting; termasuk seluruh periode dalam file sejak awal buku.`);})}>Posting mutasi belum tercatat</button>}
    {editable&&<button disabled={busy} className="border rounded-lg px-4 py-2 ml-3" onClick={()=>void run(async()=>{let count=0;await changeBook(b=>{count=postBankReview(b,data,state.currentUser.nama);},'Reklasifikasi hasil review bank');setMessage(`${count} jurnal reklasifikasi dibuat pada tanggal hari ini.`);})}>Posting hasil review akun sementara</button>}
    <details><summary className="text-sm cursor-pointer">Cocokkan mutasi dengan jurnal existing</summary><div className="max-h-96 overflow-auto mt-3 space-y-2">{rows.filter(t=>!matched(bankKey(t))).map(t=>{const account=t.bank==='BRI'?'1001':'1002',net=t.credit-t.debit;const candidates=book.journals.filter(j=>!j.source.startsWith('opening')&&!book.bankLinks.some(l=>l.journalId===j.id)&&Math.abs(j.lines.filter(l=>l.account===account).reduce((s,l)=>s+l.debit-l.credit,0)-net)<0.005);return <div key={t.id} className="border-t py-2 text-sm"><p>{t.date} · {t.bank} · {t.description} · {money(net)}</p>{editable&&<select aria-label={`Cocokkan ${t.id}`} className="border rounded p-2 max-w-full" disabled={busy} value="" onChange={e=>{const id=e.target.value;if(id)void run(()=>changeBook(b=>linkBank(b,t,id),`Rekonsiliasi ${t.id}`));}}><option value="">Pilih jurnal dengan nilai dan arah sama ({candidates.length})</option>{candidates.map(j=><option key={j.id} value={j.id}>{j.number} · {j.date} · {j.description}</option>)}</select>}</div>;})}</div></details>
  </section>;
}
