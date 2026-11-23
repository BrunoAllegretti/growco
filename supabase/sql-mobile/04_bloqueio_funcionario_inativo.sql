create or replace function public.can_operate(p_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    left join public.user_profiles p
      on p.company_id = m.company_id and p.user_id = m.user_id
    left join public.records r
      on r.company_id = m.company_id and r.kind = 'employees'
      and r.record_id = p.employee_id
    where m.company_id = p_company and m.user_id = (select auth.uid())
      and (m.role = 'owner' or (p.employee_id is not null
        and coalesce((r.data->>'active')::boolean, false)))
  );
$$;
revoke execute on function public.can_operate(uuid) from public, anon;
grant execute on function public.can_operate(uuid) to authenticated;

create or replace function private.protect_sales_from_inactive_members()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.can_operate(new.company_id) then
    raise exception 'Funcionário inativo ou sem permissão para vender';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_sales_from_inactive_members() from public, anon, authenticated;
drop trigger if exists protect_sales_from_inactive_members on public.records;
create trigger protect_sales_from_inactive_members
before insert or update on public.records
for each row when (new.kind = 'sales')
execute function private.protect_sales_from_inactive_members();
