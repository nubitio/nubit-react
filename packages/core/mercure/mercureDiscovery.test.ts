import { afterEach, describe, expect, it } from 'vitest';
import mercureManager from './MercureManager';
import {
  extractMercureHubUrl,
  extractTopicOriginFromPayload,
  normalizeMercureHubUrl,
  parseLinkHeader,
  resetMercureDiscovery,
  discoverMercureFromResponse,
  getDiscoveredMercureTopicOrigin,
} from './mercureDiscovery';

describe('parseLinkHeader', () => {
  it('parses API Platform mercure link', () => {
    const links = parseLinkHeader('</.well-known/mercure>; rel="mercure"');
    expect(links).toEqual([{ url: '/.well-known/mercure', rel: 'mercure' }]);
  });

  it('parses multiple links', () => {
    const links = parseLinkHeader(
      '<http://localhost:8000/.well-known/mercure>; rel="mercure", </api/docs.jsonld>; rel="http://www.w3.org/ns/hydra/core#apiDocumentation"',
    );
    expect(links[0]).toEqual({
      url: 'http://localhost:8000/.well-known/mercure',
      rel: 'mercure',
    });
  });
});

describe('normalizeMercureHubUrl', () => {
  it('rewrites cross-origin absolute hub URLs to the SPA origin', () => {
    expect(normalizeMercureHubUrl('http://localhost:3000/.well-known/mercure')).toBe(
      `${window.location.origin}/.well-known/mercure`,
    );
  });

  it('keeps same-origin hub URLs unchanged', () => {
    const url = `${window.location.origin}/.well-known/mercure`;
    expect(normalizeMercureHubUrl(url)).toBe(url);
  });
});

describe('extractMercureHubUrl', () => {
  it('resolves a relative hub URL and normalizes to the SPA origin in dev', () => {
    const headers = new Headers({ link: '</.well-known/mercure>; rel="mercure"' });
    expect(extractMercureHubUrl(headers, 'http://localhost:8000/api/products')).toBe(
      `${window.location.origin}/.well-known/mercure`,
    );
  });

  it('returns null when no mercure link is present', () => {
    const headers = new Headers({ link: '</api/docs.jsonld>; rel="describedby"' });
    expect(extractMercureHubUrl(headers, 'http://localhost:8000/api')).toBeNull();
  });
});

describe('extractTopicOriginFromPayload', () => {
  it('reads origin from entrypoint @id', () => {
    expect(
      extractTopicOriginFromPayload({ '@id': 'http://localhost:8000/api', '@type': 'Entrypoint' }),
    ).toBe('http://localhost:8000');
  });

  it('reads origin from the first hydra:member @id', () => {
    expect(
      extractTopicOriginFromPayload({
        'hydra:member': [{ '@id': 'http://localhost:8000/api/products/1' }],
      }),
    ).toBe('http://localhost:8000');
  });

  it('ignores relative @id values', () => {
    expect(extractTopicOriginFromPayload({ '@id': '/api/products/1' })).toBeNull();
  });
});

describe('discoverMercureFromResponse', () => {
  afterEach(() => {
    resetMercureDiscovery();
    mercureManager.setHubUrl(null);
  });

  it('updates hub URL and topic origin from a single response', () => {
    const headers = new Headers({ link: '</.well-known/mercure>; rel="mercure"' });
    const response = new Response(JSON.stringify({ '@id': 'http://localhost:8000/api' }), {
      status: 200,
      headers,
    });
    Object.defineProperty(response, 'url', {
      value: 'http://localhost:8000/api',
    });

    discoverMercureFromResponse(response, { '@id': 'http://localhost:8000/api' });

    expect(mercureManager.getHubUrl()).toBe(`${window.location.origin}/.well-known/mercure`);
    expect(getDiscoveredMercureTopicOrigin()).toBe('http://localhost:8000');
  });
});