import { REPORT_STATUS_META } from '../../../domain/constants/reportStatus';

export function mapReport(row) {
  if (!row) return null;

  return {
    ...row,
    statusMeta: REPORT_STATUS_META[row.status] || REPORT_STATUS_META.pendiente,
  };
}

export function mapReports(rows = []) {
  return rows.map(mapReport).filter(Boolean);
}
