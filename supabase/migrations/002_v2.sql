begin;
create extension if not exists pgcrypto;
alter table public.pager_tickets add column if not exists items jsonb not null default '[]', add column if not exists amount numeric, add column if not exists eta_at timestamptz, add column if not exists eta_updated_at timestamptz;
alter table public.pager_businesses add column if not exists staff_pin_hash text, add column if not exists currency text default 'USD';
create table if not exists public.pager_push_subs (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.pager_tickets(id) on delete cascade, endpoint text not null unique, p256dh text not null, auth text not null);
create index if not exists pager_push_ticket_idx on public.pager_push_subs(ticket_id);
create table if not exists public.pager_secrets (key text primary key, value text not null);
grant all on public.pager_push_subs, public.pager_secrets to service_role;
alter table public.pager_push_subs enable row level security;
alter table public.pager_secrets enable row level security;
alter table public.pager_tickets enable row level security;
drop policy if exists pager_t_read on public.pager_tickets;
drop policy if exists pager_t_ins on public.pager_tickets;
drop policy if exists pager_t_upd on public.pager_tickets;
drop policy if exists demo_ticket_select on public.pager_tickets;
drop policy if exists demo_ticket_insert on public.pager_tickets;
drop policy if exists demo_ticket_update on public.pager_tickets;
drop policy if exists demo_business_insert on public.pager_businesses;
drop policy if exists demo_business_update on public.pager_businesses;
revoke all on public.pager_tickets, public.pager_push_subs, public.pager_secrets from anon, authenticated;
revoke all on public.pager_businesses from anon;
grant select (id,slug,name,name_ar,logo_url,primary_color,accent_color,google_review_url,currency) on public.pager_businesses to anon;
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='pager_businesses' and policyname='pager_biz_read') then
 create policy pager_biz_read on public.pager_businesses for select to anon using (true);
 end if;
 if exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='pager_tickets') then alter publication supabase_realtime drop table public.pager_tickets; end if;
end $$;
update public.pager_businesses set staff_pin_hash=encode(digest(slug || ':1234','sha256'),'hex') where slug='demo-cafe' and staff_pin_hash is null;
-- Serialize allocations across all cashier instances, including concurrent requests.
create or replace function public.pager_assign_number() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.business_id::text,0));
 select coalesce(max(number),0)+1 into new.number from public.pager_tickets
 where business_id=new.business_id
 and created_at >= date_trunc('day',new.created_at at time zone 'UTC') at time zone 'UTC'
 and created_at < (date_trunc('day',new.created_at at time zone 'UTC') + interval '1 day') at time zone 'UTC';
 return new;
end $$;
revoke all on function public.pager_assign_number() from public, anon, authenticated;
drop trigger if exists pager_number_before_insert on public.pager_tickets;
create trigger pager_number_before_insert before insert on public.pager_tickets for each row execute function public.pager_assign_number();
commit;
