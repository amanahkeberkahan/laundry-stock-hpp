-- Additive shared books. Legacy tables and data remain untouched.
create schema if not exists accounting_private;
revoke all on schema accounting_private from public;
create table public.accounting_members (
 user_id uuid primary key references auth.users(id),
 role text not null check(role in ('admin','finance','owner','staff_gudang'))
);
insert into public.accounting_members(user_id,role)
 select id,role from public.profiles where aktif=true and role='admin';
create table public.accounting_books (
 id text primary key check(id='pradhana'),revision bigint not null default 0,
 payload jsonb,updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
insert into public.accounting_books(id) values('pradhana');
create table public.coa_accounts (
 code text primary key,name text not null,account_group text not null check(account_group in ('asset','liability','equity','revenue','expense')),
 normal text not null check(normal in ('debit','credit')),active boolean not null
);
create table public.journal_entries (
 id text primary key,number text not null unique,source text not null unique,source_number text not null,
 date date not null,description text not null,reversal_of text references public.journal_entries(id),created_by uuid not null references auth.users(id)
);
create table public.journal_lines (
 journal_id text references public.journal_entries(id),line_no int,account text not null references public.coa_accounts(code),
 debit numeric(20,2) not null check(debit>=0),credit numeric(20,2) not null check(credit>=0),
 primary key(journal_id,line_no),check((debit>0 and credit=0) or (credit>0 and debit=0))
);
create index journal_lines_account on public.journal_lines(account,journal_id);
create index journal_entries_date on public.journal_entries(date);
create table public.stock_movements (
 id text primary key,seq bigint unique not null,date date not null,source text not null,transaction_number text not null,
 item_id text not null,warehouse_id text not null,type text not null,
 qty_in numeric(20,6) not null check(qty_in>=0),qty_out numeric(20,6) not null check(qty_out>=0),
 balance numeric(20,6) not null check(balance>=0),unit_cost numeric not null,
 value_in numeric(20,2) not null check(value_in>=0),value_out numeric(20,2) not null check(value_out>=0),
 value_balance numeric(20,2) not null check(value_balance>=0),average numeric not null,description text not null,
 check(qty_in=0 or qty_out=0)
);
create index stock_movements_item_warehouse_date on public.stock_movements(item_id,warehouse_id,date,seq);
create table public.accounting_documents(kind text not null,id text not null,payload jsonb not null,primary key(kind,id));
do $policy$
declare t text;
begin
 foreach t in array array['accounting_members','accounting_books','coa_accounts','journal_entries','journal_lines','stock_movements','accounting_documents'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  if t='accounting_members' then
   execute 'create policy accounting_read_self on public.accounting_members for select to authenticated using(user_id=(select auth.uid()))';
  else
   execute format('create policy accounting_read_member on public.%I for select to authenticated using(exists(select 1 from public.accounting_members where user_id=(select auth.uid())))',t);
  end if;
 end loop;
end $policy$;

create function accounting_private.commit_book(p_expected bigint,p_payload jsonb,p_reason text)
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
 if b->>'version'<>'1' or (b->>'cutoff')::date is null or jsonb_typeof(b->'journals')<>'array' or jsonb_typeof(b->'movements')<>'array' or jsonb_typeof(b->'accounts')<>'array' or jsonb_typeof(p_payload->'operations')<>'object' then raise exception 'Invalid book payload';end if;
 old_j=coalesce(jsonb_array_length(old.payload->'books'->'journals'),0);
 old_m=coalesce(jsonb_array_length(old.payload->'books'->'movements'),0);
 if jsonb_array_length(b->'journals')<old_j or jsonb_array_length(b->'movements')<old_m then raise exception 'Posted history cannot be deleted';end if;
 if old.payload is not null then
  if b->>'cutoff'<>old.payload->'books'->>'cutoff' then raise exception 'Cutoff is immutable';end if;
  for idx in 0..old_j-1 loop if b->'journals'->idx<>old.payload->'books'->'journals'->idx then raise exception 'Posted journal is immutable';end if;end loop;
  for idx in 0..old_m-1 loop if b->'movements'->idx<>old.payload->'books'->'movements'->idx then raise exception 'Posted movement is immutable';end if;end loop;
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
  if (m->>'balance')::numeric=0 and (m->>'valueBalance')::numeric<>0 then raise exception 'Empty inventory must have zero value';end if;
  insert into public.stock_movements values(m->>'id',(m->>'seq')::bigint,(m->>'date')::date,m->>'source',m->>'number',m->>'itemId',m->>'warehouseId',m->>'type',(m->>'inQty')::numeric,(m->>'outQty')::numeric,(m->>'balance')::numeric,(m->>'unitCost')::numeric,(m->>'inValue')::numeric,(m->>'outValue')::numeric,(m->>'valueBalance')::numeric,(m->>'average')::numeric,m->>'description');
 end loop;
 select coalesce(sum(debit-credit),0) into inv from public.journal_lines where account='1200';
 select coalesce(sum(value_balance),0) into stock from (select distinct on(item_id,warehouse_id) value_balance from public.stock_movements order by item_id,warehouse_id,seq desc) last_stock;
 if inv<>stock then raise exception 'Inventory GL differs from stock value';end if;
 foreach kind in array array['barang','gudang','pembelian','stockOpname','transfers','adjustments','periodClosings'] loop
  if jsonb_typeof(p_payload->'operations'->kind)<>'array' then raise exception 'Invalid operations';end if;
  for doc in select value from jsonb_array_elements(p_payload->'operations'->kind) loop
   insert into public.accounting_documents values(kind,doc->>'id',doc) on conflict(kind,id) do update set payload=excluded.payload;
  end loop;
 end loop;
 update public.accounting_books set revision=revision+1,payload=p_payload,updated_at=now(),updated_by=auth.uid() where id='pradhana' returning revision into p_expected;
 return p_expected;
end $body$;
revoke all on function accounting_private.commit_book(bigint,jsonb,text) from public;
grant usage on schema accounting_private to authenticated;
grant execute on function accounting_private.commit_book(bigint,jsonb,text) to authenticated;
create function public.commit_accounting_book(p_expected bigint,p_payload jsonb,p_reason text)
returns bigint language sql security invoker set search_path='' as $$select accounting_private.commit_book(p_expected,p_payload,p_reason)$$;
revoke all on function public.commit_accounting_book(bigint,jsonb,text) from public;
grant execute on function public.commit_accounting_book(bigint,jsonb,text) to authenticated;
