const fs = require('fs');
const content = fs.readFileSync('ssc design.html', 'utf8');

// Find all <style> blocks
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let match;
let output = '';
while ((match = styleRegex.exec(content)) !== null) {
  output += match[1] + '\n';
}
fs.writeFileSync('scratch/all_styles.css', output, 'utf8');
console.log('Done, wrote ' + output.length + ' characters.');
