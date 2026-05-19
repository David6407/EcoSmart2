-- EcoSmart report proximity guard.
-- Only allow citizen reports when the selected point is near the citizen location.

create extension if not exists cube;
create extension if not exists earthdistance;

drop function if exists public.create_report_with_guard(
  uuid, text, text, numeric, numeric, integer, integer, integer, text
);

create or replace function public.create_report_with_guard(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_latitude numeric,
  p_longitude numeric,
  p_points_awarded integer default 10,
  p_cooldown_minutes integer default 15,
  p_daily_limit integer default 5,
  p_citizen_photo_url text default null,
  p_user_latitude numeric default null,
  p_user_longitude numeric default null,
  p_max_distance_meters integer default 200
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest_created_at timestamptz;
  v_today_reports integer;
  v_report_id uuid;
  v_distance_meters numeric;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'No autorizado para crear este reporte.';
  end if;

  if public.current_user_role() = 'collector' then
    raise exception 'Las cuentas recolectoras no crean reportes ciudadanos.';
  end if;

  if p_user_latitude is null or p_user_longitude is null then
    raise exception 'Necesitamos tu ubicacion actual para validar la cercania del reporte.';
  end if;

  v_distance_meters := earth_distance(
    ll_to_earth(p_user_latitude::float8, p_user_longitude::float8),
    ll_to_earth(p_latitude::float8, p_longitude::float8)
  );

  if v_distance_meters > greatest(coalesce(p_max_distance_meters, 200), 1) then
    raise exception 'Solo puedes reportar dentro de % metros de tu ubicacion actual.', greatest(coalesce(p_max_distance_meters, 200), 1);
  end if;

  select max(created_at) into v_latest_created_at
  from public.reports
  where user_id = p_user_id;

  if v_latest_created_at is not null
     and v_latest_created_at > now() - make_interval(mins => p_cooldown_minutes) then
    raise exception 'Debes esperar % minutos antes de enviar otro reporte.', p_cooldown_minutes;
  end if;

  select count(*) into v_today_reports
  from public.reports
  where user_id = p_user_id
    and created_at >= date_trunc('day', now())
    and status <> 'cancelado';

  if v_today_reports >= p_daily_limit then
    raise exception 'Ya alcanzaste el limite diario de % reportes.', p_daily_limit;
  end if;

  insert into public.reports (
    user_id, title, description, status,
    latitude, longitude, points_awarded, validated,
    citizen_photo_url
  ) values (
    p_user_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    'pendiente',
    p_latitude,
    p_longitude,
    greatest(coalesce(p_points_awarded, 10), 0),
    false,
    nullif(btrim(coalesce(p_citizen_photo_url, '')), '')
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

grant execute on function public.create_report_with_guard(
  uuid, text, text, numeric, numeric, integer, integer, integer, text, numeric, numeric, integer
) to authenticated;

notify pgrst, 'reload schema';
