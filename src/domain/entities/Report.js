import { REPORT_STATUS_META } from '../constants/reportStatus';

export function getReportStatusMeta(status) {
  return REPORT_STATUS_META[status] || REPORT_STATUS_META.pendiente;
}
