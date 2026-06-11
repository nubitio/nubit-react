/**
 * MercureManager — Singleton that manages the lifecycle of EventSource connections.
 *
 * Inspired by the `manager.ts` pattern from `api-platform/admin`, adapted for this project:
 * - Ref-counting per topic: multiple subscribers to the same topic share one EventSource.
 * - Graceful degradation: if hubUrl is null, subscribe() is a no-op.
 * - Topic format: full URI or URI Template (RFC 6570), e.g. `https://host/api/products/{id}`.
 *   The hub receives it as a query param: `?topic=<encoded-topic>`.
 */

interface TopicEntry {
  eventSource: EventSource;
  count: number;
  listeners: Map<(data: unknown) => void, (e: MessageEvent) => void>;
}

class MercureManager {
  private hubUrl: string | null = null;
  private readonly topics = new Map<string, TopicEntry>();
  private readonly hubUrlListeners = new Set<(url: string | null) => void>();

  /**
   * Update the hub URL (called by the Axios interceptor when the `Link` header is discovered,
   * or by MercureProvider). Notifies all registered listeners.
   *
   * Idempotent: if the URL is already set to the same value, listeners are NOT re-notified.
   */
  setHubUrl(url: string | null): void {
    if (this.hubUrl === url) {
      return;
    }
    // Close all existing EventSource connections before switching URLs —
    // they are bound to the old hub and would never receive cleanup otherwise.
    this.disconnectAll();
    this.hubUrl = url;
    this.hubUrlListeners.forEach((cb) => cb(url));
  }

  getHubUrl(): string | null {
    return this.hubUrl;
  }

  /**
   * Register a callback that fires whenever the hub URL changes.
   *
   * Returns an unsubscribe function — call it in a `useEffect` cleanup to avoid memory leaks.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   return MercureManager.onHubUrlChange(setHubUrl);
   * }, []);
   * ```
   */
  onHubUrlChange(callback: (url: string | null) => void): () => void {
    this.hubUrlListeners.add(callback);
    return () => {
      this.hubUrlListeners.delete(callback);
    };
  }

  /**
   * Subscribe to a Mercure topic.
   *
   * @param topic    Full topic URI or URI Template, e.g. `https://host/api/products/{id}`.
   * @param callback Called with the parsed JSON payload on each SSE message.
   *
   * If `hubUrl` is null (hub not configured), this is a no-op (graceful degradation).
   * If an EventSource for this topic already exists, it is reused (ref-counting).
   */
  subscribe(topic: string, callback: (data: unknown) => void): void {
    if (this.hubUrl === null) {
      return;
    }

    const existing = this.topics.get(topic);

    if (existing) {
      // Reuse existing EventSource — just add the new listener.
      const listener = (e: MessageEvent) => {
        try {
          callback(JSON.parse(e.data as string) as unknown);
        } catch {
          callback(e.data);
        }
      };
      existing.eventSource.addEventListener('message', listener);
      existing.listeners.set(callback, listener);
      existing.count += 1;
      return;
    }

    // Build the EventSource URL: hub + ?topic=<encoded-topic>
    const url = new URL(this.hubUrl);
    url.searchParams.append('topic', topic);

    const eventSource = new EventSource(url.toString(), { withCredentials: true });

    const listener = (e: MessageEvent) => {
      try {
        callback(JSON.parse(e.data as string) as unknown);
      } catch {
        callback(e.data);
      }
    };

    eventSource.addEventListener('message', listener);

    const listeners = new Map<(data: unknown) => void, (e: MessageEvent) => void>();
    listeners.set(callback, listener);

    this.topics.set(topic, {
      eventSource,
      count: 1,
      listeners,
    });
  }

  /**
   * Unsubscribe a specific callback from a topic.
   *
   * Decrements the ref count. When count reaches 0, the EventSource is closed
   * and removed from the internal map.
   */
  unsubscribe(topic: string, callback: (data: unknown) => void): void {
    const entry = this.topics.get(topic);
    if (!entry) {
      return;
    }

    const listener = entry.listeners.get(callback);
    if (listener) {
      entry.eventSource.removeEventListener('message', listener);
      entry.listeners.delete(callback);
    }

    entry.count -= 1;

    if (entry.count <= 0) {
      entry.eventSource.close();
      this.topics.delete(topic);
    }
  }

  /**
   * Close all active EventSource connections and clear the topic map.
   *
   * Called internally when the hub URL changes so stale connections
   * bound to the previous hub are not leaked.
   */
  disconnectAll(): void {
    this.topics.forEach((entry) => {
      entry.eventSource.close();
    });
    this.topics.clear();
  }
}

/** Singleton instance — shared across the entire application. */
const mercureManager = new MercureManager();

export default mercureManager;
export type { MercureManager };
