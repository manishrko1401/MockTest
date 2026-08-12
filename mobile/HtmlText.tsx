/**
 * HtmlText.tsx — Professional HTML renderer for React Native
 *
 * Architecture: Two-phase block/inline rendering
 *  Phase 1: HTML → Array<Block>  (htmlToBlocks)
 *  Phase 2: Array<Block> → React nodes  (renderBlocks)
 *
 * A Block maps to a View row; Inlines flow inside Text within that View.
 * This eliminates all "ghost" blank lines from CMS-generated HTML.
 */
import React, { useState } from 'react';
import { Text, View, StyleSheet, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';

export interface HtmlTextProps {
  html: string;
  style?: any;
  isDark?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML Entity Map (comprehensive: math, Greek, currencies, symbols, arrows)
// ─────────────────────────────────────────────────────────────────────────────
const ENTITIES: Record<string, string> = {
  // Basics
  amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:'\u00A0',
  // Punctuation
  iexcl:'¡',cent:'¢',pound:'£',curren:'¤',yen:'¥',brvbar:'¦',sect:'§',
  uml:'¨',copy:'©',ordf:'ª',laquo:'«',not:'¬',shy:'\u00AD',reg:'®',
  macr:'¯',deg:'°',plusmn:'±',sup2:'²',sup3:'³',acute:'´',micro:'µ',
  para:'¶',middot:'·',cedil:'¸',sup1:'¹',ordm:'º',raquo:'»',
  frac14:'¼',frac12:'½',frac34:'¾',iquest:'¿',
  // Dashes & spaces
  ndash:'–',mdash:'—',thinsp:'\u2009',ensp:'\u2002',emsp:'\u2003',
  zwj:'\u200D',zwnj:'\u200C',lrm:'\u200E',rlm:'\u200F',
  // Quotes
  sbquo:'‚',bdquo:'„',hellip:'…',dagger:'†',Dagger:'‡',permil:'‰',
  lsaquo:'‹',rsaquo:'›',ldquo:'\u201C',rdquo:'\u201D',
  lsquo:'\u2018',rsquo:'\u2019',bull:'•',prime:'′',Prime:'″',
  frasl:'⁄',trade:'™',euro:'€',
  // ── MATH OPERATORS ──────────────────────────────────────────────────────────
  minus:'−',times:'×',divide:'÷',radic:'√',infin:'∞',
  sum:'∑',prod:'∏',int:'∫',part:'∂',nabla:'∇',
  ne:'≠',le:'≤',ge:'≥',equiv:'≡',asymp:'≈',cong:'≅',
  sim:'∼',prop:'∝',ang:'∠',perp:'⊥',there4:'∴',because:'∵',
  approx:'≈',sdot:'⋅',lowast:'∗',
  // ── FRACTIONS ────────────────────────────────────────────────────────────────
  frac13:'⅓',frac23:'⅔',frac15:'⅕',frac25:'⅖',frac35:'⅗',
  frac45:'⅘',frac16:'⅙',frac56:'⅚',frac18:'⅛',frac38:'⅜',
  frac58:'⅝',frac78:'⅞',
  // ── POWERS / SUB / SUP ───────────────────────────────────────────────────────
  sup0:'⁰',sup4:'⁴',sup5:'⁵',sup6:'⁶',sup7:'⁷',sup8:'⁸',sup9:'⁹',
  sub0:'₀',sub1:'₁',sub2:'₂',sub3:'₃',sub4:'₄',
  sub5:'₅',sub6:'₆',sub7:'₇',sub8:'₈',sub9:'₉',
  // ── LOGIC & SETS ─────────────────────────────────────────────────────────────
  forall:'∀',exist:'∃',empty:'∅',isin:'∈',notin:'∉',
  sub:'⊂',sup:'⊃',nsub:'⊄',sube:'⊆',supe:'⊇',
  and:'∧',or:'∨',cap:'∩',cup:'∪',oplus:'⊕',otimes:'⊗',
  // ── ARROWS ───────────────────────────────────────────────────────────────────
  larr:'←',uarr:'↑',rarr:'→',darr:'↓',harr:'↔',crarr:'↵',
  lArr:'⇐',uArr:'⇑',rArr:'⇒',dArr:'⇓',hArr:'⇔',
  nearr:'↗',searr:'↘',swarr:'↙',nwarr:'↖',
  xlarr:'⟵',xrarr:'⟶',xharr:'⟷',xlArr:'⟸',xrArr:'⟹',xhArr:'⟺',
  // ── GEOMETRY & MISC ──────────────────────────────────────────────────────────
  loz:'◊',spades:'♠',clubs:'♣',hearts:'♥',diams:'♦',
  ldots:'…',cdots:'⋯',vdots:'⋮',ddots:'⋱',
  lceil:'⌈',rceil:'⌉',lfloor:'⌊',rfloor:'⌋',lang:'⟨',rang:'⟩',
  // Currencies (Complete World Currencies)
  dollar:'$', rupee:'₹', inr:'₹',
  bitcoin:'₿', ruble:'₽', won:'₩', peso:'₱', lira:'₺', hryvnia:'₴', baht:'฿', dong:'₫',
  shekel:'₪', taka:'৳', real:'R$',
  // Misc
  celsius:'°C', fahrenheit:'°F', degree:'°',
};

function decodeEntities(s: string): string {
  if (!s.includes('&')) return s;
  return s
    .replace(/&#([0-9]+);/g, (_,d)=>String.fromCodePoint(parseInt(d,10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_,n)=>ENTITIES[n]??_);
}

// ─────────────────────────────────────────────────────────────────────────────
// LaTeX → Unicode (comprehensive)
// ─────────────────────────────────────────────────────────────────────────────
const SUP: Record<string,string> = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  '+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','x':'ˣ','a':'ᵃ','b':'ᵇ',
  'c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ',
  'l':'ˡ','m':'ᵐ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ',
  'w':'ʷ','y':'ʸ','z':'ᶻ',
};
const SUB: Record<string,string> = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  '+':'₊','-':'₋','=':'₌','(':'₍',')':'₎',
  'a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ','n':'ₙ','i':'ᵢ','r':'ᵣ','u':'ᵤ','v':'ᵥ',
};

function latexToUnicode(s: string): string {
  if (!s) return '';
  let c = s;

  // Protect HTML img tags first, then standalone URLs from math subscript replacements
  // Use underscore-free immune token keys (e.g. @@@IMGTAGTOKENX0@@@) to prevent subscript regex mangling
  const protectedTokens: Array<{ token: string; key: string }> = [];

  c = c.replace(/<img[^>]+>/gi, (imgTag) => {
    const key = `@@@IMGTAGTOKENX${protectedTokens.length}@@@`;
    protectedTokens.push({ token: imgTag, key });
    return key;
  });

  c = c.replace(/(?:https?:\/\/|\/\/)[^\s"'<>]+/gi, (url) => {
    const key = `@@@URLTOKENX${protectedTokens.length}@@@`;
    protectedTokens.push({ token: url, key });
    return key;
  });

  // Protect currency dollar signs & reasoning operators ($50, $ 100, 12 $ 10 $ 6, 'P $ Q')
  const currencyToken = '___CURRENCY_DOLLAR___';
  c = c.replace(/\\\$([0-9a-zA-Z\s,.]*)/g, `${currencyToken}$1`);
  c = c.replace(/\$(\s*)([0-9]+(?:[,.][0-9]+)*(?:\s*(?:million|billion|trillion|lakh|crore|[kKmMbB]))?)/g, `${currencyToken}$1$2`);
  c = c.replace(/([0-9]+)\s*\$/g, `$1${currencyToken}`);
  c = c.replace(/([a-zA-Z0-9'"])\s*\$\s*([a-zA-Z0-9'"])/g, `$1 ${currencyToken} $2`);
  c = c.replace(/\s+\$\s+/g, ` ${currencyToken} `);

  // Strip math delimiters \( \) \[ \] $$ and remaining LaTeX math $
  c = c.replace(/\\\(|\\\)|\\\[|\\\]|\$\$/g,'');
  c = c.replace(/(?<![a-zA-Z])\$(?!\$)/g,'');

  // Restore protected currency & reasoning dollar signs
  c = c.replaceAll(currencyToken, '$');
  c = c.replaceAll('___SAFE_DOLLAR_SYM___', '$');
  c = c.replaceAll('&#36;', '$');
  c = c.replaceAll('&#x24;', '$');

  // Currency & Unit commands: \rupee, \Rs, \inr, \dollar, \euro, \pound, \yen, \degree, \celsius
  c = c.replace(/\\rupee\b|\\Rs\b|\\inr\b/gi, '₹');
  c = c.replace(/\\dollar\b/gi, '$');
  c = c.replace(/\\euro\b/gi, '€');
  c = c.replace(/\\pound\b/gi, '£');
  c = c.replace(/\\yen\b/gi, '¥');
  c = c.replace(/\\cent\b/gi, '¢');
  c = c.replace(/\\degree\b|\\deg\b/gi, '°');
  c = c.replace(/\\celsius\b/gi, '°C');
  c = c.replace(/\\fahrenheit\b/gi, '°F');
  c = c.replace(/\\angle\b|\\ang\b/gi, '∠');
  c = c.replace(/\\triangle\b/gi, '△');
  c = c.replace(/\\parallel\b/gi, '∥');
  c = c.replace(/\\perp\b/gi, '⊥');

  // Text-mode commands: \text{…} \mathrm{…} etc.
  c = c.replace(/\\(?:text|rm|mathrm|mathbf|textbf|textrm|mathit|labelledby|mathbb|mathcal|mbox|hbox)\s*\{([^{}]*)\}/g,'$1');

  // ── Fractions (nested up to 4 passes) ─────────────────────────────────────
  for (let i=0;i<4;i++) {
    c = c.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'($1)/($2)');
    c = c.replace(/\\dfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'($1)/($2)');
    c = c.replace(/\\tfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'($1)/($2)');
    c = c.replace(/\\cfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'($1)/($2)');
  }

  // ── Roots ─────────────────────────────────────────────────────────────────
  c = c.replace(/\\sqrt\s*\[2\]\s*\{([^{}]*)\}/g,'√($1)');
  c = c.replace(/\\sqrt\s*\[3\]\s*\{([^{}]*)\}/g,'∛($1)');
  c = c.replace(/\\sqrt\s*\[4\]\s*\{([^{}]*)\}/g,'∜($1)');
  c = c.replace(/\\sqrt\s*\{([^{}]*)\}/g,'√($1)');
  c = c.replace(/\\sqrt\b/g,'√');

  // ── Overline / bar / hat / vec ─────────────────────────────────────────────
  c = c.replace(/\\overline\s*\{([^{}]*)\}/g,'$1̄');
  c = c.replace(/\\bar\s*\{([^{}]*)\}/g,'$1̄');
  c = c.replace(/\\hat\s*\{([^{}]*)\}/g,'$1̂');
  c = c.replace(/\\vec\s*\{([^{}]*)\}/g,'$1⃗');
  c = c.replace(/\\tilde\s*\{([^{}]*)\}/g,'$1̃');
  c = c.replace(/\\dot\s*\{([^{}]*)\}/g,'$1̇');
  c = c.replace(/\\ddot\s*\{([^{}]*)\}/g,'$1̈');

  // ── Superscripts: ^{…}, ^(…), ^123, ^-2, ^ 3, ^x (with spaces) ──────────────────────
  c = c.replace(/\s*\^\s*\{([^{}]+)\}/g, (_,exp)=> exp.split('').map((ch:string)=>SUP[ch]??ch).join(''));
  c = c.replace(/\s*\^\s*\(([^()]+)\)/g, (_,exp)=> exp.split('').map((ch:string)=>SUP[ch]??ch).join(''));
  c = c.replace(/\s*\^\s*([0-9a-zA-Z+\-]+)/g, (_,exp)=> exp.split('').map((ch:string)=>SUP[ch]??ch).join(''));

  // Protect fill-in-the-blank reasoning series underscores (e.g. "_ P N I E X _ N I E Y P N", "a _ b", " _ ")
  const blankToken = '@@@BLANKUNDERSCOREX@@@';
  c = c.replace(/_{2,}/g, (m) => m.split('').map(() => blankToken).join(''));
  c = c.replace(/\s+_\s+/g, ` ${blankToken} `);
  c = c.replace(/(^|\n)\s*_\s+/g, `$1${blankToken} `);
  c = c.replace(/\s+_\s*([A-Z](?:\s+[A-Z])*\b)/g, ` ${blankToken} $1`);
  c = c.replace(/^_\s*([A-Z]\b)/g, `${blankToken} $1`);

  // ── Subscripts: _{…}, _(…), x_123, a_n (requires preceding variable/identifier character) ─
  c = c.replace(/([a-zA-Z0-9\)])\s*_\s*\{([^{}]+)\}/g, (_,base,sub)=> base + sub.split('').map((ch:string)=>SUB[ch]??ch).join(''));
  c = c.replace(/([a-zA-Z0-9\)])\s*_\s*\(([^()]+)\)/g, (_,base,sub)=> base + sub.split('').map((ch:string)=>SUB[ch]??ch).join(''));
  c = c.replace(/([a-zA-Z0-9\)])\s*_\s*([0-9a-zA-Z+\-]+)/g, (_,base,sub)=> base + sub.split('').map((ch:string)=>SUB[ch]??ch).join(''));

  // Restore protected blank underscores
  c = c.replaceAll(blankToken, '_');

  // ── Delimiters ────────────────────────────────────────────────────────────
  c = c.replace(/\\left\s*([\(\[\{|\\])/g,'$1');
  c = c.replace(/\\right\s*([\)\]\}|\\])/g,'$1');
  c = c.replace(/\\left\./g,'');
  c = c.replace(/\\right\./g,'');

  // ── Strip remaining braces ────────────────────────────────────────────────
  for (let i=0;i<4;i++) c = c.replace(/\{([^{}]*)\}/g,'$1');

  // ── Trig & log ────────────────────────────────────────────────────────────
  c = c.replace(/\\arctan\b/g,'arctan');
  c = c.replace(/\\arcsin\b/g,'arcsin');
  c = c.replace(/\\arccos\b/g,'arccos');
  c = c.replace(/\\tan\b/g,'tan');
  c = c.replace(/\\sin\b/g,'sin');
  c = c.replace(/\\cos\b/g,'cos');
  c = c.replace(/\\cot\b/g,'cot');
  c = c.replace(/\\sec\b/g,'sec');
  c = c.replace(/\\cosec\b/g,'cosec');
  c = c.replace(/\\csc\b/g,'csc');
  c = c.replace(/\\log\b/g,'log');
  c = c.replace(/\\ln\b/g,'ln');
  c = c.replace(/\\lim\b/g,'lim');
  c = c.replace(/\\exp\b/g,'exp');
  c = c.replace(/\\max\b/g,'max');
  c = c.replace(/\\min\b/g,'min');
  c = c.replace(/\\sup\b/g,'sup');
  c = c.replace(/\\inf\b/g,'inf');
  c = c.replace(/\\gcd\b/g,'gcd');
  c = c.replace(/\\lcm\b/g,'lcm');
  c = c.replace(/\\det\b/g,'det');
  c = c.replace(/\\dim\b/g,'dim');
  c = c.replace(/\\deg\b/g,'deg');
  c = c.replace(/\\mod\b/g,'mod');

  // ── Greek letters ─────────────────────────────────────────────────────────
  c = c.replace(/\\alpha\b/gi,'α');  c = c.replace(/\\beta\b/gi,'β');
  c = c.replace(/\\gamma\b/g,'γ');   c = c.replace(/\\Gamma\b/g,'Γ');
  c = c.replace(/\\delta\b/g,'δ');   c = c.replace(/\\Delta\b/g,'Δ');
  c = c.replace(/\\epsilon\b/gi,'ε'); c = c.replace(/\\varepsilon\b/g,'ε');
  c = c.replace(/\\zeta\b/gi,'ζ');   c = c.replace(/\\eta\b/gi,'η');
  c = c.replace(/\\theta\b/g,'θ');   c = c.replace(/\\Theta\b/g,'Θ');
  c = c.replace(/\\vartheta\b/g,'ϑ');
  c = c.replace(/\\iota\b/gi,'ι');   c = c.replace(/\\kappa\b/gi,'κ');
  c = c.replace(/\\lambda\b/g,'λ');  c = c.replace(/\\Lambda\b/g,'Λ');
  c = c.replace(/\\mu\b/gi,'μ');     c = c.replace(/\\nu\b/gi,'ν');
  c = c.replace(/\\xi\b/g,'ξ');      c = c.replace(/\\Xi\b/g,'Ξ');
  c = c.replace(/\\pi\b/g,'π');      c = c.replace(/\\Pi\b/g,'Π');
  c = c.replace(/\\varpi\b/g,'ϖ');
  c = c.replace(/\\rho\b/gi,'ρ');    c = c.replace(/\\varrho\b/g,'ϱ');
  c = c.replace(/\\sigma\b/g,'σ');   c = c.replace(/\\Sigma\b/g,'Σ');
  c = c.replace(/\\varsigma\b/g,'ς');
  c = c.replace(/\\tau\b/gi,'τ');
  c = c.replace(/\\upsilon\b/g,'υ'); c = c.replace(/\\Upsilon\b/g,'Υ');
  c = c.replace(/\\phi\b/g,'φ');     c = c.replace(/\\Phi\b/g,'Φ');
  c = c.replace(/\\varphi\b/g,'φ');
  c = c.replace(/\\chi\b/gi,'χ');
  c = c.replace(/\\psi\b/g,'ψ');     c = c.replace(/\\Psi\b/g,'Ψ');
  c = c.replace(/\\omega\b/g,'ω');   c = c.replace(/\\Omega\b/g,'Ω');

  // ── Operators & symbols ───────────────────────────────────────────────────
  c = c.replace(/\\times\b/g,'×');   c = c.replace(/\\div\b/g,'÷');
  c = c.replace(/\\pm\b/g,'±');      c = c.replace(/\\mp\b/g,'∓');
  c = c.replace(/\\cdot\b/g,'·');    c = c.replace(/\\cdots\b/g,'⋯');
  c = c.replace(/\\ldots\b/g,'…');   c = c.replace(/\\vdots\b/g,'⋮');
  c = c.replace(/\\ddots\b/g,'⋱');   c = c.replace(/\\dots\b/g,'…');
  c = c.replace(/\\infty\b/g,'∞');
  c = c.replace(/\\approx\b/g,'≈');  c = c.replace(/\\simeq\b/g,'≃');
  c = c.replace(/\\sim\b/g,'∼');
  c = c.replace(/\\neq\b/g,'≠');     c = c.replace(/\\ne\b/g,'≠');
  c = c.replace(/\\leq\b/g,'≤');     c = c.replace(/\\le\b/g,'≤');
  c = c.replace(/\\geq\b/g,'≥');     c = c.replace(/\\ge\b/g,'≥');
  c = c.replace(/\\ll\b/g,'≪');      c = c.replace(/\\gg\b/g,'≫');
  c = c.replace(/\\equiv\b/g,'≡');   c = c.replace(/\\cong\b/g,'≅');
  c = c.replace(/\\propto\b/g,'∝');
  c = c.replace(/\\therefore\b/g,'∴'); c = c.replace(/\\because\b/g,'∵');
  c = c.replace(/\\implies\b/g,'⇒');
  c = c.replace(/\\impliedby\b/g,'⇐');
  c = c.replace(/\\iff\b/g,'⇔');
  c = c.replace(/\\Rightarrow\b/g,'⇒'); c = c.replace(/\\Leftarrow\b/g,'⇐');
  c = c.replace(/\\Leftrightarrow\b/g,'⇔');
  c = c.replace(/\\rightarrow\b/g,'→'); c = c.replace(/\\leftarrow\b/g,'←');
  c = c.replace(/\\leftrightarrow\b/g,'↔');
  c = c.replace(/\\to\b/g,'→');      c = c.replace(/\\gets\b/g,'←');
  c = c.replace(/\\uparrow\b/g,'↑'); c = c.replace(/\\downarrow\b/g,'↓');
  c = c.replace(/\\updownarrow\b/g,'↕');
  c = c.replace(/\\subset\b/g,'⊂');  c = c.replace(/\\supset\b/g,'⊃');
  c = c.replace(/\\subseteq\b/g,'⊆'); c = c.replace(/\\supseteq\b/g,'⊇');
  c = c.replace(/\\in\b/g,'∈');      c = c.replace(/\\notin\b/g,'∉');
  c = c.replace(/\\cap\b/g,'∩');     c = c.replace(/\\cup\b/g,'∪');
  c = c.replace(/\\emptyset\b/g,'∅'); c = c.replace(/\\varnothing\b/g,'∅');
  c = c.replace(/\\forall\b/g,'∀');  c = c.replace(/\\exists\b/g,'∃');
  c = c.replace(/\\neg\b/g,'¬');     c = c.replace(/\\lnot\b/g,'¬');
  c = c.replace(/\\land\b/g,'∧');    c = c.replace(/\\lor\b/g,'∨');
  c = c.replace(/\\sum\b/g,'∑');     c = c.replace(/\\prod\b/g,'∏');
  c = c.replace(/\\int\b/g,'∫');     c = c.replace(/\\oint\b/g,'∮');
  c = c.replace(/\\partial\b/g,'∂'); c = c.replace(/\\nabla\b/g,'∇');
  c = c.replace(/\\triangle\b/g,'△'); c = c.replace(/\\angle\b/g,'∠');
  c = c.replace(/\\perp\b/g,'⊥');    c = c.replace(/\\parallel\b/g,'∥');
  c = c.replace(/\\circ\b/g,'∘');
  c = c.replace(/\\\^\\circ/g,'°');  c = c.replace(/\\\^o\b/g,'°');
  c = c.replace(/\\degree\b/g,'°');
  c = c.replace(/\\bullet\b/g,'•');  c = c.replace(/\\star\b/g,'⋆');
  c = c.replace(/\\oplus\b/g,'⊕');   c = c.replace(/\\otimes\b/g,'⊗');
  c = c.replace(/\\odot\b/g,'⊙');
  c = c.replace(/\\prime\b/g,'′');   c = c.replace(/\\backslash\b/g,'\\');

  // ── Currencies ────────────────────────────────────────────────────────────
  c = c.replace(/\\rupee\b/g,'₹');
  c = c.replace(/\\euro\b/g,'€');
  c = c.replace(/\\pounds\b/g,'£');
  c = c.replace(/\\yen\b/g,'¥');
  c = c.replace(/\\dollar\b/g,'$');
  c = c.replace(/\\cent\b/g,'¢');

  // ── Spacing commands ──────────────────────────────────────────────────────
  c = c.replace(/\\[,;:!]\s*/g,' ');
  c = c.replace(/\\quad\b/g,' ');
  c = c.replace(/\\qquad\b/g,'  ');
  c = c.replace(/\\hspace\s*\{[^{}]*\}/g,' ');
  c = c.replace(/\\vspace\s*\{[^{}]*\}/g,'');
  c = c.replace(/\\\s/g,' ');

  // ── Remove remaining LaTeX commands ───────────────────────────────────────
  c = c.replace(/\\[a-zA-Z]+\b\*?/g,'');

  // ── Clean up remaining backslashes and extra spaces ───────────────────────
  c = c.replace(/\\/g,'');
  c = c.replace(/[ \t]{2,}/g,' ').trim();

  // Restore protected URLs and IMG tags in reverse order
  for (let i = protectedTokens.length - 1; i >= 0; i--) {
    const { token, key } = protectedTokens[i];
    c = c.replaceAll(key, token);
  }

  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fraction renderer (visual numerator/denominator stack)
// ─────────────────────────────────────────────────────────────────────────────
interface FracProps { num:string; den:string; fontSize:number; color:string }
const FracView: React.FC<FracProps> = ({ num, den, fontSize, color }) => {
  const fs = Math.round(fontSize * 0.82);
  return (
    <View style={styles.fracWrap}>
      <Text style={{ fontSize:fs, color, textAlign:'center', minWidth:16 }}>{num}</Text>
      <View style={{ height:1.5, backgroundColor:color, alignSelf:'stretch', minWidth:20, marginVertical:2 }} />
      <Text style={{ fontSize:fs, color, textAlign:'center', minWidth:16 }}>{den}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Image component with fully responsive auto-sizing
// ─────────────────────────────────────────────────────────────────────────────
interface ImgProps { src:string; isDark?:boolean; w?:number; h?:number }
const HtmlImg: React.FC<ImgProps> = ({ src, isDark, w, h }) => {
  const [ar, setAr] = useState<number|null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

  let fullSrc = src ? (src.startsWith('//') ? 'https:' + src : src) : '';
  if (fullSrc && !fullSrc.startsWith('http://') && !fullSrc.startsWith('https://') && !fullSrc.startsWith('data:') && !fullSrc.startsWith('/')) {
    fullSrc = `https://storage.googleapis.com/tb-img/production/21/03/${fullSrc}`;
  }

  React.useEffect(() => {
    if (!fullSrc) { setLoading(false); return; }
    if (w && h && w > 0 && h > 0) { setAr(w/h); setLoading(false); return; }
    RNImage.getSize(fullSrc,
      (iw,ih)=>{ if(iw&&ih){ setAr(iw/ih); } setLoading(false); },
      ()=>setLoading(false)
    );
  }, [fullSrc,w,h]);

  // Only treat as tiny inline icon if BOTH explicit width attr is given AND it's < 50px
  const isExplicitIcon = (w !== undefined && w < 50) ||
    /shortcut-trick|alternate-meth|additional-info/i.test(fullSrc);

  if (loading) {
    if (isExplicitIcon)
      return <View style={{width:w??26,height:h??26,backgroundColor:isDark?'#1E293B':'#E2E8F0',borderRadius:4,marginHorizontal:4}} />;
    return <View style={{width:'100%',height:60,backgroundColor:isDark?'#1E293B':'#E2E8F0',borderRadius:6,marginVertical:4,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:10,color:'#94A3B8'}}>Loading…</Text></View>;
  }

  // Tiny inline icons: render inline at explicit size
  if (isExplicitIcon && ar) {
    const th = h ?? 26;
    return <Image source={{uri:fullSrc}} style={{width:th*ar,height:th,marginHorizontal:4,alignSelf:'center'}} contentFit="contain" cachePolicy="memory-disk" recyclingKey={fullSrc} />;
  }

  // Full responsive block image
  const effectiveAr = ar ?? (w && h ? w / h : 1.5);
  const innerWidth = containerWidth > 0 ? containerWidth - 8 : undefined; // subtract padding
  const computedHeight = innerWidth ? innerWidth / effectiveAr : undefined;
  const finalHeight = computedHeight ? Math.max(computedHeight, 60) : (h ?? 120);

  return (
    <View
      style={{
        marginVertical: 4,
        alignSelf: 'stretch',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        padding: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? '#334155' : '#E2E8F0',
        overflow: 'hidden',
      }}
      onLayout={(e) => {
        const lw = e.nativeEvent.layout.width;
        if (lw > 0 && lw !== containerWidth) setContainerWidth(lw);
      }}
    >
      <Image
        source={{uri:fullSrc}}
        style={{
          width: '100%',
          height: finalHeight,
        }}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={fullSrc}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML Table renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderTable(html:string, textStyle:any, isDark:boolean|undefined, key:string): React.ReactNode {
  const bc = isDark?'#4B5563':'#D1D5DB';
  const hBg = isDark?'#1F2937':'#E5E7EB';
  const eBg = isDark?'#111827':'#F9FAFB';
  const tc  = isDark?'#E5E7EB':'#1F2937';
  const fs  = (textStyle?.fontSize??13)*0.88;

  const rows: Array<Array<{text:string;header:boolean}>> = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm:RegExpExecArray|null;
  while((rm=rowRe.exec(html))!==null){
    const cells:Array<{text:string;header:boolean}>=[];
    const cellRe=/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    let cm:RegExpExecArray|null;
    while((cm=cellRe.exec(rm[1]))!==null){
      let t=cm[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      t=decodeEntities(t); t=latexToUnicode(t);
      cells.push({text:t,header:cm[1].toLowerCase()==='th'});
    }
    if(cells.length) rows.push(cells);
  }
  if(!rows.length) return null;
  const mc=Math.max(...rows.map(r=>r.length));
  return (
    <View key={key} style={{width:'100%',borderWidth:1,borderColor:bc,borderRadius:4,overflow:'hidden',marginVertical:6}}>
      {rows.map((row,ri)=>{
        const isH=ri===0||row.some(c=>c.header);
        return (
          <View key={ri} style={{flexDirection:'row',backgroundColor:isH?hBg:ri%2===0?eBg:'transparent'}}>
            {row.map((cell,ci)=>(
              <View key={ci} style={{flex:1,borderRightWidth:ci<mc-1?1:0,borderBottomWidth:ri<rows.length-1?1:0,borderColor:bc,padding:6,minWidth:0}}>
                <Text style={{fontSize:fs,color:tc,fontWeight:isH||cell.header?'bold':'normal',textAlign:'center'}}>{cell.text}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Block / Inline node types
// ─────────────────────────────────────────────────────────────────────────────
type InlineNode =
  | { k:'text';  v:string; bold?:boolean; italic?:boolean; under?:boolean; sup?:boolean; sub?:boolean; hLevel?:number }
  | { k:'frac';  num:string; den:string }
  | { k:'img';   src:string; w?:number; h?:number };

type Block =
  | { k:'para';  nodes: InlineNode[] }
  | { k:'head';  level:number; nodes: InlineNode[] }
  | { k:'li';    bullet:string; nodes: InlineNode[] }
  | { k:'hr' }
  | { k:'table'; html:string }
  | { k:'img';   src:string; w?:number; h?:number };

// ─────────────────────────────────────────────────────────────────────────────
// HTML pre-processing: strip junk that creates blank lines
// ─────────────────────────────────────────────────────────────────────────────
function cleanHtml(raw: string): string {
  let s = raw;

  // 1. Decode entities (4 passes for double/triple encoded &amp;lt; &lt; etc.)
  for (let i = 0; i < 4; i++) {
    const n = decodeEntities(s);
    if (n === s) break;
    s = n;
  }

  // 1b. Rescue broken or truncated <img> tag fragments and bare image filenames
  // (E.g. `10.3.21_Pallavi_D13.png" style="width: 344px; height: 81px;" />`, `//cdn.testbook.com/... width="26px" />`)
  s = s.replace(
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

  // 1c. Ensure ALL <img ... src="//..." ...> tags have explicit https: protocol
  s = s.replace(/<img\b([^>]*)\bsrc=["']\/\//gi, '<img$1src="https://');

  // 2. Strip HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Normalize line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 4. Remove style/script blocks entirely
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 5. Replace ALL HTML superscripts <sup>...</sup> with Unicode superscripts
  s = s.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const plain = inner.replace(/<[^>]+>/g, '').trim();
    if (!plain) return '';
    const decoded = decodeEntities(plain);
    return decoded.split('').map((ch: string) => SUP[ch] ?? ch).join('');
  });

  // 6. Replace ALL HTML subscripts <sub>...</sub> with Unicode subscripts
  s = s.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, (_, inner) => {
    const plain = inner.replace(/<[^>]+>/g, '').trim();
    if (!plain) return '';
    const decoded = decodeEntities(plain);
    return decoded.split('').map((ch: string) => SUB[ch] ?? ch).join('');
  });

  // 7. For short text (options), strip ALL block-level wrapper tags to prevent multi-block splitting
  //    Use actual text length (without HTML markup) for the threshold check
  const plainTextLen = s.replace(/<[^>]+>/g, '').trim().length;
  if (plainTextLen < 200) {
    s = s.replace(/<\/(?:p|div)>/gi, ' ');
    s = s.replace(/<(?:p|div|span)[^>]*>/gi, '');
    s = s.replace(/<\/span>/gi, '');
  }

  // 9. Remove ALL empty/whitespace-only block tags
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s
      .replace(/<p[^>]*>\s*(<br\s*\/?>\s*)*\s*<\/p>/gi, '')
      .replace(/<div[^>]*>\s*(<br\s*\/?>\s*)*\s*<\/div>/gi, '')
      .replace(/<p[^>]*>(?:&nbsp;|\u00A0|\s)*<\/p>/gi, '')
      .replace(/<div[^>]*>(?:&nbsp;|\u00A0|\s)*<\/div>/gi, '')
      .replace(/<span[^>]*>(?:&nbsp;|\u00A0|\s)*<\/span>/gi, '');
  }

  // 10. Collapse 3+ consecutive <br> into at most 2
  s = s.replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>');

  // 11. Remove invisible &nbsp; standalone runs
  s = s.replace(/(&nbsp;\s*){3,}/gi, '');

  // 12. Collapse ALL whitespace (spaces, tabs, newlines, nbsp) into single space
  s = s.replace(/[\s\u00A0]+/g, ' ');

  // 13. Extract width/height from style="width: 344px; height: 81px;" into explicit attributes on <img> tags
  s = s.replace(/<img\b([^>]*)>/gi, (_match, attrs: string) => {
    let a = attrs.trim();
    const selfClosing = a.endsWith('/');
    if (selfClosing) a = a.slice(0, -1).trim();
    if (!/\bwidth=/i.test(a)) {
      const wm = a.match(/style="[^"]*width:\s*(\d+)px/i);
      if (wm) a += ` width="${wm[1]}"`;
    }
    if (!/\bheight=/i.test(a)) {
      const hm = a.match(/style="[^"]*height:\s*(\d+)px/i);
      if (hm) a += ` height="${hm[1]}"`;
    }
    a = a.replace(/\s+style="[^"]*"/gi, '');
    a = a.replace(/\s+class="[^"]*"/gi, '');
    a = a.replace(/\s+data-[a-z][a-z0-9-]*="[^"]*"/gi, '');
    return `<img ${a.trim()} />`;
  });

  // 14. Remove data-* and style attributes from remaining non-img tags
  s = s.replace(/\s+data-[a-z][a-z0-9-]*="[^"]*"/gi, '');
  s = s.replace(/\s+style="[^"]*"/gi, '');

  return s.trim();
}

function getTag(token: string): string {
  const m = token.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
  return m ? m[1].toLowerCase() : '';
}

function splitTables(html: string): Array<{type:'table'|'text';content:string}> {
  const parts: Array<{type:'table'|'text';content:string}> = [];
  let rest = html;
  while(rest.length) {
    const si = rest.toLowerCase().indexOf('<table');
    if(si===-1){ parts.push({type:'text',content:rest}); break; }
    if(si>0) parts.push({type:'text',content:rest.slice(0,si)});
    const ei = rest.toLowerCase().indexOf('</table>',si);
    if(ei===-1){ parts.push({type:'text',content:rest.slice(si)}); break; }
    parts.push({type:'table',content:rest.slice(si,ei+8)});
    rest = rest.slice(ei+8);
  }
  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse \frac inside inline text segments
// ─────────────────────────────────────────────────────────────────────────────
function parseFrac(raw: string): Array<{type:'text'|'frac';v?:string;num?:string;den?:string}> {
  const out: Array<{type:'text'|'frac';v?:string;num?:string;den?:string}> = [];
  // Look for \frac{}{} patterns
  const re = /\\(?:d|t|c)?frac\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let last = 0, m: RegExpExecArray|null;
  while((m=re.exec(raw))!==null){
    if(m.index>last) out.push({type:'text',v:raw.slice(last,m.index)});
    out.push({type:'frac',num:latexToUnicode(m[1]),den:latexToUnicode(m[2])});
    last=m.index+m[0].length;
  }
  if(last<raw.length) out.push({type:'text',v:raw.slice(last)});
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main parser: HTML → Block[]
// ─────────────────────────────────────────────────────────────────────────────
function htmlToBlocks(rawHtml: string): Block[] {
  const html = cleanHtml(rawHtml);

  // Handle tables separately
  const chunks = splitTables(html);
  if(chunks.some(c=>c.type==='table')){
    const all: Block[] = [];
    for(const ch of chunks){
      if(ch.type==='table') all.push({k:'table',html:ch.content});
      else if(ch.content.trim()) all.push(...htmlToBlocks(ch.content));
    }
    return all;
  }

  const blocks: Block[] = [];

  // Formatting state
  let bold=false, italic=false, under=false, sup=false, sub=false;
  let hLevel=0;
  let isOl=false, liCount=0;
  let inLi=false;

  // Current accumulator
  let curK: 'para'|'head'|'li' = 'para';
  let curBullet = '';
  let curNodes: InlineNode[] = [];

  const flush = () => {
    // Trim leading/trailing pure-whitespace text nodes
    while(curNodes.length && curNodes[0].k==='text' && !(curNodes[0] as any).v?.trim()) curNodes.shift();
    while(curNodes.length && curNodes[curNodes.length-1].k==='text' && !(curNodes[curNodes.length-1] as any).v?.trim()) curNodes.pop();
    if(!curNodes.length) { curNodes=[]; return; }
    if(curK==='para') blocks.push({k:'para',nodes:curNodes});
    else if(curK==='head') blocks.push({k:'head',level:hLevel,nodes:curNodes});
    else if(curK==='li') blocks.push({k:'li',bullet:curBullet,nodes:curNodes});
    curNodes=[];
  };

  const addText = (raw: string) => {
    if(!raw) return;
    // Collapse whitespace but preserve single spaces between words
    const v = raw.replace(/[ \t\r\n]+/g,' ');
    if(!v.trim() && v===' '){
      // Single space — only add if we have content
      if(curNodes.length) curNodes.push({k:'text',v:' '});
      return;
    }
    if(!v.trim()) return;

    // Check for \frac patterns
    const parts = parseFrac(v);
    for(const p of parts){
      if(p.type==='frac'){
        curNodes.push({k:'frac',num:p.num!,den:p.den!});
      } else if(p.v){
        // Apply full LaTeX translation then entity decode
        let t = latexToUnicode(p.v);
        // Final cleanup
        t = t.replace(/[ \t]{2,}/g,' ');
        if(t) curNodes.push({k:'text',v:t,bold:bold||hLevel>0,italic,under,sup,sub,hLevel});
      }
    }
  };

  const tokens = html.split(/(<[^>]+>)/g);

  for(const token of tokens){
    if(!token) continue;

    if(!token.startsWith('<')){
      addText(token);
      continue;
    }

    const tag = getTag(token);
    const closing = token.startsWith('</');
    const self = token.endsWith('/>') || ['br','hr','img','input','meta','link'].includes(tag);

    // ── Inline formatting ────────────────────────────────────────────────────
    if(['strong','b'].includes(tag)){           bold=!closing; continue; }
    if(['em','i'].includes(tag)){               italic=!closing; continue; }
    if(tag==='u'){                              under=!closing; continue; }
    if(tag==='mark'){                           bold=!closing; continue; }
    if(tag==='sup'){                            sup=!closing; continue; }
    if(tag==='sub'){                            sub=!closing; continue; }

    // ── BR: newline only if block has content already ───────────────────────
    if(tag==='br'){
      if(curNodes.length) {
        // Check the last node isn't already a newline
        const last = curNodes[curNodes.length-1];
        if(!(last.k==='text' && (last as any).v==='\n')){
          curNodes.push({k:'text',v:'\n'});
        }
      }
      continue;
    }

    // ── HR ───────────────────────────────────────────────────────────────────
    if(tag==='hr'){ flush(); blocks.push({k:'hr'}); continue; }

    // ── Headings ─────────────────────────────────────────────────────────────
    if(/^h[1-6]$/.test(tag)){
      if(!closing){ flush(); curK='head'; hLevel=parseInt(tag[1],10); }
      else { flush(); curK='para'; hLevel=0; }
      continue;
    }

    // ── Block elements: p, div, section, article, blockquote, pre ───────────
    if(['p','div','section','article','blockquote','pre'].includes(tag)){
      flush(); curK='para'; continue;
    }

    // ── Lists ────────────────────────────────────────────────────────────────
    if(tag==='ul'){ if(!closing){ flush();isOl=false;liCount=0; } else { flush(); } continue; }
    if(tag==='ol'){ if(!closing){ flush();isOl=true;liCount=0; } else { flush();isOl=false; } continue; }
    if(tag==='li'){
      if(!closing){
        flush();
        curK='li';
        if(isOl){ liCount++; curBullet=`${liCount}. `; }
        else curBullet='• ';
        inLi=true;
      } else { flush(); curK='para'; inLi=false; }
      continue;
    }

    // ── Images ───────────────────────────────────────────────────────────────
    if(tag==='img' && !closing){
      const sm=token.match(/src=["']([^"']+)["']/i);
      if(sm){
        let src=sm[1];
        if(src.startsWith('//')) src='https:'+src;

        const wm=token.match(/width=["'](\d+)/i);
        const hm=token.match(/height=["'](\d+)/i);
        const sm2=token.match(/style=["'][^"']*width:\s*(\d+)px/i);
        const sm3=token.match(/style=["'][^"']*height:\s*(\d+)px/i);
        const iw=sm2?parseInt(sm2[1]):wm?parseInt(wm[1]):undefined;
        const ih=sm3?parseInt(sm3[1]):hm?parseInt(hm[1]):undefined;
        const isSmall=iw&&iw<50;

        if(isSmall){
          curNodes.push({k:'img',src,w:iw,h:ih});
        } else {
          flush();
          blocks.push({k:'img',src,w:iw,h:ih});
        }
      }
      continue;
    }

    // ── Ignored tags: span, a, abbr, code, kbd, font, td, tr, etc. ──────────
    // Their text content flows through naturally — we just skip the tag itself
  }

  flush();
  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render blocks to React Native nodes
// ─────────────────────────────────────────────────────────────────────────────
function renderInlines(nodes: InlineNode[], baseFontSize:number, baseColor:string, textStyle:any, isDark?:boolean, blockIdx:number = 0): React.ReactNode[] {
  const headingScale=[1.6,1.45,1.3,1.15,1.05,1.0];
  return nodes.map((node, i)=>{
    const key = `in_${blockIdx}_${i}`;
    if(node.k==='frac'){
      return <FracView key={key} num={node.num} den={node.den} fontSize={baseFontSize} color={baseColor}/>;
    }
    if(node.k==='img'){
      return <HtmlImg key={key} src={node.src} isDark={isDark} w={node.w} h={node.h}/>;
    }
    // text node
    const n = node as Extract<InlineNode,{k:'text'}>;
    const hFs = n.hLevel ? Math.round(baseFontSize*(headingScale[(n.hLevel??1)-1]??1)) : baseFontSize;
    const fs = (n.sup||n.sub) ? Math.round(hFs*0.75) : hFs;
    const style:any[] = [
      textStyle,
      { color:baseColor, fontSize:fs },
      n.bold  && { fontWeight:'bold' as const },
      n.italic && { fontStyle:'italic' as const },
      n.under && { textDecorationLine:'underline' as const },
    ].filter(Boolean);
    return <Text key={key} style={style}>{n.v}</Text>;
  });
}

function renderTextInlines(nodes: InlineNode[], baseFontSize:number, baseColor:string, textStyle:any, blockIdx:number = 0): React.ReactNode[] {
  const headingScale=[1.6,1.45,1.3,1.15,1.05,1.0];
  return nodes.map((node, i)=>{
    const key = `txt_${blockIdx}_${i}`;
    if (node.k !== 'text') return null;
    const n = node as Extract<InlineNode,{k:'text'}>;
    const hFs = n.hLevel ? Math.round(baseFontSize*(headingScale[(n.hLevel??1)-1]??1)) : baseFontSize;
    const fs = (n.sup||n.sub) ? Math.round(hFs*0.75) : hFs;
    const style:any[] = [
      textStyle,
      { color:baseColor, fontSize:fs },
      n.bold  && { fontWeight:'bold' as const },
      n.italic && { fontStyle:'italic' as const },
      n.under && { textDecorationLine:'underline' as const },
    ].filter(Boolean);
    return <Text key={key} style={style}>{n.v}</Text>;
  });
}

function renderBlocks(blocks: Block[], textStyle:any, isDark?:boolean): React.ReactNode[] {
  const baseFs: number = textStyle?.fontSize ?? 14;
  const baseColor: string = isDark ? '#E5E7EB' : '#1F2937';
  const out: React.ReactNode[] = [];

  blocks.forEach((b, blockIdx) => {
    const key = `blk_${blockIdx}`;
    if(b.k==='hr'){
      out.push(<View key={key} style={{width:'100%',height:1,backgroundColor:isDark?'#334155':'#E2E8F0',marginVertical:4}}/>);
      return;
    }
    if(b.k==='table'){
      const n=renderTable(b.html,textStyle,isDark,key);
      if(n) out.push(n);
      return;
    }
    if(b.k==='img'){
      out.push(<HtmlImg key={key} src={b.src} isDark={isDark} w={b.w} h={b.h}/>);
      return;
    }
    // para / head / li
    const nodes = b.nodes;
    if(!nodes.length) return;

    const hasSpecialInlines = nodes.some(n => n.k === 'frac' || n.k === 'img');

    if (hasSpecialInlines) {
      const inlines = renderInlines(nodes, baseFs, baseColor, textStyle, isDark, blockIdx);
      if(b.k==='li'){
        out.push(
          <View key={key} style={{flexDirection:'row',alignItems:'center',marginBottom:2,width:'100%'}}>
            <Text style={[textStyle,{color:baseColor,fontSize:baseFs,lineHeight:baseFs*1.55,fontWeight:'bold',flexShrink:0,marginRight:6}]}>{b.bullet}</Text>
            <View style={{flex:1,flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}>{inlines}</View>
          </View>
        );
      } else {
        out.push(
          <View key={key} style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',width:'100%',marginVertical:2}}>
            {inlines}
          </View>
        );
      }
    } else {
      const textChildren = renderTextInlines(nodes, baseFs, baseColor, textStyle, blockIdx);
      if(b.k==='li'){
        out.push(
          <View key={key} style={{flexDirection:'row',alignItems:'flex-start',marginBottom:2,width:'100%'}}>
            <Text style={[textStyle,{color:baseColor,fontSize:baseFs,lineHeight:baseFs*1.5,fontWeight:'bold',flexShrink:0,marginRight:6}]}>{b.bullet}</Text>
            <Text style={[textStyle, { color: baseColor, fontSize: baseFs, lineHeight: baseFs * 1.4, flex: 1 }]}>
              {textChildren}
            </Text>
          </View>
        );
      } else {
        out.push(
          <Text key={key} style={[textStyle, { color: baseColor, fontSize: baseFs, lineHeight: baseFs * 1.4, marginVertical: 1 }]}>
            {textChildren}
          </Text>
        );
      }
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported component
// ─────────────────────────────────────────────────────────────────────────────
function areEqual(prev:HtmlTextProps, next:HtmlTextProps): boolean {
  return prev.html===next.html && prev.isDark===next.isDark;
}

const HtmlTextInner: React.FC<HtmlTextProps> = ({ html, style, isDark }) => {
  if(!html) return null;

  const blocks  = htmlToBlocks(html);
  const rendered = renderBlocks(blocks, style, isDark);

  // Pull layout-only props (margin/padding/width) to the outer View
  const flat = StyleSheet.flatten(style) ?? {};
  const layoutProps: any = {};
  for(const k of ['margin','marginTop','marginBottom','marginLeft','marginRight','marginHorizontal','marginVertical',
                   'padding','paddingTop','paddingBottom','paddingLeft','paddingRight','paddingHorizontal','paddingVertical',
                   'width','height','flex','alignSelf']){
    if(flat[k]!==undefined) layoutProps[k]=flat[k];
  }

  return (
    <View style={[styles.wrap, layoutProps]}>
      {rendered}
    </View>
  );
};

export const HtmlText = React.memo(HtmlTextInner, areEqual);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  },
  fracWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Image pre-fetcher — call when questions load to warm disk cache
// ─────────────────────────────────────────────────────────────────────────────
export function preloadImages(htmlStrings: string[]): void {
  const re = /src=["']([^"']+)["']/gi;
  const urls = new Set<string>();
  for(const s of htmlStrings){
    if(!s) continue;
    let m: RegExpExecArray|null;
    const r=new RegExp(re.source,'gi');
    while((m=r.exec(s))!==null){
      if(m[1]?.startsWith('http')) urls.add(m[1]);
    }
  }
  if(urls.size) Image.prefetch([...urls]);
}
