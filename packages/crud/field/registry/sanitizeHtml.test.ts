import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('drops scripts and event handlers', () => {
    const dirty =
      '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('ok');
  });

  it('sanitizes a payload nested inside a disallowed wrapper', () => {
    // Regression: unwrapping a disallowed element spliced its children into the
    // parent after the traversal snapshot was taken, so they were never
    // visited. sanitizeHtml returned the payload verbatim, wrapper removed.
    const clean = sanitizeHtml('<div><img src=x onerror=alert(1)></div>');

    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('<img');
  });

  it('sanitizes a javascript: href nested several levels down', () => {
    const clean = sanitizeHtml(
      '<table><tr><td><a href="javascript:alert(1)">x</a></td></tr></table>',
    );

    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('x');
  });

  it('sanitizes a payload wrapped several disallowed levels deep', () => {
    const clean = sanitizeHtml(
      '<section><article><div><img src=x onerror=alert(1)></div></article></section>',
    );

    expect(clean).not.toContain('onerror');
  });

  it('keeps basic formatting', () => {
    expect(sanitizeHtml('<p><strong>Bold</strong></p>')).toContain('<strong>Bold</strong>');
  });
});
