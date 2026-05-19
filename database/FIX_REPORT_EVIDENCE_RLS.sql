-- Fix RLS for report evidence uploads in Supabase Storage.
-- Run this in the Supabase SQL editor for the active project.

create or replace function public.report_evidence_report_id(p_object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_folders text[] := storage.foldername(p_object_name);
  v_folder text;
begin
  if array_length(v_folders, 1) >= 2 then
    begin
      return v_folders[2]::uuid;
    exception
      when invalid_text_representation then
        null;
    end;
  end if;

  foreach v_folder in array v_folders
  loop
    begin
      return v_folder::uuid;
    exception
      when invalid_text_representation then
        null;
    end;
  end loop;

  return null;
end;
$$;

create or replace function public.can_write_report_evidence(p_object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, storage
as $$
declare
  v_report_id uuid := public.report_evidence_report_id(p_object_name);
  v_role text := public.current_user_role();
begin
  if v_report_id is null then
    return false;
  end if;

  if v_role = 'admin' then
    return true;
  end if;

  if v_role = 'collector' then
    return exists (
      select 1
      from public.reports report
      where report.id = v_report_id
        and report.collector_id = auth.uid()
        and report.status in ('asignado', 'en_proceso', 'recolectado')
    );
  end if;

  if v_role = 'citizen' then
    return exists (
      select 1
      from public.reports report
      where report.id = v_report_id
        and report.user_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

create or replace function public.attach_citizen_report_photo(
  p_report_id uuid,
  p_user_id uuid default auth.uid(),
  p_citizen_photo_url text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
  v_role text := public.current_user_role();
begin
  if auth.uid() is distinct from p_user_id and v_role <> 'admin' then
    raise exception 'No autorizado para adjuntar esta foto.';
  end if;

  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_role <> 'admin' and v_report.user_id <> p_user_id then
    raise exception 'Este reporte pertenece a otro usuario.';
  end if;

  update public.reports
  set citizen_photo_url = nullif(btrim(coalesce(p_citizen_photo_url, '')), '')
  where id = p_report_id
  returning * into v_report;

  return v_report;
end;
$$;

create or replace function public.can_read_report_evidence(p_object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, storage
as $$
declare
  v_report_id uuid := public.report_evidence_report_id(p_object_name);
  v_role text := public.current_user_role();
begin
  if v_report_id is null then
    return false;
  end if;

  if v_role = 'admin' then
    return true;
  end if;

  if v_role = 'collector' then
    return exists (
      select 1
      from public.reports report
      where report.id = v_report_id
        and report.status in ('pendiente', 'asignado', 'en_proceso', 'recolectado')
    );
  end if;

  return exists (
    select 1
    from public.reports report
    where report.id = v_report_id
      and report.user_id = auth.uid()
  );
end;
$$;

drop policy if exists "Recolectores suben evidencia asignada" on storage.objects;
drop policy if exists "Participantes leen evidencia de reportes" on storage.objects;

create policy "Recolectores suben evidencia asignada"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-evidence'
    and public.can_write_report_evidence(name)
  );

create policy "Participantes leen evidencia de reportes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-evidence'
    and public.can_read_report_evidence(name)
  );

grant execute on function public.report_evidence_report_id(text) to authenticated;
grant execute on function public.can_write_report_evidence(text) to authenticated;
grant execute on function public.can_read_report_evidence(text) to authenticated;
grant execute on function public.attach_citizen_report_photo(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
