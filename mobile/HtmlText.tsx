import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface HtmlTextProps {
  html: string;
  style?: any;
  isDark?: boolean;
}

// Converts standard LaTeX math symbols into readable Unicode equivalents for mobile screens
function translateLatexToUnicode(latex: string): string {
  if (!latex) return "";
  
  let clean = latex;
  
  // Remove \( and \) wraps, \[ and \] wraps, and $$ or $ wraps
  clean = clean.replace(/\\+\(|\\+\)|\\+\[|\\+\]|\$\$?/g, '');

  // ── STEP 1: Handle commands with {content} BEFORE generic brace stripping ──

  // Text mode: \text{Simplify:} → Simplify: (must come before brace-strip)
  clean = clean.replace(/\\+(?:text|rm|mathrm|mathbf|textbf|mbox)\s*\{([^{}]*)\}/g, '$1');

  // Fractions: \frac{num}{den} → (num)/(den)
  // Run twice to handle nested fracs like \frac{\frac{a}{b}}{c}
  for (let i = 0; i < 3; i++) {
    clean = clean.replace(/\\+frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  }

  // sqrt with arg: \sqrt{x+1} → √(x+1)
  clean = clean.replace(/\\+sqrt\s*\{([^{}]*)\}/g, '√($1)');
  clean = clean.replace(/\\+sqrt/g, '√');

  // Overline / bar: \overline{AB} → AB̄
  clean = clean.replace(/\\+overline\s*\{([^{}]*)\}/g, '$1̄');
  clean = clean.replace(/\\+bar\s*\{([^{}]*)\}/g, '$1̄');

  // Exponents with braces: x^{10} → x¹⁰, x^{-2} → x⁻²
  const supMap: Record<string, string> = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
    '+':'⁺','-':'⁻','n':'ⁿ','x':'ˣ','a':'ᵃ','b':'ᵇ','c':'ᶜ',
  };
  clean = clean.replace(/\^\{([^{}]+)\}/g, (_, exp) =>
    exp.split('').map((c: string) => supMap[c] ?? c).join('')
  );

  // Subscripts with braces: x_{10} → x₁₀
  const subMap: Record<string, string> = {
    '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
    'n':'ₙ','a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ',
  };
  clean = clean.replace(/_\{([^{}]+)\}/g, (_, sub) =>
    sub.split('').map((c: string) => subMap[c] ?? c).join('')
  );

  // Left/Right delimiters — strip, keep the bracket char
  clean = clean.replace(/\\+left\s*/g, '');
  clean = clean.replace(/\\+right\s*/g, '');

  // ── STEP 2: Strip any remaining bare {…} braces ──
  // Run a few times to handle nested groups
  for (let i = 0; i < 3; i++) {
    clean = clean.replace(/\{([^{}]*)\}/g, '$1');
  }

  // ── STEP 3: Named commands (no braces) ──

  // Trigonometric & Logarithmic
  clean = clean.replace(/\\+tan(?![a-z])/g, 'tan');
  clean = clean.replace(/\\+sin(?![a-z])/g, 'sin');
  clean = clean.replace(/\\+cos(?![a-z])/g, 'cos');
  clean = clean.replace(/\\+cot(?![a-z])/g, 'cot');
  clean = clean.replace(/\\+sec(?![a-z])/g, 'sec');
  clean = clean.replace(/\\+cosec/g, 'cosec');
  clean = clean.replace(/\\+log(?![a-z])/g, 'log');
  clean = clean.replace(/\\+lim(?![a-z])/g, 'lim');
  clean = clean.replace(/\\+exp(?![a-z])/g, 'exp');

  // Greek letters
  clean = clean.replace(/\\+theta/gi, 'θ');
  clean = clean.replace(/\\+alpha/gi, 'α');
  clean = clean.replace(/\\+beta/gi, 'β');
  clean = clean.replace(/\\+gamma/gi, 'γ');
  clean = clean.replace(/\\+lambda/gi, 'λ');
  clean = clean.replace(/\\+mu/gi, 'μ');
  clean = clean.replace(/\\+pi/gi, 'π');
  clean = clean.replace(/\\+phi/gi, 'φ');
  clean = clean.replace(/\\+sigma/gi, 'σ');
  clean = clean.replace(/\\+omega/gi, 'ω');
  clean = clean.replace(/\\+delta/gi, 'δ');
  clean = clean.replace(/\\+Delta/g, 'Δ');
  clean = clean.replace(/\\+epsilon/gi, 'ε');
  clean = clean.replace(/\\+eta/gi, 'η');
  clean = clean.replace(/\\+rho/gi, 'ρ');
  clean = clean.replace(/\\+tau/gi, 'τ');
  clean = clean.replace(/\\+xi/gi, 'ξ');

  // Math operators
  clean = clean.replace(/\\+times/g, '×');
  clean = clean.replace(/\\+div/g, '÷');
  clean = clean.replace(/\\+pm/g, '±');
  clean = clean.replace(/\\+mp/g, '∓');
  clean = clean.replace(/\\+triangle/g, '△');
  clean = clean.replace(/\\+angle/g, '∠');
  clean = clean.replace(/\\+infty/g, '∞');
  clean = clean.replace(/\\+approx/g, '≈');
  clean = clean.replace(/\\+neq/g, '≠');
  clean = clean.replace(/\\+leq/g, '≤');
  clean = clean.replace(/\\+geq/g, '≥');
  clean = clean.replace(/\\+implies/g, '⇒');
  clean = clean.replace(/\\+impliedby/g, '⇐');
  clean = clean.replace(/\\+iff/g, '⇔');
  clean = clean.replace(/\\+leftrightarrow/g, '↔');
  clean = clean.replace(/\\+rightarrow/g, '→');
  clean = clean.replace(/\\+leftarrow/g, '←');
  clean = clean.replace(/\\+to(?![a-z])/g, '→');
  clean = clean.replace(/\\+cdot/g, '·');
  clean = clean.replace(/\\+ldots/g, '…');
  clean = clean.replace(/\\+dots/g, '…');
  clean = clean.replace(/\\+sum/g, '∑');
  clean = clean.replace(/\\+prod/g, '∏');
  clean = clean.replace(/\\+int/g, '∫');
  clean = clean.replace(/\\+circ/g, '°');

  // Simple exponents (single char, no braces)
  clean = clean.replace(/\^\\+circ/g, '°');
  clean = clean.replace(/\^circ/g, '°');
  clean = clean.replace(/\^0/g, '⁰');
  clean = clean.replace(/\^1/g, '¹');
  clean = clean.replace(/\^2/g, '²');
  clean = clean.replace(/\^3/g, '³');
  clean = clean.replace(/\^4/g, '⁴');
  clean = clean.replace(/\^5/g, '⁵');
  clean = clean.replace(/\^6/g, '⁶');
  clean = clean.replace(/\^7/g, '⁷');
  clean = clean.replace(/\^8/g, '⁸');
  clean = clean.replace(/\^9/g, '⁹');
  clean = clean.replace(/\^x/g, 'ˣ');
  clean = clean.replace(/\^n/g, 'ⁿ');

  // Simple subscripts (single char)
  clean = clean.replace(/_0/g, '₀');
  clean = clean.replace(/_1/g, '₁');
  clean = clean.replace(/_2/g, '₂');
  clean = clean.replace(/_3/g, '₃');
  clean = clean.replace(/_n/g, 'ₙ');

  // Currency
  clean = clean.replace(/\\+rupee/g, '₹');

  // ── STEP 4: Remove any remaining backslashes ──
  clean = clean.replace(/\\/g, '');

  // ── STEP 5: Trim excessive whitespace ──
  clean = clean.replace(/\s{2,}/g, ' ').trim();
  
  return clean;
}

function renderHtml(html: string, style: any, isDark: boolean | undefined): React.ReactNode[] {
  // First decode HTML entities recursively to handle double-escaped elements
  let clean = html;
  for (let i = 0; i < 3; i++) {
    const temp = clean
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (temp === clean) break;
    clean = temp;
  }

  // Clean comments and format tags
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  
  // Split by tag boundaries
  const tokens = clean.split(/(<[^>]+>)/g);
  
  let isBold = false;
  let isUnderline = false;
  
  const elements: React.ReactNode[] = [];
  let keyIdx = 0;

  tokens.forEach((token) => {
    if (token.startsWith('<')) {
      const tag = token.toLowerCase();
      if (tag === '<strong>' || tag === '<b>') {
        isBold = true;
      } else if (tag === '</strong>' || tag === '</b>') {
        isBold = false;
      } else if (tag === '<u>') {
        isUnderline = true;
      } else if (tag === '</u>') {
        isUnderline = false;
      } else if (tag === '<br>' || tag === '<br />' || tag === '<br/>') {
        elements.push(<Text key={keyIdx++}>{'\n'}</Text>);
      } else if (tag === '<p>' || tag === '<div>') {
        if (elements.length > 0) {
          elements.push(<Text key={keyIdx++}>{'\n'}</Text>);
        }
      } else if (tag === '</p>' || tag === '</div>') {
        elements.push(<Text key={keyIdx++}>{'\n'}</Text>);
      } else if (tag === '<ul>') {
        elements.push(<Text key={keyIdx++}>{'\n'}</Text>);
      } else if (tag === '</ul>') {
        elements.push(<Text key={keyIdx++}>{'\n'}</Text>);
      } else if (tag === '<li>') {
        elements.push(<Text key={keyIdx++}>• </Text>);
      } else if (tag === '</li>') {
        elements.push(<Text key={keyIdx++}>{'\n'}</Text>);
      }
    } else {
      // Decode HTML entities
      let text = token
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&deg;/g, '°')
        .replace(/&sup1;/g, '¹')
        .replace(/&sup2;/g, '²')
        .replace(/&sup3;/g, '³')
        .replace(/&times;/g, '×')
        .replace(/&divide;/g, '÷')
        .replace(/&plusmn;/g, '±')
        .replace(/&minus;/g, '−')
        .replace(/&pi;/g, 'π')
        .replace(/&theta;/g, 'θ')
        .replace(/&alpha;/g, 'α')
        .replace(/&beta;/g, 'β')
        .replace(/&gamma;/g, 'γ')
        .replace(/&lambda;/g, 'λ')
        .replace(/&mu;/g, 'μ')
        .replace(/&sigma;/g, 'σ')
        .replace(/&omega;/g, 'ω')
        .replace(/&delta;/g, 'δ')
        .replace(/&Delta;/g, 'Δ')
        .replace(/&radic;/g, '√')
        .replace(/&infin;/g, '∞')
        .replace(/&ne;/g, '≠')
        .replace(/&le;/g, '≤')
        .replace(/&ge;/g, '≥')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&there4;/g, '∴')
        .replace(/&sum;/g, '∑')
        .replace(/&int;/g, '∫')
        .replace(/&euro;/g, '€')
        .replace(/&pound;/g, '£')
        .replace(/&yen;/g, '¥')
        .replace(/&cent;/g, '¢')
        .replace(/&copy;/g, '©')
        .replace(/&reg;/g, '®')
        .replace(/&trade;/g, '™')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&middot;/g, '·')
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»')
        .replace(/&hellip;/g, '…')
        .replace(/&bull;/g, '•')
        .replace(/&prime;/g, '′')
        .replace(/&Prime;/g, '″')
        .replace(/&frac12;/g, '½')
        .replace(/&frac14;/g, '¼')
        .replace(/&frac34;/g, '¾');

      // Check if text has LaTeX math blocks and translate them
      // Matches \(...\), \[...\], $$...$$, $...$
      const mathRegex = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
      text = text.replace(mathRegex, (match) => translateLatexToUnicode(match));


      if (text) {
        const textStyle = [
          style,
          isBold && { fontWeight: 'bold' },
          isUnderline && { textDecorationLine: 'underline' },
          isDark ? { color: '#E5E7EB' } : { color: '#1F2937' }
        ];
        elements.push(
          <Text key={keyIdx++} style={textStyle}>
            {text}
          </Text>
        );
      }
    }
  });

  return elements;
}

// Custom comparison: only re-render when html content or dark mode changes.
// Ignores style prop changes (e.g. selection highlight) to prevent LaTeX re-parsing flicker.
function arePropsEqual(prev: HtmlTextProps, next: HtmlTextProps): boolean {
  return prev.html === next.html && prev.isDark === next.isDark;
}

const HtmlTextInner: React.FC<HtmlTextProps> = ({ html, style, isDark }) => {
  if (!html) return null;
  const elements = renderHtml(html, style, isDark);
  return (
    <Text style={style}>
      {elements}
    </Text>
  );
};

export const HtmlText = React.memo(HtmlTextInner, arePropsEqual);
