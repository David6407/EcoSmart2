import { buildCurrentUser } from '../../../domain/entities/User';

export function mapAuthUserWithProfile(authUser, profile) {
  if (!authUser) return null;
  return buildCurrentUser(authUser, profile);
}
