-- EcoSmart push notifications foundation.
-- Run this in the Supabase SQL editor, then deploy the Edge Function
-- supabase/functions/send-push-notifications.

create table if not exists public.notification_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text,
  device_name text,
  project_id text,
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  preference_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, preference_key)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  preference_key text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_tokens_user on public.notification_push_tokens(user_id);
create index if not exists idx_notification_tokens_enabled on public.notification_push_tokens(user_id, enabled);
create index if not exists idx_notification_events_pending on public.notification_events(status, available_at, created_at);
create index if not exists idx_notification_events_recipient on public.notification_events(recipient_id, created_at desc);

alter table public.notification_push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;

drop policy if exists "Usuarios administran sus tokens push" on public.notification_push_tokens;
drop policy if exists "Usuarios ven sus tokens push" on public.notification_push_tokens;
drop policy if exists "Usuarios administran sus preferencias push" on public.notification_preferences;
drop policy if exists "Usuarios ven sus notificaciones" on public.notification_events;

create policy "Usuarios ven sus tokens push"
  on public.notification_push_tokens for select to authenticated
  using (auth.uid() = user_id);

create policy "Usuarios administran sus tokens push"
  on public.notification_push_tokens for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios administran sus preferencias push"
  on public.notification_preferences for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios ven sus notificaciones"
  on public.notification_events for select to authenticated
  using (auth.uid() = recipient_id);

create or replace function public.notification_pref_enabled(
  p_user_id uuid,
  p_preference_key text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select preference.enabled
      from public.notification_preferences preference
      where preference.user_id = p_user_id
        and preference.preference_key = p_preference_key
    ),
    true
  );
$$;

create or replace function public.enqueue_notification(
  p_recipient_id uuid,
  p_preference_key text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if p_recipient_id is null or not public.notification_pref_enabled(p_recipient_id, p_preference_key) then
    return null;
  end if;

  insert into public.notification_events (
    recipient_id,
    preference_key,
    title,
    body,
    data
  ) values (
    p_recipient_id,
    p_preference_key,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.enqueue_new_report_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_zone text;
  v_collector record;
begin
  select zone into v_owner_zone
  from public.profiles
  where id = new.user_id;

  for v_collector in
    select id
    from public.profiles
    where role = 'collector'
      and (
        nullif(v_owner_zone, '') is null
        or nullif(zone, '') is null
        or zone = v_owner_zone
      )
  loop
    perform public.enqueue_notification(
      v_collector.id,
      'new_reports',
      'Nuevo reporte ciudadano',
      coalesce(new.title, 'Hay un reporte disponible cerca de tu zona.'),
      jsonb_build_object(
        'screen', 'map',
        'reportId', new.id,
        'status', new.status,
        'type', 'new_report'
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.enqueue_report_update_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_label text;
begin
  if new.collector_id is not null and old.collector_id is distinct from new.collector_id then
    perform public.enqueue_notification(
      new.collector_id,
      'assigned_reports',
      'Reporte asignado',
      coalesce(new.title, 'Tienes un reporte asignado.'),
      jsonb_build_object(
        'screen', 'map',
        'reportId', new.id,
        'status', new.status,
        'type', 'report_assigned'
      )
    );
  end if;

  if old.status is distinct from new.status then
    v_status_label := case new.status
      when 'asignado' then 'Tu reporte fue asignado a un recolector.'
      when 'en_proceso' then 'La recoleccion de tu reporte inicio.'
      when 'recolectado' then 'Tu reporte fue marcado como recolectado. Confirma el resultado.'
      when 'rechazado' then 'Tu reporte fue rechazado. Revisa el motivo.'
      when 'validado' then 'Tu reporte fue validado.'
      else 'Tu reporte cambio de estado.'
    end;

    perform public.enqueue_notification(
      new.user_id,
      case when new.status = 'recolectado' then 'collection_reminders' else 'report_status' end,
      'Actualizacion de reporte',
      v_status_label,
      jsonb_build_object(
        'screen', 'map',
        'reportId', new.id,
        'status', new.status,
        'type', 'report_status'
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists enqueue_new_report_notifications_trigger on public.reports;
create trigger enqueue_new_report_notifications_trigger
after insert on public.reports
for each row execute function public.enqueue_new_report_notifications();

drop trigger if exists enqueue_report_update_notifications_trigger on public.reports;
create trigger enqueue_report_update_notifications_trigger
after update of status, collector_id on public.reports
for each row execute function public.enqueue_report_update_notifications();

grant select, insert, update, delete on public.notification_push_tokens to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.notification_events to authenticated;
grant execute on function public.notification_pref_enabled(uuid, text) to authenticated;
grant execute on function public.enqueue_notification(uuid, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
