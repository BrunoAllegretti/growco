insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "growco_profile_photo_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
);

create policy "growco_profile_photo_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "growco_profile_photo_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.set_sale_seller()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  new.data := jsonb_set(new.data, '{seller_user_id}', to_jsonb(new.updated_by::text), true);
  return new;
end;
$$;

drop trigger if exists set_sale_seller on public.records;
create trigger set_sale_seller
before insert on public.records
for each row when (new.kind = 'sales')
execute function public.set_sale_seller();
