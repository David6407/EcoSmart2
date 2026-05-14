import { getLevelFromPoints } from '../../shared/utils/levelUtils';

export function buildCurrentUser(authUser, profile) {
  const metadata = authUser?.user_metadata || {};
  const email = profile?.email || authUser?.email || '';
  const fullName =
    profile?.full_name ||
    metadata.full_name ||
    metadata.name ||
    (email ? email.split('@')[0] : 'Usuario EcoSmart');
  const points = profile?.points ?? 0;

  return {
    id: authUser?.id,
    email,
    fullName,
    role: profile?.role || metadata.role || 'citizen',
    zone: profile?.zone || '',
    points,
    level: getLevelFromPoints(points),
    streak: profile?.streak ?? 0,
    bestStreak: profile?.best_streak ?? 0,
    reportsCount: profile?.reports_count ?? 0,
    activeDays: profile?.active_days ?? 0,
    totalCollected: profile?.total_collected ?? 0,
    totalRejected: profile?.total_rejected ?? 0,
  };
}
