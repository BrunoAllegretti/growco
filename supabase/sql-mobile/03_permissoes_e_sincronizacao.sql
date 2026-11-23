create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.ensure_member_employee(p_company uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_name text;
  v_employee_id text;
  v_existing text;
begin
  if not exists (
    select 1 from public.company_members
    where company_id = p_company and user_id = p_user
  ) then
    raise exception 'Esta conta não pertence à empresa';
  end if;
  select u.email, coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(u.email, '@', 1), ''), 'Funcionário')
  into v_email, v_name
  from auth.users u where u.id = p_user;
  if v_email is null then
    raise exception 'Conta sem e-mail';
  end if;
  select p.employee_id into v_existing
  from public.user_profiles p
  where p.company_id = p_company and p.user_id = p_user;
  if v_existing is not null and exists (
    select 1 from public.records r
    where r.company_id = p_company and r.kind = 'employees' and r.record_id = v_existing
  ) then
    return v_existing;
  end if;
  select r.record_id into v_employee_id
  from public.records r
  where r.company_id = p_company and r.kind = 'employees'
    and lower(trim(r.data->>'email')) = lower(trim(v_email))
    and not exists (
      select 1 from public.user_profiles p
      where p.company_id = p_company and p.employee_id = r.record_id and p.user_id <> p_user
    )
  order by r.updated_at desc
  limit 1;
  if v_employee_id is null then
    v_employee_id := replace(gen_random_uuid()::text, '-', '');
    insert into public.records (company_id, kind, record_id, data, updated_by)
    values (p_company, 'employees', v_employee_id,
      jsonb_build_object('id', v_employee_id, 'full_name', left(v_name, 80),
        'email', lower(v_email), 'role_title',
        case when exists (
          select 1 from public.company_members
          where company_id = p_company and user_id = p_user and role = 'owner'
        ) then 'Administrador' else 'Funcionário' end,
        'department_id', '', 'salary', 0, 'hire_date', current_date::text, 'active', true),
      p_user);
  end if;
  insert into public.user_profiles (company_id, user_id, employee_id)
  values (p_company, p_user, v_employee_id)
  on conflict (company_id, user_id)
  do update set employee_id = excluded.employee_id;
  return v_employee_id;
end;
$$;
revoke all on function private.ensure_member_employee(uuid, uuid) from public, anon, authenticated;

create or replace function public.join_company(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_company uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Faça login antes de entrar na empresa';
  end if;
  if exists (select 1 from public.company_members where user_id = (select auth.uid())) then
    raise exception 'Esta conta já pertence a uma empresa';
  end if;
  if p_code is null or char_length(trim(p_code)) <> 32 then
    raise exception 'Convite inválido';
  end if;
  update public.company_invites
    set uses = uses + 1
    where code_hash = md5(lower(trim(p_code)))
      and expires_at > now() and uses < max_uses
    returning company_id into v_company;
  if v_company is null then
    raise exception 'Convite inválido, esgotado ou expirado';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (v_company, (select auth.uid()), 'employee');
  perform private.ensure_member_employee(v_company, (select auth.uid()));
  return v_company;
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
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Nome de empresa inválido';
  end if;
  if exists (select 1 from public.company_members where user_id = (select auth.uid())) then
    raise exception 'Esta conta já pertence a uma empresa';
  end if;
  insert into public.companies (name, owner_id)
  values (trim(p_name), (select auth.uid())) returning id into v_company;
  insert into public.company_members (company_id, user_id, role)
  values (v_company, (select auth.uid()), 'owner');
  perform private.ensure_member_employee(v_company, (select auth.uid()));
  return v_company;
end;
$$;

create or replace function public.can_edit_record(p_company uuid, p_kind text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_company_owner(p_company)
    and p_kind in ('employees', 'payments', 'teams', 'goals', 'settings', 'transactions');
$$;

create or replace function public.list_company_members(p_company uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_company_owner(p_company) then
    raise exception 'Somente o administrador pode visualizar contas vinculadas';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id, 'role', m.role, 'joined_at', m.joined_at,
    'email', u.email, 'employee_id', p.employee_id
  ) order by m.joined_at), '[]'::jsonb)
  into v_result
  from public.company_members m
  join auth.users u on u.id = m.user_id
  left join public.user_profiles p on p.company_id = m.company_id and p.user_id = m.user_id
  where m.company_id = p_company;
  return v_result;
end;
$$;
revoke all on function public.list_company_members(uuid) from public, anon;
grant execute on function public.list_company_members(uuid) to authenticated;

create or replace function public.clock_my_time(p_company uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_employee_id text;
  v_row_id text;
  v_row jsonb;
  v_now text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_new_id text;
begin
  if not public.is_company_member(p_company) then
    raise exception 'Sem acesso à empresa';
  end if;
  select p.employee_id into v_employee_id
    from public.user_profiles p
    where p.company_id = p_company and p.user_id = (select auth.uid())
    for update;
  if v_employee_id is null then
    raise exception 'Vincule seu cadastro de funcionário antes de registrar o ponto';
  end if;
  if not exists (
    select 1 from public.records r
    where r.company_id = p_company and r.kind = 'employees'
      and r.record_id = v_employee_id
      and coalesce((r.data->>'active')::boolean, true)
  ) then
    raise exception 'Cadastro de funcionário inativo ou não encontrado';
  end if;
  select r.record_id, r.data into v_row_id, v_row
    from public.records r
    where r.company_id = p_company and r.kind = 'timeEntries'
      and r.data->>'employee_id' = v_employee_id
      and coalesce(r.data->>'clock_out', '') = ''
    order by r.updated_at desc
    limit 1 for update;
  if v_row_id is not null then
    update public.records
      set data = jsonb_set(data, '{clock_out}', to_jsonb(v_now)),
        updated_at = now(), updated_by = (select auth.uid())
      where company_id = p_company and kind = 'timeEntries' and record_id = v_row_id;
    return jsonb_build_object('action', 'out', 'at', v_now);
  end if;
  v_new_id := replace(gen_random_uuid()::text, '-', '');
  insert into public.records (company_id, kind, record_id, data, updated_by)
  values (p_company, 'timeEntries', v_new_id,
    jsonb_build_object('id', v_new_id, 'employee_id', v_employee_id,
      'clock_in', v_now, 'clock_out', null), (select auth.uid()));
  return jsonb_build_object('action', 'in', 'at', v_now);
end;
$$;
revoke all on function public.clock_my_time(uuid) from public, anon;
grant execute on function public.clock_my_time(uuid) to authenticated;

drop policy if exists members_owner_read on public.company_members;
create policy members_owner_read on public.company_members for select to authenticated
using (public.is_company_owner(company_id));

drop policy if exists records_read on public.records;
create policy records_read on public.records for select to authenticated
using (
  public.is_company_member(company_id)
  and (
    public.is_company_owner(company_id)
    or kind in ('products', 'moves', 'sales', 'goals', 'teams', 'settings')
    or (kind = 'timeEntries' and exists (
      select 1 from public.user_profiles p
      where p.company_id = records.company_id
        and p.user_id = (select auth.uid())
        and p.employee_id = records.data->>'employee_id'
    ))
  )
);

revoke execute on function public.is_company_member(uuid) from public, anon;
revoke execute on function public.is_company_owner(uuid) from public, anon;
revoke execute on function public.can_edit_record(uuid, text) from public, anon;
revoke execute on function public.can_manage_time_entry(uuid, jsonb) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;
grant execute on function public.can_edit_record(uuid, text) to authenticated;
grant execute on function public.can_manage_time_entry(uuid, jsonb) to authenticated;

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
  if not public.is_company_owner(p_company) then
    raise exception 'Somente o administrador pode criar ou editar produtos';
  end if;
  v_id := p_product->>'id';
  v_price := (p_product->>'price')::numeric;
  v_cost := (p_product->>'cost')::numeric;
  v_min_stock := (p_product->>'min_stock')::numeric;
  if v_id is null or char_length(v_id) not between 1 and 140
    or coalesce(trim(p_product->>'name'), '') = ''
    or v_price is null or v_cost is null or v_min_stock is null
    or v_price < 0 or v_cost < 0 or v_min_stock < 0
    or v_price > 1000000000 or v_cost > 1000000000 then
    raise exception 'Informações inválidas para o produto';
  end if;
  if p_edit then
    update public.records
    set data = data || jsonb_build_object('name', trim(p_product->>'name'),
      'sku', coalesce(p_product->>'sku',''), 'price', v_price,
      'cost', v_cost, 'min_stock', v_min_stock),
      updated_at = now(), updated_by = (select auth.uid())
    where company_id = p_company and kind = 'products' and record_id = v_id;
    if not found then raise exception 'Produto não encontrado'; end if;
  else
    v_stock := (p_product->>'stock')::numeric;
    if v_stock is null or v_stock < 0 or v_stock > 1000000000
      or v_stock <> trunc(v_stock) then
      raise exception 'Estoque inicial inválido';
    end if;
    insert into public.records (company_id, kind, record_id, data, updated_by)
    values (p_company, 'products', v_id,
      jsonb_build_object('id', v_id, 'name', trim(p_product->>'name'),
        'sku', coalesce(p_product->>'sku', ''), 'price', v_price,
        'cost', v_cost, 'min_stock', v_min_stock,
        'stock', v_stock, 'active', true), (select auth.uid()));
    if v_stock > 0 then
      v_move_id := replace(gen_random_uuid()::text, '-', '');
      insert into public.records (company_id, kind, record_id, data, updated_by)
      values (p_company, 'moves', v_move_id,
        jsonb_build_object('id', v_move_id, 'product_id', v_id,
          'type', 'in', 'quantity', v_stock, 'reason', 'Estoque inicial',
          'created_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        (select auth.uid()));
    end if;
  end if;
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
  if not public.is_company_owner(p_company) then
    raise exception 'Somente o administrador pode adicionar estoque';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity <> trunc(p_quantity)
    or p_quantity > 1000000 or p_cost is null or p_cost < 0 or p_cost > 1000000000 then
    raise exception 'Quantidade ou custo inválido';
  end if;
  update public.records
    set data = jsonb_set(jsonb_set(data, '{stock}',
      to_jsonb((data->>'stock')::numeric + p_quantity)), '{cost}', to_jsonb(p_cost)),
      updated_at = now(), updated_by = (select auth.uid())
    where company_id = p_company and kind = 'products' and record_id = p_product_id
    returning data into v_product;
  if not found then raise exception 'Produto não encontrado'; end if;
  v_cost := p_cost;
  v_move_id := replace(gen_random_uuid()::text, '-', '');
  insert into public.records (company_id, kind, record_id, data, updated_by)
  values (p_company, 'moves', v_move_id,
    jsonb_build_object('id', v_move_id, 'product_id', p_product_id,
      'type', 'in', 'quantity', p_quantity,
      'reason', coalesce(nullif(trim(p_reason), ''), 'Compra de fornecedor'),
      'created_at', v_now), (select auth.uid()));
  if v_cost > 0 then
    v_transaction_id := replace(gen_random_uuid()::text, '-', '');
    insert into public.records (company_id, kind, record_id, data, updated_by)
    values (p_company, 'transactions', v_transaction_id,
      jsonb_build_object('id', v_transaction_id, 'type', 'expense',
        'description', coalesce(nullif(trim(p_reason), ''), 'Compra de fornecedor'),
        'amount', p_quantity * v_cost, 'category', '',
        'occurred_at', (now() at time zone 'UTC')::date::text), (select auth.uid()));
  end if;
end;
$$;

select private.ensure_member_employee(m.company_id, m.user_id)
from public.company_members m
where not exists (
  select 1 from public.user_profiles p
  where p.company_id = m.company_id and p.user_id = m.user_id
    and p.employee_id is not null
    and exists (
      select 1 from public.records r
      where r.company_id = m.company_id and r.kind = 'employees'
        and r.record_id = p.employee_id
    )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'company_members'
  ) then
    alter publication supabase_realtime add table public.company_members;
  end if;
end;
$$;
