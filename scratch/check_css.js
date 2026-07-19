const fs = require('fs');
const css = fs.readFileSync('scratch/all_styles.css', 'utf8');
console.log('Includes tb-main-header:', css.includes('tb-main-header'));
console.log('Includes newSsc:', css.includes('newSsc'));
console.log('Includes section-box:', css.includes('section-box'));
console.log('Length of css:', css.length);
