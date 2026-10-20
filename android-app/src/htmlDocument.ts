import type { Theme } from './theme';

// The page that shows formatted content (notices, questions) inside the app.
export function htmlDocument(body: string, t: Theme, extraCss = '', extraHead = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  html,body{margin:0;padding:0;background:transparent;color:${t.text};font-family:-apple-system,Roboto,'Noto Sans','Noto Sans Devanagari',sans-serif;font-size:15px;line-height:1.55;word-wrap:break-word;overflow-wrap:anywhere}
  a{color:${t.primary}} img{max-width:100%;height:auto} table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13px;display:block;overflow-x:auto}
  td,th{border:1px solid ${t.border};padding:6px;vertical-align:top} th{background:${t.cardAlt}} p{margin:0 0 8px} h1,h2,h3,h4{line-height:1.3;margin:12px 0 6px}
  ul,ol{padding-left:20px} pre{white-space:pre-wrap}
  ${extraCss}
</style>${extraHead}</head><body><div id="c">${body}</div>
<script>
  function h(){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({h: document.getElementById('c').scrollHeight + 4})); }
  window.addEventListener('load', h); new ResizeObserver(h).observe(document.getElementById('c')); setTimeout(h, 300); setTimeout(h, 1200);
</script></body></html>`;
}
