import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('drops scripts and event handlers', () => {
    const dirty = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('ok');
  });

  it('keeps basic formatting', () => {
    expect(sanitizeHtml('<p><strong>Bold</strong></p>')).toContain('<strong>Bold</strong>');
  });
});
