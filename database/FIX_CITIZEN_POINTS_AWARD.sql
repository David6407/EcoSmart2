-- EcoSmart fix: award report points to citizens, not collectors.
-- Run this in the Supabase SQL editor for the active project.

drop function if exists public.close_report(uuid, uuid, text, text);
drop function if exists public.close_report(uuid, uuid, text, text, jsonb);

create or replace function public.close_report(
  p_report_id uuid,
  p_collector_id uuid default auth.uid(),
  p_collection_photo_url text default null,
  p_collector_notes text default null,
  p_location jsonb default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
  v_actor_id uuid := auth.uid();
  v_actor_role text := public.current_user_role();
  v_points integer;
begin
  if coalesce(v_actor_role, '') not in ('collector', 'admin') then
    raise exception 'Solo un recolector o administrador puede cerrar reportes.';
  end if;

  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_report.status <> 'en_proceso' then
    raise exception 'Solo los reportes en proceso pueden cerrarse.';
  end if;

  if nullif(btrim(coalesce(p_collection_photo_url, '')), '') is null
     and nullif(btrim(coalesce(p_collector_notes, '')), '') is null then
    raise exception 'El cierre requiere foto o notas de evidencia.';
  end if;

  if v_actor_role <> 'admin' and v_report.collector_id <> p_collector_id then
    raise exception 'Este reporte pertenece a otro recolector.';
  end if;

  v_points := greatest(coalesce(v_report.points_awarded, 10), 0);

  update public.reports
  set
    status = 'recolectado',
    resolved_at = now(),
    collection_photo_url = nullif(btrim(coalesce(p_collection_photo_url, '')), ''),
    collector_notes = nullif(btrim(coalesce(p_collector_notes, '')), ''),
    validated = false,
    validated_at = null
  where id = p_report_id
  returning * into v_report;

  update public.profiles
  set total_collected = total_collected + 1
  where id = v_report.collector_id;

  perform public.award_points(
    v_report.user_id,
    v_points,
    'reporte_recolectado',
    'Reporte recolectado: ' || v_report.title
  );

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'cerrado'::public.report_event_type,
    'en_proceso',
    'recolectado',
    p_collector_notes,
    p_collection_photo_url,
    jsonb_build_object(
      'points_awarded_to_collector', 0,
      'points_awarded_to_citizen', v_points,
      'location', coalesce(p_location, '{}'::jsonb)
    )
  );

  return v_report;
end;
$$;

create or replace function public.confirm_collection(
  p_report_id uuid,
  p_citizen_id uuid default auth.uid()
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
  v_actor_id uuid := auth.uid();
begin
  if auth.uid() is distinct from p_citizen_id then
    raise exception 'No autorizado para confirmar este reporte.';
  end if;

  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_report.user_id <> p_citizen_id then
    raise exception 'Solo el ciudadano propietario puede confirmar la recoleccion.';
  end if;

  if v_report.status <> 'recolectado' then
    raise exception 'Solo los reportes recolectados pueden confirmarse.';
  end if;

  if v_report.citizen_confirmed then
    return v_report;
  end if;

  update public.reports
  set
    status = 'validado',
    citizen_confirmed = true,
    citizen_confirmed_at = now(),
    validated = true,
    validated_at = now()
  where id = p_report_id
  returning * into v_report;

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'confirmado'::public.report_event_type,
    'recolectado',
    'validado',
    'Confirmacion ciudadana',
    null,
    jsonb_build_object('points_awarded_to_citizen', 0)
  );

  return v_report;
end;
$$;

grant execute on function public.close_report(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.confirm_collection(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
