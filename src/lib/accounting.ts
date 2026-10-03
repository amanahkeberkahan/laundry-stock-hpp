import type { MasterBarang, StockSnapshot, Pembelian, StockOpname, Adjustment, Transfer, PeriodClosing } from '../types';
import type { BankTransaction, FinanceData } from './finance';
import type { FixedAsset } from './assets';
import { depreciation, validateAsset } from './assets';

export type AccountGroup = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export interface Account { code: string; name: string; group: AccountGroup; normal: 'debit' | 'credit'; active: boolean }
export interface JournalLine { account: string; debit: number; credit: number }
export interface Journal { id: string; number: string; source: string; sourceNumber: string; date: string; description: string; lines: JournalLine[]; createdBy: string; reversalOf?: string }
export interface StockMovement {
  id: string; seq: number; date: string; source: string; number: string; itemId: string; warehouseId: string;
  type: 'opening' | 'purchase' | 'usage' | 'opname' | 'adjustment' | 'transfer-in' | 'transfer-out' | 'void';
  inQty: number; outQty: number; balance: number; unitCost: number;
  inValue: number; outValue: number; valueBalance: number; average: number; description: string;
}
export interface Usage { id: string; date: string; itemId: string; warehouseId: string; quantity: number; unit: string; description: string }
export interface Book {
  version: 1; cutoff: string; accounts: Account[]; journals: Journal[]; movements: StockMovement[]; assets: FixedAsset[];
  usages: Usage[]; closedPeriods: string[]; bankLinks: { key: string; journalId: string }[];
}
const account = (code: string, name: string, group: AccountGroup, normal: 'debit'|'credit' = ['asset','expense'].includes(group)?'debit':'credit'): Account => ({code,name,group,normal,active:true});
export const defaultAccounts: Account[] = [
  account('1000','Kas','asset'),account('1001','Bank BRI','asset'),account('1002','Bank BSI','asset'),
  account('1101','Piutang Karyawan / Kasbon','asset'),account('1102','Uang Muka Operasional','asset'),account('1103','Piutang Usaha','asset'),
  account('1109','Transaksi Bank Belum Teridentifikasi','asset'),account('1200','Persediaan Bahan Laundry','asset'),account('1201','Investasi Emas','asset'),
  account('1300','Peralatan','asset'),account('1301','Akumulasi Penyusutan Peralatan','asset','credit'),
  account('2001','Hutang Usaha','liability'),account('2002','Hutang Lain-lain / Akrual','liability'),
  account('3001','Modal / Saldo Awal','equity'),account('3101','Prive','equity','debit'),account('3201','Laba Ditahan','equity'),
  account('4001','Pendapatan Laundry','revenue'),account('4002','Pendapatan Bunga / Bonus','revenue'),account('4003','Pendapatan Tambahan / Penyesuaian POS','revenue'),account('4999','Pendapatan Lainnya','revenue'),
  account('5001','Beban Bahan Laundry','expense'),account('5002','Beban Listrik','expense'),account('5003','Upah Tambahan Produksi','expense'),
  account('5101','Beban Gaji','expense'),account('5201','Operasional Karyawan','expense'),account('5301','Beban Administrasi Bank','expense'),
  account('5302','Beban Air','expense'),account('5303','Beban Sewa','expense'),account('5304','Beban Transportasi','expense'),account('5305','Beban Perawatan Mesin','expense'),
  account('5401','Pajak Bunga Bank','expense'),account('5501','Beban Bagi Hasil','expense'),account('5601','Beban Penyusutan','expense'),account('5901','Beban Lain-lain','expense'),
  account('5999','Beban Belum Teridentifikasi (Provisional)','expense'),account('9991','Kliring Transfer Antar Rekening','asset'),
];
export const roundMoney = (n: number) => Math.round((n+Number.EPSILON)*100)/100;
const roundQty = (n: number) => Math.round(n*1_000_000)/1_000_000;
export const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date());
export const monthEnd = (month: string) => { const [y,m] = month.split('-').map(Number); return `${month}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`; };
function validDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date+'T00:00:00Z').toISOString().slice(0,10) === date; }
export function checkDate(b: Book, date: string, closings: PeriodClosing[] = [], warehouse?: string) {
  if (!validDate(date) || date < b.cutoff) throw Error(`Tanggal harus valid dan minimal ${b.cutoff} (awal buku).`);
  if (b.closedPeriods.includes(date.slice(0,7)) || closings.some(c => c.status === 'closed' && c.periode === date.slice(0,7) && (!warehouse || c.gudangId === warehouse))) throw Error('Periode ditutup. Gunakan periode terbuka untuk koreksi.');
}
export function journalBalance(j: Journal) {
  const debit = roundMoney(j.lines.reduce((s,l)=>s+l.debit,0)), credit = roundMoney(j.lines.reduce((s,l)=>s+l.credit,0));
  return {debit,credit,difference:roundMoney(debit-credit)};
}
export function appendJournal(b: Book, j: Omit<Journal,'id'|'number'>) {
  checkDate(b,j.date);
  if (b.journals.some(x=>x.source === j.source)) throw Error('Transaksi sumber sudah diposting.');
  if (j.lines.length < 2 || !j.description.trim() || !j.source || !j.createdBy) throw Error('Jurnal harus memiliki sumber, keterangan, petugas, dan minimal dua baris.');
  j.lines.forEach(l => {
    if (!b.accounts.some(a=>a.code===l.account && a.active) || !Number.isFinite(l.debit) || !Number.isFinite(l.credit) || l.debit < 0 || l.credit < 0 ||
      (l.debit > 0 && l.credit > 0) || (l.debit === 0 && l.credit === 0) || l.debit !== roundMoney(l.debit) || l.credit !== roundMoney(l.credit)) throw Error('Akun atau nilai jurnal tidak valid; setiap baris hanya debit atau kredit, maksimal dua desimal.');
  });
  const balance = journalBalance(j as Journal);
  if (!balance.debit || balance.difference !== 0) throw Error(`Jurnal tidak balance. Selisih ${balance.difference}.`);
  const n = b.journals.length+1;
  const posted: Journal = {...j,id:`journal-${n}`,number:`JU-${String(n).padStart(6,'0')}`};
  b.journals.push(posted); return posted;
}
export function stockBalance(b: Book, item: string, warehouse: string, until = '9999-12-31') {
  const rows = b.movements.filter(m=>m.itemId===item && m.warehouseId===warehouse && m.date<=until);
  return rows.length ? rows[rows.length-1] : null;
}
function movement(b: Book, m: Omit<StockMovement,'id'|'seq'|'balance'|'valueBalance'|'average'|'unitCost'>) {
  checkDate(b,m.date);
  if(m.type!=='opening'&&!m.source.startsWith('opening-price:')&&pendingOpeningPrices(b).some(x=>x.itemId===m.itemId&&x.warehouseId===m.warehouseId))throw Error('Verifikasi harga saldo awal di Mutasi Stok terlebih dahulu.');
  const previous = stockBalance(b,m.itemId,m.warehouseId);
  if (previous && previous.date > m.date) throw Error(`Mutasi ${m.itemId} mendahului histori terakhir ${previous.date}; posting kronologis diperlukan untuk moving average.`);
  if (![m.inQty,m.outQty,m.inValue,m.outValue].every(n=>Number.isFinite(n)&&n>=0) || (m.inQty>0&&m.outQty>0)) throw Error('Jumlah/nilai mutasi tidak valid.');
  const balance = roundQty((previous?.balance ?? 0)+m.inQty-m.outQty);
  const valueBalance = roundMoney((previous?.valueBalance ?? 0)+m.inValue-m.outValue);
  if (balance < 0 || valueBalance < 0 || (balance === 0 && Math.abs(valueBalance) > 0.01)) throw Error('Stok/nilai persediaan tidak cukup atau tidak konsisten.');
  const seq = b.movements.length+1;
  const row: StockMovement = {...m,id:`movement-${seq}`,seq,balance,valueBalance:balance===0?0:valueBalance,
    average:balance>0?valueBalance/balance:0,unitCost: m.inQty>0?m.inValue/m.inQty:m.outQty>0?m.outValue/m.outQty:previous?.average ?? 0};
  b.movements.push(row);return row;
}
function issueCost(b: Book, item: string, warehouse: string, qty: number) {
  const balance = stockBalance(b,item,warehouse);
  if (!Number.isFinite(qty) || qty <= 0 || !balance || roundQty(qty)>balance.balance) throw Error(`Stok ${item} tidak cukup / qty harus positif.`);
  return qty === balance.balance ? balance.valueBalance : roundMoney(qty*balance.valueBalance/balance.balance);
}
const pair = (debit: string, credit: string, amount: number): JournalLine[] => [{account:debit,debit:amount,credit:0},{account:credit,debit:0,credit:amount}];
export function initializeBook(cutoff: string, snapshots: StockSnapshot[], user: string, quantityOnly = false): Book {
  if (!validDate(cutoff)) throw Error('Tanggal awal buku tidak valid.');
  const b: Book = {version:1,cutoff,accounts:structuredClone(defaultAccounts),journals:[],movements:[],assets:[],usages:[],closedPeriods:[],bankLinks:[]};
  const latest = new Map<string, StockSnapshot>();
  snapshots.forEach(s=> { const k=`${s.barangId}|${s.gudangId}`;if (!latest.has(k) || latest.get(k)!.tanggal<=s.tanggal) latest.set(k,s); });
  const totals=new Map<string,number>();
  [...latest.values()].sort((a,c)=>a.tanggal.localeCompare(c.tanggal)).forEach(s=> {
    if(quantityOnly) s={...s,nilaiTotal:0};
    if (!Number.isFinite(s.quantity) || s.quantity<0 || !Number.isFinite(s.nilaiTotal) || s.nilaiTotal<0 || (s.quantity===0&&s.nilaiTotal!==0)) throw Error('Saldo stok awal tidak valid.');
    const date=s.tanggal>cutoff?s.tanggal:cutoff;
    movement(b,{date,source:`opening-inventory:${date}`,number:'SALDO-AWAL',itemId:s.barangId,warehouseId:s.gudangId,type:'opening',inQty:s.quantity,outQty:0,inValue:roundMoney(s.nilaiTotal),outValue:0,description:quantityOnly&&s.quantity>0?'Harga saldo awal belum diverifikasi':`Saldo awal migrasi dari snapshot ${s.tanggal}`});
    totals.set(date,roundMoney((totals.get(date)??0)+s.nilaiTotal));
  });
  totals.forEach((total,date)=>{if(total>0)appendJournal(b,{date,source:`opening-inventory:${date}`,sourceNumber:'SALDO-AWAL',description:'Saldo awal persediaan dari snapshot (modal awal perlu verifikasi)',createdBy:user,lines:pair('1200','3001',total)});});
  return b;
}
export function postPurchase(b: Book, p: Pembelian, items: MasterBarang[], user: string, closings: PeriodClosing[]) {
  checkDate(b,p.tanggal,closings,p.gudangId);
  if (!p.paymentAccount || !['1000','1001','1002','2001'].includes(p.paymentAccount)) throw Error('Pilih sumber pembayaran kas/bank atau hutang usaha.');
  if (p.status!=='active' || !p.items.length || !Number.isFinite(p.total) || p.total<=0 || b.journals.some(j=>j.source===`purchase:${p.id}`)) throw Error('Nota tidak valid atau sudah diposting.');
  const subtotal = p.items.reduce((s,i)=>s+i.subtotal,0);
  if (subtotal<=0 || Math.abs(p.total-(subtotal+p.pajak))>0.01) throw Error('Total nota harus sesuai subtotal setelah diskon + pajak.');
  let allocated = 0;
  p.items.forEach((i,n)=> {
    const master=items.find(x=>x.id===i.barangId && x.statusAktif);
    if (!master || !Number.isFinite(i.quantityDasar) || i.quantityDasar<=0 || !Number.isFinite(i.subtotal) || i.subtotal<0 || !Number.isFinite(i.quantity) || i.quantity<=0 || !Number.isFinite(i.diskon) || i.diskon<0) throw Error('Item, quantity, atau harga nota tidak valid.');
    const factor = i.satuan===master.satuanDasar?1:master.konversi.find(k=>k.fromUnit===i.satuan&&k.toUnit===master.satuanDasar)?.factor;
    if (!factor || Math.abs(roundQty(i.quantity*factor)-i.quantityDasar)>0.000001 || Math.abs(roundMoney(i.quantity*i.hargaSatuan-i.diskon)-i.subtotal)>0.01) throw Error('Konversi satuan / subtotal nota tidak konsisten.');
    const amount = n===p.items.length-1?roundMoney(p.total-allocated):roundMoney(i.subtotal/subtotal*p.total); allocated=roundMoney(allocated+amount);
    movement(b,{date:p.tanggal,source:`purchase:${p.id}`,number:p.nomorNota,itemId:i.barangId,warehouseId:p.gudangId,type:'purchase',inQty:roundQty(i.quantityDasar),outQty:0,inValue:amount,outValue:0,description:`Pembelian ${p.supplier}`});
  });
  appendJournal(b,{date:p.tanggal,source:`purchase:${p.id}`,sourceNumber:p.nomorNota,description:`Pembelian bahan: ${p.supplier}`,createdBy:user,lines:pair('1200',p.paymentAccount,roundMoney(p.total))});
}
export function postOpeningStock(b:Book,item:string,warehouse:string,date:string,qty:number,unitCost:number,user:string) {
  if(b.movements.some(m=>m.itemId===item&&m.warehouseId===warehouse))throw Error('Barang/gudang sudah memiliki histori; gunakan opname atau penyesuaian.');
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(unitCost)||unitCost<0)throw Error('Qty harus positif dan harga awal tidak negatif.');
  const value=roundMoney(qty*unitCost),source=`opening-stock:${item}:${warehouse}`;
  movement(b,{date,source,number:'SALDO-AWAL',itemId:item,warehouseId:warehouse,type:'opening',inQty:roundQty(qty),outQty:0,inValue:value,outValue:0,description:'Saldo awal persediaan manual'});
  if(value>0)appendJournal(b,{date,source,sourceNumber:'SALDO-AWAL',description:'Saldo awal persediaan manual',createdBy:user,lines:pair('1200','3001',value)});
}
export function voidPurchase(b: Book, p: Pembelian, date: string, user: string, closings: PeriodClosing[]) {
  checkDate(b,p.tanggal,closings,p.gudangId);checkDate(b,date,closings,p.gudangId);
  const original=b.journals.find(j=>j.source===`purchase:${p.id}`);
  if (!original || b.journals.some(j=>j.source===`void:${p.id}`)) throw Error('Nota belum diposting / sudah dibalik. Nota historis perlu jurnal koreksi terpisah.');
  const moves = b.movements.filter(m=>m.source===original.source);
  moves.forEach(m=> {if (b.movements.some(x=>x.seq>m.seq && x.source!==m.source && x.itemId===m.itemId && x.warehouseId===m.warehouseId)) throw Error('Nota sudah diikuti mutasi lain. Void ditolak agar moving average tetap benar; lakukan koreksi melalui penyesuaian.');});
  moves.forEach(m=>movement(b,{date,source:`void:${p.id}`,number:p.nomorNota,itemId:m.itemId,warehouseId:m.warehouseId,type:'void',inQty:0,outQty:m.inQty,inValue:0,outValue:m.inValue,description:'Pembalikan nota pembelian'}));
  appendJournal(b,{date,source:`void:${p.id}`,sourceNumber:p.nomorNota,description:`Void ${p.nomorNota}`,createdBy:user,reversalOf:original.id,lines:original.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit}))});
}
export function postUsage(b: Book, usage: Usage, items: MasterBarang[], user: string, closings: PeriodClosing[]) {
  checkDate(b,usage.date,closings,usage.warehouseId);
  const master=items.find(x=>x.id===usage.itemId&&x.statusAktif);
  const factor = usage.unit===master?.satuanDasar?1:master?.konversi.find(k=>k.fromUnit===usage.unit&&k.toUnit===master.satuanDasar)?.factor;
  if (!master || !factor || !usage.description.trim() || b.usages.some(u=>u.id===usage.id)) throw Error('Barang, satuan, keterangan atau nomor pemakaian tidak valid.');
  const qty=roundQty(usage.quantity*factor), cost=issueCost(b,usage.itemId,usage.warehouseId,qty);
  movement(b,{date:usage.date,source:`usage:${usage.id}`,number:usage.id,itemId:usage.itemId,warehouseId:usage.warehouseId,type:'usage',inQty:0,outQty:qty,inValue:0,outValue:cost,description:usage.description});
  if (cost>0) appendJournal(b,{date:usage.date,source:`usage:${usage.id}`,sourceNumber:usage.id,description:usage.description,createdBy:user,lines:pair('5001','1200',cost)});
  b.usages.push(usage);
}
export function postCount(b: Book, count: StockOpname | Adjustment, items: MasterBarang[], user: string, closings: PeriodClosing[]) {
  checkDate(b,count.tanggal,closings,count.gudangId);
  const opname = 'periode' in count;
  const source=`${opname?'opname':'adjustment'}:${count.id}`;
  if (b.movements.some(m=>m.source===source)) throw Error('Opname / adjustment sudah diposting.');
  const lines: JournalLine[]=[];
  const unique = new Set<string>();
  count.items.forEach(i=> {
    if (unique.has(i.barangId)) throw Error('Barang ganda pada opname / adjustment.'); unique.add(i.barangId);
    const master=items.find(x=>x.id===i.barangId);
    if (!master) throw Error('Barang tidak ditemukan.');
    const previous=stockBalance(b,i.barangId,count.gudangId);
    const before='stockSistem' in i?i.stockSistem:i.quantitySebelum, after='stockFisik' in i?i.stockFisik:i.quantitySesudah;
    if (!Number.isFinite(after)||after<0||Math.abs((previous?.balance??0)-before)>0.000001) throw Error('Stok berubah sejak perhitungan. Buat ulang opname / adjustment dengan stok sistem terbaru.');
    const delta=roundQty(after-before);
    if (delta !== 0 && !(i.catatan?.trim() || ('alasan' in i && i.alasan?.trim()))) throw Error('Setiap selisih wajib mempunyai alasan.');
    const cost=delta<0?issueCost(b,i.barangId,count.gudangId,-delta):roundMoney(delta*(previous?.average||master.hargaRataRata));
    movement(b,{date:count.tanggal,source,number:opname?count.id:(count as Adjustment).nomorAdjustment,itemId:i.barangId,warehouseId:count.gudangId,type:opname?'opname':'adjustment',inQty:Math.max(0,delta),outQty:Math.max(0,-delta),inValue:delta>0?cost:0,outValue:delta<0?cost:0,description:i.catatan||('alasan' in i?i.alasan:'Stok sesuai')});
    if (cost>0) lines.push(...(delta>0?pair('1200','5901',cost):pair('5901','1200',cost)));
  });
  if (lines.length) appendJournal(b,{date:count.tanggal,source,sourceNumber:count.id,description:`Selisih ${opname?'stock opname':'adjustment'}`,createdBy:user,lines});
}
export function postTransfer(b: Book, t: Transfer, date: string, closings: PeriodClosing[]) {
  checkDate(b,date,closings,t.gudangAsalId);checkDate(b,date,closings,t.gudangTujuanId);
  if (t.gudangAsalId===t.gudangTujuanId || b.movements.some(m=>m.source===`transfer:${t.id}`)) throw Error('Gudang sama / transfer sudah diposting.');
  t.items.forEach(i=> {
    const cost=issueCost(b,i.barangId,t.gudangAsalId,i.quantityDasar);
    const common={date,source:`transfer:${t.id}`,number:t.nomorTransfer,itemId:i.barangId,description:t.catatan||'Transfer antar gudang'};
    movement(b,{...common,warehouseId:t.gudangAsalId,type:'transfer-out',inQty:0,outQty:i.quantityDasar,inValue:0,outValue:cost});
    movement(b,{...common,warehouseId:t.gudangTujuanId,type:'transfer-in',inQty:i.quantityDasar,outQty:0,inValue:cost,outValue:0});
  });
}
export function ledger(b: Book, code: string, from: string, to: string) {
  const a=b.accounts.find(a=>a.code===code);
  const all=b.journals.flatMap(j=>j.lines.filter(l=>l.account===code).map(l=>({journal:j,...l}))).sort((x,y)=>x.journal.date.localeCompare(y.journal.date)||x.journal.number.localeCompare(y.journal.number));
  const change=(l:JournalLine)=>a?.normal==='credit'?l.credit-l.debit:l.debit-l.credit;
  const opening=roundMoney(all.filter(l=>l.journal.date<from).reduce((s,l)=>s+change(l),0));
  let running=opening;
  const rows=all.filter(l=>l.journal.date>=from&&l.journal.date<=to).map(l=>{running=roundMoney(running+change(l));return {...l,balance:running};});
  return {opening,rows,closing:running};
}
export function trialBalance(b: Book, to: string) {
  return b.accounts.map(a=> {
    const amount=roundMoney(b.journals.filter(j=>j.date<=to).flatMap(j=>j.lines).filter(l=>l.account===a.code).reduce((s,l)=>s+l.debit-l.credit,0));
    return {...a, debit:Math.max(0,amount), credit:Math.max(0,-amount), signed:amount};
  });
}
export function statements(b: Book, from: string, to: string) {
  const lines=b.accounts.map(a=>({ ...a, amount:roundMoney(b.journals.filter(j=>j.date>=from&&j.date<=to).flatMap(j=>j.lines).filter(l=>l.account===a.code).reduce((s,l)=>s+(a.group==='revenue'?l.credit-l.debit:l.debit-l.credit),0)) }));
  const revenue=roundMoney(lines.filter(a=>a.group==='revenue').reduce((s,a)=>s+a.amount,0));
  const expenses=roundMoney(lines.filter(a=>a.group==='expense').reduce((s,a)=>s+a.amount,0));
  const trial=trialBalance(b,to);
  const sum=(group:AccountGroup)=>roundMoney(trial.filter(a=>a.group===group).reduce((s,a)=>s+(group==='asset'?a.signed:-a.signed),0));
  const cumulativeProfit=roundMoney(trial.filter(a=>['revenue','expense'].includes(a.group)).reduce((s,a)=>s-a.signed,0));
  const assets=sum('asset'),liabilities=sum('liability'),equity=roundMoney(sum('equity')+cumulativeProfit);
  return {lines,revenue,expenses,net:roundMoney(revenue-expenses),trial,assets,liabilities,equity,cumulativeProfit,difference:roundMoney(assets-liabilities-equity)};
}
export function inventoryCheck(b: Book, to: string) {
  const latest=new Map<string,StockMovement>();
  b.movements.filter(m=>m.date<=to).forEach(m=>latest.set(`${m.itemId}|${m.warehouseId}`,m));
  const stock=roundMoney([...latest.values()].reduce((s,m)=>s+m.valueBalance,0));
  const gl=trialBalance(b,to).find(a=>a.code==='1200')?.signed??0;
  return {stock,gl,difference:roundMoney(stock-gl)};
}
export function bankKey(t: BankTransaction) { return ['bank',t.bank,t.account,t.date,t.reference,t.debit,t.credit,t.balance].join('|'); }
export function postBankData(b: Book, d: FinanceData, user: string) {
  const staged = d.transactions.filter(t=>t.date>=b.cutoff).sort((a,c)=>a.date.localeCompare(c.date));
  let posted=0;
  for(const bank of [...new Set(staged.map(t=>t.bank))]) {
    const account=bank==='BRI'?'1001':bank==='BSI'?'1002':null;
    if(!account)throw Error('Bank belum didukung.');
    const source=`opening-bank:${account}`;
    if(b.journals.some(j=>j.source===source||j.source.startsWith('bank|')&&j.lines.some(l=>l.account===account))||b.bankLinks.some(l=>l.key.startsWith(`bank|${bank}|`)))continue;
    if(b.journals.some(j=>j.lines.some(l=>l.account===account)))throw Error(`${bank} sudah memiliki jurnal. Cocokkan transaksi ke jurnal existing dan isi saldo awal secara manual; jangan gandakan saldo awal.`);
    const control=d.controls.find(c=>c.bank===bank&&c.period===b.cutoff.slice(0,7));
    if(!control)throw Error(`Kontrol saldo awal ${bank} tidak tersedia pada bulan awal buku.`);
    const before=d.transactions.filter(t=>t.bank===bank&&t.bankPeriod===control.period&&t.date<b.cutoff);
    const opening=roundMoney(control.opening+before.reduce((s,t)=>s+t.credit-t.debit,0));
    if(opening!==0)appendJournal(b,{date:b.cutoff,source,sourceNumber:`Saldo awal ${bank}`,description:`Saldo awal ${bank} dari kontrol rekening; lawan modal perlu verifikasi`,createdBy:user,lines:opening>0?pair(account,'3001',opening):pair('3001',account,-opening)});
    // A zero opening is identified by the subsequent bank postings.
  }
  for (const t of staged) {
    const key=bankKey(t);
    if (b.journals.some(j=>j.source===key) || b.bankLinks.some(l=>l.key===key)) continue;
    const bank=t.bank==='BRI'?'1001':t.bank==='BSI'?'1002':null;
    const gl=t.pending||t.gl.startsWith('5999')?'1109':t.gl.split(' - ')[0];
    if (!bank || !b.accounts.some(a=>a.code===gl&&a.active) || ['1200','1300','1301',bank].includes(gl)) throw Error('Bank / akun belum dapat diposting. Pembelian stok dan perolehan aset harus melalui dokumen sumber lalu dicocokkan ke bank.');
    const amount=roundMoney(t.credit||t.debit);if (!amount) continue;
    appendJournal(b,{date:t.date,source:key,sourceNumber:t.id,description:`${t.bank}: ${t.description}${t.pending?' (pending → akun sementara)':''}`,createdBy:user,lines:t.credit>0?pair(bank,gl,amount):pair(gl,bank,amount)});
    posted++;
  }
  return posted;
}
export function postBankReview(b:Book,d:FinanceData,user:string,date=today()) {
  let count=0;
  for(const t of d.transactions.filter(t=>!t.pending)) {
    const key=bankKey(t),original=b.journals.find(j=>j.source===key),source=`bank-review:${key}`;
    if(!original?.lines.some(l=>l.account==='1109')||b.journals.some(j=>j.source===source))continue;
    const gl=t.gl.split(' - ')[0],amount=roundMoney(t.debit||t.credit);
    if(gl==='5999')continue;
    if(['1200','1300','1301','1001','1002','1109'].includes(gl)||!b.accounts.some(a=>a.code===gl&&a.active))throw Error('Reklasifikasi stok / aset perlu dokumen sumber dan jurnal penyesuaian terpisah.');
    appendJournal(b,{date,source,sourceNumber:t.id,description:`Reklasifikasi review ${t.id}: ${t.note}`,createdBy:user,lines:t.debit>0?pair(gl,'1109',amount):pair('1109',gl,amount)});count++;
  }
  return count;
}
export function linkBank(b:Book,t:BankTransaction,journalId:string) {
  const key=bankKey(t),j=b.journals.find(j=>j.id===journalId),account=t.bank==='BRI'?'1001':'1002';
  if(!j||b.bankLinks.some(l=>l.key===key||l.journalId===journalId)||b.journals.some(j=>j.source===key))throw Error('Transaksi / jurnal sudah dicocokkan atau tidak ditemukan.');
  const net=roundMoney(j.lines.filter(l=>l.account===account).reduce((s,l)=>s+l.debit-l.credit,0));
  if(net!==roundMoney(t.credit-t.debit))throw Error('Nilai / arah mutasi bank tidak sama dengan jurnal.');
  b.bankLinks.push({key,journalId});
}
export function reverseJournal(b:Book,id:string,date:string,user:string) {
  const original=b.journals.find(j=>j.id===id);
  if(!original||b.journals.some(j=>j.reversalOf===id))throw Error('Jurnal tidak ditemukan atau sudah dibalik.');
  if(original.lines.some(l=>['1200','1300','1301'].includes(l.account)))throw Error('Koreksi stok / aset melalui dokumen sumber agar register tetap konsisten.');
  return appendJournal(b,{date,source:`reversal:${id}`,sourceNumber:original.number,description:`Pembalik ${original.number}: ${original.description}`,createdBy:user,reversalOf:id,lines:original.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit}))});
}
export function postAsset(b: Book,a: FixedAsset,payment: string,user: string) {
  validateAsset(a);
  if (!['1000','1001','1002','2001','3001'].includes(payment)) throw Error('Akun pembayaran aset tidak valid.');
  const date=a.acquired < b.cutoff?b.cutoff:a.acquired;
  const priorMonth=new Date(`${b.cutoff.slice(0,7)}-01T00:00:00Z`);priorMonth.setUTCMonth(priorMonth.getUTCMonth()-1);
  const prior=a.acquired<b.cutoff?depreciation(a,priorMonth.toISOString().slice(0,7)).accumulated:0;
  const lines:JournalLine[]=[{account:'1300',debit:a.cost,credit:0}];
  if(prior>0)lines.push({account:'1301',debit:0,credit:prior});
  if(a.cost-prior>0)lines.push({account:a.acquired<b.cutoff?'3001':payment,debit:0,credit:roundMoney(a.cost-prior)});
  appendJournal(b,{date,source:`asset:${a.id}`,sourceNumber:a.id,description:`Perolehan / saldo awal aset ${a.name}`,createdBy:user,lines});
  const index=b.assets.findIndex(x=>x.id===a.id);if(index<0)b.assets.push(a);else b.assets[index]=a;
}
export function postDepreciation(b:Book,a:FixedAsset,period:string,user:string) {
  validateAsset(a);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||period>today().slice(0,7))throw Error('Periode penyusutan tidak valid / mendatang.');
  if (!b.journals.some(j=>j.source===`asset:${a.id}`)) throw Error(`Posting perolehan ${a.name} terlebih dahulu.`);
  let month=b.cutoff.slice(0,7)>a.start?b.cutoff.slice(0,7):a.start;
  while(month<=period) {
    const amount=depreciation(a,month).current;
    const source=`depreciation:${a.id}:${month}`;
    if(amount>0&&!b.journals.some(j=>j.source===source))appendJournal(b,{date:monthEnd(month),source,sourceNumber:a.id,description:`Penyusutan ${a.name} ${month}`,createdBy:user,lines:pair('5601','1301',amount)});
    const [y,m]=month.split('-').map(Number);month=new Date(Date.UTC(y,m,1)).toISOString().slice(0,7);
  }
}
export function validateBook(value: unknown): Book {
  const b=value as Book;
  if(!b||b.version!==1||!validDate(b.cutoff)||![b.accounts,b.journals,b.movements,b.usages,b.closedPeriods,b.bankLinks,b.assets].every(Array.isArray))throw Error('Data buku tidak valid.');
  if(new Set(b.accounts.map(a=>a.code)).size!==b.accounts.length)throw Error('Kode akun duplikat.');
  b.accounts.forEach(a=>{if(!a.code||!a.name||!['asset','liability','equity','revenue','expense'].includes(a.group)||!['debit','credit'].includes(a.normal)||typeof a.active!=='boolean')throw Error('Master akun tidak valid.');});
  if(new Set(b.journals.map(j=>j.source)).size!==b.journals.length)throw Error('Sumber jurnal duplikat.');
  const check:Book={...b,accounts:b.accounts.map(a=>({...a,active:true})),journals:[],movements:[],closedPeriods:[]};
  b.assets.forEach(validateAsset);
  if(new Set(b.assets.map(a=>a.id)).size!==b.assets.length)throw Error('Aset duplikat.');
  if(new Set(b.bankLinks.map(l=>l.key)).size!==b.bankLinks.length||new Set(b.bankLinks.map(l=>l.journalId)).size!==b.bankLinks.length)throw Error('Pencocokan bank duplikat.');
  for(const link of b.bankLinks){
    const parts=link.key.split('|'),j=b.journals.find(j=>j.id===link.journalId),code=parts[1]==='BRI'?'1001':parts[1]==='BSI'?'1002':null;
    const debit=Number(parts[parts.length-3]),credit=Number(parts[parts.length-2]);
    if(parts[0]!=='bank'||!code||!j||b.journals.some(j=>j.source===link.key)||!Number.isFinite(debit)||!Number.isFinite(credit)||roundMoney(j.lines.filter(l=>l.account===code).reduce((s,l)=>s+l.debit-l.credit,0))!==roundMoney(credit-debit))throw Error('Pencocokan bank tidak konsisten.');
  }
  b.journals.forEach((j,i)=>{if(!validDate(j.date)||j.id!==`journal-${i+1}`||j.number!==`JU-${String(i+1).padStart(6,'0')}`)throw Error('Tanggal / nomor jurnal tidak valid.');appendJournal(check,j);});
  b.movements.forEach(m=>{const next=movement(check,m);if(next.seq!==m.seq||Math.abs(next.balance-m.balance)>0.000001||next.valueBalance!==m.valueBalance)throw Error('Saldo mutasi tidak konsisten.');});
  if(inventoryCheck(b,'9999-12-31').difference!==0)throw Error('Nilai mutasi persediaan tidak sama dengan buku besar.');
  for(const date of new Set([...b.journals.filter(j=>j.lines.some(l=>l.account==='1200')).map(j=>j.date),...b.movements.map(m=>m.date)]))if(inventoryCheck(b,date).difference!==0)throw Error(`Persediaan tidak cocok dengan buku besar pada ${date}.`);
  return b;
}

export function pendingOpeningPrices(b:Book) { return b.movements.filter(m=>m.type==='opening'&&m.description==='Harga saldo awal belum diverifikasi'&&!b.movements.some(v=>v.source===`opening-price:${m.id}`)); }
export function verifyOpeningPrice(b:Book,id:string,cost:number,user:string) {
 const m=pendingOpeningPrices(b).find(x=>x.id===id);if(!m||!Number.isFinite(cost)||cost<0)throw Error('Harga tidak valid atau sudah diverifikasi.');
 const value=roundMoney(m.balance*cost),source=`opening-price:${id}`;
 movement(b,{date:m.date,source,number:'HARGA-AWAL',itemId:m.itemId,warehouseId:m.warehouseId,type:'adjustment',inQty:0,outQty:0,inValue:value,outValue:0,description:'Verifikasi harga saldo awal; qty tetap'});
 if(value>0)appendJournal(b,{date:m.date,source,sourceNumber:'HARGA-AWAL',description:'Penilaian saldo awal persediaan',createdBy:user,lines:pair('1200','3001',value)});
}
