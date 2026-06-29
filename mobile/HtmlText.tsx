import React, { useState } from 'react';
import { Text, View, StyleSheet, Image } from 'react-native';

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
// Remote image helper component with auto-height sizing
// ──────────────────────────────────────────────────────────────────────────────
interface HtmlImageProps {
  src: string;
  isDark?: boolean;
}
const HtmlImage: React.FC<HtmlImageProps> = ({ src, isDark }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    Image.getSize(
      src,
      (width, height) => {
        if (width && height) {
          setAspectRatio(width / height);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Failed to get image size for:', src, error);
        setLoading(false);
      }
    );
  }, [src]);

  if (loading) {
    return (
      <View
        style={{
          width: 120,
          height: 40,
          backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
          borderRadius: 4,
          marginVertical: 6,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 9, color: isDark ? '#94A3B8' : '#64748B' }}>Loading image...</Text>
      </View>
    );
  }

  const containerStyle: any = {
    marginVertical: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
  };

  if (aspectRatio) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: src }}
          style={{
            width: '100%',
            aspectRatio: aspectRatio,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Fallback if size detection fails
  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: src }}
        style={{
          width: '100%',
          height: 150,
        }}
        resizeMode="contain"
      />
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
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&ang;/g, '\u2220').replace(/&perp;/g, '\u22a5').replace(/&cong;/g, '\u2245')
    .replace(/&sim;/g, '\u223c').replace(/&asymp;/g, '\u2248').replace(/&equiv;/g, '\u2261')
    .replace(/&prop;/g, '\u221d').replace(/&forall;/g, '\u2200').replace(/&exist;/g, '\u2203')
    .replace(/&empty;/g, '\u2205').replace(/&isin;/g, '\u2208').replace(/&notin;/g, '\u2209')
    .replace(/&sub;/g, '\u2282').replace(/&sup;/g, '\u2283').replace(/&sube;/g, '\u2286')
    .replace(/&and;/g, '\u2227').replace(/&or;/g, '\u2228').replace(/&cap;/g, '\u2229')
    .replace(/&cup;/g, '\u222a').replace(/&sdot;/g, '\u22c5').replace(/&lowast;/g, '\u2217')
    .replace(/&Aring;/g, '\u00c5').replace(/&aring;/g, '\u00e5')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201d').replace(/&ldquo;/g, '\u201c');
}

// ──────────────────────────────────────────────────────────────────────────────
// HTML Table renderer
// Parses <table><tr><td>/<th> structure and renders as a bordered View grid
// ──────────────────────────────────────────────────────────────────────────────
function renderTableHtml(
  tableHtml: string,
  textStyle: any,
  isDark: boolean | undefined,
  keyPrefix: string
): React.ReactNode {
  const borderColor = isDark ? '#4B5563' : '#D1D5DB';
  const headerBg   = isDark ? '#1F2937' : '#E5E7EB';
  const evenBg     = isDark ? '#111827' : '#F9FAFB';
  const textColor  = isDark ? '#E5E7EB' : '#1F2937';
  const fontSize   = (textStyle?.fontSize ?? 13) * 0.88;

  // Extract rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: Array<Array<{ text: string; isHeader: boolean }>> = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: Array<{ text: string; isHeader: boolean }> = [];
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const isHeader = cellMatch[1].toLowerCase() === 'th';
      // Strip inner tags, decode entities
      let cellText = cellMatch[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // Decode HTML entities
      cellText = decodeEntities(cellText);
      // Apply LaTeX translation
      cellText = translateLatexToUnicode(cellText);
      cells.push({ text: cellText, isHeader });
    }

    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return null;

  // Find max columns across all rows for flex calculation
  const maxCols = Math.max(...rows.map(r => r.length));

  return (
    <View
      key={keyPrefix}
      style={{
        width: '100%',
        borderWidth: 1,
        borderColor,
        borderRadius: 4,
        overflow: 'hidden',
        marginVertical: 8,
      }}
    >
      {rows.map((row, rIdx) => {
        const isHeaderRow = rIdx === 0 || row.some(c => c.isHeader);
        return (
          <View
            key={rIdx}
            style={{
              flexDirection: 'row',
              backgroundColor: isHeaderRow ? headerBg : (rIdx % 2 === 0 ? evenBg : 'transparent'),
            }}
          >
            {row.map((cell, cIdx) => (
              <View
                key={cIdx}
                style={{
                  flex: 1,
                  borderRightWidth: cIdx < maxCols - 1 ? 1 : 0,
                  borderBottomWidth: rIdx < rows.length - 1 ? 1 : 0,
                  borderColor,
                  padding: 6,
                  minWidth: 0,
                }}
              >
                <Text
                  style={{
                    fontSize,
                    color: textColor,
                    fontWeight: isHeaderRow || cell.isHeader ? 'bold' : 'normal',
                    textAlign: 'center',
                  }}
                >
                  {cell.text}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Split HTML into table and non-table chunks
function splitByTables(
  html: string
): Array<{ type: 'table' | 'text'; content: string }> {
  const parts: Array<{ type: 'table' | 'text'; content: string }> = [];
  let remaining = html;
  while (remaining.length > 0) {
    const tblStart = remaining.toLowerCase().indexOf('<table');
    if (tblStart === -1) { parts.push({ type: 'text', content: remaining }); break; }
    if (tblStart > 0) parts.push({ type: 'text', content: remaining.slice(0, tblStart) });
    const tblEnd = remaining.toLowerCase().indexOf('</table>', tblStart);
    if (tblEnd === -1) { parts.push({ type: 'text', content: remaining.slice(tblStart) }); break; }
    const endIdx = tblEnd + 8;
    parts.push({ type: 'table', content: remaining.slice(tblStart, endIdx) });
    remaining = remaining.slice(endIdx);
  }
  return parts;
}

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

  // ── Pre-pass: extract <table> blocks and render them separately ─────────────
  const chunks = splitByTables(clean);
  if (chunks.some(c => c.type === 'table')) {
    // Has at least one table – process chunk by chunk
    const allNodes: React.ReactNode[] = [];
    let tableCount = 0;
    for (const chunk of chunks) {
      if (chunk.type === 'table') {
        const tblNode = renderTableHtml(chunk.content, textStyle, isDark, `tbl-${tableCount++}`);
        if (tblNode) allNodes.push(tblNode);
      } else if (chunk.content.trim()) {
        // Recurse for non-table text (strips tables from input so no infinite loop)
        allNodes.push(...renderContent(chunk.content, textStyle, isDark));
      }
    }
    return allNodes;
  }

  // ── No table: proceed with normal token-based rendering ─────────────────────

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
      } else if (tag.startsWith('<img')) {
        const srcMatch = token.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
          let src = srcMatch[1];
          if (src.startsWith('//')) {
            src = 'https:' + src;
          }
          nodes.push(
            <HtmlImage
              key={keyIdx++}
              src={src}
              isDark={isDark}
            />
          );
        }
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
