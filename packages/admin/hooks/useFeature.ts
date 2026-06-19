import { useSession } from '../auth/SessionContext';

export function useFeature(featureKey: string): boolean {
  const { session } = useSession();
  if (session.status !== 'authenticated') {
    return false;
  }

  return session.profile.features?.[featureKey]?.enabled ?? false;
}

export function useFeatureConfig(featureKey: string): Record<string, unknown> {
  const { session } = useSession();
  if (session.status !== 'authenticated') {
    return {};
  }

  const entry = session.profile.features?.[featureKey];
  if (!entry?.enabled) {
    return {};
  }

  return entry.config ?? {};
}