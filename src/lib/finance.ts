export interface BankTransaction {
  id: string; date: string; bankPeriod: string; period: string; bank: string;
  account: string; description: string; reference: string; debit: number;
  credit: number; balance: number | null; gl: string; treatment: string;
  pending: boolean; note: string; source: string; page: number | null;
}
export interface FinanceData {
  version: 1; source: string; transactions: BankTransaction[];
  coa: { code: string; name: string; report: string; group: string; normal: string }[];
  controls: { period: string; bank: string; opening: number; closing: number }[];
  pos: { period: string; net: number; cash: number; noncash: number }[];
  balanceSnapshot: { label: string; values: Record<string, number | null> }[];
  profitSnapshot: { label: string; values: Record<string, number | null> }[];
}
export const money = (n: number | null | undefined) => n == null ? 'Belum tersedia' :
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(n);
const month = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const string = (s: unknown): s is string => typeof s === 'string';
export function parseFinance(value: unknown): FinanceData {
  const d = value as FinanceData;
  if (!d || d.version !== 1 || !string(d.source) || !Array.isArray(d.transactions) ||
      !Array.isArray(d.coa) || !Array.isArray(d.controls) || !Array.isArray(d.pos) ||
      !Array.isArray(d.balanceSnapshot) || !Array.isArray(d.profitSnapshot)) throw Error('Format impor keuangan tidak valid. Gunakan file hasil prepare-finance.py.');
  const ids = new Set<string>();
  for (const t of d.transactions) {
    if (!t || !string(t.id) || !t.id || ids.has(t.id) || !month(t.period) || !month(t.bankPeriod) ||
        !string(t.date) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !string(t.bank) || !string(t.account) ||
        ![t.description,t.reference,t.gl,t.treatment,t.note,t.source].every(string) ||
        !finite(t.debit) || !finite(t.credit) || t.debit < 0 || t.credit < 0 ||
        (t.debit > 0 && t.credit > 0) || (t.balance !== null && !finite(t.balance)) ||
        typeof t.pending !== 'boolean') throw Error('Transaksi tidak valid atau ID duplikat. Impor dibatalkan.');
    ids.add(t.id);
  }
  if (!d.transactions.length) throw Error('File tidak berisi transaksi.');
  const codes = new Set<string>();
  for (const c of d.coa) {
    if (!c || ![c.code,c.name,c.report,c.group,c.normal].every(string) || codes.has(c.code)) throw Error('COA tidak valid.');
    codes.add(c.code);
  }
  if (d.transactions.some(t => !codes.has(t.gl))) throw Error('Ada akun transaksi yang belum terdaftar di COA.');
  const keys = new Set<string>();
  for (const c of d.controls) {
    const key = `${c.period}|${c.bank}`;
    if (!c || !month(c.period) || !string(c.bank) || !finite(c.opening) || !finite(c.closing) || keys.has(key)) throw Error('Kontrol saldo tidak valid atau duplikat.');
    keys.add(key);
    if (new Set(d.transactions.filter(t => t.bank === c.bank && t.bankPeriod === c.period).map(t => t.account)).size > 1) throw Error('Kontrol bank memuat beberapa rekening; pisahkan rekening sebelum impor.');
  }
  const periods = new Set<string>();
  for (const p of d.pos) {
    if (!p || !month(p.period) || ![p.net,p.cash,p.noncash].every(finite) || periods.has(p.period)) throw Error('Ringkasan POS tidak valid.');
    periods.add(p.period);
  }
  for (const r of [...d.balanceSnapshot,...d.profitSnapshot]) {
    if (!r || !string(r.label) || !r.values || typeof r.values !== 'object' ||
        Object.entries(r.values).some(([k,v]) => !month(k) || (v !== null && !finite(v)))) throw Error('Snapshot laporan tidak valid.');
  }
  return d;
}
export function reconcile(d: FinanceData, period: string) {
  return [...new Set(d.transactions.filter(t => t.bankPeriod === period).map(t => t.bank))].map(bank => {
    const rows = d.transactions.filter(t => t.bankPeriod === period && t.bank === bank);
    const control = d.controls.find(c => c.period === period && c.bank === bank);
    const debit = rows.reduce((s,t) => s+t.debit,0), credit = rows.reduce((s,t) => s+t.credit,0);
    const computed = control ? control.opening + credit - debit : null;
    return { bank, opening: control?.opening ?? null, closing: control?.closing ?? null,
      debit, credit, computed, difference: computed == null || !control ? null : Math.round((computed-control.closing)*100)/100 };
  });
}
export function profit(d: FinanceData, period: string, includeProvisional: boolean) {
  // Original workbook SUMIFS includes all mapped accounts, including pending rows.
  const rows = d.transactions.filter(t => t.period === period &&
    (includeProvisional || (!t.pending && !t.gl.startsWith('5999'))));
  const amounts = new Map<string, number>();
  for (const t of rows) {
    const c = d.coa.find(c => c.code === t.gl);
    if (c?.report !== 'Laba Rugi') continue;
    const amount = c.normal === 'Kredit' ? t.credit-t.debit : t.debit-t.credit;
    amounts.set(t.gl,(amounts.get(t.gl) ?? 0)+amount);
  }
  const bankRevenue = amounts.get(d.coa.find(c => c.code.startsWith('4001'))?.code ?? '') ?? 0;
  const pos = d.pos.find(p => p.period === period);
  const adjustment = pos ? pos.net-bankRevenue : null;
  const lines = d.coa.filter(c => c.report === 'Laba Rugi').map(c => ({ ...c,
    amount: c.code.startsWith('4003') ? adjustment : amounts.get(c.code) ?? 0 }));
  const sum = (group: string) => lines.filter(c => c.group === group).reduce((s,c) => s+(c.amount ?? 0),0);
  const revenue = sum('Pendapatan'), hpp = sum('HPP'), expenses = sum('Beban Operasional');
  return { lines, bankRevenue, adjustment, revenue, hpp, expenses,
    net: revenue-hpp-expenses+sum('Pendapatan Lain')-sum('Beban Lain'), pos };
}
