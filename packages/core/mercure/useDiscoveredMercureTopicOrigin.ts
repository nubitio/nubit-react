import { useEffect, useState } from 'react';
import {
  getDiscoveredMercureTopicOrigin,
  onMercureTopicOriginChange,
} from './mercureDiscovery';

/**
 * Returns the Mercure topic origin autodiscovered from Hydra `@id` IRIs.
 * Re-renders when a new origin is discovered from a subsequent API response.
 */
export function useDiscoveredMercureTopicOrigin(): string | undefined {
  const [origin, setOrigin] = useState(getDiscoveredMercureTopicOrigin);

  useEffect(() => onMercureTopicOriginChange(setOrigin), []);

  return origin;
}