const fs = require('fs');
const css = fs.readFileSync('ssc test_files/test-style.a1b920d8786345436201eeca4ef16fd019efec97e90.css', 'utf8');

const targets = ['section-box'];
const rules = css.split('}');

for (const rule of rules) {
  const lowerRule = rule.toLowerCase();
  for (const target of targets) {
    if (lowerRule.includes(target)) {
      console.log(`/* Target: ${target} */\n${rule.trim()}}\n`);
      break;
    }
  }
}
