import { afterEach, describe, expect, it } from 'vitest';
import { configureCore } from '../config/CoreConfig';
import { buildMercureCollectionTopic, resolveMercureTopicOrigin } from './mercureTopics';

describe('resolveMercureTopicOrigin', () => {
  afterEach(() => {
    configureCore({ apiBaseUrl: '/api/', locale: 'es', timezone: 'UTC' });
  });

  it('prefers an explicit mercureTopicOrigin override', () => {
    expect(resolveMercureTopicOrigin('/api/', 'http://localhost:8000')).toBe('http://localhost:8000');
  });

  it('derives the origin from an absolute apiBaseUrl', () => {
    expect(resolveMercureTopicOrigin('https://api.example.com/v1/')).toBe('https://api.example.com');
  });

  it('falls back to window.location.origin for relative apiBaseUrl', () => {
    expect(resolveMercureTopicOrigin('/api/')).toBe(window.location.origin);
  });
});

describe('buildMercureCollectionTopic', () => {
  afterEach(() => {
    configureCore({ apiBaseUrl: '/api/', locale: 'es', timezone: 'UTC' });
  });

  it('builds a wildcard topic from apiUrl and configured origin', () => {
    expect(buildMercureCollectionTopic('/api/products', 'http://localhost:8000')).toBe(
      'http://localhost:8000/api/products/{id}',
    );
  });

  it('normalizes apiUrl slashes', () => {
    expect(buildMercureCollectionTopic('api/sales_documents/', 'http://localhost:8000')).toBe(
      'http://localhost:8000/api/sales_documents/{id}',
    );
  });
});