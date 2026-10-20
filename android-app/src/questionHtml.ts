import type { Theme } from './theme';
import { processQuestionHtml } from './shared/mathUtils';

// The page that shows one question (passage, question, image, options, and in review mode the
// answer and explanation). Same MathJax settings as the website. Option taps are sent to the
// app; the selection is updated by the app without reloading the page.

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
  labels?: { passage: string; explanation: string; yourAnswer: string; correct: string };
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function questionPage(q: QuestionPageInput, t: Theme): string {
  const L = q.labels || { passage: 'Passage', explanation: 'Explanation', yourAnswer: 'Your answer', correct: 'Correct answer' };
  const fs = Math.round(16 * (q.fontScale || 1));
  const options = q.options.map((o, i) => {
    let cls = 'opt';
    if (q.review) {
      if (i === q.review.correct) cls += ' ok';
      else if (i === q.review.chosen) cls += ' bad';
    } else if (i === q.selected) cls += ' sel';
    const tag = q.review ? (i === q.review.correct ? `<span class="tag ok">${esc(L.correct)}</span>` : i === q.review.chosen ? `<span class="tag bad">${esc(L.yourAnswer)}</span>` : '') : '';
    return `<div class="${cls}" id="o${i}" onclick="pick(${i})"><span class="l">${String.fromCharCode(65 + i)}</span><div class="ot">${processQuestionHtml(o.text || '')}${o.imageUrl ? `<img src="${esc(o.imageUrl)}">` : ''}${tag}</div></div>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script>window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)'],['$','$']],displayMath:[['\\\\[','\\\\]'],['$$','$$']],processEscapes:true,packages:{'[+]':['ams','boldsymbol','color']},macros:{rupee:'{\\\\text{₹}}',Rs:'{\\\\text{₹}}',inr:'{\\\\text{₹}}',degree:'{^{\\\\circ}}',celsius:'{\\\\text{°C}}'}},svg:{fontCache:'global'},options:{skipHtmlTags:['script','noscript','style','textarea','pre'],ignoreHtmlClass:'no-math'},startup:{typeset:true}};</script>
<script src="${q.mathJaxSrc}" async></script>
<style>
  html,body{margin:0;background:${t.bg};color:${t.text};font-family:Roboto,'Noto Sans','Noto Sans Devanagari',sans-serif;font-size:${fs}px;line-height:1.6;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
  .w{padding:14px 14px 28px}
  .pass{background:${t.cardAlt};border:1px solid ${t.border};border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:.92em;max-height:42vh;overflow:auto}
  .pass b.h{display:block;color:${t.primary};font-size:.8em;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
  .q{margin-bottom:14px} img{max-width:100%;height:auto;border-radius:6px} table{border-collapse:collapse;max-width:100%;display:block;overflow-x:auto} td,th{border:1px solid ${t.border};padding:4px 6px}
  .opt{display:flex;gap:12px;align-items:flex-start;background:${t.card};border:1.5px solid ${t.border};border-radius:12px;padding:11px 12px;margin-bottom:10px}
  .opt .l{flex:none;width:28px;height:28px;border-radius:50%;border:1.5px solid ${t.textMuted};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85em;color:${t.textSoft}}
  .opt .ot{flex:1;min-width:0;overflow-wrap:anywhere}
  .opt.sel{border-color:${t.primary};background:${t.primarySoft}} .opt.sel .l{background:${t.primary};border-color:${t.primary};color:#fff}
  .opt.ok{border-color:#16a34a;background:${t.successSoft}} .opt.ok .l{background:#16a34a;border-color:#16a34a;color:#fff}
  .opt.bad{border-color:#dc2626;background:${t.dangerSoft}} .opt.bad .l{background:#dc2626;border-color:#dc2626;color:#fff}
  .tag{display:inline-block;margin-top:6px;font-size:.72em;font-weight:700;padding:1px 8px;border-radius:999px} .tag.ok{background:#16a34a;color:#fff} .tag.bad{background:#dc2626;color:#fff}
  .exp{margin-top:16px;background:${t.card};border:1px solid ${t.border};border-left:4px solid ${t.primary};border-radius:10px;padding:10px 12px;font-size:.93em}
  .exp b.h{display:block;color:${t.primary};margin-bottom:4px}
  .wm{position:fixed;inset:-50%;display:flex;flex-wrap:wrap;align-content:flex-start;gap:60px 90px;transform:rotate(-24deg);opacity:.06;pointer-events:none;z-index:9;font-size:13px;font-weight:600;color:${t.text}}
  mjx-container{max-width:100%;overflow-x:auto;overflow-y:hidden}
</style></head><body><div class="w">
${q.comprehension ? `<div class="pass"><b class="h">${esc(L.passage)}</b>${processQuestionHtml(q.comprehension)}</div>` : ''}
<div class="q">${processQuestionHtml(q.questionText || '')}${q.imageUrl ? `<div><img src="${esc(q.imageUrl)}"></div>` : ''}</div>
${options}
${q.review && q.review.explanation ? `<div class="exp"><b class="h">${esc(L.explanation)}</b>${processQuestionHtml(q.review.explanation)}</div>` : ''}
</div>
${q.watermark ? `<div class="wm">${Array.from({ length: 120 }, () => `<span>${esc(q.watermark || "")}</span>`).join('')}</div>` : ''}
<script>
  var review=${q.review ? 'true' : 'false'};
  function send(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); else if(window.parent!==window) window.parent.postMessage(JSON.stringify(m),'*'); }
  function pick(i){ if(review) return; send({type:'select',i:i}); }
  function setSel(i){ var o=document.querySelectorAll('.opt'); for(var k=0;k<o.length;k++){ o[k].classList.toggle('sel',k===i); } }
  document.addEventListener('contextmenu',function(e){e.preventDefault();});
</script></body></html>`;
}
