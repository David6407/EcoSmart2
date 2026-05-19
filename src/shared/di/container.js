import { createAssignReportUseCase } from '../../application/usecases/assignReportUseCase';
import { createCloseReportUseCase } from '../../application/usecases/closeReportUseCase';
import { createConfirmCollectionUseCase } from '../../application/usecases/confirmCollectionUseCase';
import { createCreateReportUseCase } from '../../application/usecases/createReportUseCase';
import { createLoadActivityLogsUseCase } from '../../application/usecases/loadActivityLogsUseCase';
import { createLoadActiveMapReportsUseCase } from '../../application/usecases/loadActiveMapReportsUseCase';
import { createLoadCitizenReportsUseCase } from '../../application/usecases/loadCitizenReportsUseCase';
import { createLoadCollectorDashboardUseCase } from '../../application/usecases/loadCollectorDashboardUseCase';
import { createLoadCollectorReportsUseCase } from '../../application/usecases/loadCollectorReportsUseCase';
import { createLoadCurrentUserUseCase } from '../../application/usecases/loadCurrentUserUseCase';
import { createLoadMapPointsUseCase } from '../../application/usecases/loadMapPointsUseCase';
import { createLoadNotificationPreferencesUseCase } from '../../application/usecases/loadNotificationPreferencesUseCase';
import { createLoadReportDetailUseCase } from '../../application/usecases/loadReportDetailUseCase';
import { createLoadReportTimelineUseCase } from '../../application/usecases/loadReportTimelineUseCase';
import { createLoadRewardsUseCase } from '../../application/usecases/loadRewardsUseCase';
import { createLoginUseCase } from '../../application/usecases/loginUseCase';
import { createRegisterUseCase } from '../../application/usecases/registerUseCase';
import { createRegisterPushNotificationsUseCase } from '../../application/usecases/registerPushNotificationsUseCase';
import { createRejectReportUseCase } from '../../application/usecases/rejectReportUseCase';
import { createRequestPasswordResetUseCase } from '../../application/usecases/requestPasswordResetUseCase';
import { createStartReportUseCase } from '../../application/usecases/startReportUseCase';
import { createUpdateNotificationPreferenceUseCase } from '../../application/usecases/updateNotificationPreferenceUseCase';
import { createUpdateProfileUseCase } from '../../application/usecases/updateProfileUseCase';
import { createExpoPushService } from '../../infrastructure/notifications/expoPushService';
import { isSupabaseConfigured } from '../../infrastructure/supabase/client';
import { createSupabaseAuthRepository } from '../../infrastructure/supabase/repositories/supabaseAuthRepository';
import { createSupabaseMapRepository } from '../../infrastructure/supabase/repositories/supabaseMapRepository';
import { createSupabaseProfileRepository } from '../../infrastructure/supabase/repositories/supabaseProfileRepository';
import { createSupabaseReportRepository } from '../../infrastructure/supabase/repositories/supabaseReportRepository';
import { createSupabaseRewardRepository } from '../../infrastructure/supabase/repositories/supabaseRewardRepository';

const authRepository = createSupabaseAuthRepository();
const profileRepository = createSupabaseProfileRepository();
const reportRepository = createSupabaseReportRepository();
const mapRepository = createSupabaseMapRepository();
const rewardRepository = createSupabaseRewardRepository();
const pushService = createExpoPushService();

export const repositories = {
  authRepository,
  profileRepository,
  reportRepository,
  mapRepository,
  rewardRepository,
  pushService,
};

export const usecases = {
  loginUseCase: createLoginUseCase({ authRepository }),
  registerUseCase: createRegisterUseCase({ authRepository }),
  requestPasswordResetUseCase: createRequestPasswordResetUseCase({ authRepository }),
  loadCurrentUserUseCase: createLoadCurrentUserUseCase({ profileRepository }),
  createReportUseCase: createCreateReportUseCase({ reportRepository }),
  assignReportUseCase: createAssignReportUseCase({ reportRepository }),
  startReportUseCase: createStartReportUseCase({ reportRepository }),
  closeReportUseCase: createCloseReportUseCase({ reportRepository }),
  rejectReportUseCase: createRejectReportUseCase({ reportRepository }),
  confirmCollectionUseCase: createConfirmCollectionUseCase({ reportRepository }),
  loadCollectorDashboardUseCase: createLoadCollectorDashboardUseCase({ reportRepository }),
  loadCollectorReportsUseCase: createLoadCollectorReportsUseCase({ reportRepository }),
  loadCitizenReportsUseCase: createLoadCitizenReportsUseCase({ reportRepository }),
  loadReportDetailUseCase: createLoadReportDetailUseCase({ reportRepository }),
  loadReportTimelineUseCase: createLoadReportTimelineUseCase({ reportRepository }),
  loadActiveMapReportsUseCase: createLoadActiveMapReportsUseCase({ mapRepository }),
  loadMapPointsUseCase: createLoadMapPointsUseCase({ mapRepository }),
  loadActivityLogsUseCase: createLoadActivityLogsUseCase({ profileRepository }),
  loadRewardsUseCase: createLoadRewardsUseCase({ rewardRepository }),
  updateProfileUseCase: createUpdateProfileUseCase({ authRepository, profileRepository }),
  registerPushNotificationsUseCase: createRegisterPushNotificationsUseCase({ profileRepository, pushService }),
  loadNotificationPreferencesUseCase: createLoadNotificationPreferencesUseCase({ profileRepository }),
  updateNotificationPreferenceUseCase: createUpdateNotificationPreferenceUseCase({ profileRepository }),
};

export const container = {
  isSupabaseConfigured,
  repositories,
  usecases,
};
