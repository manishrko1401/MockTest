// -----------------------------------------------------------------------------
// Last cleaning step in the browser for HTML that was reshaped on the page after the
// server cleaned it (decoding entities can turn "&lt;img onerror…&gt;" back into a tag).
// Removes active elements, event handlers and script links. Browser only: on the server
// it returns an empty string (the notice body is filled in after the page loads).
// -----------------------------------------------------------------------------

const DROP = new Set(['SCRIPT', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET', 'FORM', 'INPUT', 'BUTTON',
  'SELECT', 'TEXTAREA', 'STYLE', 'LINK', 'META', 'BASE', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT', 'PORTAL']);
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'background', 'poster', 'srcset']);
const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/|\.|[^:]*$)/i;
const SAFE_IMG_DATA = /^data:image\/(?:png|jpe?g|gif|webp);/i;

export function sanitizeDomHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (DROP.has(child.tagName.toUpperCase())) { child.remove(); continue; }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value.replace(/[\u0000- ]+/g, '');
        if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction') child.removeAttribute(attr.name);
        else if (URL_ATTRS.has(name) && !(SAFE_URL.test(value) || (name === 'src' && child.tagName === 'IMG' && SAFE_IMG_DATA.test(value)))) child.removeAttribute(attr.name);
        else if (name === 'style' && /expression\(|javascript:|url\(\s*['"]?\s*javascript:/i.test(value)) child.removeAttribute(attr.name);
      }
      if (child.tagName === 'A' && child.getAttribute('target') === '_blank') child.setAttribute('rel', 'noopener noreferrer nofollow');
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
