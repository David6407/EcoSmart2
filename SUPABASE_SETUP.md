# Supabase Setup

## 1. Crear el proyecto

1. Entra a `https://supabase.com`.
2. Crea un proyecto nuevo.
3. Guarda estos datos:
   - `Project URL`
   - `anon public key`
   - `service_role key` solo para backend seguro, no para la app movil

## 2. Crear tablas base

Abre el `SQL Editor` y ejecuta este script:

```sql
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  points integer not null default 0,
  level integer not null default 1,
  recycled_kg numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_required integer not null,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pendiente',
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz not null default now()
);
```

## 3. Crear recompensas iniciales

```sql
insert into rewards (title, description, points_required)
values
  ('500 descuento', 'Descuento basico en comercio aliado', 500),
  ('1000 producto', 'Producto ecologico promocional', 1000),
  ('1500 free', 'Beneficio premium o acceso especial', 1500);
```

## 4. Activar seguridad

```sql
alter table profiles enable row level security;
alter table rewards enable row level security;
alter table reports enable row level security;
```

## 5. Politicas recomendadas

```sql
create policy "Users can read own profile"
on profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on profiles
for update
to authenticated
using (auth.uid() = id);

create policy "Anyone authenticated can read rewards"
on rewards
for select
to authenticated
using (true);

create policy "Users can read own reports"
on reports
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own reports"
on reports
for insert
to authenticated
with check (auth.uid() = user_id);
```

## 6. Crear perfil automatico al registrarse

```sql
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
```

## 7. Siguiente integracion en Expo

1. Instala:
   - `@supabase/supabase-js`
   - `react-native-url-polyfill`
2. Crea variables de entorno:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Crea el cliente Supabase
4. Reemplaza la autenticacion local por `signUp`, `signInWithPassword` y `signOut`
