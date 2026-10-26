/**
 * mathUtils.ts — Permanent, comprehensive math & symbol rendering utility.
 *
 * STRATEGY:
 * Every maths piece (\( \), \[ \], $$ $$, real $ $) becomes
 *   <span class="math-inline" data-tex="…the original LaTeX…">…HTML fallback…</span>
 * The fallback (fractions, roots, powers, symbols drawn in HTML) shows straight away and
 * wherever MathJax isn't loaded. Where MathJax is loaded (MathJaxText on the website, the
 * question page in the Android app) it typesets the original LaTeX from data-tex, so every
 * construct (\over, matrices, \overline, nested fractions…) renders exactly. If MathJax can't
 * parse a piece, the fallback stays.
 *
 * Money and puzzle "$" signs are protected first (protectCurrencySymbols), and MathJax is not
 * told to look for "$" itself, so "$50 … $60" can never turn into maths.
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

/**
 * $…$ / $$…$$ pairs that are clearly maths (a LaTeX command, ^, _, braces, or an equation
 * starting with a variable: "$a + b = 0$") become \( … \) / \[ … \] before money is protected.
 * Money ("$5 billion and $10") and puzzle symbols ("7 $ B Z 9 $ 4") don't match.
 */
export function promoteDollarMath(text: string): string {
  if (!text || !text.includes('$')) return text;
  const looksLikeMath = (inner: string) => {
    const s = inner.trim();
    if (!s || /<\/?[a-zA-Z]/.test(s)) return false;
    if (/\\[a-zA-Z]+|[\^_{}]/.test(s)) return true;
    return /^[a-zA-Z](?:\s*[=+\-−×÷*/<>≤≥(]|\s*$)/.test(s) && !/\b(?:billion|million|crore|lakh|thousand)\b/i.test(s);
  };
  let s = text.replace(/(?<!\\)\$\$([^$]+?)\$\$/g, (m, inner) => (looksLikeMath(inner) ? `\\[${inner}\\]` : m));
  s = s.replace(/(?<![\\$])\$(?!\$)([^$\n]+?)(?<!\\)\$(?!\$)/g, (m, inner) => (looksLikeMath(inner) && !/^\s|\s$/.test(inner) ? `\\(${inner}\\)` : m));
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

  // 1. Same meaning, simpler form: \dfrac → \frac, {a \over b} → \frac{a}{b}, size hints removed.
  //    "<" / ">" in maths are comparisons, never tags.
  let result = normalizeTex(latex.replace(/</g, LT).replace(/>/g, GT));

  // 2. Matrices / arrays → small HTML tables
  result = renderMatrices(result);

  // 3. \frac{numerator}{denominator} and \binom{n}{k} → stacked HTML (handles nesting)
  result = renderFrac(result);

  // 4. \sqrt{…} (nested braces) or \sqrt[n]{…} → √ with a bar over the content
  result = replaceCommandWithGroups(result, '\\sqrt', (inner, index) =>
    `${index ? `<sup style="font-size:0.7em">${index}</sup>` : ''}√<span style="text-decoration:overline">${inner}</span>`, true);
  result = result.replace(/\\sqrt\s*([^{}\s\\])/g, '√$1');

  // 5. Accents and bars
  const over = (s: string) => `<span style="text-decoration:overline">${s}</span>`;
  result = replaceCommandWithGroups(result, '\\overline', over);
  result = replaceCommandWithGroups(result, '\\bar', over);
  result = replaceCommandWithGroups(result, '\\underline', s => `<span style="text-decoration:underline">${s}</span>`);
  result = replaceCommandWithGroups(result, '\\hat', s => `${s}̂`);
  result = replaceCommandWithGroups(result, '\\widehat', s => `${s}̂`);
  result = replaceCommandWithGroups(result, '\\vec', s => `${s}⃗`);
  result = replaceCommandWithGroups(result, '\\overrightarrow', s => `${s}⃗`);
  result = replaceCommandWithGroups(result, '\\dot', s => `${s}̇`);
  result = replaceCommandWithGroups(result, '\\tilde', s => `${s}̃`);
  result = replaceCommandWithGroups(result, '\\boxed', s => `<span style="border:1px solid currentColor;padding:0 3px">${s}</span>`);
  result = replaceCommandWithGroups(result, '\\mathbb', s => s.replace(/[A-Z]/g, c => DOUBLE_STRUCK[c] || c));

  // 6. Comprehensive Superscripts (cubes, squares, powers) & Subscripts
  result = renderPowersAndSubscripts(result);

  // 7. \text{...} and font commands
  result = replaceCommandWithGroups(result, '\\text', s => `<span>${s}</span>`);
  result = replaceCommandWithGroups(result, '\\textrm', s => `<span>${s}</span>`);
  result = replaceCommandWithGroups(result, '\\mathrm', s => `<span>${s}</span>`);
  result = replaceCommandWithGroups(result, '\\operatorname', s => `<span>${s}</span>`);
  result = replaceCommandWithGroups(result, '\\textbf', s => `<strong>${s}</strong>`);
  result = replaceCommandWithGroups(result, '\\mathbf', s => `<strong>${s}</strong>`);
  result = replaceCommandWithGroups(result, '\\boldsymbol', s => `<strong>${s}</strong>`);
  result = replaceCommandWithGroups(result, '\\textit', s => `<em>${s}</em>`);
  result = replaceCommandWithGroups(result, '\\mathit', s => `<em>${s}</em>`);
  result = replaceCommandWithGroups(result, '\\color', (_c, _i, rest) => rest ?? '', false, true);

  // 8. Simple LaTeX commands → Unicode (longest first, so \leq wins over \le)
  for (const [cmd, unicode] of UNICODE_COMMANDS) {
    const escaped = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped + (/[a-zA-Z]$/.test(cmd) ? '(?![a-zA-Z])' : ''), 'g'), unicode);
  }

  // 8b. Font / size switches (\rm, \bf, \large…) and any other command left in front of a group
  //     go before the braces do, so "\rm{conduction}" doesn't become "\rmconduction" and vanish
  result = result.replace(/\\(?:rm|bf|it|sf|tt|cal|mathcal|mathsf|mathtt|mathop|large|Large|LARGE|small|normalsize|scriptsize|footnotesize|tiny|huge|Huge|space)(?![a-zA-Z])\s*/g, ' ');
  result = result.replace(/\\[a-zA-Z]+(?=\s*\{)/g, '');

  // 9. Remove remaining grouping braces (innermost first, until none are left)
  for (let k = 0; k < 10 && /\{[^{}]*\}/.test(result); k++) result = result.replace(/\{([^{}]*)\}/g, '$1');

  // 10. Line breaks (\\) in aligned / cases blocks; any other unknown command is dropped
  result = result.replace(/\\\\/g, '<br>');
  result = result.replace(/\\[a-zA-Z]+/g, '');
  result = result.replaceAll(ESCAPED_UNDERSCORE, '_').replaceAll(ESCAPED_AMP, '&amp;').replaceAll(LBRACE, '{').replaceAll(RBRACE, '}').replaceAll(LT, '&lt;').replaceAll(GT, '&gt;');

  // 11. Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ');

  return result.trim();
}

const ESCAPED_UNDERSCORE = '@@@ESCUNDERSCOREX@@@';
const ESCAPED_AMP = '@@@ESCAMPX@@@';
const LT = '@@@LTX@@@';
const GT = '@@@GTX@@@';
const LBRACE = '@@@LBRACEX@@@';
const RBRACE = '@@@RBRACEX@@@';
const DOUBLE_STRUCK: Record<string, string> = { N: 'ℕ', Z: 'ℤ', Q: 'ℚ', R: 'ℝ', C: 'ℂ', P: 'ℙ' };
const UNICODE_COMMANDS = Object.entries(LATEX_TO_UNICODE)
  .filter(([cmd]) => !['\\sqrt{}', '\\(', '\\)', '\\[', '\\]'].includes(cmd))
  .sort((a, b) => b[0].length - a[0].length);

/** Same meaning, simpler form for the HTML fallback. */
function normalizeTex(latex: string): string {
  let s = latex;
  s = s.replace(/\\(?:dfrac|tfrac|cfrac)(?![a-zA-Z])/g, '\\frac');
  s = s.replace(/\\(?:displaystyle|textstyle|scriptstyle|limits|nolimits)(?![a-zA-Z])/g, '');
  s = s.replace(/\\(?:left|right)\s*\./g, '');
  s = s.replace(/\\(?:left|right|bigl|bigr|Bigl|Bigr|biggl|biggr|big|Big|bigg|Bigg)(?![a-zA-Z])\s*/g, '');
  s = s.replace(/\\(?:left|right)\s*\\?([()[\]|{}])/g, '$1');
  s = s.replace(/\\%/g, '%').replace(/\\&/g, ESCAPED_AMP).replace(/\\#/g, '#').replace(/\\_/g, ESCAPED_UNDERSCORE);
  s = s.replace(/\\\{/g, LBRACE).replace(/\\\}/g, RBRACE).replace(/\\lbrace(?![a-zA-Z])/g, LBRACE).replace(/\\rbrace(?![a-zA-Z])/g, RBRACE);
  s = s.replace(/\\(?:mathrm|text)\s*\{\s*\}/g, '');
  s = s.replace(/\\[,;:!> ]/g, ' ');
  s = convertOver(s, '\\over', (a, b) => `\\frac{${a}}{${b}}`);
  s = convertOver(s, '\\choose', (a, b) => `\\binom{${a}}{${b}}`);
  return s;
}

/** {a \over b} → \frac{a}{b} (the group around \over, or the whole piece). */
function convertOver(input: string, word: string, make: (a: string, b: string) => string): string {
  let s = input;
  const re = new RegExp(word.replace(/\\/g, '\\\\') + '(?![a-zA-Z])');
  for (let guard = 0; guard < 50; guard++) {
    const m = re.exec(s);
    if (!m) break;
    const at = m.index;
    let start = -1;
    for (let j = at - 1, depth = 0; j >= 0; j--) {
      if (s[j] === '}') depth++;
      else if (s[j] === '{') { if (depth === 0) { start = j; break; } depth--; }
    }
    let end = s.length;
    for (let j = at + word.length, depth = 0; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { if (depth === 0) { end = j; break; } depth--; }
    }
    const frac = make(s.slice(start + 1, at).trim(), s.slice(at + word.length, end).trim());
    s = start >= 0 ? `${s.slice(0, start)}{${frac}}${s.slice(end + 1)}` : frac + s.slice(end + 1);
  }
  return s;
}

/**
 * Replaces \cmd{…} (nested braces allowed; optional [index] when withIndex) using make().
 * With takesRest, \cmd{x} applies to the rest of the piece (like \color{red} text).
 */
function replaceCommandWithGroups(input: string, cmd: string, make: (inner: string, index?: string, rest?: string) => string, withIndex = false, takesRest = false): string {
  let s = input;
  const re = new RegExp(cmd.replace(/\\/g, '\\\\') + '(?![a-zA-Z])');
  for (let guard = 0; guard < 60; guard++) {
    const m = re.exec(s);
    if (!m) break;
    let pos = m.index + cmd.length;
    while (s[pos] === ' ') pos++;
    let index: string | undefined;
    if (withIndex && s[pos] === '[') {
      const close = s.indexOf(']', pos);
      if (close > pos) { index = s.slice(pos + 1, close); pos = close + 1; while (s[pos] === ' ') pos++; }
    }
    let inner: string, end: number;
    if (s[pos] === '{') [inner, end] = parseBraceGroup(s, pos);
    else if (s[pos] === '\\') { const w = /^\\[a-zA-Z]+/.exec(s.slice(pos)); inner = w ? w[0] : s[pos]; end = pos + inner.length; }
    else { inner = s[pos] || ''; end = pos + (inner ? 1 : 0); }
    // Keep a command just before (\cdot\hat{b}) separate from the replacement
    const before = s.slice(0, m.index) + (/\\[a-zA-Z]+$/.test(s.slice(0, m.index)) ? ' ' : '');
    if (takesRest) { s = before + make(inner, index, s.slice(end)); continue; }
    s = before + make(inner, index) + s.slice(end);
  }
  return s;
}

/** \begin{matrix|pmatrix|bmatrix|vmatrix|array|cases|aligned} … \end{…} → a small inline table. */
function renderMatrices(input: string): string {
  return input.replace(/\\begin\{(matrix|pmatrix|bmatrix|Bmatrix|vmatrix|array|cases|aligned|align\*?|gathered|split)\}(\{[^}]*\})?([\s\S]*?)\\end\{\1\}/g, (_m, kind: string, _cols, body: string) => {
    const rows = body.split(/\\\\/).map(r => r.trim()).filter(Boolean)
      .map(r => `<span style="display:table-row">${r.split(/(?<!\\)&/).map(c => `<span style="display:table-cell;padding:1px 6px;text-align:${kind === 'cases' || kind.startsWith('align') ? 'left' : 'center'}">${c.trim()}</span>`).join('')}</span>`).join('');
    const table = `<span style="display:inline-table;vertical-align:middle">${rows}</span>`;
    const [l, r] = kind === 'pmatrix' ? ['(', ')'] : kind === 'bmatrix' ? ['[', ']'] : kind === 'Bmatrix' ? [LBRACE, RBRACE] : kind === 'vmatrix' ? ['|', '|'] : kind === 'cases' ? [LBRACE, ''] : ['', ''];
    const big = (c: string) => (c ? `<span style="font-size:1.6em;vertical-align:middle;font-weight:300">${c}</span>` : '');
    return `${big(l)}${table}${big(r)}`;
  });
}

/**
 * Iterative \frac renderer that correctly handles nested braces.
 */
function renderFrac(input: string): string {
  if (!input.includes('\\frac') && !input.includes('\\binom')) return input;

  let result = input;
  let safetyLimit = 30;

  while (safetyLimit-- > 0) {
    const found = /\\(frac|binom)(?![a-zA-Z])/.exec(result);
    if (!found) break;
    const fracIdx = found.index;
    const isBinom = found[1] === 'binom';

    let pos = fracIdx + found[0].length; // skip '\frac' / '\binom'
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

    const line = isBinom ? 'none' : '1.5px solid currentColor';
    const stacked = `<span class="math-frac" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.2;font-size:0.92em;margin:0 2px;"><span style="border-bottom:${line};padding:0 3px;min-width:10px;text-align:center;">${renderedNum}</span><span style="padding:0 3px;min-width:10px;text-align:center;">${renderedDen}</span></span>`;
    const fracHtml = isBinom ? `(${stacked})` : stacked;

    result = result.substring(0, fracIdx) + fracHtml + result.substring(endPos);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// 6. MATH DELIMITER STRIPPER & SEGMENT PROCESSOR
// ─────────────────────────────────────────────────────────────

/**
 * The LaTeX kept in data-tex. Percent-encoded with only [A-Za-z0-9%-] left, so the later
 * power / subscript / entity passes (which look for ^ _ & < >) can never touch it.
 */
export function encodeTex(tex: string): string {
  return encodeURIComponent(tex).replace(/[_.!~*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
export function decodeTex(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

// A real HTML tag (not "a < b" inside maths)
const HTML_TAG_RE = /<\/?(?:span|sup|sub|b|i|u|s|strong|em|br|p|div|font|img|table|thead|tbody|tr|td|th|li|ul|ol|a|small|big|math|mi|mo|mn|mrow|mfrac|svg)\b[^>]*>/i;

// Symbol commands that sometimes appear in plain text (outside \( \)); shown as the symbol
const PLAIN_SYMBOLS = ['triangle', 'angle', 'times', 'div', 'pi', 'theta', 'alpha', 'beta', 'gamma', 'delta', 'Delta', 'lambda',
  'sigma', 'omega', 'Omega', 'phi', 'infty', 'pm', 'circ', 'cdot', 'therefore', 'because', 'Rightarrow', 'rightarrow', 'leq', 'geq', 'neq', 'approx'];
const PLAIN_SYMBOL_RE = new RegExp(`\\\\(${PLAIN_SYMBOLS.join('|')})(?![a-zA-Z])`, 'g');

/** A bare \frac{…}{…} / \dfrac / \sqrt{…} in plain text (no \( \) around it) → a maths piece. */
function wrapBareLatex(text: string): string {
  const re = /\\(d?frac|tfrac|sqrt)(?![a-zA-Z])/g;
  let out = '';
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    let pos = m.index + m[0].length;
    if (m[1] === 'sqrt' && text[pos] === '[') { const c = text.indexOf(']', pos); if (c < 0) continue; pos = c + 1; }
    const groups = m[1] === 'sqrt' ? 1 : 2;
    let ok = true;
    for (let g = 0; g < groups; g++) {
      while (text[pos] === ' ') pos++;
      if (text[pos] !== '{') { ok = false; break; }
      const [, end] = parseBraceGroup(text, pos);
      if (end > text.length || text[end - 1] !== '}') { ok = false; break; }
      pos = end;
    }
    if (!ok) continue;
    // a power right after it belongs to it: \frac{a}{b}^{2}
    const pow = /^\^(?:\{[^{}]*\}|\d)/.exec(text.slice(pos));
    if (pow) pos += pow[0].length;
    out += text.slice(last, m.index) + mathSpan(text.slice(m.index, pos), false);
    last = pos;
    re.lastIndex = pos;
  }
  return last ? out + text.slice(last) : text;
}

/** Text between maths pieces: stray symbol commands, and "\n" / "\t" / \" left by bad escaping. */
function tidyPlainText(text: string): string {
  if (!text.includes('\\')) return text;
  return wrapBareLatex(text)
    .replace(PLAIN_SYMBOL_RE, (m, name) => LATEX_TO_UNICODE[`\\${name}`] ?? m)
    .replace(/\\r\\n|\\n(?=[A-Z0-9\s(•\-–"'‘“ऀ-ॿ])/g, '<br>')
    .replace(/\\t(?=[A-Z0-9\s])/g, ' ')
    .replace(/\\"/g, '"');
}

/**
 * Fixes for LaTeX as it comes from question banks, so MathJax shows what the author meant:
 *  - curly brackets typed as brackets in sums, "27-[5-{6+2(7-3)}]": LaTeX would hide them
 *  - ₹ and Hindi text inside maths go into \text{} (MathJax can't draw them as maths symbols)
 *  - matrix rows whose "\\" lost a backslash ("1&3\2&-8")
 */
export function repairTex(tex: string): string {
  let s = tex;
  if (!s) return s;
  // Matrix / array / aligned rows: a single "\" before a digit, minus, "a_1"-style entry or the
  // next row's "&" is a row break that lost its second backslash
  s = s.replace(/\\begin\{(matrix|pmatrix|bmatrix|Bmatrix|vmatrix|array|aligned|align\*?|cases|gathered|split|eqnarray\*?)\}([\s\S]*?)\\end\{\1\}/g, (m) =>
    m.replace(/(?<!\\)\\(?=\s*&)|(?<!\\)\\(?=[-0-9]|[a-z]_|[a-z]&)/g, '\\\\'));
  s = bracesAsBrackets(s);
  // ₹, other currency signs and Devanagari runs → \text{…}
  s = s.replace(/[₹€£¥ऀ-ॿ](?:[ऀ-ॿ\s]*[ऀ-ॿ])?/g, m => `\\text{${m}}`);
  return s;
}

/** "{" … "}" written as curly brackets in a sum (not LaTeX grouping) → "\{" … "\}". */
function bracesAsBrackets(tex: string): string {
  if (!tex.includes('{')) return tex;
  let out = '';
  const stack: boolean[] = [];
  for (let i = 0; i < tex.length; i++) {
    const ch = tex[i];
    if (ch === '\\') {
      const m = /^\\(?:[a-zA-Z]+|.)/.exec(tex.slice(i));
      const cmd = m ? m[0] : ch;
      out += cmd;
      i += cmd.length - 1;
      continue;
    }
    if (ch === '{') {
      const before = out.replace(/\s+$/, '');
      const prev = before.slice(-1);
      const afterCommand = /\\[a-zA-Z]+$/.test(before);
      const [inner, end] = parseBraceGroup(tex, i);
      const next = tex.slice(end).trimStart()[0];
      const topLevel = inner.replace(/\{[^{}]*\}/g, 'X').replace(/\{[^{}]*\}/g, 'X');
      // Not an argument of a command, a power / subscript, or the 2nd part of \frac{..}{..}
      const literal = !afterCommand && prev !== '' && !'^_}]'.includes(prev);
      const isSum = /[-+×÷*/=]|\\times|\\div|\\cdot/.test(topLevel.slice(1)) && /[0-9a-zA-Z)]/.test(topLevel);
      const asBracket = literal && isSum && next !== '^' && next !== '_' && !/\\(?:over|choose|atop)(?![a-zA-Z])/.test(inner);
      stack.push(asBracket);
      out += asBracket ? '\\{' : '{';
      continue;
    }
    if (ch === '}') {
      out += stack.pop() ? '\\}' : '}';
      continue;
    }
    out += ch;
  }
  return out;
}

/** One maths piece: the original LaTeX for MathJax plus the HTML fallback. */
function mathSpan(tex: string, display: boolean): string {
  const t = repairTex(tex.trim());
  if (!t) return '';
  // A multi-row block (aligned steps) written as inline maths still gets its own lines
  if (/\\begin\{(?:aligned|align\*?|gathered|split|eqnarray\*?)\}/.test(t)) display = true;
  const fallback = renderLatexMath(t);
  return display
    ? `<span class="math-display" data-tex="${encodeTex(t)}" data-display="1" style="display:block;text-align:center;padding:4px 0;font-size:1.05em">${fallback}</span>`
    : `<span class="math-inline" data-tex="${encodeTex(t)}">${fallback}</span>`;
}

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
        result.push(mathSpan(text.substring(start, end), true));
        i = end + 2;
        continue;
      }
    }

    // ── \( ... \) inline math ──
    if (text[i] === '\\' && text[i + 1] === '(') {
      const start = i + 2;
      const end = text.indexOf('\\)', start);
      if (end >= 0) {
        result.push(mathSpan(text.substring(start, end), false));
        i = end + 2;
        continue;
      }
    }

    // ── $$ ... $$ display math ──
    if (text[i] === '$' && text[i + 1] === '$') {
      const start = i + 2;
      const end = text.indexOf('$$', start);
      if (end >= 0) {
        result.push(mathSpan(text.substring(start, end), true));
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
        // A pair that spans a protected money / puzzle "$" is not a maths piece
        if (isActualLatexMath(mathContent) && !mathContent.includes('&#36;')) {
          result.push(mathSpan(mathContent, false));
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
      result.push(tidyPlainText(text.substring(plainStart, i)));
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

  // Step 0: Maths copied from another site's MathJax output → its original LaTeX / MathML
  let processed = cleanCopiedMathJax(rawContent);

  // Step 1: Real $…$ maths → \( … \), then protect currency symbols ($50, $ 100, $10.50,
  // $5,000, etc.) from math parser. (Without the first part "$x = \sqrt{10} + 3$" lost its
  // closing "$" to the "3$ is money" rule.)
  processed = promoteDollarMath(processed);
  processed = protectCurrencySymbols(processed);

  // Step 2: Decode HTML entities (&amp;, &times;, &frac12;, &rupee;, &dollar;, etc.) 4 passes
  for (let i = 0; i < 4; i++) {
    const n = decodeHtmlEntities(processed);
    if (n === processed) break;
    processed = n;
  }

  // Step 2a: Image addresses whose underscores were turned into italics by a markdown converter
  // ("lms<em>creative</em>elements/x.png" → "lms_creative_elements/x.png")
  for (let k = 0; k < 4 && /src="[^"]*<em>/.test(processed); k++) {
    processed = processed.replace(/(src="[^"]*?)<em>([^<"]*)<\/em>/g, '$1_$2_');
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
        const file = bareFile.trim();
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
    // \( … \) / \[ … \] pieces first: a "<" inside them ("\(\frac13 < x < 1\)") would otherwise
    // be read as the start of an HTML tag and the rest of the sentence lost
    const pieces: string[] = [];
    processed = processed.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g, (m, inline, display) => {
      const inner = inline ?? display;
      if (HTML_TAG_RE.test(inner)) return m; // maths split by real tags: handled per text node below
      pieces.push(mathSpan(inner, display !== undefined));
      return `@@@MATHPIECEX${pieces.length - 1}@@@`;
    });
    // Content has HTML tags — process math only in text nodes (between tags)
    // Split by HTML tags, process text segments, reassemble
    processed = processed.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
      if (tag) return tag; // Keep HTML tags as-is
      if (text) return processAllMath(text); // Process math in text
      return match;
    });
    processed = processed.replace(/@@@MATHPIECEX(\d+)@@@/g, (_m, n) => pieces[Number(n)]);
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
 * Questions copied from sites that used MathJax 2 carry its drawn output (<span class="MathJax"
 * data-mathml="…">, whose unescaped quotes break the HTML) next to the original
 * <script type="math/tex">. Each drawn copy is replaced by that LaTeX, or by the clean MathML
 * kept for screen readers when there is no script.
 */
export function cleanCopiedMathJax(html: string): string {
  if (!html.includes('MathJax') && !html.includes('math/tex') && !html.includes('math/mml')) return html;
  let s = html.replace(/<span class="MathJax_Preview"[^>]*>[\s\S]*?<\/span>/g, '');
  const START = /<span class="MathJax(?:_Display|_SVG|_CHTML)?"/g;
  const SCRIPT_AFTER = /^\s*<script[^>]*type="math\/(tex|mml)(; ?mode=display)?"[^>]*>([\s\S]*?)<\/script>/;
  const cleanMml = (blob: string) => {
    for (const m of blob.matchAll(/(<math\b[\s\S]*?<\/math>)/g)) if (!m[1].includes('<merror')) return m[1];
    return '';
  };
  let out = '';
  let last = 0;
  for (let m = START.exec(s); m; m = START.exec(s)) {
    const from = m.index;
    // The drawn copy ends at its matching </span> (its MathML attribute holds no spans)
    const tags = /<span\b|<\/span>/g;
    tags.lastIndex = from;
    let depth = 0, end = s.length;
    for (let t = tags.exec(s); t; t = tags.exec(s)) {
      if (t[0] === '</span>') { if (--depth === 0) { end = tags.lastIndex; break; } } else depth++;
    }
    const blob = s.slice(from, end);
    // The original source: a <script type="math/tex"> inside or right after the copy
    let replacement = '';
    let to = end;
    const inner = /<script[^>]*type="math\/tex(; ?mode=display)?"[^>]*>([\s\S]*?)<\/script>/.exec(blob);
    const after = SCRIPT_AFTER.exec(s.slice(end));
    if (inner) replacement = inner[1] ? `\\[${inner[2]}\\]` : `\\(${inner[2]}\\)`;
    else if (after && after[1] === 'tex') replacement = after[2] ? `\\[${after[3]}\\]` : `\\(${after[3]}\\)`;
    else replacement = cleanMml(blob) || (after ? cleanMml(after[3]) : '');
    if (after) to = end + after[0].length;
    out += s.slice(last, from) + replacement;
    last = to;
    START.lastIndex = to;
  }
  s = out + s.slice(last);
  // Lone scripts: TeX → \( \), MathML kept when it isn't an error copy
  s = s.replace(/<script[^>]*type="math\/tex(; ?mode=display)?"[^>]*>([\s\S]*?)<\/script>/g, (_m, display, tex) => (display ? `\\[${tex}\\]` : `\\(${tex}\\)`));
  s = s.replace(/<script[^>]*type="math\/mml"[^>]*>([\s\S]*?)<\/script>/g, (_m, mml) => (mml.includes('<merror') ? '' : mml));
  // Pieces of a drawn copy without its outer span: drop the absolute positioning so the
  // characters at least read in a line
  s = s.replace(/<span\b([^>]*\bid="MathJax-Span-\d+"[^>]*)>/g, (_m, attrs: string) => `<span${attrs.replace(/\sstyle="[^"]*"/g, '')}>`);
  return s;
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

  // 6. Letter puzzles with two or more blanks in one word: "m_u_mg_p_gu_", "a_bc_d" (text only,
  //    not inside tags). Without this, "m_u" was shown as m with a subscript u.
  s = s.replace(/(^|>)([^<]*)/g, (_m, lead: string, text: string) =>
    lead + text.replace(/[A-Za-z]*_[A-Za-z]*_[A-Za-z_]*/g, (word) => word.replace(/_/g, blankToken)));

  // 3. Subscripts (ONLY apply if preceded by a valid variable/identifier character e.g. x_1, a_n, H_2O, a_{n})
  // _{inner} -> <sub>inner</sub>
  s = s.replace(/([a-zA-Z0-9\)]|<\/sup>)\s*_\s*\{([^}]+)\}/g, '$1<sub style="font-size:0.75em;line-height:0;vertical-align:sub;">$2</sub>');

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
