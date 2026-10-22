import sanitizeHtml from 'sanitize-html';

// -----------------------------------------------------------------------------
// Notice pages show HTML copied from other websites. Before it leaves the server it is
// cut down to plain formatting: no scripts, no event handlers (onerror=, onclick=…),
// no javascript: links, no iframes or forms. Links open in a new tab.
// -----------------------------------------------------------------------------

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'div', 'span', 'center', 'font',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'small', 'big', 'sup', 'sub', 'mark',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'align', 'title', 'dir', 'lang'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    font: ['color', 'size', 'face'],
    table: ['width', 'border', 'cellpadding', 'cellspacing', 'bgcolor'],
    td: ['colspan', 'rowspan', 'width', 'valign', 'bgcolor', 'nowrap'],
    th: ['colspan', 'rowspan', 'width', 'valign', 'bgcolor', 'nowrap', 'scope'],
    tr: ['valign', 'bgcolor'],
    col: ['span', 'width'],
    colgroup: ['span', 'width'],
    ol: ['start', 'type'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: true,
  // whole element removed, text included
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'template'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.href ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' } : attribs,
    }),
  },
};

export function sanitizeNoticeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}
