-- EcoSmart: roles, estados de reportes y guardas basicas
-- Ejecutar en Supabase SQL Editor

alter table public.profiles
add column if not exists role text not null default 'citizen';

update public.profiles
set role = 'citizen'
where role is null;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('citizen', 'collector', 'admin'));

alter table public.reports
add column if not exists collector_id uuid references public.profiles(id) on delete set null;

alter table public.reports
add column if not exists resolved_at timestamptz;

update public.reports
set status = 'pendiente'
where status is null;

alter table public.reports
drop constraint if exists reports_status_check;

alter table public.reports
add constraint reports_status_check
check (status in ('pendiente', 'en_proceso', 'recolectado', 'rechazado', 'validado'));

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario EcoSmart'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'citizen')
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
    and created_at >= date_trunc('day', now());

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
    points_awarded
  )
  values (
    p_user_id,
    p_title,
    p_description,
    'pendiente',
    p_latitude,
    p_longitude,
    p_points_awarded
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

drop policy if exists "Usuarios ven sus propios reportes" on public.reports;
drop policy if exists "Usuarios insertan sus propios reportes" on public.reports;
drop policy if exists "Usuarios y recolectores ven reportes" on public.reports;
drop policy if exists "Recolectores actualizan reportes" on public.reports;

create policy "Usuarios y recolectores ven reportes"
  on public.reports for select to authenticated
  using (
    auth.uid() = user_id
    or public.current_user_role() in ('collector', 'admin')
  );

create policy "Usuarios insertan sus propios reportes"
  on public.reports for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Recolectores actualizan reportes"
  on public.reports for update to authenticated
  using (public.current_user_role() in ('collector', 'admin'))
  with check (public.current_user_role() in ('collector', 'admin'));
