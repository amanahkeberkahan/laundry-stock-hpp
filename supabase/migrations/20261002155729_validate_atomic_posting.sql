create or replace function accounting_private.commit_book(p_expected bigint,p_payload jsonb,p_reason text)
returns bigint language plpgsql security definer set search_path='' as $body$
declare
 member_role text;old public.accounting_books%rowtype;b jsonb;j jsonb;l jsonb;m jsonb;a jsonb;prev jsonb;
 idx int;old_j int;old_m int;total_d numeric;total_c numeric;inv numeric;stock numeric;
 kind text;doc jsonb;period text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select role into member_role from public.accounting_members where user_id=auth.uid();
 if member_role is null or member_role not in ('admin','finance') then raise exception 'Posting requires trusted admin / finance membership';end if;
 select * into old from public.accounting_books where id='pradhana' for update;
 if old.revision<>p_expected then raise exception 'Revision conflict: reload book';end if;
 b=p_payload->'books';
 if b->>'version' is distinct from '1' or (b->>'cutoff')::date is null or jsonb_typeof(b->'journals') is distinct from 'array' or jsonb_typeof(b->'movements') is distinct from 'array' or jsonb_typeof(b->'accounts') is distinct from 'array' or jsonb_typeof(p_payload->'operations') is distinct from 'object' then raise exception 'Invalid book payload';end if;
 if jsonb_typeof(b->'assets') is distinct from 'array' or jsonb_typeof(b->'usages') is distinct from 'array' or jsonb_typeof(b->'bankLinks') is distinct from 'array' or jsonb_typeof(b->'closedPeriods') is distinct from 'array' then raise exception 'Invalid registers';end if;
 if (select count(*) from jsonb_array_elements(b->'accounts'))<>(select count(distinct value->>'code') from jsonb_array_elements(b->'accounts')) then raise exception 'Duplicate / missing account codes';end if;
 old_j=coalesce(jsonb_array_length(old.payload->'books'->'journals'),0);
 old_m=coalesce(jsonb_array_length(old.payload->'books'->'movements'),0);
 if jsonb_array_length(b->'journals')<old_j or jsonb_array_length(b->'movements')<old_m then raise exception 'Posted history cannot be deleted';end if;
 if old.payload is not null then
  if b->>'cutoff'<>old.payload->'books'->>'cutoff' then raise exception 'Cutoff is immutable';end if;
  for idx in 0..old_j-1 loop if b->'journals'->idx<>old.payload->'books'->'journals'->idx then raise exception 'Posted journal is immutable';end if;end loop;
  for idx in 0..old_m-1 loop if b->'movements'->idx<>old.payload->'books'->'movements'->idx then raise exception 'Posted movement is immutable';end if;end loop;
  for a in select value from jsonb_array_elements(old.payload->'books'->'assets') loop
   if exists(select 1 from public.journal_entries where source='asset:'||(a->>'id')) and not b->'assets' @> jsonb_build_array(a) then raise exception 'Posted asset is immutable';end if;
  end loop;
  for a in select value from jsonb_array_elements(old.payload->'books'->'bankLinks') loop
   if not b->'bankLinks' @> jsonb_build_array(a) then raise exception 'Bank link is immutable';end if;
  end loop;
  for period in select jsonb_array_elements_text(old.payload->'books'->'closedPeriods') loop
   if not b->'closedPeriods' @> jsonb_build_array(period) then raise exception 'Closed period cannot be reopened';end if;
  end loop;
 end if;
 for a in select value from jsonb_array_elements(b->'accounts') loop
  if exists(select 1 from public.coa_accounts c join public.journal_lines x on x.account=c.code where c.code=a->>'code' and (c.normal<>a->>'normal' or c.account_group<>a->>'group')) then raise exception 'Used account classification is immutable';end if;
  insert into public.coa_accounts values(a->>'code',a->>'name',a->>'group',a->>'normal',(a->>'active')::boolean)
   on conflict(code) do update set name=excluded.name,active=excluded.active,account_group=excluded.account_group,normal=excluded.normal;
 end loop;
 for idx in old_j..jsonb_array_length(b->'journals')-1 loop
  j=b->'journals'->idx;
  if j->>'id'<>'journal-'||(idx+1)::text or j->>'number'<>'JU-'||lpad((idx+1)::text,6,'0') or coalesce(j->>'description','')='' or coalesce(j->>'source','')='' or (j->>'date')::date<(b->>'cutoff')::date then raise exception 'Invalid journal identity / date';end if;
  if old.payload->'books'->'closedPeriods' @> jsonb_build_array(left(j->>'date',7)) then raise exception 'Period is closed';end if;
  if jsonb_typeof(j->'lines') is distinct from 'array' then raise exception 'Invalid journal lines';end if;
  select sum((value->>'debit')::numeric),sum((value->>'credit')::numeric) into total_d,total_c from jsonb_array_elements(j->'lines');
  if jsonb_array_length(j->'lines')<2 or total_d<>total_c or total_d<=0 then raise exception 'Journal is not balanced';end if;
  insert into public.journal_entries values(j->>'id',j->>'number',j->>'source',coalesce(j->>'sourceNumber',''),(j->>'date')::date,j->>'description',j->>'reversalOf',auth.uid());
  for l,idx in select value,ordinality::int from jsonb_array_elements(j->'lines') with ordinality loop
   if not exists(select 1 from public.coa_accounts where code=l->>'account' and active) or (l->>'debit')::numeric<>round((l->>'debit')::numeric,2) or (l->>'credit')::numeric<>round((l->>'credit')::numeric,2) then raise exception 'Invalid journal account / precision';end if;
   insert into public.journal_lines values(j->>'id',idx,l->>'account',(l->>'debit')::numeric,(l->>'credit')::numeric);
  end loop;
 end loop;
 for idx in old_m..jsonb_array_length(b->'movements')-1 loop
  m=b->'movements'->idx;
  if (m->>'seq')::int<>idx+1 or m->>'id'<>'movement-'||(idx+1)::text or (m->>'date')::date<(b->>'cutoff')::date then raise exception 'Invalid movement sequence / date';end if;
  if old.payload->'books'->'closedPeriods' @> jsonb_build_array(left(m->>'date',7)) then raise exception 'Period is closed';end if;
  select jsonb_build_object('balance',balance,'valueBalance',value_balance,'date',date) into prev from public.stock_movements where item_id=m->>'itemId' and warehouse_id=m->>'warehouseId' order by seq desc limit 1;
  if (m->>'date')::date<coalesce((prev->>'date')::date,(b->>'cutoff')::date) or (m->>'balance')::numeric<>coalesce((prev->>'balance')::numeric,0)+(m->>'inQty')::numeric-(m->>'outQty')::numeric or (m->>'valueBalance')::numeric<>coalesce((prev->>'valueBalance')::numeric,0)+(m->>'inValue')::numeric-(m->>'outValue')::numeric then raise exception 'Invalid chronological stock balance';end if;
  if m->>'type' not in ('opening','purchase','usage','opname','adjustment','transfer-in','transfer-out','void') then raise exception 'Invalid movement type';end if;
  if (m->>'outQty')::numeric>0 and m->>'type'<>'void' then
   if coalesce((prev->>'balance')::numeric,0)<=0 or (m->>'outValue')::numeric<>(case when (m->>'outQty')::numeric=(prev->>'balance')::numeric then (prev->>'valueBalance')::numeric else round((m->>'outQty')::numeric*(prev->>'valueBalance')::numeric/(prev->>'balance')::numeric,2) end) then raise exception 'Invalid moving average issue cost';end if;
  end if;
  if abs((m->>'average')::numeric-case when (m->>'balance')::numeric=0 then 0 else (m->>'valueBalance')::numeric/(m->>'balance')::numeric end)>0.000001 then raise exception 'Invalid average value';end if;
  if (m->>'balance')::numeric=0 and (m->>'valueBalance')::numeric<>0 then raise exception 'Empty inventory must have zero value';end if;
  insert into public.stock_movements values(m->>'id',(m->>'seq')::bigint,(m->>'date')::date,m->>'source',m->>'number',m->>'itemId',m->>'warehouseId',m->>'type',(m->>'inQty')::numeric,(m->>'outQty')::numeric,(m->>'balance')::numeric,(m->>'unitCost')::numeric,(m->>'inValue')::numeric,(m->>'outValue')::numeric,(m->>'valueBalance')::numeric,(m->>'average')::numeric,m->>'description');
 end loop;
 select coalesce(sum(debit-credit),0) into inv from public.journal_lines where account='1200';
 select coalesce(sum(value_balance),0) into stock from (select distinct on(item_id,warehouse_id) value_balance from public.stock_movements order by item_id,warehouse_id,seq desc) last_stock;
 if inv<>stock then raise exception 'Inventory GL differs from stock value';end if;
 for period in select distinct date::text from public.stock_movements union select distinct e.date::text from public.journal_entries e join public.journal_lines l on l.journal_id=e.id where l.account='1200' loop
  select coalesce(sum(l.debit-l.credit),0) into inv from public.journal_lines l join public.journal_entries e on e.id=l.journal_id where l.account='1200' and e.date<=period::date;
  select coalesce(sum(value_balance),0) into stock from (select distinct on(item_id,warehouse_id) value_balance from public.stock_movements where date<=period::date order by item_id,warehouse_id,seq desc) daily_stock;
  if inv<>stock then raise exception 'Inventory GL mismatch at %',period;end if;
 end loop;
 foreach kind in array array['barang','gudang','pembelian','stockOpname','transfers','adjustments','periodClosings'] loop
  if jsonb_typeof(p_payload->'operations'->kind) is distinct from 'array' then raise exception 'Invalid operations';end if;
  for doc in select value from jsonb_array_elements(p_payload->'operations'->kind) loop
   insert into public.accounting_documents values(kind,doc->>'id',doc) on conflict on constraint accounting_documents_pkey do update set payload=excluded.payload;
  end loop;
 end loop;
 update public.accounting_books set revision=revision+1,payload=p_payload,updated_at=now(),updated_by=auth.uid() where id='pradhana' returning revision into p_expected;
 return p_expected;
end $body$;
