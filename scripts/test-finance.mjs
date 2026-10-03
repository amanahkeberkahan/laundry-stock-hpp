import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
async function module(path) {
  const code = ts.transpileModule(fs.readFileSync(path,'utf8'), { compilerOptions: {target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.ES2020} }).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
const {parseFinance,reconcile,profit} = await module('src/lib/finance.ts');
const {depreciation,validateAsset} = await module('src/lib/assets.ts');
const data = parseFinance(JSON.parse(fs.readFileSync('outputs/finance-import.json','utf8')));
assert.equal(data.transactions.length,682);
for (const period of ['2026-06','2026-07','2026-08']) {
  for (const bank of reconcile(data,period)) assert.equal(bank.difference,0, `${period} ${bank.bank}`);
  const report = profit(data,period,true);
  const expected = data.profitSnapshot.find(l => l.label === 'LABA BERSIH SEMENTARA').values[period];
  assert.ok(Math.abs(report.net-expected)<0.01, `${period}: ${report.net} vs ${expected}`);
}
assert.ok(profit(data,'2026-08',false).net > profit(data,'2026-08',true).net);
assert.equal(profit(data,'2026-06',false).lines.find(l=>l.code.startsWith('5002')).amount,2000000);
const invalid = structuredClone(data); invalid.transactions.push(invalid.transactions[0]);
assert.throws(()=>parseFinance(invalid),/duplikat/);
const missing = structuredClone(data);missing.controls=[];
assert.equal(reconcile(missing,'2026-08')[0].difference,null);
const changed = structuredClone(data);changed.transactions[0].credit+=1;
assert.notEqual(reconcile(changed,'2026-06').find(c=>c.bank==='BSI').difference,0);
const asset = validateAsset({id:'test',name:'Mesin',category:'Mesin',location:'',acquired:'2026-06-01',start:'2026-06',cost:12000000,residual:2000000,months:60});
assert.equal(depreciation(asset,'2026-05').current,0);
assert.equal(depreciation(asset,'2026-06').accumulated,166666.67);
assert.equal(depreciation(asset,'2031-05').book,2000000);
assert.equal(depreciation(asset,'2031-06').current,0);
assert.throws(()=>validateAsset({...asset,residual:13000000}));
assert.throws(()=>validateAsset({...asset,months:0}));
console.log('PASS: 682 transactions, 6 bank controls, 3 draft profit totals, import validation, missing controls, mutation detection, depreciation boundaries.');
