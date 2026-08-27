const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'EM',
  'B',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'BLOCKQUOTE',
  'A',
  'SPAN',
]);

/**
 * Strips scripts, event handlers and javascript: URLs.
 *
 * Grid cells used to render API HTML as-is. TipTap limits what this editor
 * writes; it does not limit what another client PATCHes. The allow-list is
 * the read-side defence.
 */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  clean(doc.body);
  return doc.body.innerHTML;
}

function clean(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;
      if (!ALLOWED_TAGS.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        continue;
      }

      for (const attr of Array.from(element.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'style') {
          element.removeAttribute(attr.name);
          continue;
        }
        if (element.tagName === 'A' && name === 'href') {
          const href = attr.value.trim();
          if (!/^(https?:|mailto:|\/|#)/i.test(href)) {
            element.removeAttribute('href');
          }
          element.setAttribute('rel', 'noopener noreferrer');
          continue;
        }
        if (element.tagName !== 'A') {
          element.removeAttribute(attr.name);
        }
      }

      clean(element);
    }
  }
}
