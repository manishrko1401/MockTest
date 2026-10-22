import type { Theme } from './theme';
import { processQuestionHtml } from './shared/mathUtils';

// The page that shows one question (passage, question, image, options, and in review mode the
// answer and explanation). Same MathJax settings as the website. Option taps are sent to the
// app; the selection is updated by the app without reloading the page. Images open full
// screen (pinch to zoom) when tapped.

export type QuestionPageInput = {
  comprehension?: string;
  questionText: string;
  imageUrl?: string;
  options: { text: string; imageUrl?: string }[];
  selected: number | null;
  /** Review mode: show the correct answer (and the student's choice) */
  review?: { correct: number; chosen: number | null; explanation?: string };
  fontScale?: number;
  watermark?: string;
  /** Where MathJax is loaded from (inside the APK, or a CDN in the browser preview) */
  mathJaxSrc: string;
  labels?: { passage: string; explanation: string; yourAnswer: string; correct: string; skipped?: string; right?: string; wrong?: string };
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Question HTML from many sources (Testbook, Word, other sites) carries its own fonts, sizes
 * and colours. Those are removed so every question looks the same and stays readable in dark
 * mode; relative sizes (em, %) used for fractions and powers are kept.
 */
export function tidyHtml(raw: string): string {
  let html = processQuestionHtml(raw || '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<link\b[^>]*>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_m, q, css: string) => {
    const kept = css.split(';').map(d => d.trim()).filter(d => {
      if (!d) return false;
      const [prop, ...rest] = d.split(':');
      const p = prop.trim().toLowerCase();
      const v = rest.join(':').trim().toLowerCase();
      if (p === 'font-family' || p === 'color' || p === 'background' || p === 'background-color' || p === 'line-height') return false;
      if (p === 'font-size' && /(px|pt|pc|cm|mm|in)\s*$/.test(v)) return false;
      if ((p === 'height' || p === 'min-height') && /px/.test(v)) return false; // fixed heights squash images and boxes
      if (p === 'text-align' && v === 'justify') return false; // leaves wide gaps on a phone
      if (p === 'text-indent' || ((p === 'margin' || p.startsWith('margin-') || p.startsWith('padding-')) && v.includes('-'))) return false;
      if (p === 'list-style-position' || p === 'white-space') return false;
      if ((p === 'margin' || p.startsWith('margin-') || p === 'padding' || p.startsWith('padding-')) && /\d{2,}px/.test(v)) return false;
      return true;
    });
    return kept.length ? ` style=${q}${kept.join(';')}${q}` : '';
  });
  html = html.replace(/<font\b[^>]*>/gi, '<span>').replace(/<\/font>/gi, '</span>');
  html = html.replace(/\s(?:bgcolor|color|face)\s*=\s*(["'])[^"']*\1/gi, '');
  // tables scroll sideways instead of squeezing
  html = html.replace(/<table\b/gi, '<div class="tbl"><table').replace(/<\/table>/gi, '</table></div>');
  return html;
}

const IMG = (src: string) => `<div class="img"><img src="${esc(src)}" alt=""></div>`;

export function questionPage(q: QuestionPageInput, t: Theme): string {
  const L = { passage: 'Passage', explanation: 'Solution', yourAnswer: 'Your answer', correct: 'Correct answer', skipped: 'Not answered', right: 'Correct', wrong: 'Wrong', ...(q.labels || {}) };
  const fs = Math.round(16.5 * (q.fontScale || 1));
  const letter = (i: number) => String.fromCharCode(65 + i);
  const options = q.options.map((o, i) => {
    let cls = 'opt';
    let tag = '';
    if (q.review) {
      if (i === q.review.correct) { cls += ' ok'; tag = `<span class="tag ok">✓ ${esc(i === q.review.chosen ? L.yourAnswer + ' · ' + L.right : L.correct)}</span>`; }
      else if (i === q.review.chosen) { cls += ' bad'; tag = `<span class="tag bad">✗ ${esc(L.yourAnswer)}</span>`; }
    } else if (i === q.selected) cls += ' sel';
    return `<div class="${cls}" id="o${i}" onclick="pick(${i})" role="button"><span class="l">${letter(i)}</span><div class="ot"><div class="c">${tidyHtml(o.text || '')}</div>${o.imageUrl ? IMG(o.imageUrl) : ''}${tag}</div></div>`;
  }).join('');

  // Review: one line that says how the student did
  let verdict = '';
  if (q.review) {
    const { correct, chosen } = q.review;
    const state = chosen === null || chosen === undefined ? 'skip' : chosen === correct ? 'right' : 'wrong';
    const label = state === 'skip' ? L.skipped : state === 'right' ? L.right : L.wrong;
    const detail = state === 'right' ? `${L.correct}: ${letter(correct)}` : state === 'wrong' ? `${L.yourAnswer}: ${letter(chosen as number)} · ${L.correct}: ${letter(correct)}` : `${L.correct}: ${letter(correct)}`;
    verdict = `<div class="verdict ${state}"><b>${state === 'right' ? '✓' : state === 'wrong' ? '✗' : '–'} ${esc(label)}</b><span>${esc(detail)}</span></div>`;
  }

  const wm = q.watermark ? `<div class="wm" aria-hidden="true">${Array.from({ length: 36 }, () => `<span>${esc(q.watermark || '')}</span>`).join('')}</div>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script>window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)'],['$','$']],displayMath:[['\\\\[','\\\\]'],['$$','$$']],processEscapes:true,packages:{'[+]':['ams','boldsymbol','color']},macros:{rupee:'{\\\\text{₹}}',Rs:'{\\\\text{₹}}',inr:'{\\\\text{₹}}',degree:'{^{\\\\circ}}',celsius:'{\\\\text{°C}}'}},svg:{fontCache:'global'},options:{skipHtmlTags:['script','noscript','style','textarea','pre'],ignoreHtmlClass:'no-math'},startup:{typeset:true}};</script>
<script src="${q.mathJaxSrc}" async></script>
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{margin:0;background:${t.bg};color:${t.text};font-family:Roboto,'Noto Sans','Noto Sans Devanagari',system-ui,sans-serif;font-size:${fs}px;line-height:1.62;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-text-size-adjust:100%}
  .w{padding:16px 16px 36px;position:relative;z-index:2}
  .c p{margin:0 0 .55em}.c p:last-child{margin-bottom:0}
  .c ul,.c ol{margin:.3em 0 .6em!important;padding-left:1.35em!important;list-style-position:outside}.c li{margin:.15em 0!important;padding-left:0!important}
  .c b,.c strong{font-weight:700}
  .c a{color:${t.primary}}
  .c hr{border:0;border-top:1px solid ${t.border};margin:12px 0}
  .pass{background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:.93em;max-height:42vh;overflow:auto}
  .pass .h,.exp .h{display:flex;align-items:center;gap:6px;color:${t.primary};font-size:.74em;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .q{margin-bottom:16px;font-weight:500}
  .img{background:#fff;border-radius:12px;padding:6px;margin:10px 0;display:inline-block;max-width:100%;border:1px solid ${t.border}}
  img{max-width:100%;height:auto!important;display:block;margin:0 auto}
  .c img{background:#fff;border-radius:8px;padding:2px;display:inline-block;vertical-align:middle;cursor:zoom-in}
  .tbl{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:10px 0;border-radius:10px;border:1px solid ${t.border}}
  .tbl table{border-collapse:collapse;min-width:100%;width:auto!important;font-size:.92em;background:${t.card}}
  .tbl td,.tbl th{border:1px solid ${t.border};padding:7px 9px;vertical-align:top;text-align:left}
  .tbl tr:first-child td,.tbl th{background:${t.cardAlt};font-weight:700}
  .opt{display:flex;gap:12px;align-items:flex-start;background:${t.card};border:1.5px solid ${t.border};border-radius:14px;padding:12px 13px;margin-bottom:10px;transition:background .12s,border-color .12s;cursor:pointer}
  .opt:active{transform:scale(.995)}
  .opt .l{flex:none;width:30px;height:30px;border-radius:50%;border:1.5px solid ${t.textMuted};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8em;color:${t.textSoft};margin-top:1px}
  .opt .ot{flex:1;min-width:0;overflow-wrap:anywhere;padding-top:2px}
  .opt.sel{border-color:${t.primary};background:${t.primarySoft}} .opt.sel .l{background:${t.primary};border-color:${t.primary};color:${t.primaryText}}
  .opt.ok{border-color:${t.success};background:${t.successSoft}} .opt.ok .l{background:${t.success};border-color:${t.success};color:${t.dark ? '#0b111c' : '#fff'}}
  .opt.bad{border-color:${t.danger};background:${t.dangerSoft}} .opt.bad .l{background:${t.danger};border-color:${t.danger};color:${t.dark ? '#0b111c' : '#fff'}}
  .tag{display:inline-block;margin-top:8px;font-size:.72em;font-weight:800;padding:2px 9px;border-radius:999px;line-height:1.6}
  .tag.ok{background:${t.success};color:${t.dark ? '#0b111c' : '#fff'}} .tag.bad{background:${t.danger};color:${t.dark ? '#0b111c' : '#fff'}}
  .verdict{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;border-radius:12px;padding:9px 12px;margin-bottom:14px;font-size:.86em}
  .verdict b{font-weight:800} .verdict span{opacity:.9}
  .verdict.right{background:${t.successSoft};color:${t.success}} .verdict.wrong{background:${t.dangerSoft};color:${t.danger}} .verdict.skip{background:${t.cardAlt};color:${t.textSoft}}
  .exp{margin-top:18px;background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:13px 14px;font-size:.94em}
  .exp .h{color:${t.success}}
  .wm{position:fixed;inset:-40%;display:flex;flex-wrap:wrap;align-content:flex-start;gap:110px 130px;transform:rotate(-24deg);opacity:${t.dark ? '.05' : '.04'};pointer-events:none;z-index:1;font-size:12px;font-weight:700;color:${t.text};white-space:nowrap}
  mjx-container{max-width:100%;overflow-x:auto;overflow-y:hidden;vertical-align:middle}
  mjx-container[display="true"]{margin:.4em 0!important}
  .math-frac{color:inherit}
</style></head><body>${wm}<div class="w">
${verdict}
${q.comprehension ? `<div class="pass"><div class="h">${esc(L.passage)}</div><div class="c">${tidyHtml(q.comprehension)}</div></div>` : ''}
<div class="q c">${tidyHtml(q.questionText || '')}${q.imageUrl ? IMG(q.imageUrl) : ''}</div>
${options}
${q.review && q.review.explanation ? `<div class="exp"><div class="h">✓ ${esc(L.explanation)}</div><div class="c">${tidyHtml(q.review.explanation)}</div></div>` : ''}
</div>
<script>
  var review=${q.review ? 'true' : 'false'};
  function send(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); else if(window.parent!==window) window.parent.postMessage(JSON.stringify(m),'*'); }
  function pick(i){ if(review) return; send({type:'select',i:i}); }
  function setSel(i){ var o=document.querySelectorAll('.opt'); for(var k=0;k<o.length;k++){ o[k].classList.toggle('sel',k===i); } }
  document.addEventListener('contextmenu',function(e){e.preventDefault();});
  // tap a picture to see it full screen (an option picture still selects the option)
  document.addEventListener('click',function(e){
    var el=e.target; if(!el||el.tagName!=='IMG') return;
    if(!review && el.closest && el.closest('.opt')) return;
    e.stopPropagation(); send({type:'zoom',src:el.currentSrc||el.src});
  },true);
  // a broken picture hides its frame instead of showing an empty box
  document.addEventListener('error',function(e){ var el=e.target; if(el&&el.tagName==='IMG'){ var f=el.closest('.img'); (f||el).style.display='none'; } },true);
</script></body></html>`;
}

/** Full-screen picture with pinch zoom (opened from a question). */
export function zoomPage(src: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=6,user-scalable=yes">
<style>html,body{margin:0;height:100%;background:#000}body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100%;background:#fff}</style></head>
<body><img src="${esc(src)}" alt=""></body></html>`;
}
