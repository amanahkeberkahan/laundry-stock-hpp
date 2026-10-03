import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('outputs/test-book.json','utf8'));
const immutable=structuredClone(p);immutable.books.journals[0].description='changed';
const bad=structuredClone(p);bad.books.journals.push({id:'journal-9',number:'JU-000009',date:'2026-06-08',source:'bad-test',sourceNumber:'bad-test',description:'bad-test',createdBy:'test',lines:[{account:'1000',debit:5,credit:0},{account:'4001',debit:0,credit:4}]});
const quote=o=>`$testpayload$${JSON.stringify(o)}$testpayload$::jsonb`;
const rejects=(payload,expected,reason)=>`do $check$ begin begin perform public.commit_accounting_book(${expected},${quote(payload)},'${reason}'); raise exception 'TEST FAILED: ${reason} was accepted'; exception when others then if SQLERRM like 'TEST FAILED:%' then raise;end if;if position('${reason}' in SQLERRM)=0 then raise exception 'Unexpected rejection: %',SQLERRM;end if;end;end $check$;`;
const sql=`begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.accounting_members where role='admin' limit 1),true);
set local role authenticated;
select public.commit_accounting_book(0,${quote(p)},'integration test');
${rejects(p,0,'Revision conflict')}
${rejects(immutable,1,'Posted journal is immutable')}
${rejects(bad,1,'Journal is not balanced')}
select (select count(*) from public.journal_entries) journals,(select count(*) from public.journal_lines) lines,(select count(*) from public.stock_movements) movements,(select revision from public.accounting_books where id='pradhana') revision;
do $check$ begin begin update public.accounting_books set revision=99;raise exception 'TEST FAILED: direct update accepted';exception when insufficient_privilege then null;end;end $check$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
${rejects(p,1,'trusted admin / finance')}
do $check$ begin if (select count(*) from public.accounting_books)<>0 then raise exception 'TEST FAILED: outsider can read book';end if;end $check$;
rollback;
select (select count(*) from public.journal_entries) production_journals,(select count(*) from public.stock_movements) production_movements,(select revision from public.accounting_books where id='pradhana') production_revision;
`;
fs.writeFileSync('outputs/test-supabase.sql',sql);
