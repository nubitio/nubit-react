export { MercureProvider, MercureContext } from './MercureProvider';
export type { MercureProviderProps } from './MercureProvider';
export { useMercureHub } from './useMercureHub';
export { useMercureSubscription } from './useMercureSubscription';
export {
  buildMercureCollectionTopic,
  resolveMercureTopicOrigin,
} from './mercureTopics';
export {
  discoverMercureFromResponse,
  extractMercureHubUrl,
  extractTopicOriginFromPayload,
  getDiscoveredMercureTopicOrigin,
  parseLinkHeader,
} from './mercureDiscovery';
export { useDiscoveredMercureTopicOrigin } from './useDiscoveredMercureTopicOrigin';
/** Singleton instance — import as `MercureManager` per spec barrel contract. */
export { default as MercureManager } from './MercureManager';
export type { MercureManager as MercureManagerType } from './MercureManager';
