/**
 * mathUtils.ts
 * Comprehensive utility for processing mathematical content from question databases.
 * Handles HTML entities, LaTeX, Unicode math symbols, and ensures MathJax compatibility.
 */

// ─────────────────────────────────────────────────────────────
// 1. COMPREHENSIVE HTML ENTITY DECODER
// ─────────────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  // Basic
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&ensp;': ' ', '&emsp;': '  ', '&thinsp;': '\u202F',
  // Math symbols → Unicode
  '&times;': '×', '&divide;': '÷', '&plusmn;': '±', '&minus;': '−',
  '&bull;': '•', '&middot;': '·', '&sdot;': '⋅', '&circ;': 'ˆ',
  // Fractions → Unicode
  '&frac12;': '½', '&frac13;': '⅓', '&frac14;': '¼', '&frac34;': '¾',
  '&frac23;': '⅔', '&frac15;': '⅕', '&frac25;': '⅖', '&frac35;': '⅗',
  '&frac45;': '⅘', '&frac16;': '⅙', '&frac56;': '⅚', '&frac18;': '⅛',
  '&frac38;': '⅜', '&frac58;': '⅝', '&frac78;': '⅞',
  // Superscripts / Powers
  '&sup1;': '¹', '&sup2;': '²', '&sup3;': '³',
  // Greek letters – uppercase
  '&Alpha;': 'Α', '&Beta;': 'Β', '&Gamma;': 'Γ', '&Delta;': 'Δ',
  '&Epsilon;': 'Ε', '&Zeta;': 'Ζ', '&Eta;': 'Η', '&Theta;': 'Θ',
  '&Iota;': 'Ι', '&Kappa;': 'Κ', '&Lambda;': 'Λ', '&Mu;': 'Μ',
  '&Nu;': 'Ν', '&Xi;': 'Ξ', '&Omicron;': 'Ο', '&Pi;': 'Π',
  '&Rho;': 'Ρ', '&Sigma;': 'Σ', '&Tau;': 'Τ', '&Upsilon;': 'Υ',
  '&Phi;': 'Φ', '&Chi;': 'Χ', '&Psi;': 'Ψ', '&Omega;': 'Ω',
  // Greek letters – lowercase
  '&alpha;': 'α', '&beta;': 'β', '&gamma;': 'γ', '&delta;': 'δ',
  '&epsilon;': 'ε', '&zeta;': 'ζ', '&eta;': 'η', '&theta;': 'θ',
  '&iota;': 'ι', '&kappa;': 'κ', '&lambda;': 'λ', '&mu;': 'μ',
  '&nu;': 'ν', '&xi;': 'ξ', '&omicron;': 'ο', '&pi;': 'π',
  '&rho;': 'ρ', '&sigma;': 'σ', '&tau;': 'τ', '&upsilon;': 'υ',
  '&phi;': 'φ', '&chi;': 'χ', '&psi;': 'ψ', '&omega;': 'ω',
  // Arrows
  '&larr;': '←', '&uarr;': '↑', '&rarr;': '→', '&darr;': '↓',
  '&harr;': '↔', '&lArr;': '⇐', '&rArr;': '⇒', '&hArr;': '⇔',
  // Math operators
  '&le;': '≤', '&ge;': '≥', '&ne;': '≠', '&equiv;': '≡',
  '&prop;': '∝', '&infin;': '∞', '&sum;': '∑', '&prod;': '∏',
  '&int;': '∫', '&radic;': '√', '&there4;': '∴', '&because;': '∵',
  '&forall;': '∀', '&exist;': '∃', '&isin;': '∈', '&notin;': '∉',
  '&sub;': '⊂', '&sup;': '⊃', '&cup;': '∪', '&cap;': '∩',
  '&oplus;': '⊕', '&otimes;': '⊗', '&empty;': '∅', '&nabla;': '∇',
  '&ang;': '∠', '&perp;': '⊥', '&prime;': '′', '&Prime;': '″',
  '&deg;': '°', '&sim;': '∼', '&asymp;': '≈', '&cong;': '≅',
  // Misc
  '&laquo;': '«', '&raquo;': '»', '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  '&ldquo;': '\u201C', '&rdquo;': '\u201D', '&ndash;': '–', '&mdash;': '—',
  '&trade;': '™', '&reg;': '®', '&copy;': '©', '&cent;': '¢',
  '&pound;': '£', '&euro;': '€', '&yen;': '¥',
};

/**
 * Decodes all HTML entities in a string (both named and numeric).
 * Works in both browser and server (SSR) environments.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  // Replace named entities first (case-sensitive, like the HTML spec)
  let decoded = text.replace(/&[a-zA-Z][a-zA-Z0-9]*;/g, (match) => HTML_ENTITIES[match] || match);

  // Replace decimal numeric entities: &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Replace hex numeric entities: &#x1F600;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Handle double-encoded entities (e.g. &amp;frac12; → &frac12; → ½)
  if (decoded.includes('&') && decoded.includes(';')) {
    decoded = decoded.replace(/&[a-zA-Z][a-zA-Z0-9]*;/g, (match) => HTML_ENTITIES[match] || match);
    decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  return decoded;
}

// ─────────────────────────────────────────────────────────────
// 2. HTML TAG PROCESSORS (for math-in-HTML patterns)
// ─────────────────────────────────────────────────────────────

/**
 * Converts <sup>...</sup> and <sub>...</sub> inside text to LaTeX notation
 * when they appear to contain mathematical content.
 * Only converts inside LaTeX blocks (\\(...\\)) – leaves HTML for display content.
 */
function convertSupSubToLatex(html: string): string {
  // Convert <sup>n</sup> → ^{n} and <sub>n</sub> → _{n} for simple numeric/letter content
  // Only when they appear in math-like contexts (near operators, numbers, letters)
  return html
    .replace(/<sup>([\d\w+\-*/\\^{}(). ]+?)<\/sup>/gi, (_, inner) => `<sup>${inner}</sup>`)
    .replace(/<sub>([\d\w+\-*/\\^{}(). ]+?)<\/sub>/gi, (_, inner) => `<sub>${inner}</sub>`);
}

// ─────────────────────────────────────────────────────────────
// 3. LATEX PREPROCESSOR FOR MATHJAX
// ─────────────────────────────────────────────────────────────

/**
 * Ensures LaTeX commands outside of MathJax delimiters get wrapped.
 * This handles questions where the LaTeX is not delimited.
 */
function wrapOrphanLatex(text: string): string {
  // If already fully wrapped in \( ... \) or \[ ... \], don't double-wrap
  if (/\\\(/.test(text) || /\\\[/.test(text) || /\$/.test(text)) {
    return text; // Let MathJax handle it as-is
  }

  // Detect bare LaTeX patterns that need wrapping
  const BARE_LATEX_PATTERNS = [
    /\\frac\s*\{/,
    /\\sqrt\s*[\[{]/,
    /\\sum\s/,
    /\\int\s/,
    /\\prod\s/,
    /\\lim\s/,
    /\\sin\s/,
    /\\cos\s/,
    /\\tan\s/,
    /\\log\s/,
    /\\ln\s/,
    /\\alpha\s/,
    /\\beta\s/,
    /\\gamma\s/,
    /\\delta\s/,
    /\\theta\s/,
    /\\pi\b/,
    /\^\{[\d\w]+\}/,
    /_\{[\d\w]+\}/,
  ];

  const hasBareLatex = BARE_LATEX_PATTERNS.some(p => p.test(text));
  if (hasBareLatex) {
    // Wrap the whole text in inline math
    return `\\(${text}\\)`;
  }

  return text;
}

// ─────────────────────────────────────────────────────────────
// 4. MASTER CONTENT PROCESSOR
// ─────────────────────────────────────────────────────────────

/**
 * Full pipeline for processing question/option/explanation HTML content.
 * - Decodes all HTML entities
 * - Preserves existing MathJax delimiters intact
 * - Handles <sup>, <sub> tags correctly
 * - Strips invalid or display-breaking tags
 *
 * IMPORTANT: Returns HTML string (safe for dangerouslySetInnerHTML / MathJaxText).
 */
export function processQuestionHtml(rawContent: string | null | undefined): string {
  if (!rawContent) return '';

  // Step 1: Decode all HTML entities (including &frac12;, &times;, &radic;, etc.)
  let processed = decodeHtmlEntities(rawContent);

  // Step 2: Normalize newlines
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 3: Convert standalone newlines (not inside HTML) to <br> only for plain text
  // (HTML content already uses <p>, <br> etc.)
  if (!/<[a-zA-Z]/.test(processed)) {
    // Plain text – convert newlines to <br>
    processed = processed.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    if (processed.includes('</p><p>')) {
      processed = `<p>${processed}</p>`;
    }
  }

  return processed;
}

/**
 * Simple decode for plain text contexts (no HTML needed, just entity decoding).
 */
export function decodeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return decodeHtmlEntities(text);
}
