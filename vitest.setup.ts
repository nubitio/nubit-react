import { vi } from 'vitest';

// happy-dom's EventSource opens a real socket. Unit tests exercise subscription
// behavior through listeners and must never depend on a Mercure process.
class EventSourceStub extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readonly url: string;
  readonly withCredentials: boolean;
  readonly readyState = EventSourceStub.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string | URL, init?: EventSourceInit) {
    super();
    this.url = String(url);
    this.withCredentials = init?.withCredentials ?? false;
  }

  close(): void {}
}

vi.stubGlobal('EventSource', EventSourceStub);
