import mercureManager from './MercureManager';

/** Parsed RFC 8288 Link header entry. */
export interface ParsedLink {
  url: string;
  rel: string;
}

let discoveredTopicOrigin: string | undefined;
const topicOriginListeners = new Set<(origin: string | undefined) => void>();

/**
 * Parse a `Link` response header value into `{ url, rel }` pairs.
 * Handles API Platform's `</.well-known/mercure>; rel="mercure"` format.
 */
export function parseLinkHeader(header: string): ParsedLink[] {
  const links: ParsedLink[] = [];

  for (const segment of header.split(/,(?=\s*<)/)) {
    const urlMatch = segment.match(/<([^>]+)>/);
    const relMatch = segment.match(/rel=(?:"([^"]+)"|([^;\s,]+))/i);
    if (urlMatch && relMatch) {
      links.push({ url: urlMatch[1], rel: (relMatch[1] ?? relMatch[2]).trim() });
    }
  }

  return links;
}

/**
 * When the API advertises an absolute hub on another origin (common in Docker:
 * `MERCURE_PUBLIC_URL=http://localhost:3000/...` while the SPA proxies the hub
 * at `/.well-known/mercure`), prefer the same-origin path so EventSource and
 * cookies go through the dev proxy.
 */
export function normalizeMercureHubUrl(hubUrl: string): string {
  if (typeof window === 'undefined') {
    return hubUrl;
  }

  try {
    const parsed = new URL(hubUrl, window.location.origin);
    if (
      parsed.pathname === '/.well-known/mercure' &&
      parsed.origin !== window.location.origin
    ) {
      return `${window.location.origin}${parsed.pathname}`;
    }
    return parsed.toString();
  } catch {
    return hubUrl;
  }
}

/**
 * Extract the Mercure hub URL from response headers, if present.
 * Relative URLs are resolved against the request URL.
 */
export function extractMercureHubUrl(headers: Headers, responseUrl: string): string | null {
  const linkHeader = headers.get('link') ?? headers.get('Link');
  if (!linkHeader) {
    return null;
  }

  const mercureLink = parseLinkHeader(linkHeader).find((link) => link.rel === 'mercure');
  if (!mercureLink) {
    return null;
  }

  try {
    return normalizeMercureHubUrl(new URL(mercureLink.url, responseUrl).toString());
  } catch {
    return normalizeMercureHubUrl(mercureLink.url);
  }
}

function originFromAbsoluteIri(iri: string): string | null {
  if (!/^https?:\/\//i.test(iri)) {
    return null;
  }

  try {
    return new URL(iri).origin;
  } catch {
    return null;
  }
}

/**
 * Infer the API origin from Hydra `@id` values (entrypoint or collection items).
 * API Platform publishes absolute IRIs when `DEFAULT_URI` is configured.
 */
export function extractTopicOriginFromPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (typeof record['@id'] === 'string') {
    const origin = originFromAbsoluteIri(record['@id']);
    if (origin) {
      return origin;
    }
  }

  const members = record['hydra:member'];
  if (Array.isArray(members)) {
    for (const member of members) {
      if (!member || typeof member !== 'object') {
        continue;
      }
      const memberId = (member as Record<string, unknown>)['@id'];
      if (typeof memberId === 'string') {
        const origin = originFromAbsoluteIri(memberId);
        if (origin) {
          return origin;
        }
      }
    }
  }

  return null;
}

export function getDiscoveredMercureTopicOrigin(): string | undefined {
  return discoveredTopicOrigin;
}

/** Subscribe to autodiscovered topic-origin changes (for React hooks). */
export function onMercureTopicOriginChange(
  callback: (origin: string | undefined) => void,
): () => void {
  topicOriginListeners.add(callback);
  return () => {
    topicOriginListeners.delete(callback);
  };
}

function setDiscoveredTopicOrigin(origin: string): void {
  if (discoveredTopicOrigin === origin) {
    return;
  }
  discoveredTopicOrigin = origin;
  topicOriginListeners.forEach((listener) => listener(origin));
}

/**
 * Inspect an API response and update Mercure hub URL / topic origin when found.
 * Called from `CoreHttpClient` on every successful response.
 */
export function discoverMercureFromResponse(response: Response, data: unknown): void {
  const hubUrl = extractMercureHubUrl(response.headers, response.url);
  if (hubUrl) {
    mercureManager.setHubUrl(hubUrl);
  }

  const topicOrigin = extractTopicOriginFromPayload(data);
  if (topicOrigin) {
    setDiscoveredTopicOrigin(topicOrigin);
  }
}

/** Reset autodiscovered state — test helper only. */
export function resetMercureDiscovery(): void {
  discoveredTopicOrigin = undefined;
  topicOriginListeners.clear();
}