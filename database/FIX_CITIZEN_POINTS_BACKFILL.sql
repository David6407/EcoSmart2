-- EcoSmart data repair: move previously awarded collection points
-- from collectors to the citizen who created each report.

with affected_reports as (
  select
    report.id as report_id,
    report.title,
    report.user_id as citizen_id,
    report.collector_id,
    greatest(
      coalesce((event.metadata->>'points_awarded_to_collector')::integer, report.points_awarded, 10),
      0
    ) as report_points
  from public.report_events event
  join public.reports report on report.id = event.report_id
  where event.event_type = 'cerrado'
    and coalesce((event.metadata->>'points_awarded_to_collector')::integer, 0) > 0
),
collector_deductions as (
  select
    log.user_id,
    sum(log.points)::integer as points_to_remove
  from public.activity_logs log
  join affected_reports affected
    on affected.collector_id = log.user_id
   and log.action = 'recoleccion'
   and log.detail = 'Reporte cerrado: ' || affected.title
  group by log.user_id
),
existing_citizen_points as (
  select
    affected.report_id,
    coalesce(sum(log.points), 0)::integer as already_awarded
  from affected_reports affected
  left join public.activity_logs log
    on log.user_id = affected.citizen_id
   and log.action in ('confirmacion_ciudadana', 'reporte_validado', 'reporte_recolectado', 'reporte_recolectado_ajuste')
   and log.detail in (
     'Recoleccion confirmada: ' || affected.title,
     'Reporte validado: ' || affected.title,
     'Reporte recolectado: ' || affected.title,
     'Ajuste de puntos ciudadano: ' || affected.title
   )
  group by affected.report_id
),
citizen_awards as (
  select
    affected.report_id,
    affected.title,
    affected.citizen_id,
    greatest(affected.report_points - existing.already_awarded, 0)::integer as points_to_add
  from affected_reports affected
  join existing_citizen_points existing on existing.report_id = affected.report_id
),
updated_collectors as (
  update public.profiles profile
  set points = greatest(0, profile.points - deduction.points_to_remove)
  from collector_deductions deduction
  where profile.id = deduction.user_id
  returning profile.id
),
updated_citizens as (
  update public.profiles profile
  set points = profile.points + award.points_to_add
  from (
    select citizen_id, sum(points_to_add)::integer as points_to_add
    from citizen_awards
    where points_to_add > 0
    group by citizen_id
  ) award
  where profile.id = award.citizen_id
  returning profile.id
),
inserted_citizen_logs as (
  insert into public.activity_logs (user_id, action, points, detail)
  select
    citizen_id,
    'reporte_recolectado_ajuste',
    points_to_add,
    'Ajuste de puntos ciudadano: ' || title
  from citizen_awards
  where points_to_add > 0
  returning id
),
zeroed_collector_logs as (
  update public.activity_logs log
  set
    action = 'recoleccion_revertida',
    points = 0,
    detail = log.detail || ' (puntos trasladados al ciudadano)'
  from affected_reports affected
  where affected.collector_id = log.user_id
    and log.action = 'recoleccion'
    and log.detail = 'Reporte cerrado: ' || affected.title
  returning log.id
)
update public.report_events event
set metadata =
  (event.metadata - 'points_awarded_to_collector')
  || jsonb_build_object(
    'points_awarded_to_collector', 0,
    'points_awarded_to_citizen', affected.report_points,
    'points_backfill_applied', true
  )
from affected_reports affected
where event.report_id = affected.report_id
  and event.event_type = 'cerrado';
