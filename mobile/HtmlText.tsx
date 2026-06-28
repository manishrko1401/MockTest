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
  
  // Replace fractions: \frac{num}{den} -> (num) / (den)
  clean = clean.replace(/\\+frac\s*{(.*?)}{(.*?)}/g, '($1) / ($2)');
  
  // Trigonometric & Logarithmic functions
  clean = clean.replace(/\\+tan/g, 'tan');
  clean = clean.replace(/\\+sin/g, 'sin');
  clean = clean.replace(/\\+cos/g, 'cos');
  clean = clean.replace(/\\+cot/g, 'cot');
  clean = clean.replace(/\\+sec/g, 'sec');
  clean = clean.replace(/\\+cosec/g, 'cosec');
  clean = clean.replace(/\\+log/g, 'log');
  clean = clean.replace(/\\+lim/g, 'lim');
  
  // Greek letters & symbols
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
  
  // Mathematical operators & relations
  clean = clean.replace(/\\+times/g, '×');
  clean = clean.replace(/\\+div/g, '÷');
  clean = clean.replace(/\\+pm/g, '±');
  clean = clean.replace(/\\+mp/g, '∓');
  clean = clean.replace(/\\+sqrt\s*{(.*?)}/g, '√($1)');
  clean = clean.replace(/\\+sqrt/g, '√');
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
  clean = clean.replace(/\\+left-arrow/g, '←');
  clean = clean.replace(/\\+to/g, '→');
  clean = clean.replace(/\\+cdot/g, '·');
  
  // Exponents & superscripts
  clean = clean.replace(/\^\\+circ/g, '°');
  clean = clean.replace(/\^circ/g, '°');
  clean = clean.replace(/\\+circ/g, '°');
  clean = clean.replace(/\^1/g, '¹');
  clean = clean.replace(/\^2/g, '²');
  clean = clean.replace(/\^3/g, '³');
  clean = clean.replace(/\^x/g, 'ˣ');
  clean = clean.replace(/\^n/g, 'ⁿ');
  
  // Subscripts
  clean = clean.replace(/_1/g, '₁');
  clean = clean.replace(/_2/g, '₂');
  clean = clean.replace(/_3/g, '₃');
  clean = clean.replace(/_n/g, 'ₙ');
  
  // Strip trailing braces
  clean = clean.replace(/{(.*?)}/g, '$1');
  
  // Sum, Product, Integral
  clean = clean.replace(/\\+sum/g, '∑');
  clean = clean.replace(/\\+prod/g, '∏');
  clean = clean.replace(/\\+int/g, '∫');
  
  // Overline (bar notation)
  clean = clean.replace(/\\+overline\s*{(.*?)}/g, '$1̄');
  clean = clean.replace(/\\+bar\s*{(.*?)}/g, '$1̄');
  
  // Text mode, mathrm, rm - strip the command, keep the text
  clean = clean.replace(/\\+(?:text|rm|mathrm|mathbf|textbf)\s*{(.*?)}/g, '$1');
  
  // Left/Right delimiters (just strip them, keep the bracket)
  clean = clean.replace(/\\+left\s*/g, '');
  clean = clean.replace(/\\+right\s*/g, '');
  
  // Currency symbols
  clean = clean.replace(/\\+rupee/g, '₹');
  
  // Remove loose LaTeX escape backslashes
  clean = clean.replace(/\\/g, '');
  
  return clean;
}

export const HtmlText: React.FC<HtmlTextProps> = ({ html, style, isDark }) => {
  if (!html) return null;

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
        .replace(/&pi;/g, 'π')
        .replace(/&theta;/g, 'θ')
        .replace(/&alpha;/g, 'α')
        .replace(/&beta;/g, 'β')
        .replace(/&gamma;/g, 'γ')
        .replace(/&lambda;/g, 'λ')
        .replace(/&mu;/g, 'μ')
        .replace(/&radic;/g, '√')
        .replace(/&infin;/g, '∞')
        .replace(/&ne;/g, '≠')
        .replace(/&le;/g, '≤')
        .replace(/&ge;/g, '≥')
        .replace(/&there4;/g, '∴');

      // Check if text has LaTeX math blocks and translate them
      const mathRegex = /(\\+[\(\[][\s\S]*?\\+[\)\]]|\$\$?[\s\S]*?\$\$?)/g;
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

  return (
    <Text style={style}>
      {elements}
    </Text>
  );
};
