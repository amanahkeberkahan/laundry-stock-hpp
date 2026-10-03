import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useApp, reducer, Action, AppState } from './store';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Book, initializeBook, validateBook, postPurchase, voidPurchase, postUsage, postCount, postTransfer, Usage, today, stockBalance, inventoryCheck } from './lib/accounting';

export type Operations = Pick<AppState,'barang'|'gudang'|'pembelian'|'stockOpname'|'transfers'|'adjustments'|'stockSnapshots'|'periodClosings'|'auditLogs'|'stockMovements'>;
export interface BookEnvelope { books: Book; operations: Operations }
const pick = (s:AppState):Operations => ({barang:s.barang,gudang:s.gudang,pembelian:s.pembelian,stockOpname:s.stockOpname,transfers:s.transfers,adjustments:s.adjustments,stockSnapshots:s.stockSnapshots,periodClosings:s.periodClosings,auditLogs:s.auditLogs,stockMovements:s.stockMovements});
interface BooksContextType {
  book: Book|null; busy: boolean; error: string; cloud: boolean;
  initialize: (date:string) => Promise<void>; reload: () => Promise<void>;
  commitAction: (action:Action) => Promise<void>;
  postUsageRecord: (usage:Usage) => Promise<void>;
  changeBook: (change:(b:Book)=>void,reason:string) => Promise<void>;
  exportBackup: () => void;
  restoreBackup: (payload:unknown) => Promise<void>;
}
const BooksContext=createContext<BooksContextType|null>(null);
export function BooksProvider({children}:{children:ReactNode}) {
  const {state,dispatch}=useApp();
  const cloud=isSupabaseConfigured();
  const [book,setBook]=useState<Book|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const revision=useRef(0), lock=useRef(false), currentBook=useRef<Book|null>(null), ready=useRef(false);
  async function reload() {
    if(lock.current){setError('Tunggu sampai posting selesai sebelum memuat ulang buku.');return;}
    setBusy(true);setError('');ready.current=false;
    try {
      let payload:BookEnvelope|null=null;
      if(cloud) {
        const result=await supabase.from('accounting_books').select('payload,revision').eq('id','pradhana').maybeSingle();
        if(result.error)throw Error('Buku Supabase belum dapat dibaca: '+result.error.message);
        if(!result.data)throw Error('Buku perusahaan belum tersedia / akun belum menjadi anggota. Jalankan setup akuntansi.');
        payload=result.data.payload;revision.current=result.data.revision;
      } else {
        const saved=localStorage.getItem('laundry-accounting-v1');
        if(saved)payload=JSON.parse(saved);
      }
      if(payload) {
        const checked=validateBook(payload.books);
        currentBook.current=checked;setBook(checked);
        const safeOperations=Object.fromEntries(Object.keys(pick(state)).map(key=>{const rows=payload!.operations[key as keyof Operations];if(!Array.isArray(rows))throw Error('Buku operasional tidak valid.');return [key,rows];}));
        dispatch({type:'LOAD_DATA',payload:{...safeOperations,stockMovements:checked.movements,isSupabaseMode:cloud,loadError:''}});
      } else {currentBook.current=null;setBook(null);}
      ready.current=true;
    } catch(e) {currentBook.current=null;setBook(null);setError(e instanceof Error?e.message:'Gagal membaca buku.');}
    finally {setBusy(false);}
  }
  useEffect(()=>{ if(!state.isLoading&&(!cloud||state.currentUser.id))void reload(); },[state.isLoading,cloud,state.currentUser.id]);
  async function write(books:Book, nextState:AppState, reason:string) {
    validateBook(books);
    const operations=pick(nextState);operations.stockMovements=books.movements;
    // Keep legacy stock reports compatible with cumulative balances, never purchase quantities.
    const changed = books.movements.slice(currentBook.current?.movements.length ?? 0);
    for(const m of changed) {
      const period=m.date.slice(0,7);
      operations.stockSnapshots=operations.stockSnapshots.filter(s=>!(s.barangId===m.itemId&&s.gudangId===m.warehouseId&&s.periode===period));
      operations.stockSnapshots.push({barangId:m.itemId,gudangId:m.warehouseId,periode:period,quantity:m.balance,nilaiTotal:m.valueBalance,hargaRataRata:m.average,tanggal:m.date});
    }
    const audit={id:crypto.randomUUID(),timestamp:new Date().toISOString(),user:state.currentUser.nama,action:'POST',entityType:'accounting',entityId:reason,reason};
    operations.auditLogs=[...operations.auditLogs,audit];
    const payload:BookEnvelope={books,operations};
    if(cloud) {
      const result=await supabase.rpc('commit_accounting_book',{p_expected:revision.current,p_payload:payload,p_reason:reason});
      if(result.error)throw Error(result.error.message+' Muat ulang buku sebelum mencoba kembali.');
      revision.current=Number(result.data);
    } else {
      // One atomic localStorage write contains operational documents + journals + movements.
      const saved=localStorage.getItem('laundry-accounting-v1');
      if(saved&&currentBook.current&&JSON.stringify(JSON.parse(saved).books)!==JSON.stringify(currentBook.current))throw Error('Buku berubah di tab lain. Muat ulang sebelum posting.');
      localStorage.setItem('laundry-accounting-v1',JSON.stringify(payload));
    }
    currentBook.current=books;setBook(books);dispatch({type:'LOAD_DATA',payload:operations});
  }
  async function transaction(run:()=>Promise<void>) {
    if(lock.current)throw Error('Posting lain sedang berjalan.');
    if(!['admin','finance'].includes(state.currentUser.role))throw Error('Penyimpanan dan posting buku terintegrasi memerlukan role admin atau finance.');
    if(!ready.current)throw Error('Buku belum berhasil dimuat. Muat ulang / periksa setup Supabase.');
    lock.current=true;setBusy(true);setError('');
    try {await run();}catch(e){setError(e instanceof Error?e.message:'Posting gagal.');throw e;}finally{lock.current=false;setBusy(false);}
  }
  function draft() {if(!currentBook.current)throw Error('Aktifkan buku di menu Jurnal Umum terlebih dahulu.');return structuredClone(currentBook.current);}
  async function initialize(date:string) {
    await transaction(async()=>{
      if(currentBook.current)throw Error('Buku sudah aktif. Saldo awal tidak boleh diposting ulang.');
      if(cloud&&(state.isLoading||!state.isSupabaseMode||state.loadError))throw Error('Data operasional Supabase belum berhasil dimuat. Muat ulang halaman setelah login sebelum aktivasi; saldo demo tidak boleh digunakan sebagai saldo cloud.');
      const b=initializeBook(date,state.stockSnapshots,state.currentUser.nama,true);
      b.closedPeriods=[...new Set(state.periodClosings.filter(c=>c.status==='closed').map(c=>c.periode))];
      await write(b,state,'Aktivasi saldo awal persediaan');
    });
  }
  async function commitAction(action:Action) {
    await transaction(async()=>{
      const b=draft(),next=reducer(state,action),user=state.currentUser.nama;
      switch(action.type) {
        case 'UPDATE_BARANG': {
          const old=state.barang.find(i=>i.id===action.payload.id);
          if(old&&b.movements.some(m=>m.itemId===old.id)&&(old.satuanDasar!==action.payload.satuanDasar||JSON.stringify(old.konversi)!==JSON.stringify(action.payload.konversi)))throw Error('Barang memiliki histori. Satuan dasar dan konversi tidak boleh diubah.');
          break;
        }
        case 'ADD_PEMBELIAN': postPurchase(b,action.payload,state.barang,user,state.periodClosings);break;
        case 'VOID_PEMBELIAN': {
          const p=state.pembelian.find(p=>p.id===action.payload);if(!p)throw Error('Nota tidak ditemukan.');
          voidPurchase(b,p,today(),user,state.periodClosings);break;
        }
        case 'UPDATE_STOCK_OPNAME': if(action.payload.status==='finalized')postCount(b,action.payload,state.barang,user,state.periodClosings);break;
        case 'ADD_STOCK_OPNAME': if(action.payload.status==='finalized')postCount(b,action.payload,state.barang,user,state.periodClosings);break;
        case 'APPROVE_ADJUSTMENT': {
          const a=state.adjustments.find(a=>a.id===action.payload.id);if(!a||a.status!=='pending')throw Error('Adjustment tidak pending.');
          postCount(b,a,state.barang,user,state.periodClosings);break;
        }
        case 'UPDATE_TRANSFER': if(action.payload.status==='completed'){
          const previous=state.transfers.find(t=>t.id===action.payload.id);if(!previous||!['pending','in_transit'].includes(previous.status))throw Error('Transfer tidak dapat diselesaikan.');
          postTransfer(b,previous,today(),state.periodClosings);
        }break;
        case 'CLOSE_PERIOD': {
          const period=action.payload.periode;
          if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||period<b.cutoff.slice(0,7)||period>=today().slice(0,7))throw Error('Closing hanya untuk bulan lampau setelah awal buku.');
          if(state.stockOpname.some(x=>x.periode===period&&x.status==='draft')||state.adjustments.some(x=>x.tanggal.startsWith(period)&&x.status==='pending')||state.transfers.some(x=>x.tanggal.startsWith(period)&&['pending','in_transit'].includes(x.status)))throw Error('Selesaikan draft opname, adjustment, dan transfer sebelum closing.');
          if(!b.closedPeriods.includes(period))b.closedPeriods.push(period);break;
        }
        case 'DELETE_BARANG': if(b.movements.some(m=>m.itemId===action.payload))throw Error('Barang memiliki histori; nonaktifkan, jangan hapus.');break;
      }
      if(inventoryCheck(b,'9999-12-31').difference!==0)throw Error('Persediaan dan jurnal tidak cocok. Posting dibatalkan.');
      await write(b,next,action.type);
    });
  }
  async function changeBook(change:(b:Book)=>void,reason:string) {await transaction(async()=>{const b=draft();change(b);await write(b,state,reason);});}
  async function postUsageRecord(usage:Usage) {await changeBook(b=>postUsage(b,usage,state.barang,state.currentUser.nama,state.periodClosings),`Pemakaian ${usage.id}`);}
  function exportBackup() {
    if(!currentBook.current)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify({books:currentBook.current,operations:pick(state)},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='backup-stok-akuntansi.json';a.click();URL.revokeObjectURL(url);
  }
  async function restoreBackup(value:unknown) {
    await transaction(async()=>{
      if(currentBook.current)throw Error('Restore hanya tersedia pada buku kosong, agar histori aktif tidak ditimpa.');
      const payload=value as BookEnvelope,checked=validateBook(payload?.books);
      const operations=Object.fromEntries(Object.keys(pick(state)).map(key=>{const rows=payload.operations?.[key as keyof Operations];if(!Array.isArray(rows))throw Error('Backup operasional tidak lengkap.');return [key,rows];}));
      await write(checked,{...state,...operations},'Restore backup stok dan akuntansi');
    });
  }
  return <BooksContext.Provider value={{book,busy,error,cloud,initialize,reload,commitAction,postUsageRecord,changeBook,exportBackup,restoreBackup}}>{children}</BooksContext.Provider>;
}
export function useBooks(){const context=useContext(BooksContext);if(!context)throw Error('BooksProvider belum tersedia.');return context;}
