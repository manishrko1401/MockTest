/**
 * mathUtils.ts — Permanent, comprehensive math & symbol rendering utility.
 *
 * STRATEGY:
 * Instead of relying on MathJax (async CDN, race conditions, unprocessed elements),
 * we convert ALL known LaTeX patterns → rendered HTML directly in processQuestionHtml.
 * MathJax then only needs to handle exotic edge cases that weren't caught here.
 *
 * This guarantees correct rendering regardless of how or where the HTML is rendered
 * (MathJaxText component, plain dangerouslySetInnerHTML, SSR, etc.)
 */

// ─────────────────────────────────────────────────────────────
// 1. HTML ENTITY MAP
// ─────────────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  // Basic
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': '\u00A0', '&ensp;': '\u2002', '&emsp;': '\u2003', '&thinsp;': '\u202F',
  // Math symbols & Operators
  '&times;': '×', '&divide;': '÷', '&plusmn;': '±', '&minus;': '−',
  '&bull;': '•', '&middot;': '·', '&sdot;': '⋅', '&circ;': 'ˆ',
  '&lowast;': '∗', '&radic;': '√', '&infin;': '∞', '&sum;': '∑',
  '&prod;': '∏', '&int;': '∫', '&part;': '∂', '&nabla;': '∇',
  // Fractions (HTML entity)
  '&frac12;': '½', '&frac13;': '⅓', '&frac14;': '¼', '&frac34;': '¾',
  '&frac23;': '⅔', '&frac15;': '⅕', '&frac25;': '⅖', '&frac35;': '⅗',
  '&frac45;': '⅘', '&frac16;': '⅙', '&frac56;': '⅚', '&frac18;': '⅛',
  '&frac38;': '⅜', '&frac58;': '⅝', '&frac78;': '⅞',
  // Superscripts & Subscripts
  '&sup1;': '¹', '&sup2;': '²', '&sup3;': '³', '&sup0;': '⁰', '&sup4;': '⁴',
  '&sup5;': '⁵', '&sup6;': '⁶', '&sup7;': '⁷', '&sup8;': '⁸', '&sup9;': '⁹',
  // Greek – uppercase
  '&Alpha;': 'Α', '&Beta;': 'Β', '&Gamma;': 'Γ', '&Delta;': 'Δ',
  '&Epsilon;': 'Ε', '&Zeta;': 'Ζ', '&Eta;': 'Η', '&Theta;': 'Θ',
  '&Iota;': 'Ι', '&Kappa;': 'Κ', '&Lambda;': 'Λ', '&Mu;': 'Μ',
  '&Nu;': 'Ν', '&Xi;': 'Ξ', '&Omicron;': 'Ο', '&Pi;': 'Π',
  '&Rho;': 'Ρ', '&Sigma;': 'Σ', '&Tau;': 'Τ', '&Upsilon;': 'Υ',
  '&Phi;': 'Φ', '&Chi;': 'Χ', '&Psi;': 'Ψ', '&Omega;': 'Ω',
  // Greek – lowercase
  '&alpha;': 'α', '&beta;': 'β', '&gamma;': 'γ', '&delta;': 'δ',
  '&epsilon;': 'ε', '&zeta;': 'ζ', '&eta;': 'η', '&theta;': 'θ',
  '&iota;': 'ι', '&kappa;': 'κ', '&lambda;': 'λ', '&mu;': 'μ',
  '&nu;': 'ν', '&xi;': 'ξ', '&omicron;': 'ο', '&pi;': 'π',
  '&rho;': 'ρ', '&sigma;': 'σ', '&tau;': 'τ', '&upsilon;': 'υ',
  '&phi;': 'φ', '&chi;': 'χ', '&psi;': 'ψ', '&omega;': 'ω',
  '&sigmaf;': 'ς', '&thetasym;': 'ϑ', '&upsih;': 'ϒ', '&piv;': 'ϖ',
  // Arrows
  '&larr;': '←', '&uarr;': '↑', '&rarr;': '→', '&darr;': '↓',
  '&harr;': '↔', '&lArr;': '⇐', '&rArr;': '⇒', '&hArr;': '⇔',
  '&crarr;': '↵', '&nearr;': '↗', '&searr;': '↘', '&swarr;': '↙', '&nwarr;': '↖',
  // Math relations & Sets
  '&le;': '≤', '&ge;': '≥', '&ne;': '≠', '&equiv;': '≡',
  '&prop;': '∝', '&there4;': '∴', '&because;': '∵',
  '&forall;': '∀', '&exist;': '∃', '&isin;': '∈', '&notin;': '∉',
  '&sub;': '⊂', '&sup;': '⊃', '&cup;': '∪', '&cap;': '∩',
  '&oplus;': '⊕', '&otimes;': '⊗', '&empty;': '∅',
  '&ang;': '∠', '&perp;': '⊥', '&prime;': '′', '&Prime;': '″',
  '&deg;': '°', '&sim;': '∼', '&asymp;': '≈', '&cong;': '≅',
  // Currencies (Complete World Currencies)
  '&dollar;': '$', '&rupee;': '₹', '&inr;': '₹', '&euro;': '€',
  '&pound;': '£', '&yen;': '¥', '&cent;': '¢', '&curren;': '¤',
  '&bitcoin;': '₿', '&ruble;': '₽', '&won;': '₩', '&peso;': '₱',
  '&lira;': '₺', '&hryvnia;': '₴', '&baht;': '฿', '&dong;': '₫',
  '&shekel;': '₪', '&taka;': '৳', '&real;': 'R$',
  // Misc
  '&laquo;': '«', '&raquo;': '»', '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  '&ldquo;': '\u201C', '&rdquo;': '\u201D', '&ndash;': '–', '&mdash;': '—',
  '&trade;': '™', '&reg;': '®', '&copy;': '©', '&micro;': 'µ',
};

// ─────────────────────────────────────────────────────────────
// 2. CURRENCY & HTML ENTITY DECODER & PROTECTOR
// ─────────────────────────────────────────────────────────────

const SAFE_DOLLAR_SYM = '&#36;';

/**
 * Determines if content inside $ ... $ is genuine LaTeX math vs plain text / reasoning operators.
 */
export function isActualLatexMath(inner: string): boolean {
  if (!inner || !inner.trim()) return false;
  const s = inner.trim();

  // Contains LaTeX backslash commands: \frac, \sqrt, \alpha, \sum, etc.
  if (/\\/.test(s)) return true;

  // Contains LaTeX structural math symbols: ^, _, {, }
  if (/[\^_{}]/.test(s)) return true;

  // Contains explicit math operators: +, -, =, *, /, <, >, ≤, ≥, ±, ×, ÷
  if (/[+=*/<>≤≥±×÷]/.test(s)) return true;

  // Single mathematical variable formula e.g. "$x$", "$y$", "$a, b$"
  if (/^[a-zA-Z](\s*,\s*[a-zA-Z])*$/.test(s)) return true;

  return false;
}

/**
 * Protects currency dollar signs & reasoning operators ($50, $ 100, 12 $ 10 $ 6, 'P $ Q')
 * from being misinterpreted as LaTeX math delimiters. Converts them to standard HTML entity &#36;.
 */
export function protectCurrencySymbols(text: string): string {
  if (!text || !text.includes('$')) return text;

  let s = text;

  // 1. Escaped dollar sign \$ -> &#36;
  s = s.replace(/\\\$([0-9a-zA-Z\s,.]*)/g, '&#36;$1');

  // 2. Dollar sign followed by numbers ($50, $ 100, $10.50, $5,000, $0.99, $.50, $1M, $2.5 billion)
  s = s.replace(/\$(\s*)([0-9]+(?:[,.][0-9]+)*(?:\s*(?:million|billion|trillion|lakh|crore|[kKmMbB]))?)/g, '&#36;$1$2');

  // 3. Number followed by dollar sign (50$, 100$, 12 $)
  s = s.replace(/([0-9]+)\s*\$/g, '$1&#36;');

  // 4. Reasoning operators & variables: "12 $ 10", "A $ B", "P $ Q", " $ "
  s = s.replace(/([a-zA-Z0-9'"])\s*\$\s*([a-zA-Z0-9'"])/g, '$1 &#36; $2');
  s = s.replace(/\s+\$\s+/g, ' &#36; ');

  // 5. If $ ... $ contains plain regular text or numbers without LaTeX commands or math operators, protect both $
  s = s.replace(/\$(\s*[a-zA-Z0-9\s,.'"-]+?\s*)\$/g, (match, inner) => {
    if (!isActualLatexMath(inner)) {
      return `&#36;${inner}&#36;`;
    }
    return match;
  });

  // 6. Lone or unclosed dollar signs
  const matches = s.match(/(?<!\\)\$/g);
  if (matches && matches.length % 2 !== 0) {
    s = s.replace(/\$(\s+|$|(?=[.,;!?\s]))/g, '&#36;$1');
  }

  return s;
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  let decoded = text.replace(/&[a-zA-Z][a-zA-Z0-9]*;/g, (m) => HTML_ENTITIES[m] || m);
  // Decode numeric entities EXCEPT &#36; and &#x24; (which are currency / operator $)
  decoded = decoded.replace(/&#(\d+);/g, (m, c) => (c === '36' ? m : String.fromCharCode(Number(c))));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (m, h) => (h.toLowerCase() === '24' ? m : String.fromCharCode(parseInt(h, 16))));

  // Handle double-encoded (e.g. &amp;frac12; → &frac12; → ½)
  if (decoded.includes('&') && decoded.includes(';')) {
    decoded = decoded.replace(/&[a-zA-Z][a-zA-Z0-9]*;/g, (m) => HTML_ENTITIES[m] || m);
    decoded = decoded.replace(/&#(\d+);/g, (m, c) => (c === '36' ? m : String.fromCharCode(Number(c))));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (m, h) => (h.toLowerCase() === '24' ? m : String.fromCharCode(parseInt(h, 16))));
  }

  return decoded;
}

// ─────────────────────────────────────────────────────────────
// 3. LATEX COMMAND → UNICODE / HTML CONVERTER
// ─────────────────────────────────────────────────────────────

/**
 * Maps simple LaTeX commands to their Unicode/display equivalents.
 * These are converted BEFORE MathJax processes anything, so they always render.
 */
const LATEX_TO_UNICODE: Record<string, string> = {
  // Greek lowercase
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
  '\\theta': 'θ', '\\vartheta': 'ϑ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
  '\\pi': 'π', '\\varpi': 'ϖ', '\\rho': 'ρ', '\\varrho': 'ϱ',
  '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
  '\\phi': 'φ', '\\varphi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  // Greek uppercase
  '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
  '\\Epsilon': 'Ε', '\\Zeta': 'Ζ', '\\Eta': 'Η', '\\Theta': 'Θ',
  '\\Iota': 'Ι', '\\Kappa': 'Κ', '\\Lambda': 'Λ', '\\Mu': 'Μ',
  '\\Nu': 'Ν', '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Rho': 'Ρ',
  '\\Sigma': 'Σ', '\\Tau': 'Τ', '\\Upsilon': 'Υ', '\\Phi': 'Φ',
  '\\Chi': 'Χ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  // Math operators
  '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
  '\\cdot': '·', '\\cdots': '⋯', '\\ldots': '…', '\\vdots': '⋮', '\\ddots': '⋱',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
  '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡',
  '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅', '\\propto': '∝',
  '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇', '\\forall': '∀',
  '\\exists': '∃', '\\nexists': '∄', '\\emptyset': '∅', '\\varnothing': '∅',
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
  '\\subseteq': '⊆', '\\supseteq': '⊇', '\\cup': '∪', '\\cap': '∩',
  '\\oplus': '⊕', '\\otimes': '⊗', '\\perp': '⊥', '\\parallel': '∥',
  '\\angle': '∠', '\\ang': '∠', '\\triangle': '△', '\\therefore': '∴', '\\because': '∵',
  '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\oint': '∮', '\\iint': '∬', '\\iiint': '∭',
  '\\sqrt{}': '√', '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉',
  // Arrows
  '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
  '\\leftrightarrow': '↔', '\\uparrow': '↑', '\\downarrow': '↓',
  '\\longrightarrow': '⟶', '\\longleftarrow': '⟵',
  // Misc math & Units
  '\\degree': '°', '\\deg': '°', '\\circ': '°', '\\celsius': '°C', '\\fahrenheit': '°F',
  '\\prime': '′', '\\ddagger': '‡', '\\dagger': '†',
  '\\bullet': '•', '\\star': '★', '\\ast': '*', '\\|': '‖',
  '\\hbar': 'ℏ', '\\ell': 'ℓ', '\\wp': '℘', '\\Re': 'ℜ', '\\Im': 'ℑ', '\\aleph': 'ℵ',
  // Currencies (LaTeX commands & standard symbols)
  '\\rupee': '₹', '\\Rs': '₹', '\\inr': '₹', '\\$': '$', '\\dollar': '$',
  '\\euro': '€', '\\pound': '£', '\\yen': '¥', '\\cent': '¢',
  // Trig functions (display as text)
  '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\cot': 'cot',
  '\\sec': 'sec', '\\csc': 'csc', '\\log': 'log', '\\ln': 'ln',
  '\\exp': 'exp', '\\lim': 'lim', '\\max': 'max', '\\min': 'min',
  '\\gcd': 'gcd', '\\lcm': 'lcm', '\\det': 'det', '\\mod': 'mod',
  // Spacing (collapse to single space)
  '\\,': ' ', '\\;': ' ', '\\:': ' ', '\\!': '',
  '\\quad': '\u2003', '\\qquad': '\u2003\u2003',
  // Brackets
  '\\{': '{', '\\}': '}', '\\(': '', '\\)': '', '\\[': '', '\\]': '',
  '\\left': '', '\\right': '', '\\big': '', '\\Big': '', '\\bigg': '', '\\Bigg': '',
};

// ─────────────────────────────────────────────────────────────
// 4. BRACE PARSER — extracts content of a LaTeX {} group
// ─────────────────────────────────────────────────────────────

/**
 * Given a string starting at index `start` (which should be `{`),
 * returns [innerContent, endIndex] where endIndex is the index AFTER the closing `}`.
 */
function parseBraceGroup(s: string, start: number): [string, number] {
  if (s[start] !== '{') return ['', start];
  let depth = 0;
  let i = start;
  while (i < s.length) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return [s.substring(start + 1, i), i + 1];
    }
    i++;
  }
  // Unclosed brace — return rest
  return [s.substring(start + 1), s.length];
}

// ─────────────────────────────────────────────────────────────
// 5. LATEX MATH BLOCK RENDERER
// ─────────────────────────────────────────────────────────────

/**
 * Converts a LaTeX math string (without delimiters) into rendered HTML.
 * Handles: \frac, \sqrt, ^{}, _{}, \text{}, simple commands, numbers, operators.
 *
 * PERMANENT FIX STRATEGY: Convert all known patterns to HTML here.
 * This means math renders correctly even without MathJax.
 */
function renderLatexMath(latex: string): string {
  if (!latex) return '';

  let result = latex;

  // 1. Strip outer \left \right \big etc. (visual size hints, not semantic)
  result = result.replace(/\\(left|right|big|Big|bigg|Bigg)\s*/g, '');

  // 2. \frac{numerator}{denominator} → rendered HTML fraction (handles nesting)
  result = renderFrac(result);

  // 3. \sqrt{content} or \sqrt[n]{content} → √(content)
  result = result.replace(/\\sqrt(?:\[([^\]]*)\])?\s*\{([^}]*)\}/g, (_, idx, inner) => {
    const rendered = renderLatexMath(inner);
    const indexPart = idx ? `<sup style="font-size:0.7em">${idx}</sup>` : '';
    return `${indexPart}√<span style="text-decoration:overline">${rendered}</span>`;
  });
  result = result.replace(/\\sqrt(?:\[([^\]]*)\])?\s*([^{}\s])/g, (_, idx, char) => {
    const indexPart = idx ? `<sup style="font-size:0.7em">${idx}</sup>` : '';
    return `${indexPart}√${char}`;
  });

  // 4. Comprehensive Superscripts (cubes, squares, powers) & Subscripts
  result = renderPowersAndSubscripts(result);

  // 6. \text{...} → plain text span
  result = result.replace(/\\text\s*\{([^}]*)\}/g, (_, inner) => `<span>${inner}</span>`);
  result = result.replace(/\\textrm\s*\{([^}]*)\}/g, (_, inner) => `<span>${inner}</span>`);
  result = result.replace(/\\textbf\s*\{([^}]*)\}/g, (_, inner) => `<strong>${inner}</strong>`);
  result = result.replace(/\\textit\s*\{([^}]*)\}/g, (_, inner) => `<em>${inner}</em>`);
  result = result.replace(/\\mathrm\s*\{([^}]*)\}/g, (_, inner) => `<span>${inner}</span>`);
  result = result.replace(/\\mathbf\s*\{([^}]*)\}/g, (_, inner) => `<strong>${inner}</strong>`);
  result = result.replace(/\\mathit\s*\{([^}]*)\}/g, (_, inner) => `<em>${inner}</em>`);

  // 7. Simple LaTeX commands → Unicode
  for (const [cmd, unicode] of Object.entries(LATEX_TO_UNICODE)) {
    // Skip multi-char replacements that need special handling
    if (cmd.startsWith('\\sqrt') || cmd.startsWith('\\frac') || cmd.startsWith('\\text') || cmd === '\\(' || cmd === '\\)' || cmd === '\\[' || cmd === '\\]') continue;
    // Escape for regex: \alpha → \\alpha
    const escaped = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match command at word boundary or followed by non-letter
    const re = new RegExp(escaped + '(?![a-zA-Z])', 'g');
    result = result.replace(re, unicode);
  }

  // 8. Remove remaining curly braces {}, these are LaTeX grouping
  result = result.replace(/\{([^}]*)\}/g, '$1');

  // 9. Remove remaining backslash commands we didn't handle
  result = result.replace(/\\[a-zA-Z]+/g, '');

  // 10. Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ');

  return result.trim();
}

/**
 * Iterative \frac renderer that correctly handles nested braces.
 */
function renderFrac(input: string): string {
  if (!input.includes('\\frac')) return input;

  let result = input;
  let safetyLimit = 30;

  while (result.includes('\\frac') && safetyLimit-- > 0) {
    const fracIdx = result.indexOf('\\frac');
    if (fracIdx < 0) break;

    let pos = fracIdx + 5; // skip '\frac'
    while (pos < result.length && result[pos] === ' ') pos++;

    let num: string, den: string, endPos: number;

    if (result[pos] === '{') {
      [num, pos] = parseBraceGroup(result, pos);
      while (pos < result.length && result[pos] === ' ') pos++;
      if (result[pos] === '{') {
        [den, endPos] = parseBraceGroup(result, pos);
      } else {
        // Single char denominator
        den = result[pos] || '';
        endPos = pos + (den ? 1 : 0);
      }
    } else {
      // Single char numerator
      num = result[pos] || '';
      pos++;
      while (pos < result.length && result[pos] === ' ') pos++;
      if (result[pos] === '{') {
        [den, endPos] = parseBraceGroup(result, pos);
      } else {
        den = result[pos] || '';
        endPos = pos + (den ? 1 : 0);
      }
    }

    // Recursively render num and den (handle nested \frac)
    const renderedNum = renderFrac(num);
    const renderedDen = renderFrac(den);

    const fracHtml = `<span class="math-frac" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.2;font-size:0.92em;margin:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 3px;min-width:10px;text-align:center;">${renderedNum}</span><span style="padding:0 3px;min-width:10px;text-align:center;">${renderedDen}</span></span>`;

    result = result.substring(0, fracIdx) + fracHtml + result.substring(endPos);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// 6. MATH DELIMITER STRIPPER & SEGMENT PROCESSOR
// ─────────────────────────────────────────────────────────────

/**
 * Processes a full text string that may contain math delimiters.
 * Segments: \( ... \), \[ ... \], $$ ... $$, $ ... $
 * Each math segment is rendered by renderLatexMath().
 * Non-math segments are left as-is (just HTML text).
 */
function processAllMath(text: string): string {
  if (!text) return '';

  // Quick bail: if no LaTeX-like content, return as-is
  if (!text.includes('\\') && !text.includes('$')) return text;

  const result: string[] = [];
  let i = 0;

  while (i < text.length) {

    // ── \[ ... \] display math ──
    if (text[i] === '\\' && text[i + 1] === '[') {
      const start = i + 2;
      const end = text.indexOf('\\]', start);
      if (end >= 0) {
        const mathContent = text.substring(start, end);
        result.push(`<span class="math-display" style="display:block;text-align:center;padding:4px 0;font-size:1.05em">${renderLatexMath(mathContent)}</span>`);
        i = end + 2;
        continue;
      }
    }

    // ── \( ... \) inline math ──
    if (text[i] === '\\' && text[i + 1] === '(') {
      const start = i + 2;
      const end = text.indexOf('\\)', start);
      if (end >= 0) {
        const mathContent = text.substring(start, end);
        result.push(`<span class="math-inline">${renderLatexMath(mathContent)}</span>`);
        i = end + 2;
        continue;
      }
    }

    // ── $$ ... $$ display math ──
    if (text[i] === '$' && text[i + 1] === '$') {
      const start = i + 2;
      const end = text.indexOf('$$', start);
      if (end >= 0) {
        const mathContent = text.substring(start, end);
        result.push(`<span class="math-display" style="display:block;text-align:center;padding:4px 0;font-size:1.05em">${renderLatexMath(mathContent)}</span>`);
        i = end + 2;
        continue;
      }
    }

    // ── $ ... $ inline math ──
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      const start = i + 1;
      let end = -1;
      for (let j = start; j < text.length; j++) {
        if (text[j] === '$' && text[j - 1] !== '\\') { end = j; break; }
      }
      if (end > start) {
        const mathContent = text.substring(start, end);
        if (isActualLatexMath(mathContent)) {
          result.push(`<span class="math-inline">${renderLatexMath(mathContent)}</span>`);
          i = end + 1;
          continue;
        }
      }
    }

    // ── Plain text character ── collect until next math delimiter
    const plainStart = i;
    while (i < text.length) {
      if (text[i] === '\\' && (text[i + 1] === '(' || text[i + 1] === '[')) break;
      if (text[i] === '$') break;
      i++;
    }
    if (i > plainStart) {
      result.push(text.substring(plainStart, i));
    } else {
      // Avoid infinite loop if nothing was consumed
      result.push(text[i]);
      i++;
    }
  }

  return result.join('');
}

// ─────────────────────────────────────────────────────────────
// 7. MASTER CONTENT PROCESSOR
// ─────────────────────────────────────────────────────────────

/**
 * Full pipeline for processing question/option/explanation content.
 *
 * Steps:
 *  1. Decode HTML entities (&amp;, &times;, &frac12;, etc.)
 *  2. Normalize newlines
 *  3. If content contains HTML tags: process math ONLY in text nodes (skip tags)
 *     If plain text: run full math processing
 *  4. Convert \frac{}{}, \sqrt{}, ^{}, _{}, \alpha etc. → HTML
 *  5. Return rendered HTML string safe for dangerouslySetInnerHTML
 *
 * PERMANENT: Works without MathJax. MathJax is a bonus for exotic expressions.
 */
export function processQuestionHtml(rawContent: string | null | undefined): string {
  if (!rawContent) return '';

  // Step 1: Protect currency symbols ($50, $ 100, $10.50, $5,000, etc.) from math parser
  let processed = protectCurrencySymbols(rawContent);

  // Step 2: Decode HTML entities (&amp;, &times;, &frac12;, &rupee;, &dollar;, etc.) 4 passes
  for (let i = 0; i < 4; i++) {
    const n = decodeHtmlEntities(processed);
    if (n === processed) break;
    processed = n;
  }

  // Step 2b: Rescue broken or truncated <img> tag fragments and bare image filenames
  // (E.g. `10.3.21_Pallavi_D13.png" style="width: 344px; height: 81px;" />`, `//cdn.testbook.com/... width="26px" />`)
  processed = processed.replace(
    /(?:<img\b([^>]*?)\bsrc=["']?([^"'\s>]+)["']?([^>]*?)>)|((?:https?:)?\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg|PNG|JPG|JPEG))\s*"?\s*(?:width=["']?(\d+)px?["']?)?\s*(?:style=["']?[^"']*?(?:width:\s*(\d+)px)?[^"']*?(?:height:\s*(\d+)px)?[^"']*?["']?)?\s*\/?\s*>|([a-zA-Z0-9_.\-%]+\.(?:png|jpg|jpeg|gif|webp|svg|PNG|JPG|JPEG))\s*"?\s*(?:width=["']?(\d+)px?["']?)?\s*(?:style=["']?[^"']*?(?:width:\s*(\d+)px)?[^"']*?(?:height:\s*(\d+)px)?[^"']*?["']?)?\s*\/?\s*>/gi,
    (match, imgAttrs1, existingSrc, imgAttrs2, protoUrl, pW1, pW2, pH, bareFile, bW1, bW2, bH) => {
      // Case A: Valid <img> tag
      if (existingSrc !== undefined) {
        let src = existingSrc.trim();
        if (src.startsWith('//')) src = 'https:' + src;
        const attrs = (imgAttrs1 || '') + ` src="${src}" ` + (imgAttrs2 || '');
        let cleanAttrs = attrs.trim().replace(/\s+/g, ' ');
        if (cleanAttrs.endsWith('/')) cleanAttrs = cleanAttrs.slice(0, -1).trim();
        return `<img ${cleanAttrs} />`;
      }

      // Case B: Truncated URL fragment
      if (protoUrl) {
        let src = protoUrl.trim();
        if (src.startsWith('//')) src = 'https:' + src;
        const w = pW1 || pW2;
        const h = pH;
        const wAttr = w ? ` width="${w}"` : '';
        const hAttr = h ? ` height="${h}"` : '';
        return `<img src="${src}"${wAttr}${hAttr} />`;
      }

      // Case C: Bare image filename fragment
      if (bareFile) {
        let file = bareFile.trim();
        let src = file;
        if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//') && !src.startsWith('data:') && !src.startsWith('/')) {
          src = `https://storage.googleapis.com/tb-img/production/21/03/${file}`;
        }
        if (src.startsWith('//')) src = 'https:' + src;
        const w = bW1 || bW2;
        const h = bH;
        const wAttr = w ? ` width="${w}"` : '';
        const hAttr = h ? ` height="${h}"` : '';
        return `<img src="${src}"${wAttr}${hAttr} />`;
      }

      return match;
    }
  );

  // Step 2c: Normalize ALL <img ... src="//..." ...> to https://
  processed = processed.replace(/<img\b([^>]*)\bsrc=["']\/\//gi, '<img$1src="https://');

  // Step 3: Normalize newlines
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 4: Process math
  const hasHtmlTags = /<[a-zA-Z]/.test(processed);

  if (hasHtmlTags) {
    // Content has HTML tags — process math only in text nodes (between tags)
    // Split by HTML tags, process text segments, reassemble
    processed = processed.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
      if (tag) return tag; // Keep HTML tags as-is
      if (text) return processAllMath(text); // Process math in text
      return match;
    });
  } else {
    // Plain text — process all math
    processed = processAllMath(processed);

    // Convert newlines to <br> for plain text display
    processed = processed.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    if (processed.includes('</p><p>')) {
      processed = `<p>${processed}</p>`;
    }
  }

  // Step 5: Always format any remaining bare powers (^3, ^2, ^4, ^5, ^-1, unicode powers) & subscripts
  processed = renderPowersAndSubscripts(processed);

  // Step 6: Clean up any legacy string placeholder tokens
  processed = processed.replaceAll('___SAFE_DOLLAR_SYM___', '&#36;');

  return processed;
}

/**
 * Universal Power & Subscript Formatter.
 * Handles cubes (^3, ³), squares (^2, ²), power 4 (^4, ⁴), power 5 (^5, ⁵), multi-digit powers (^10, ^{-2}),
 * and subscripts (_1, _{n}) everywhere — inside and outside math delimiters.
 */
export function renderPowersAndSubscripts(text: string): string {
  if (!text) return '';
  let s = text;

  // Protect HTML img tags first, then standalone URLs from subscript/power mangling
  // Use underscore-free immune token keys (e.g. @@@IMGTAGTOKENX0@@@) to prevent subscript regex mangling
  const protectedTokens: Array<{ token: string; key: string }> = [];

  s = s.replace(/<img[^>]+>/gi, (imgTag) => {
    const key = `@@@IMGTAGTOKENX${protectedTokens.length}@@@`;
    protectedTokens.push({ token: imgTag, key });
    return key;
  });

  s = s.replace(/(?:https?:\/\/|\/\/)[^\s"'<>]+/gi, (url) => {
    const key = `@@@URLTOKENX${protectedTokens.length}@@@`;
    protectedTokens.push({ token: url, key });
    return key;
  });

  // 1. Standardize Unicode superscripts (³, ², ¹, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, ⁰, ⁺, ⁻, ⁿ) -> <sup>
  const superMap: Record<string, string> = {
    '³': '3', '²': '2', '¹': '1', '⁴': '4', '⁵': '5',
    '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁰': '0',
    '⁺': '+', '⁻': '-', 'ⁿ': 'n'
  };
  s = s.replace(/[³²¹⁴⁵⁶⁷⁸⁹⁰⁺⁻ⁿ]/g, m => `<sup style="font-size:0.75em;line-height:0;vertical-align:super;">${superMap[m] || m}</sup>`);

  // 2. Caret powers (handles spaces like "31 ^ 3", "x ^ {3}", "10 ^ -5"):
  // ^{inner} -> <sup>inner</sup>
  s = s.replace(/(?<!\\)\s*\^\s*\{([^}]+)\}/g, (_, inner) => `<sup style="font-size:0.75em;line-height:0;vertical-align:super;">${inner}</sup>`);

  // ^(inner) -> <sup>inner</sup>
  s = s.replace(/(?<!\\)\s*\^\s*\(([^)]+)\)/g, (_, inner) => `<sup style="font-size:0.75em;line-height:0;vertical-align:super;">${inner}</sup>`);

  // ^+123 or ^-123 or ^123 or ^ 3 (multi-digit exponents, negative exponents, signed exponents, spaces)
  s = s.replace(/(?<!\\)\s*\^\s*([\+\-]?\d+)/g, (_, num) => `<sup style="font-size:0.75em;line-height:0;vertical-align:super;">${num}</sup>`);

  // ^n, ^x, ^a, ^k (single variable exponents)
  s = s.replace(/(?<!\\)\s*\^\s*([a-zA-Z])(?![a-zA-Z0-9])/g, (_, char) => `<sup style="font-size:0.75em;line-height:0;vertical-align:super;">${char}</sup>`);

  // Protect fill-in-the-blank reasoning series underscores (e.g. "_ P N I E X _ N I E Y P N", "a _ b", " _ ")
  const blankToken = '@@@BLANKUNDERSCOREX@@@';

  // 1. Multiple consecutive underscores: __, ___, ____
  s = s.replace(/_{2,}/g, (m) => m.split('').map(() => blankToken).join(''));

  // 2. Underscore surrounded by spaces: " _ "
  s = s.replace(/\s+_\s+/g, ` ${blankToken} `);

  // 3. Underscore at start of line/string followed by space: "^_ "
  s = s.replace(/(^|\n)\s*_\s+/g, `$1${blankToken} `);

  // 4. Underscore preceded by space and followed by space or capital letters (reasoning series: " _ P N", " _ N I")
  s = s.replace(/\s+_\s*([A-Z](?:\s+[A-Z])*\b)/g, ` ${blankToken} $1`);

  // 5. Underscore at start of string before capital letter in series: "^_ P", "^_P"
  s = s.replace(/^_\s*([A-Z]\b)/g, `${blankToken} $1`);

  // 3. Subscripts (ONLY apply if preceded by a valid variable/identifier character e.g. x_1, a_n, H_2O, a_{n})
  // _{inner} -> <sub>inner</sub>
  s = s.replace(/([a-zA-Z0-9\)])\s*_\s*\{([^}]+)\}/g, '$1<sub style="font-size:0.75em;line-height:0;vertical-align:sub;">$2</sub>');

  // _(inner) -> <sub>inner</sub>
  s = s.replace(/([a-zA-Z0-9\)])\s*_\s*\(([^)]+)\)/g, '$1<sub style="font-size:0.75em;line-height:0;vertical-align:sub;">$2</sub>');

  // x_123 or x_-1 or a_1 (numeric subscript)
  s = s.replace(/([a-zA-Z0-9\)])\s*_\s*([\+\-]?\d+)/g, '$1<sub style="font-size:0.75em;line-height:0;vertical-align:sub;">$2</sub>');

  // a_n, x_i, k_j (single variable subscript, requires preceding letter/number)
  s = s.replace(/([a-zA-Z0-9\)])\s*_\s*([a-zA-Z])(?![a-zA-Z0-9])/g, '$1<sub style="font-size:0.75em;line-height:0;vertical-align:sub;">$2</sub>');

  // Restore protected blank underscores
  s = s.replaceAll(blankToken, '_');

  // Restore protected tokens in reverse order
  for (let i = protectedTokens.length - 1; i >= 0; i--) {
    const { token, key } = protectedTokens[i];
    s = s.replaceAll(key, token);
  }

  return s;
}

/**
 * Simple decode for plain text contexts (no HTML/math processing needed).
 */
export function decodeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return decodeHtmlEntities(text);
}
