// Puts MathJax (maths in questions) inside the APK, so formulas show without internet:
// android/app/src/main/assets/mathjax/tex-svg-full.js, loaded by the question view as
// file:///android_asset/mathjax/tex-svg-full.js. SVG output needs no font files.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

module.exports = function withMathJax(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const src = require.resolve('mathjax/es5/tex-svg-full.js', { paths: [cfg.modRequest.projectRoot] });
    const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', 'mathjax');
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, path.join(dir, 'tex-svg-full.js'));
    return cfg;
  }]);
};
