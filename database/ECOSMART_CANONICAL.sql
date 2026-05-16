-- EcoSmart canonical database schema
-- Deployment 1: System foundation
-- Execute this file in the Supabase SQL editor. It replaces the old
-- SUPABASE_SETUP.sql and SUPABASE_REPORTS_MIGRATION.sql files.

create extension if not exists pgcrypto;

do $$
begin
  create type public.report_event_type as enum (
    'creado',
    'asignado',
    'iniciado',
    'cerrado',
    'rechazado',
    'confirmado',
    'cancelado',
    'validado',
    'actualizado'
  );
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  points integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_active_date date,
  reports_count integer not null default 0,
  active_days integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'citizen',
  add column if not exists zone text,
  add column if not exists total_collected integer not null default 0,
  add column if not exists total_rejected integer not null default 0;

update public.profiles
set role = 'citizen'
where role is null or role not in ('citizen', 'collector', 'admin');

alter table public.profiles
  alter column role set default 'citizen',
  alter column total_collected set default 0,
  alter column total_rejected set default 0;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('citizen', 'collector', 'admin'));

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pendiente',
  latitude numeric(10,7),
  longitude numeric(10,7),
  points_awarded integer not null default 10,
  validated boolean not null default false,
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports
  add column if not exists collector_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists collection_photo_url text,
  add column if not exists collector_notes text,
  add column if not exists citizen_confirmed boolean not null default false,
  add column if not exists citizen_confirmed_at timestamptz;

alter table public.reports
  alter column status set default 'pendiente',
  alter column points_awarded set default 10,
  alter column validated set default false,
  alter column citizen_confirmed set default false;

alter table public.reports
  drop constraint if exists reports_status_check;

update public.reports
set status = case
  when status in ('pendiente', 'asignado', 'en_proceso', 'recolectado', 'rechazado', 'cancelado', 'validado') then status
  else 'pendiente'
end
where status is null
   or status not in ('pendiente', 'asignado', 'en_proceso', 'recolectado', 'rechazado', 'cancelado', 'validado');

alter table public.reports
  add constraint reports_status_check
  check (status in ('pendiente', 'asignado', 'en_proceso', 'recolectado', 'rechazado', 'cancelado', 'validado'));

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_required integer not null,
  category text not null default 'descuento',
  icon text not null default '*',
  accent_color text not null default '#2E9E65',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  points integer not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  type text not null default 'reciclaje',
  materials text[],
  status text not null default 'activo',
  color text not null default '#2E9E65',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type public.report_event_type not null,
  from_status text,
  to_status text,
  notes text,
  photo_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_zone on public.profiles(zone);
create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_reports_collector_id on public.reports(collector_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_reports_active_map on public.reports(status, created_at desc)
  where status in ('pendiente', 'asignado');
create index if not exists idx_report_events_report_id on public.report_events(report_id, created_at desc);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Compatibility and business helpers
-- ---------------------------------------------------------------------------

create or replace function public.calculate_level(pts integer)
returns integer
language plpgsql
immutable
as $$
begin
  if pts >= 400 then
    return 5;
  elsif pts >= 250 then
    return 4;
  elsif pts >= 120 then
    return 3;
  elsif pts >= 50 then
    return 2;
  else
    return 1;
  end if;
end;
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anonymous'
  );
$$;

create or replace function public.same_zone_as_current_user(p_report_owner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles collector
    join public.profiles owner_profile
      on owner_profile.id = p_report_owner_id
    where collector.id = auth.uid()
      and collector.zone is not null
      and collector.zone <> ''
      and owner_profile.zone is not null
      and owner_profile.zone <> ''
      and collector.zone = owner_profile.zone
  );
$$;

create or replace function public.can_access_report(p_report_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
  v_role text;
begin
  select *
  into v_report
  from public.reports
  where id = p_report_id;

  if not found then
    return false;
  end if;

  v_role := public.current_user_role();

  if auth.uid() = v_report.user_id then
    return true;
  end if;

  if v_role = 'admin' then
    return true;
  end if;

  if v_role = 'collector' then
    return v_report.status in ('pendiente', 'asignado', 'en_proceso')
      or v_report.collector_id = auth.uid()
      or public.same_zone_as_current_user(v_report.user_id);
  end if;

  return v_report.status in ('pendiente', 'asignado');
end;
$$;

create or replace function public.award_points(
  p_user_id uuid,
  p_points integer,
  p_action text,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or coalesce(p_points, 0) <= 0 then
    return;
  end if;

  update public.profiles
  set points = points + p_points
  where id = p_user_id;

  insert into public.activity_logs (user_id, action, points, detail)
  values (p_user_id, p_action, p_points, p_detail);
end;
$$;

create or replace function public.log_report_event(
  p_report_id uuid,
  p_actor_id uuid,
  p_event_type public.report_event_type,
  p_from_status text default null,
  p_to_status text default null,
  p_notes text default null,
  p_photo_url text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.report_events (
    report_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    notes,
    photo_url,
    metadata
  )
  values (
    p_report_id,
    p_actor_id,
    p_event_type,
    p_from_status,
    p_to_status,
    p_notes,
    p_photo_url,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auth and passive audit triggers
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'citizen');

  if v_role not in ('citizen', 'collector', 'admin') then
    v_role := 'citizen';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario EcoSmart'),
    new.email,
    v_role
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = coalesce(public.profiles.role, excluded.role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists on_report_created on public.reports;
drop trigger if exists on_report_created_audit on public.reports;
drop trigger if exists on_report_validated on public.reports;
drop function if exists public.handle_new_report();
drop function if exists public.handle_report_validated();

create or replace function public.handle_report_created_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set reports_count = reports_count + 1
  where id = new.user_id;

  perform public.log_report_event(
    new.id,
    new.user_id,
    'creado'::public.report_event_type,
    null,
    new.status,
    'Reporte registrado',
    null,
    jsonb_build_object('source', 'insert_trigger')
  );

  return new;
end;
$$;

create trigger on_report_created_audit
after insert on public.reports
for each row execute procedure public.handle_report_created_audit();

-- ---------------------------------------------------------------------------
-- Atomic report transitions
-- ---------------------------------------------------------------------------

create or replace function public.create_report_with_guard(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_latitude numeric,
  p_longitude numeric,
  p_points_awarded integer default 10,
  p_cooldown_minutes integer default 15,
  p_daily_limit integer default 5
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
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'No autorizado para crear este reporte.';
  end if;

  if public.current_user_role() = 'collector' then
    raise exception 'Las cuentas recolectoras no crean reportes ciudadanos.';
  end if;

  select max(created_at)
  into v_latest_created_at
  from public.reports
  where user_id = p_user_id;

  if v_latest_created_at is not null
     and v_latest_created_at > now() - make_interval(mins => p_cooldown_minutes) then
    raise exception 'Debes esperar % minutos antes de enviar otro reporte.', p_cooldown_minutes;
  end if;

  select count(*)
  into v_today_reports
  from public.reports
  where user_id = p_user_id
    and created_at >= date_trunc('day', now())
    and status <> 'cancelado';

  if v_today_reports >= p_daily_limit then
    raise exception 'Ya alcanzaste el limite diario de % reportes.', p_daily_limit;
  end if;

  insert into public.reports (
    user_id,
    title,
    description,
    status,
    latitude,
    longitude,
    points_awarded,
    validated
  )
  values (
    p_user_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    'pendiente',
    p_latitude,
    p_longitude,
    greatest(coalesce(p_points_awarded, 10), 0),
    false
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

create or replace function public.assign_report(
  p_report_id uuid,
  p_collector_id uuid default auth.uid()
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
begin
  if coalesce(v_actor_role, '') not in ('collector', 'admin') then
    raise exception 'Solo un recolector o administrador puede tomar reportes.';
  end if;

  if p_collector_id is null then
    raise exception 'No se pudo identificar al recolector.';
  end if;

  perform 1
  from public.profiles
  where id = p_collector_id
    and role in ('collector', 'admin');

  if not found then
    raise exception 'El recolector indicado no existe o no tiene permisos.';
  end if;

  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_report.status = 'asignado' and v_report.collector_id = p_collector_id then
    return v_report;
  end if;

  if v_report.status <> 'pendiente' then
    raise exception 'El reporte no esta disponible para asignacion.';
  end if;

  if v_report.collector_id is not null and v_report.collector_id <> p_collector_id then
    raise exception 'El reporte ya fue tomado por otro recolector.';
  end if;

  update public.reports
  set
    status = 'asignado',
    collector_id = p_collector_id,
    assigned_at = now(),
    validated = false,
    validated_at = null
  where id = p_report_id
  returning * into v_report;

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'asignado'::public.report_event_type,
    'pendiente',
    'asignado',
    'Reporte asignado',
    null,
    jsonb_build_object('collector_id', p_collector_id)
  );

  return v_report;
end;
$$;

create or replace function public.start_report(
  p_report_id uuid,
  p_collector_id uuid default auth.uid()
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
begin
  if coalesce(v_actor_role, '') not in ('collector', 'admin') then
    raise exception 'Solo un recolector o administrador puede iniciar reportes.';
  end if;

  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_report.status <> 'asignado' then
    raise exception 'Solo los reportes asignados pueden iniciarse.';
  end if;

  if v_actor_role <> 'admin' and v_report.collector_id <> p_collector_id then
    raise exception 'Este reporte pertenece a otro recolector.';
  end if;

  update public.reports
  set
    status = 'en_proceso',
    started_at = coalesce(started_at, now())
  where id = p_report_id
  returning * into v_report;

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'iniciado'::public.report_event_type,
    'asignado',
    'en_proceso',
    'Recoleccion iniciada',
    null,
    jsonb_build_object('collector_id', v_report.collector_id)
  );

  return v_report;
end;
$$;

drop function if exists public.close_report(uuid, uuid, text, text);

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
    v_report.collector_id,
    v_points,
    'recoleccion',
    'Reporte cerrado: ' || v_report.title
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
      'points_awarded_to_collector', v_points,
      'location', coalesce(p_location, '{}'::jsonb)
    )
  );

  return v_report;
end;
$$;

create or replace function public.reject_report(
  p_report_id uuid,
  p_collector_id uuid default auth.uid(),
  p_rejection_reason text default null
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
  v_from_status text;
begin
  if coalesce(v_actor_role, '') not in ('collector', 'admin') then
    raise exception 'Solo un recolector o administrador puede rechazar reportes.';
  end if;

  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_report.status not in ('pendiente', 'asignado', 'en_proceso') then
    raise exception 'El reporte no puede rechazarse desde su estado actual.';
  end if;

  if v_report.collector_id is not null
     and v_actor_role <> 'admin'
     and v_report.collector_id <> p_collector_id then
    raise exception 'Este reporte pertenece a otro recolector.';
  end if;

  v_from_status := v_report.status;

  update public.reports
  set
    status = 'rechazado',
    collector_id = coalesce(collector_id, p_collector_id),
    assigned_at = coalesce(assigned_at, now()),
    resolved_at = now(),
    rejected_at = now(),
    rejection_reason = nullif(btrim(coalesce(p_rejection_reason, '')), ''),
    validated = false,
    validated_at = null
  where id = p_report_id
  returning * into v_report;

  update public.profiles
  set total_rejected = total_rejected + 1
  where id = v_report.collector_id;

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'rechazado'::public.report_event_type,
    v_from_status,
    'rechazado',
    p_rejection_reason,
    null,
    jsonb_build_object('collector_id', v_report.collector_id)
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

  perform public.award_points(
    v_report.user_id,
    5,
    'confirmacion_ciudadana',
    'Recoleccion confirmada: ' || v_report.title
  );

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'confirmado'::public.report_event_type,
    'recolectado',
    'validado',
    'Confirmacion ciudadana',
    null,
    jsonb_build_object('points_awarded_to_citizen', 5)
  );

  return v_report;
end;
$$;

create or replace function public.cancel_report(
  p_report_id uuid,
  p_user_id uuid default auth.uid(),
  p_reason text default null
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
  v_from_status text;
begin
  select *
  into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Reporte no encontrado.';
  end if;

  if v_actor_role <> 'admin' and (auth.uid() is distinct from p_user_id or v_report.user_id <> p_user_id) then
    raise exception 'No autorizado para cancelar este reporte.';
  end if;

  if v_report.status not in ('pendiente', 'asignado') then
    raise exception 'Solo los reportes pendientes o asignados pueden cancelarse.';
  end if;

  v_from_status := v_report.status;

  update public.reports
  set
    status = 'cancelado',
    resolved_at = now(),
    validated = false,
    validated_at = null
  where id = p_report_id
  returning * into v_report;

  perform public.log_report_event(
    p_report_id,
    v_actor_id,
    'cancelado'::public.report_event_type,
    v_from_status,
    'cancelado',
    p_reason,
    null,
    '{}'::jsonb
  );

  return v_report;
end;
$$;

create or replace function public.daily_summary(
  p_collector_id uuid default auth.uid()
)
returns table (
  pending_today integer,
  assigned_to_me integer,
  in_progress integer,
  completed_today integer,
  rejected_today integer,
  avg_response_minutes numeric
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_day_start timestamptz := date_trunc('day', now());
begin
  if coalesce(v_role, '') not in ('collector', 'admin') then
    raise exception 'Solo un recolector o administrador puede consultar el resumen diario.';
  end if;

  return query
  select
    count(*) filter (
      where r.status = 'pendiente'
        and r.created_at >= v_day_start
    )::integer as pending_today,
    count(*) filter (
      where r.status = 'asignado'
        and r.collector_id = p_collector_id
    )::integer as assigned_to_me,
    count(*) filter (
      where r.status = 'en_proceso'
        and r.collector_id = p_collector_id
    )::integer as in_progress,
    count(*) filter (
      where r.status in ('recolectado', 'validado')
        and r.collector_id = p_collector_id
        and r.resolved_at >= v_day_start
    )::integer as completed_today,
    count(*) filter (
      where r.status = 'rechazado'
        and r.collector_id = p_collector_id
        and r.rejected_at >= v_day_start
    )::integer as rejected_today,
    round(avg(
      case
        when r.collector_id = p_collector_id
         and r.resolved_at is not null
         and r.resolved_at >= v_day_start
        then extract(epoch from (r.resolved_at - r.created_at)) / 60.0
        else null
      end
    )::numeric, 2) as avg_response_minutes
  from public.reports r;
end;
$$;

create or replace function public.update_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_date date;
  v_streak integer;
  v_best integer;
  v_today date := current_date;
begin
  if auth.uid() is distinct from p_user_id and public.current_user_role() <> 'admin' then
    raise exception 'No autorizado para actualizar esta racha.';
  end if;

  select last_active_date, streak, best_streak
  into v_last_date, v_streak, v_best
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if v_last_date = v_today then
    return;
  end if;

  if v_last_date = v_today - interval '1 day' then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  if v_streak > coalesce(v_best, 0) then
    v_best := v_streak;
  end if;

  update public.profiles
  set
    streak = v_streak,
    best_streak = v_best,
    last_active_date = v_today,
    active_days = active_days + 1
  where id = p_user_id;

  if v_streak % 7 = 0 then
    perform public.award_points(
      p_user_id,
      20,
      'racha',
      'Racha de ' || v_streak || ' dias consecutivos'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Active operational map view
-- ---------------------------------------------------------------------------

create or replace view public.active_reports_map
with (security_invoker = true)
as
select
  id,
  user_id,
  title,
  description,
  status,
  latitude,
  longitude,
  collector_id,
  assigned_at,
  started_at,
  created_at
from public.reports
where status in ('pendiente', 'asignado', 'en_proceso')
  and latitude is not null
  and longitude is not null;

-- ---------------------------------------------------------------------------
-- Legacy cleanup and backfill
-- ---------------------------------------------------------------------------

-- The old on_report_created trigger awarded points immediately. Neutralize
-- only those legacy log entries so future point totals represent verified
-- actions.
with legacy_report_points as (
  select id, user_id, points
  from public.activity_logs
  where action = 'reporte'
    and points > 0
),
reset_legacy_logs as (
  update public.activity_logs log
  set
    action = 'reporte_registrado_legacy',
    points = 0,
    detail = coalesce(log.detail, 'Reporte registrado') || ' (sin puntos automaticos)'
  from legacy_report_points legacy
  where log.id = legacy.id
  returning legacy.user_id, legacy.points
)
update public.profiles profile
set points = greatest(0, profile.points - totals.total_points)
from (
  select user_id, sum(points) as total_points
  from reset_legacy_logs
  group by user_id
) totals
where profile.id = totals.user_id;

update public.reports
set
  resolved_at = coalesce(resolved_at, validated_at),
  citizen_confirmed = true,
  citizen_confirmed_at = coalesce(citizen_confirmed_at, validated_at, resolved_at),
  validated = true,
  validated_at = coalesce(validated_at, resolved_at)
where status = 'validado'
   or validated = true;

update public.reports
set assigned_at = coalesce(assigned_at, created_at)
where collector_id is not null
  and assigned_at is null
  and status in ('asignado', 'en_proceso', 'recolectado', 'rechazado', 'validado');

update public.reports
set started_at = coalesce(started_at, assigned_at, created_at)
where collector_id is not null
  and started_at is null
  and status in ('en_proceso', 'recolectado', 'rechazado', 'validado');

update public.reports
set
  rejected_at = coalesce(rejected_at, resolved_at, now()),
  resolved_at = coalesce(resolved_at, rejected_at, now())
where status = 'rechazado';

update public.profiles profile
set reports_count = (
  select count(*)::integer
  from public.reports report
  where report.user_id = profile.id
);

update public.profiles profile
set
  total_collected = (
    select count(*)::integer
    from public.reports report
    where report.collector_id = profile.id
      and report.status in ('recolectado', 'validado')
  ),
  total_rejected = (
    select count(*)::integer
    from public.reports report
    where report.collector_id = profile.id
      and report.status = 'rechazado'
  );

insert into public.report_events (report_id, actor_id, event_type, from_status, to_status, notes, created_at)
select report.id, report.user_id, 'creado'::public.report_event_type, null, report.status, 'Backfill: reporte existente', report.created_at
from public.reports report
where not exists (
  select 1
  from public.report_events event
  where event.report_id = report.id
    and event.event_type = 'creado'::public.report_event_type
);

insert into public.report_events (report_id, actor_id, event_type, from_status, to_status, notes, created_at)
select report.id, report.collector_id, 'asignado'::public.report_event_type, 'pendiente', 'asignado', 'Backfill: reporte asignado', coalesce(report.assigned_at, report.created_at)
from public.reports report
where report.collector_id is not null
  and report.status in ('asignado', 'en_proceso', 'recolectado', 'rechazado', 'validado')
  and not exists (
    select 1
    from public.report_events event
    where event.report_id = report.id
      and event.event_type = 'asignado'::public.report_event_type
  );

insert into public.report_events (report_id, actor_id, event_type, from_status, to_status, notes, created_at)
select report.id, report.collector_id, 'iniciado'::public.report_event_type, 'asignado', 'en_proceso', 'Backfill: recoleccion iniciada', coalesce(report.started_at, report.assigned_at, report.created_at)
from public.reports report
where report.collector_id is not null
  and report.status in ('en_proceso', 'recolectado', 'rechazado', 'validado')
  and not exists (
    select 1
    from public.report_events event
    where event.report_id = report.id
      and event.event_type = 'iniciado'::public.report_event_type
  );

insert into public.report_events (report_id, actor_id, event_type, from_status, to_status, notes, photo_url, created_at)
select report.id, report.collector_id, 'cerrado'::public.report_event_type, 'en_proceso', 'recolectado', coalesce(report.collector_notes, 'Backfill: reporte recolectado'), report.collection_photo_url, coalesce(report.resolved_at, report.validated_at, report.created_at)
from public.reports report
where report.collector_id is not null
  and report.status in ('recolectado', 'validado')
  and not exists (
    select 1
    from public.report_events event
    where event.report_id = report.id
      and event.event_type = 'cerrado'::public.report_event_type
  );

insert into public.report_events (report_id, actor_id, event_type, from_status, to_status, notes, created_at)
select report.id, report.collector_id, 'rechazado'::public.report_event_type, coalesce(nullif(report.status, 'rechazado'), 'en_proceso'), 'rechazado', coalesce(report.rejection_reason, 'Backfill: reporte rechazado'), coalesce(report.rejected_at, report.resolved_at, report.created_at)
from public.reports report
where report.status = 'rechazado'
  and not exists (
    select 1
    from public.report_events event
    where event.report_id = report.id
      and event.event_type = 'rechazado'::public.report_event_type
  );

insert into public.report_events (report_id, actor_id, event_type, from_status, to_status, notes, created_at)
select report.id, report.user_id, 'confirmado'::public.report_event_type, 'recolectado', 'validado', 'Backfill: reporte validado previamente', coalesce(report.citizen_confirmed_at, report.validated_at, report.resolved_at, report.created_at)
from public.reports report
where report.citizen_confirmed = true
  and report.status = 'validado'
  and not exists (
    select 1
    from public.report_events event
    where event.report_id = report.id
      and event.event_type = 'confirmado'::public.report_event_type
  );

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.rewards enable row level security;
alter table public.activity_logs enable row level security;
alter table public.containers enable row level security;
alter table public.report_events enable row level security;

drop policy if exists "Usuarios ven su propio perfil" on public.profiles;
drop policy if exists "Usuarios actualizan su propio perfil" on public.profiles;
drop policy if exists "Admins ven todos los perfiles" on public.profiles;
drop policy if exists "Admins actualizan perfiles" on public.profiles;

create policy "Usuarios ven su propio perfil"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.current_user_role() = 'admin');

create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.current_user_role() = 'admin')
  with check (auth.uid() = id or public.current_user_role() = 'admin');

drop policy if exists "Usuarios ven sus propios reportes" on public.reports;
drop policy if exists "Usuarios insertan sus propios reportes" on public.reports;
drop policy if exists "Usuarios y recolectores ven reportes" on public.reports;
drop policy if exists "Recolectores ven reportes" on public.reports;
drop policy if exists "Recolectores actualizan reportes" on public.reports;
drop policy if exists "Reportes visibles por rol" on public.reports;
drop policy if exists "Ciudadanos insertan sus reportes" on public.reports;
drop policy if exists "Admins actualizan reportes" on public.reports;
drop policy if exists "Admins eliminan reportes" on public.reports;

create policy "Reportes visibles por rol"
  on public.reports for select to authenticated
  using (public.can_access_report(id));

create policy "Ciudadanos insertan sus reportes"
  on public.reports for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.current_user_role() in ('citizen', 'admin')
  );

create policy "Admins actualizan reportes"
  on public.reports for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "Admins eliminan reportes"
  on public.reports for delete to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists "Cualquier usuario autenticado ve recompensas" on public.rewards;
drop policy if exists "Recompensas activas visibles" on public.rewards;

create policy "Recompensas activas visibles"
  on public.rewards for select to authenticated
  using (active = true or public.current_user_role() = 'admin');

drop policy if exists "Usuarios ven su propio historial" on public.activity_logs;

create policy "Usuarios ven su propio historial"
  on public.activity_logs for select to authenticated
  using (auth.uid() = user_id or public.current_user_role() = 'admin');

drop policy if exists "Usuarios autenticados ven contenedores" on public.containers;

create policy "Usuarios autenticados ven contenedores"
  on public.containers for select to authenticated
  using (true);

drop policy if exists "Eventos visibles por acceso al reporte" on public.report_events;
drop policy if exists "Admins administran eventos" on public.report_events;

create policy "Eventos visibles por acceso al reporte"
  on public.report_events for select to authenticated
  using (public.can_access_report(report_id));

create policy "Admins administran eventos"
  on public.report_events for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Supabase Storage: report evidence
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-evidence',
  'report-evidence',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Recolectores suben evidencia asignada" on storage.objects;
drop policy if exists "Participantes leen evidencia de reportes" on storage.objects;
drop policy if exists "Recolectores administran su evidencia" on storage.objects;

create policy "Recolectores suben evidencia asignada"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-evidence'
    and public.current_user_role() in ('collector', 'admin')
    and exists (
      select 1
      from public.reports report
      where report.id = ((storage.foldername(name))[2])::uuid
        and (
          public.current_user_role() = 'admin'
          or report.collector_id = auth.uid()
        )
    )
  );

create policy "Participantes leen evidencia de reportes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-evidence'
    and exists (
      select 1
      from public.reports report
      where report.id = ((storage.foldername(name))[2])::uuid
        and (
          public.current_user_role() = 'admin'
          or report.collector_id = auth.uid()
          or report.user_id = auth.uid()
        )
    )
  );

create policy "Recolectores administran su evidencia"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'report-evidence'
    and (
      public.current_user_role() = 'admin'
      or owner = auth.uid()
    )
  )
  with check (
    bucket_id = 'report-evidence'
    and (
      public.current_user_role() = 'admin'
      or owner = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants for Supabase authenticated role
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant select on public.rewards to authenticated;
grant select on public.activity_logs to authenticated;
grant select on public.containers to authenticated;
grant select on public.report_events to authenticated;
grant select on public.active_reports_map to authenticated;

grant execute on function public.calculate_level(integer) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.create_report_with_guard(uuid, text, text, numeric, numeric, integer, integer, integer) to authenticated;
grant execute on function public.assign_report(uuid, uuid) to authenticated;
grant execute on function public.start_report(uuid, uuid) to authenticated;
grant execute on function public.close_report(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.reject_report(uuid, uuid, text) to authenticated;
grant execute on function public.confirm_collection(uuid, uuid) to authenticated;
grant execute on function public.cancel_report(uuid, uuid, text) to authenticated;
grant execute on function public.daily_summary(uuid) to authenticated;
grant execute on function public.update_streak(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into public.rewards (title, description, points_required, category, icon, accent_color)
select seed.title, seed.description, seed.points_required, seed.category, seed.icon, seed.accent_color
from (
  values
    ('Cafe gratis', 'Un cafe en comercios aliados de la ciudad.', 50, 'producto', 'CA', '#6F4E37'),
    ('Descuento 10%', 'Descuento en tiendas ecologicas aliadas.', 120, 'descuento', '10', '#2E9E65'),
    ('Bolsa reutilizable', 'Bolsa ecologica de tela de marca EcoSmart.', 200, 'producto', 'BR', '#43A047'),
    ('Entrada evento verde', 'Acceso a evento de sostenibilidad local.', 300, 'experiencia', 'EV', '#1976D2'),
    ('Kit reciclaje', 'Kit completo con separadores y guia de reciclaje.', 400, 'producto', 'KR', '#2E9E65')
) as seed(title, description, points_required, category, icon, accent_color)
where not exists (
  select 1 from public.rewards reward where reward.title = seed.title
);

insert into public.containers (title, latitude, longitude, type, materials, status, color)
select seed.title, seed.latitude, seed.longitude, seed.type, seed.materials, seed.status, seed.color
from (
  values
    ('Punto Verde Centro', 1.2136::numeric, -77.2811::numeric, 'reciclaje', array['Plastico','Papel','Vidrio'], 'activo', '#2E9E65'),
    ('Reciclaje La Aurora', 1.2180::numeric, -77.2750::numeric, 'reciclaje', array['Vidrio','Metal'], 'activo', '#F57C00'),
    ('Ecopunto Sur', 1.2090::numeric, -77.2900::numeric, 'reciclaje', array['Organico','Papel'], 'activo', '#43A047'),
    ('Punto Plastico Norte', 1.2200::numeric, -77.2870::numeric, 'reciclaje', array['Plastico'], 'mantenimiento', '#FBC02D')
) as seed(title, latitude, longitude, type, materials, status, color)
where not exists (
  select 1 from public.containers container where container.title = seed.title
);

-- End of EcoSmart canonical database schema.
