export interface FixedAsset {
  id: string; name: string; category: string; location: string;
  acquired: string; start: string; cost: number; residual: number; months: number;
}
export function validateAsset(a: FixedAsset) {
  if (!a || !a.id || !a.name?.trim() || !a.category?.trim() || typeof a.location !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(a.acquired) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(a.start) ||
      a.start < a.acquired.slice(0,7) || !Number.isFinite(a.cost) || !Number.isFinite(a.residual) ||
      a.cost <= 0 || a.residual < 0 || a.residual > a.cost ||
      !Number.isInteger(a.months) || a.months < 1 || a.months > 600) throw Error('Periksa harga, residu, masa manfaat 1–600 bulan, dan bulan mulai (minimal bulan perolehan).');
  return a;
}
const monthIndex = (s: string) => Number(s.slice(0,4))*12+Number(s.slice(5,7))-1;
const round = (n: number) => Math.round(n*100)/100;
export function depreciation(a: FixedAsset, period: string) {
  const elapsed = Math.min(a.months,Math.max(0,monthIndex(period)-monthIndex(a.start)+1));
  const base = a.cost-a.residual;
  const accumulated = round(base*elapsed/a.months);
  const previous = round(base*Math.max(0,elapsed-1)/a.months);
  const current = period >= a.start && monthIndex(period)-monthIndex(a.start) < a.months ? round(accumulated-previous) : 0;
  return { elapsed, current, accumulated, book: round(a.cost-accumulated) };
}
