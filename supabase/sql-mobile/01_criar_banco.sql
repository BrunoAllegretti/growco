create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  joined_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  uses integer not null default 0,
  max_uses integer not null default 20 check (max_uses between 1 and 100)
);

create table if not exists public.records (
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('products', 'moves', 'sales', 'transactions', 'employees', 'payments', 'teams', 'goals', 'timeEntries', 'settings')),
  record_id text not null check (char_length(record_id) between 1 and 140),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (company_id, kind, record_id)
);

create table if not exists public.user_profiles (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id text,
  primary key (company_id, user_id)
);

create unique index if not exists unique_employee_identity
  on public.user_profiles (company_id, employee_id)
  where employee_id is not null;

create index if not exists records_company_kind on public.records (company_id, kind);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;
alter table public.records enable row level security;
alter table public.user_profiles enable row level security;

create or replace function public.is_company_member(p_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_company_owner(p_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

create or replace function public.can_edit_record(p_company uuid, p_kind text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_kind in ('employees', 'payments', 'teams', 'settings') then public.is_company_owner(p_company)
    else public.is_company_member(p_company)
  end;
$$;

create or replace function public.can_manage_time_entry(p_company uuid, p_data jsonb)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_company_owner(p_company) or exists (
    select 1 from public.user_profiles p
    where p.company_id = p_company and p.user_id = (select auth.uid())
      and p.employee_id = (p_data->>'employee_id')
  );
$$;

create policy companies_read on public.companies for select to authenticated
using (public.is_company_member(id));

create policy members_read on public.company_members for select to authenticated
using (user_id = (select auth.uid()));

create policy profiles_read on public.user_profiles for select to authenticated
using (user_id = (select auth.uid()) and public.is_company_member(company_id));

create policy records_read on public.records for select to authenticated
using (public.is_company_member(company_id)
  and (kind not in ('employees', 'payments') or public.is_company_owner(company_id))
  and (kind <> 'transactions' or (data->>'payment_id') is null or public.is_company_owner(company_id)));

create policy records_insert on public.records for insert to authenticated
with check (public.can_edit_record(company_id, kind)
  and (kind <> 'timeEntries' or public.can_manage_time_entry(company_id, data))
  and updated_by = (select auth.uid()));

create policy records_update on public.records for update to authenticated
using (public.can_edit_record(company_id, kind)
  and (kind <> 'timeEntries' or public.can_manage_time_entry(company_id, data)))
with check (public.can_edit_record(company_id, kind)
  and (kind <> 'timeEntries' or public.can_manage_time_entry(company_id, data))
  and updated_by = (select auth.uid()));

create policy records_delete on public.records for delete to authenticated
using (public.can_edit_record(company_id, kind)
  and (kind <> 'timeEntries' or public.can_manage_time_entry(company_id, data)));

create or replace function public.list_company_employees(p_company uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_employees jsonb;
  v_email text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  select email into v_email from auth.users where id = (select auth.uid());
  select coalesce(jsonb_agg(
    (r.data - 'salary' - 'email') || jsonb_build_object('salary', 0,
      'email', case when lower(r.data->>'email') = lower(v_email) then v_email else '' end)
  ), '[]'::jsonb) into v_employees
  from public.records r
  where r.company_id = p_company and r.kind = 'employees';
  return v_employees;
end;
$$;

create or replace function public.create_company(p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_company uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Faça login antes de criar uma empresa';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(trim(p_name)) > 120 then
    raise exception 'Nome de empresa inválido';
  end if;
  if exists (select 1 from public.company_members where user_id = (select auth.uid())) then
    raise exception 'Esta conta já pertence a uma empresa';
  end if;
  insert into public.companies (name, owner_id)
  values (trim(p_name), (select auth.uid())) returning id into v_company;
  insert into public.company_members (company_id, user_id, role)
  values (v_company, (select auth.uid()), 'owner');
  return v_company;
end;
$$;

create or replace function public.create_invite(p_company uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_company_owner(p_company) then
    raise exception 'Somente o dono pode convidar funcionários';
  end if;
  v_code := replace(gen_random_uuid()::text, '-', '');
  insert into public.company_invites (company_id, code_hash, expires_at)
  values (p_company, md5(v_code), now() + interval '7 days');
  return v_code;
end;
$$;

create or replace function public.join_company(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_company uuid;
  v_employee text;
begin
  if (select auth.uid()) is null then
    raise exception 'Faça login antes de entrar na empresa';
  end if;
  if exists (select 1 from public.company_members where user_id = (select auth.uid())) then
    raise exception 'Esta conta já pertence a uma empresa';
  end if;
  if p_code is null or char_length(p_code) <> 32 then
    raise exception 'Convite inválido';
  end if;
  update public.company_invites
  set uses = uses + 1
  where code_hash = md5(lower(trim(p_code))) and expires_at > now() and uses < max_uses
  returning company_id into v_company;
  if v_company is null then
    raise exception 'Convite inválido, esgotado ou expirado';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (v_company, (select auth.uid()), 'employee');
  select r.record_id into v_employee
  from public.records r, auth.users u
  where r.company_id = v_company and r.kind = 'employees'
    and u.id = (select auth.uid())
    and lower(r.data->>'email') = lower(u.email)
    and coalesce(r.data->>'email', '') <> ''
  limit 1;
  insert into public.user_profiles (company_id, user_id, employee_id)
  values (v_company, (select auth.uid()), v_employee);
  return v_company;
end;
$$;

create or replace function public.link_my_employee(p_company uuid, p_employee_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_employee_email text;
  v_user_email text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  select data->>'email' into v_employee_email
  from public.records where company_id = p_company and kind = 'employees' and record_id = p_employee_id;
  if not found then
    raise exception 'Funcionário não encontrado';
  end if;
  select email into v_user_email from auth.users where id = (select auth.uid());
  if not public.is_company_owner(p_company) and lower(coalesce(v_employee_email, '')) <> lower(coalesce(v_user_email, '')) then
    raise exception 'Este funcionário deve ter o mesmo e-mail da sua conta';
  end if;
  insert into public.user_profiles (company_id, user_id, employee_id)
  values (p_company, (select auth.uid()), p_employee_id)
  on conflict (company_id, user_id) do update set employee_id = excluded.employee_id;
end;
$$;

create or replace function public.save_product(p_company uuid, p_product jsonb, p_edit boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_id text;
  v_stock numeric;
  v_price numeric;
  v_cost numeric;
  v_min_stock numeric;
  v_move_id text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  v_id := p_product->>'id';
  v_price := (p_product->>'price')::numeric;
  v_cost := (p_product->>'cost')::numeric;
  v_min_stock := (p_product->>'min_stock')::numeric;
  if v_id is null or coalesce(trim(p_product->>'name'), '') = '' or v_price < 0 or v_cost < 0 or v_min_stock < 0 then
    raise exception 'Informações inválidas para o produto';
  end if;
  if p_edit then
    update public.records
    set data = data || jsonb_build_object('name', p_product->>'name', 'sku', coalesce(p_product->>'sku',''),
      'price', v_price, 'cost', v_cost, 'min_stock', v_min_stock),
      updated_at = now(), updated_by = (select auth.uid())
    where company_id = p_company and kind = 'products' and record_id = v_id;
    if not found then
      raise exception 'Produto não encontrado';
    end if;
  else
    v_stock := (p_product->>'stock')::numeric;
    if v_stock < 0 or v_stock <> trunc(v_stock) then
      raise exception 'Estoque inicial inválido';
    end if;
    insert into public.records (company_id, kind, record_id, data, updated_by)
    values (p_company, 'products', v_id, p_product, (select auth.uid()));
    if v_stock > 0 then
      v_move_id := replace(gen_random_uuid()::text, '-', '');
      insert into public.records (company_id, kind, record_id, data, updated_by)
      values (p_company, 'moves', v_move_id,
        jsonb_build_object('id', v_move_id, 'product_id', v_id, 'type', 'in',
          'quantity', v_stock, 'reason', 'Estoque inicial', 'created_at',
          to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        (select auth.uid()));
    end if;
  end if;
end;
$$;

create or replace function public.register_sale(p_company uuid, p_sale_id text, p_customer text, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row record;
  v_product jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_quantity numeric;
  v_price numeric;
  v_now text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_move_id text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'Adicione de 1 a 100 itens';
  end if;
  for v_row in
    select item->>'product_id' as product_id, sum((item->>'quantity')::numeric) as quantity
    from jsonb_array_elements(p_items) as elements(item)
    group by item->>'product_id'
    order by item->>'product_id'
  loop
    v_quantity := v_row.quantity;
    if v_row.product_id is null or v_quantity <= 0 or v_quantity <> trunc(v_quantity) then
      raise exception 'Quantidade inválida';
    end if;
    update public.records
    set data = jsonb_set(data, '{stock}', to_jsonb((data->>'stock')::numeric - v_quantity)),
        updated_at = now(), updated_by = (select auth.uid())
    where company_id = p_company and kind = 'products' and record_id = v_row.product_id
      and coalesce((data->>'stock')::numeric, 0) >= v_quantity
      and coalesce((data->>'active')::boolean, true) = true
    returning data into v_product;
    if not found then
      raise exception 'Estoque insuficiente ou produto indisponível: %', v_row.product_id;
    end if;
    v_price := (v_product->>'price')::numeric;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_row.product_id, 'quantity', v_quantity, 'unit_price', v_price
    ));
    v_total := v_total + v_quantity * v_price;
    v_move_id := replace(gen_random_uuid()::text, '-', '');
    insert into public.records (company_id, kind, record_id, data, updated_by)
    values (p_company, 'moves', v_move_id,
      jsonb_build_object('id', v_move_id, 'product_id', v_row.product_id,
        'type', 'out', 'quantity', v_quantity, 'reason', 'Venda', 'created_at', v_now),
      (select auth.uid()));
  end loop;
  insert into public.records (company_id, kind, record_id, data, updated_by)
  values (p_company, 'sales', p_sale_id,
    jsonb_build_object('id', p_sale_id, 'items', v_items, 'customer_name', coalesce(p_customer,''),
      'total', v_total, 'occurred_at', v_now, 'paid', false),
    (select auth.uid()));
  return jsonb_build_object('total', v_total, 'items', v_items, 'occurred_at', v_now);
end;
$$;

create or replace function public.mark_sale_paid(p_company uuid, p_sale_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_sale jsonb;
  v_transaction_id text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  update public.records
  set data = jsonb_set(data, '{paid}', 'true'::jsonb),
      updated_at = now(), updated_by = (select auth.uid())
  where company_id = p_company and kind = 'sales' and record_id = p_sale_id
    and coalesce((data->>'paid')::boolean, false) = false
  returning data into v_sale;
  if not found then
    raise exception 'Venda inexistente ou já paga';
  end if;
  v_transaction_id := replace(gen_random_uuid()::text, '-', '');
  insert into public.records (company_id, kind, record_id, data, updated_by)
  values (p_company, 'transactions', v_transaction_id,
    jsonb_build_object('id', v_transaction_id, 'type', 'income',
      'description', 'Venda', 'amount', (v_sale->>'total')::numeric,
      'category', '', 'occurred_at', left(v_sale->>'occurred_at',10)),
    (select auth.uid()));
end;
$$;

create or replace function public.add_stock(p_company uuid, p_product_id text, p_quantity numeric, p_cost numeric, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_product jsonb;
  v_cost numeric;
  v_now text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_move_id text;
  v_transaction_id text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  if p_quantity <= 0 or p_quantity <> trunc(p_quantity) or p_quantity > 1000000 or p_cost < 0 then
    raise exception 'Quantidade ou custo inválido';
  end if;
  update public.records
  set data = jsonb_set(jsonb_set(data, '{stock}', to_jsonb((data->>'stock')::numeric + p_quantity)),
      '{cost}', to_jsonb(coalesce(p_cost, (data->>'cost')::numeric, 0))),
      updated_at = now(), updated_by = (select auth.uid())
  where company_id = p_company and kind = 'products' and record_id = p_product_id
  returning data into v_product;
  if not found then
    raise exception 'Produto não encontrado';
  end if;
  v_cost := coalesce(p_cost, (v_product->>'cost')::numeric, 0);
  v_move_id := replace(gen_random_uuid()::text, '-', '');
  insert into public.records (company_id, kind, record_id, data, updated_by)
  values (p_company, 'moves', v_move_id,
    jsonb_build_object('id', v_move_id, 'product_id', p_product_id,
      'type', 'in', 'quantity', p_quantity, 'reason', coalesce(nullif(trim(p_reason),''), 'Compra de fornecedor'),
      'created_at', v_now), (select auth.uid()));
  if v_cost > 0 then
    v_transaction_id := replace(gen_random_uuid()::text, '-', '');
    insert into public.records (company_id, kind, record_id, data, updated_by)
    values (p_company, 'transactions', v_transaction_id,
      jsonb_build_object('id', v_transaction_id, 'type', 'expense',
        'description', coalesce(nullif(trim(p_reason),''), 'Compra de fornecedor'),
        'amount', p_quantity * v_cost, 'category', '',
        'occurred_at', (now() at time zone 'UTC')::date::text), (select auth.uid()));
  end if;
end;
$$;

grant usage on schema public to authenticated;
grant select on public.companies, public.company_members, public.records, public.user_profiles to authenticated;
grant insert, update, delete on public.records to authenticated;

revoke all on function public.list_company_employees(uuid) from public;
revoke all on function public.create_company(text) from public;
revoke all on function public.create_invite(uuid) from public;
revoke all on function public.join_company(text) from public;
revoke all on function public.link_my_employee(uuid, text) from public;
revoke all on function public.save_product(uuid, jsonb, boolean) from public;
revoke all on function public.register_sale(uuid, text, text, jsonb) from public;
revoke all on function public.mark_sale_paid(uuid, text) from public;
revoke all on function public.add_stock(uuid, text, numeric, numeric, text) from public;
grant execute on function public.list_company_employees(uuid) to authenticated;
grant execute on function public.create_company(text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.join_company(text) to authenticated;
grant execute on function public.link_my_employee(uuid, text) to authenticated;
grant execute on function public.save_product(uuid, jsonb, boolean) to authenticated;
grant execute on function public.register_sale(uuid, text, text, jsonb) to authenticated;
grant execute on function public.mark_sale_paid(uuid, text) to authenticated;
grant execute on function public.add_stock(uuid, text, numeric, numeric, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end;
$$;
