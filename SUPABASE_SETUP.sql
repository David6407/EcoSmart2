-- ═══════════════════════════════════════════════════════════════
-- ECOSMART — BASE DE DATOS COMPLETA
-- Ejecutar en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 0. EXTENSIONES ──────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════
-- 1. TABLAS
-- ═══════════════════════════════════════════════════════════════

-- ── 1.1 PROFILES ────────────────────────────────────────────────
-- Perfil público de cada usuario autenticado.
-- El nivel se CALCULA desde puntos, no se guarda manualmente.
--   0–49   → nivel 1
--   50–119 → nivel 2
--   120–249→ nivel 3
--   250–399→ nivel 4
--   400+   → nivel 5

create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text        not null,
  email            text        unique not null,
  points           integer     not null default 0,
  streak           integer     not null default 0,
  best_streak      integer     not null default 0,
  last_active_date date,
  reports_count    integer     not null default 0,
  active_days      integer     not null default 0,
  created_at       timestamptz not null default now()
);

-- ── 1.2 REPORTS ─────────────────────────────────────────────────
-- Reportes de puntos de reciclaje enviados por usuarios.

create table if not exists reports (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  title           text        not null,
  description     text,
  status          text        not null default 'pendiente',  -- pendiente | validado
  latitude        numeric(10,7),
  longitude       numeric(10,7),
  points_awarded  integer     not null default 10,
  validated       boolean     not null default false,
  validated_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ── 1.3 REWARDS ─────────────────────────────────────────────────
-- Catálogo de recompensas canjeables con puntos.

create table if not exists rewards (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  description      text,
  points_required  integer     not null,
  category         text        not null default 'descuento',  -- descuento | producto | experiencia
  icon             text        not null default '🎁',
  accent_color     text        not null default '#2E9E65',
  active           boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- ── 1.4 ACTIVITY_LOGS ───────────────────────────────────────────
-- Historial de acciones que generan puntos.

create table if not exists activity_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  action     text        not null,   -- 'reporte' | 'validacion' | 'racha' | 'logro'
  points     integer     not null,
  detail     text,
  created_at timestamptz not null default now()
);

-- ── 1.5 CONTAINERS ──────────────────────────────────────────────
-- Puntos de reciclaje reales (para el mapa).

create table if not exists containers (
  id          uuid           primary key default gen_random_uuid(),
  title       text           not null,
  latitude    numeric(10,7)  not null,
  longitude   numeric(10,7)  not null,
  type        text           not null default 'reciclaje',  -- reciclaje | basura | especial
  materials   text[],                                        -- ['Plastico','Vidrio','Papel']
  status      text           not null default 'activo',     -- activo | inactivo | mantenimiento
  color       text           not null default '#2E9E65',
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);


-- ═══════════════════════════════════════════════════════════════
-- 2. FUNCIÓN: CALCULAR NIVEL DESDE PUNTOS
-- ═══════════════════════════════════════════════════════════════
-- Usada en triggers y en queries para no guardar el nivel.

create or replace function calculate_level(pts integer)
returns integer
language plpgsql
as $$
begin
  if pts >= 400 then return 5;
  elsif pts >= 250 then return 4;
  elsif pts >= 120 then return 3;
  elsif pts >= 50  then return 2;
  else return 1;
  end if;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 3. FUNCIÓN: CREAR PERFIL AUTOMÁTICO AL REGISTRARSE
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario EcoSmart'),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════
-- 4. FUNCIÓN: SUMAR PUNTOS + LOG AL INSERTAR REPORTE
-- ═══════════════════════════════════════════════════════════════
-- Se ejecuta automáticamente al insertar en reports.
-- Suma 10 puntos al perfil y registra en activity_logs.

create or replace function handle_new_report()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Sumar puntos y contador de reportes al perfil
  update profiles
  set
    points        = points + new.points_awarded,
    reports_count = reports_count + 1
  where id = new.user_id;

  -- Registrar en historial de actividad
  insert into activity_logs (user_id, action, points, detail)
  values (
    new.user_id,
    'reporte',
    new.points_awarded,
    new.title
  );

  return new;
end;
$$;

drop trigger if exists on_report_created on reports;
create trigger on_report_created
  after insert on reports
  for each row execute procedure handle_new_report();


-- ═══════════════════════════════════════════════════════════════
-- 5. FUNCIÓN: SUMAR PUNTOS EXTRA AL VALIDAR REPORTE
-- ═══════════════════════════════════════════════════════════════
-- Se ejecuta cuando status cambia a 'validado'.

create or replace function handle_report_validated()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Solo actuar si cambió a validado y antes no lo estaba
  if new.validated = true and old.validated = false then
    -- Sumar 5 puntos extra al perfil
    update profiles
    set points = points + 5
    where id = new.user_id;

    -- Registrar en historial
    insert into activity_logs (user_id, action, points, detail)
    values (
      new.user_id,
      'validacion',
      5,
      'Reporte validado: ' || new.title
    );

    -- Actualizar campos del reporte
    update reports
    set
      status       = 'validado',
      validated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_report_validated on reports;
create trigger on_report_validated
  after update of validated on reports
  for each row execute procedure handle_report_validated();


-- ═══════════════════════════════════════════════════════════════
-- 6. FUNCIÓN: ACTUALIZAR RACHA DIARIA
-- ═══════════════════════════════════════════════════════════════
-- Llamada desde la app al iniciar sesión o abrir la app.
-- Actualiza streak, best_streak y last_active_date.

create or replace function update_streak(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_last_date date;
  v_streak    integer;
  v_best      integer;
  v_today     date := current_date;
begin
  select last_active_date, streak, best_streak
  into v_last_date, v_streak, v_best
  from profiles
  where id = p_user_id;

  -- Si ya se actualizó hoy, no hacer nada
  if v_last_date = v_today then
    return;
  end if;

  -- Si fue ayer, continúa la racha
  if v_last_date = v_today - interval '1 day' then
    v_streak := v_streak + 1;
  else
    -- Racha rota o primer día
    v_streak := 1;
  end if;

  -- Actualizar mejor racha
  if v_streak > v_best then
    v_best := v_streak;
  end if;

  update profiles
  set
    streak           = v_streak,
    best_streak      = v_best,
    last_active_date = v_today,
    active_days      = active_days + 1
  where id = p_user_id;

  -- Bonus por racha de 7 días
  if v_streak % 7 = 0 then
    update profiles
    set points = points + 20
    where id = p_user_id;

    insert into activity_logs (user_id, action, points, detail)
    values (
      p_user_id,
      'racha',
      20,
      'Racha de ' || v_streak || ' días consecutivos'
    );
  end if;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 7. SEGURIDAD (RLS)
-- ═══════════════════════════════════════════════════════════════

alter table profiles       enable row level security;
alter table reports        enable row level security;
alter table rewards        enable row level security;
alter table activity_logs  enable row level security;
alter table containers     enable row level security;

-- Profiles
create policy "Usuarios ven su propio perfil"
  on profiles for select to authenticated
  using (auth.uid() = id);

create policy "Usuarios actualizan su propio perfil"
  on profiles for update to authenticated
  using (auth.uid() = id);

-- Reports
create policy "Usuarios ven sus propios reportes"
  on reports for select to authenticated
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios reportes"
  on reports for insert to authenticated
  with check (auth.uid() = user_id);

-- Rewards (todos los autenticados pueden ver)
create policy "Cualquier usuario autenticado ve recompensas"
  on rewards for select to authenticated
  using (active = true);

-- Activity logs
create policy "Usuarios ven su propio historial"
  on activity_logs for select to authenticated
  using (auth.uid() = user_id);

-- Containers (lectura pública para autenticados)
create policy "Usuarios autenticados ven contenedores"
  on containers for select to authenticated
  using (true);


-- ═══════════════════════════════════════════════════════════════
-- 8. DATOS INICIALES
-- ═══════════════════════════════════════════════════════════════

-- ── 8.1 Recompensas ─────────────────────────────────────────────
insert into rewards (title, description, points_required, category, icon, accent_color)
values
  ('Café gratis',          'Un café en comercios aliados de la ciudad.',         50,  'producto',     '☕', '#6F4E37'),
  ('Descuento 10%',        'Descuento en tiendas ecológicas aliadas.',           120, 'descuento',    '🏷️', '#2E9E65'),
  ('Bolsa reutilizable',   'Bolsa ecológica de tela de marca EcoSmart.',         200, 'producto',     '🛍️', '#43A047'),
  ('Entrada evento verde', 'Acceso a evento de sostenibilidad local.',           300, 'experiencia',  '🎟️', '#1976D2'),
  ('Kit reciclaje',        'Kit completo con separadores y guía de reciclaje.',  400, 'producto',     '♻️', '#2E9E65')
on conflict do nothing;

-- ── 8.2 Contenedores de ejemplo (Pasto, Colombia) ───────────────
insert into containers (title, latitude, longitude, type, materials, status, color)
values
  ('Punto Verde Centro',    1.2136, -77.2811, 'reciclaje', array['Plastico','Papel','Vidrio'], 'activo',       '#2E9E65'),
  ('Reciclaje La Aurora',   1.2180, -77.2750, 'reciclaje', array['Vidrio','Metal'],            'activo',       '#F57C00'),
  ('Ecopunto Sur',          1.2090, -77.2900, 'reciclaje', array['Organico','Papel'],          'activo',       '#43A047'),
  ('Punto Plástico Norte',  1.2200, -77.2870, 'reciclaje', array['Plastico'],                  'mantenimiento','#FBC02D')
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════════
-- Incio de mejora para la base de datos
alter table profiles
add column if not exists role text not null default 'citizen';

alter table profiles
drop constraint if exists profiles_role_check;

alter table profiles
add constraint profiles_role_check
check (role in ('citizen', 'collector', 'admin'));

alter table reports
add column if not exists collector_id uuid references profiles(id) on delete set null;

alter table reports
drop constraint if exists reports_status_check;

alter table reports
add constraint reports_status_check
check (status in ('pendiente', 'validado', 'en_proceso', 'recolectado', 'rechazado'));

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario EcoSmart'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'citizen')
  );

  return new;
end;
$$;

drop policy if exists "Usuarios ven sus propios reportes" on reports;
drop policy if exists "Recolectores ven reportes" on reports;
drop policy if exists "Recolectores actualizan reportes" on reports;

create policy "Usuarios y recolectores ven reportes"
  on reports for select to authenticated
  using (
    auth.uid() = user_id
    or public.current_user_role() in ('collector', 'admin')
  );

create policy "Recolectores actualizan reportes"
  on reports for update to authenticated
  using (public.current_user_role() in ('collector', 'admin'))
  with check (public.current_user_role() in ('collector', 'admin'));
