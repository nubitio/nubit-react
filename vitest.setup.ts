import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// Testing Library's `waitFor`/`findBy*` default to 1s. The lazy TipTap and
// recharts chunks are transformed on first import, which under coverage
// instrumentation and a parallel run can pass that — so html.test.tsx and
// WidgetRenderer.test.tsx failed roughly one run in three with no code change.
// The ceiling only matters when something is genuinely wrong; passing runs are
// not slowed down.
configure({ asyncUtilTimeout: 5000 });

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
