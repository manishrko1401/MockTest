import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

interface HtmlTextProps {
  html: string;
  style?: any;
  isDark?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Brace-aware group extractor
// Returns the content between matching { } starting at str[start], and the
// index of the character AFTER the closing }.
// ──────────────────────────────────────────────────────────────────────────────
function extractBraceGroup(
  str: string,
  start: number
): { content: string; end: number } | null {
  if (start >= str.length || str[start] !== '{') return null;
  let depth = 1;
  let i = start + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') depth--;
    i++;
  }
  return depth === 0 ? { content: str.slice(start + 1, i - 1), end: i } : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// LaTeX → plain Unicode for non-fraction content
// (fracs are extracted separately before this is called)
// ──────────────────────────────────────────────────────────────────────────────
function translateLatexToUnicode(latex: string): string {
  if (!latex) return '';
  let c = latex;

  // Strip math delimiters
  c = c.replace(/\\+\(|\\+\)|\\+\[|\\+\]|\$\$?/g, '');

  // ── Commands with {content} (must run before generic brace-strip) ──────────

  // Text mode: \text{Simplify:} → Simplify:
  c = c.replace(/\\+(?:text|rm|mathrm|mathbf|textbf|mbox)\s*\{([^{}]*)\}/g, '$1');

  // Fractions that appear inside num/den of a visual fraction (render inline)
  for (let i = 0; i < 3; i++) {
    c = c.replace(/\\+frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  }

  // sqrt
  c = c.replace(/\\+sqrt\s*\{([^{}]*)\}/g, '√($1)');
  c = c.replace(/\\+sqrt/g, '√');

  // overline / bar
  c = c.replace(/\\+overline\s*\{([^{}]*)\}/g, '$1̄');
  c = c.replace(/\\+bar\s*\{([^{}]*)\}/g, '$1̄');

  // Exponents with braces: x^{10} → x¹⁰
  const supMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'a': 'ᵃ', 'b': 'ᵇ',
  };
  c = c.replace(/\^\{([^{}]+)\}/g, (_, exp) =>
    exp.split('').map((ch: string) => supMap[ch] ?? ch).join('')
  );

  // Subscripts with braces: x_{10} → x₁₀
  const subMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'n': 'ₙ', 'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
  };
  c = c.replace(/_\{([^{}]+)\}/g, (_, sub) =>
    sub.split('').map((ch: string) => subMap[ch] ?? ch).join('')
  );

  // Left/Right delimiters
  c = c.replace(/\\+left\s*/g, '');
  c = c.replace(/\\+right\s*/g, '');

  // ── Strip remaining bare {…} braces (run 3× for nested groups) ────────────
  for (let i = 0; i < 3; i++) c = c.replace(/\{([^{}]*)\}/g, '$1');

  // ── Named commands (no braces) ─────────────────────────────────────────────

  // Trig / log
  c = c.replace(/\\+tan(?![a-z])/g, 'tan');
  c = c.replace(/\\+sin(?![a-z])/g, 'sin');
  c = c.replace(/\\+cos(?![a-z])/g, 'cos');
  c = c.replace(/\\+cot(?![a-z])/g, 'cot');
  c = c.replace(/\\+sec(?![a-z])/g, 'sec');
  c = c.replace(/\\+cosec/g, 'cosec');
  c = c.replace(/\\+log(?![a-z])/g, 'log');
  c = c.replace(/\\+lim(?![a-z])/g, 'lim');
  c = c.replace(/\\+exp(?![a-z])/g, 'exp');

  // Greek
  c = c.replace(/\\+theta/gi, 'θ');
  c = c.replace(/\\+alpha/gi, 'α');
  c = c.replace(/\\+beta/gi, 'β');
  c = c.replace(/\\+gamma/gi, 'γ');
  c = c.replace(/\\+lambda/gi, 'λ');
  c = c.replace(/\\+mu/gi, 'μ');
  c = c.replace(/\\+pi/gi, 'π');
  c = c.replace(/\\+phi/gi, 'φ');
  c = c.replace(/\\+sigma/gi, 'σ');
  c = c.replace(/\\+omega/gi, 'ω');
  c = c.replace(/\\+delta/gi, 'δ');
  c = c.replace(/\\+Delta/g, 'Δ');
  c = c.replace(/\\+epsilon/gi, 'ε');
  c = c.replace(/\\+eta/gi, 'η');
  c = c.replace(/\\+rho/gi, 'ρ');
  c = c.replace(/\\+tau/gi, 'τ');
  c = c.replace(/\\+xi/gi, 'ξ');

  // Operators
  c = c.replace(/\\+times/g, '×');
  c = c.replace(/\\+div/g, '÷');
  c = c.replace(/\\+pm/g, '±');
  c = c.replace(/\\+mp/g, '∓');
  c = c.replace(/\\+triangle/g, '△');
  c = c.replace(/\\+angle/g, '∠');
  c = c.replace(/\\+infty/g, '∞');
  c = c.replace(/\\+approx/g, '≈');
  c = c.replace(/\\+neq/g, '≠');
  c = c.replace(/\\+leq/g, '≤');
  c = c.replace(/\\+geq/g, '≥');
  c = c.replace(/\\+implies/g, '⇒');
  c = c.replace(/\\+impliedby/g, '⇐');
  c = c.replace(/\\+iff/g, '⇔');
  c = c.replace(/\\+leftrightarrow/g, '↔');
  c = c.replace(/\\+rightarrow/g, '→');
  c = c.replace(/\\+leftarrow/g, '←');
  c = c.replace(/\\+to(?![a-z])/g, '→');
  c = c.replace(/\\+cdot/g, '·');
  c = c.replace(/\\+ldots|\\+dots/g, '…');
  c = c.replace(/\\+sum/g, '∑');
  c = c.replace(/\\+prod/g, '∏');
  c = c.replace(/\\+int/g, '∫');
  c = c.replace(/\\+circ/g, '°');

  // Single-char exponents
  c = c.replace(/\^\^?\\+circ|\\^circ/g, '°');
  c = c.replace(/\^0/g, '⁰'); c = c.replace(/\^1/g, '¹'); c = c.replace(/\^2/g, '²');
  c = c.replace(/\^3/g, '³'); c = c.replace(/\^4/g, '⁴'); c = c.replace(/\^5/g, '⁵');
  c = c.replace(/\^6/g, '⁶'); c = c.replace(/\^7/g, '⁷'); c = c.replace(/\^8/g, '⁸');
  c = c.replace(/\^9/g, '⁹'); c = c.replace(/\^x/g, 'ˣ'); c = c.replace(/\^n/g, 'ⁿ');

  // Single-char subscripts
  c = c.replace(/_0/g, '₀'); c = c.replace(/_1/g, '₁'); c = c.replace(/_2/g, '₂');
  c = c.replace(/_3/g, '₃'); c = c.replace(/_n/g, 'ₙ');

  // Currency
  c = c.replace(/\\+rupee/g, '₹');

  // Remove remaining backslashes
  c = c.replace(/\\/g, '');

  // Collapse extra whitespace
  c = c.replace(/\s{2,}/g, ' ').trim();
  return c;
}

// ──────────────────────────────────────────────────────────────────────────────
// Parsed segment types
// ──────────────────────────────────────────────────────────────────────────────
type Segment =
  | { type: 'text'; value: string }
  | { type: 'frac'; num: string; den: string };

// ──────────────────────────────────────────────────────────────────────────────
// Split a text string into plain-text and fraction segments.
// Fracs are found with a brace-aware parser so nested {} work correctly.
// ──────────────────────────────────────────────────────────────────────────────
function splitIntoSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let buf = '';

  while (i < raw.length) {
    // Count leading backslashes
    if (raw[i] === '\\') {
      let bs = 0;
      while (i + bs < raw.length && raw[i + bs] === '\\') bs++;
      const after = raw.slice(i + bs);

      if (after.startsWith('frac')) {
        // Flush buffer
        if (buf) { segments.push({ type: 'text', value: buf }); buf = ''; }
        i += bs + 4; // skip \frac

        // Skip whitespace between \frac and {
        while (i < raw.length && raw[i] === ' ') i++;

        const numRes = extractBraceGroup(raw, i);
        if (!numRes) { buf += '\\frac'; continue; }
        i = numRes.end;

        // Skip whitespace between {} {}
        while (i < raw.length && raw[i] === ' ') i++;

        const denRes = extractBraceGroup(raw, i);
        if (!denRes) { buf += `(${numRes.content})`; continue; }
        i = denRes.end;

        // Translate num/den content (fracs inside render as inline text)
        segments.push({
          type: 'frac',
          num: translateLatexToUnicode(numRes.content),
          den: translateLatexToUnicode(denRes.content),
        });
        continue;
      } else {
        buf += raw[i];
        i++;
      }
    } else {
      buf += raw[i];
      i++;
    }
  }

  if (buf) segments.push({ type: 'text', value: buf });
  return segments;
}

// ──────────────────────────────────────────────────────────────────────────────
// Visual fraction component
// ──────────────────────────────────────────────────────────────────────────────
interface FracProps {
  num: string;
  den: string;
  fontSize: number;
  color: string;
}
const FractionView: React.FC<FracProps> = ({ num, den, fontSize, color }) => {
  const fs = Math.round(fontSize * 0.82);
  return (
    <View style={styles.fracWrap}>
      <Text style={[styles.fracPart, { fontSize: fs, color }]}>{num}</Text>
      <View style={[styles.fracLine, { backgroundColor: color }]} />
      <Text style={[styles.fracPart, { fontSize: fs, color }]}>{den}</Text>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// HTML entity decoder (run recursively up to 3 passes for double-encoded text)
// ──────────────────────────────────────────────────────────────────────────────
function decodeEntities(text: string): string {
  return text
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&deg;/g, '°')
    .replace(/&sup1;/g, '¹').replace(/&sup2;/g, '²').replace(/&sup3;/g, '³')
    .replace(/&times;/g, '×').replace(/&divide;/g, '÷').replace(/&plusmn;/g, '±')
    .replace(/&minus;/g, '−').replace(/&pi;/g, 'π').replace(/&theta;/g, 'θ')
    .replace(/&alpha;/g, 'α').replace(/&beta;/g, 'β').replace(/&gamma;/g, 'γ')
    .replace(/&lambda;/g, 'λ').replace(/&mu;/g, 'μ').replace(/&sigma;/g, 'σ')
    .replace(/&omega;/g, 'ω').replace(/&delta;/g, 'δ').replace(/&Delta;/g, 'Δ')
    .replace(/&radic;/g, '√').replace(/&infin;/g, '∞').replace(/&ne;/g, '≠')
    .replace(/&le;/g, '≤').replace(/&ge;/g, '≥').replace(/&there4;/g, '∴')
    .replace(/&sum;/g, '∑').replace(/&int;/g, '∫').replace(/&euro;/g, '€')
    .replace(/&pound;/g, '£').replace(/&yen;/g, '¥').replace(/&cent;/g, '¢')
    .replace(/&copy;/g, '©').replace(/&reg;/g, '®').replace(/&trade;/g, '™')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·')
    .replace(/&hellip;/g, '…').replace(/&bull;/g, '•').replace(/&frac12;/g, '½')
    .replace(/&frac14;/g, '¼').replace(/&frac34;/g, '¾').replace(/&prime;/g, '′')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main rendering function – returns an array of React nodes (Text + View)
// The outer container MUST be a View (not Text) to allow mixing View children.
// ──────────────────────────────────────────────────────────────────────────────
function renderContent(
  html: string,
  textStyle: any,
  isDark: boolean | undefined
): React.ReactNode[] {
  // Recursive entity decoding
  let clean = html;
  for (let pass = 0; pass < 3; pass++) {
    const next = decodeEntities(clean);
    if (next === clean) break;
    clean = next;
  }

  // Strip HTML comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  // Split by HTML tags
  const tokens = clean.split(/(<[^>]+>)/g);

  let isBold = false;
  let isUnderline = false;
  const nodes: React.ReactNode[] = [];
  let keyIdx = 0;

  const color: string = isDark ? '#E5E7EB' : '#1F2937';
  const fontSize: number = textStyle?.fontSize ?? 14;

  const pushText = (value: string) => {
    if (!value) return;
    const s: any[] = [
      textStyle,
      { color },
      isBold && { fontWeight: 'bold' as const },
      isUnderline && { textDecorationLine: 'underline' as const },
    ].filter(Boolean);
    nodes.push(
      <Text key={keyIdx++} style={s}>{value}</Text>
    );
  };

  const pushTextWithFracs = (rawText: string) => {
    // First strip math delimiters so \frac is accessible at top level
    const stripped = rawText.replace(/\\+\(|\\+\)|\\+\[|\\+\]|\$\$?/g, '');
    const segments = splitIntoSegments(stripped);

    for (const seg of segments) {
      if (seg.type === 'frac') {
        nodes.push(
          <FractionView
            key={keyIdx++}
            num={seg.num}
            den={seg.den}
            fontSize={fontSize}
            color={color}
          />
        );
      } else {
        // Translate remaining LaTeX in the plain-text part
        const translated = translateLatexToUnicode(seg.value);
        pushText(translated);
      }
    }
  };

  for (const token of tokens) {
    if (token.startsWith('<')) {
      const tag = token.toLowerCase().trim();
      if (tag === '<strong>' || tag === '<b>') { isBold = true; }
      else if (tag === '</strong>' || tag === '</b>') { isBold = false; }
      else if (tag === '<u>') { isUnderline = true; }
      else if (tag === '</u>') { isUnderline = false; }
      else if (tag === '<br>' || tag === '<br />' || tag === '<br/>') {
        nodes.push(<Text key={keyIdx++} style={textStyle}>{'\n'}</Text>);
      } else if (tag === '<p>' || tag === '<div>') {
        if (nodes.length > 0) nodes.push(<Text key={keyIdx++} style={textStyle}>{'\n'}</Text>);
      } else if (tag === '</p>' || tag === '</div>') {
        nodes.push(<Text key={keyIdx++} style={textStyle}>{'\n'}</Text>);
      } else if (tag === '<ul>') {
        nodes.push(<Text key={keyIdx++} style={textStyle}>{'\n'}</Text>);
      } else if (tag === '</ul>') {
        nodes.push(<Text key={keyIdx++} style={textStyle}>{'\n'}</Text>);
      } else if (tag === '<li>') {
        pushText('• ');
      } else if (tag === '</li>') {
        nodes.push(<Text key={keyIdx++} style={textStyle}>{'\n'}</Text>);
      }
      // All other tags (span, sub, sup, etc.) are silently ignored
    } else {
      // Plain text token – push with fraction support
      if (token) pushTextWithFracs(token);
    }
  }

  return nodes;
}

// ──────────────────────────────────────────────────────────────────────────────
// Custom memo comparator: skip re-render when only the style identity changed
// (e.g. selection highlight in exam) – only re-render on content or theme change
// ──────────────────────────────────────────────────────────────────────────────
function arePropsEqual(prev: HtmlTextProps, next: HtmlTextProps): boolean {
  return prev.html === next.html && prev.isDark === next.isDark;
}

const HtmlTextInner: React.FC<HtmlTextProps> = ({ html, style, isDark }) => {
  if (!html) return null;

  const nodes = renderContent(html, style, isDark);

  // Extract layout props (margin, padding) from style to apply to outer View
  // Text-only props (color, fontSize, fontWeight, lineHeight, etc.) stay in
  // the individual Text/FractionView children.
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const layoutProps: any = {};
  const layoutKeys = [
    'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'marginHorizontal', 'marginVertical',
    'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'paddingHorizontal', 'paddingVertical',
    'width', 'height', 'flex', 'alignSelf',
  ];
  for (const key of layoutKeys) {
    if (flatStyle[key] !== undefined) layoutProps[key] = flatStyle[key];
  }

  return (
    <View style={[styles.wrap, layoutProps]}>
      {nodes}
    </View>
  );
};

export const HtmlText = React.memo(HtmlTextInner, arePropsEqual);

// ──────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  fracWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    // Vertically center with surrounding text
  },
  fracPart: {
    textAlign: 'center',
    minWidth: 16,
  },
  fracLine: {
    height: 1.5,
    alignSelf: 'stretch',
    minWidth: 20,
    marginVertical: 2,
  },
});
