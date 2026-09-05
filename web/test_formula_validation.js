const { evaluateTyping } = require('../web/app/lib/typingTypes.ts');

const passage = 'In the year 2025 a very big and beautiful change has come to the public libraries across India for a long time many libraries were just old buildings with dusty books but now they have been turned into modern knowledge centers for everyone in the country and beyond that point in time.';

const cfg = (slug) => ({ id: 'x', title: `Test ${slug}`, slug });
const run = (slug, typed, label) => {
  const r = evaluateTyping(passage, typed, 10, 0, 35, 7, false, cfg(slug), false, false, false, 'en', 'UR');
  return r;
};

const typed = 'In the year 2025 a very big and beautiful change has come to the public libraries across India for a long time many libraries were just old buildings';

// Test 1: KVS JSA (STANDARD_NET_SPEED) - should use DIRECT deduction, no 10x penalty
const kvs = run('kvs-jsa-typing', typed, 'KVS JSA');
console.log('=== KVS JSA (STANDARD_NET_SPEED) ===');
console.log(`Gross Words: ${kvs.grossWpm * 10} | Total Mistakes: ${kvs.totalMistakes} | Net WPM: ${kvs.netWpm}`);
console.log(`Category badge: ${kvs.categoryEvaluation.evaluationBadge}`);
console.log(`Breakdown labels: ${kvs.categoryEvaluation.criteriaBreakdown.map(c => c.label).join(', ')}`);
// Verify: penalty/10x words should NOT appear
const hasWrongPenalty = kvs.categoryEvaluation.criteriaBreakdown.some(c => c.label.includes('Penalty') || c.label.includes('Permissible'));
console.log(`PASS (no penalty in KVS breakdown): ${!hasWrongPenalty}`);

// Test 2: RRB NTPC (RRB_NTPC_PENALTY) - should use 5% ignorable + 10x penalty
const rrb = run('rrb-ntpc-typing', typed, 'RRB NTPC');
console.log('\n=== RRB NTPC (RRB_NTPC_PENALTY) ===');
console.log(`Net WPM: ${rrb.netWpm}`);
console.log(`Badge: ${rrb.categoryEvaluation.evaluationBadge}`);
const hasPermissible = rrb.categoryEvaluation.criteriaBreakdown.some(c => c.label.includes('Ignorable') || c.label.includes('Permissible'));
console.log(`PASS (has Ignorable/Permissible in RRB breakdown): ${hasPermissible}`);

// Test 3: Chandigarh Admin (CHANDIGARH_ADMIN_FULL_ERRORS) - all errors as full
const chan = run('chandigarh-administration-clerk-typing', typed, 'Chandigarh Admin');
console.log('\n=== Chandigarh Admin (CHANDIGARH_ADMIN_FULL_ERRORS) ===');
console.log(`Net WPM: ${chan.netWpm}`);
console.log(`Half Errors: ${chan.halfMistakes} (should be 0 for Chandigarh)`);
console.log(`Badge: ${chan.categoryEvaluation.evaluationBadge}`);
console.log(`PASS (half = 0): ${chan.halfMistakes === 0}`);

// Test 4: SSC CHSL (SSC_CHSL_NET) - error% uses PASSAGE words as denominator
const chsl = run('ssc-chsl-typing', typed, 'SSC CHSL');
console.log('\n=== SSC CHSL (SSC_CHSL_NET) ===');
console.log(`Net WPM: ${chsl.netWpm}`);
console.log(`Error %: ${chsl.errorPercentage} (should use PASSAGE words as denominator)`);
console.log(`Badge: ${chsl.categoryEvaluation.evaluationBadge}`);

// Test 5: AIIMS CRE (AIIMS_CRE_STROKES) - keystroke-based with 50-stroke penalty  
const aiims = run('aiims-cre-ldc-udc-deo-typing', typed, 'AIIMS CRE');
console.log('\n=== AIIMS CRE (AIIMS_CRE_STROKES) ===');
console.log(`Penalty Strokes: ${aiims.aiimsPenaltyStrokes}`);
console.log(`Net WPM: ${aiims.aiimsNetWpm}`);
console.log(`Badge: ${aiims.categoryEvaluation.evaluationBadge}`);

// Test 6: SSC CGL (SSC_CGL_DEST) - Net speed and Error % using passage denominator
const cgl = run('ssc-cgl-typing', typed, 'SSC CGL');
console.log('\n=== SSC CGL (SSC_CGL_DEST) ===');
console.log(`Net WPM: ${cgl.netWpm}`);
console.log(`Error %: ${cgl.errorPercentage} (should use PASSAGE words as denominator)`);
console.log(`Badge: ${cgl.categoryEvaluation.evaluationBadge}`);

// Test 7: DSSSB JSA (DSSSB_JSA_PENALTY) - all errors full, 2-word penalty
const dsssb = run('dsssb-jsa-typing', typed, 'DSSSB JSA');
console.log('\n=== DSSSB JSA ===');
console.log(`Net WPM: ${dsssb.netWpm}`);
console.log(`Half Errors: ${dsssb.halfMistakes} (should be 0 for DSSSB)`);
console.log(`Penalty Words: ${dsssb.penalty} (should be totalErrors * 2)`);
console.log(`Badge: ${dsssb.categoryEvaluation.evaluationBadge}`);
console.log(`PASS (half = 0): ${dsssb.halfMistakes === 0}`);

// Test 8: EMRS JSA - all errors full, 1x error deduction
const emrs = run('emrs-jsa-typing', typed, 'EMRS JSA');
console.log('\n=== EMRS JSA ===');
console.log(`Net WPM: ${emrs.netWpm}`);
console.log(`Half Errors: ${emrs.halfMistakes} (should be 0 for EMRS)`);
console.log(`Badge: ${emrs.categoryEvaluation.evaluationBadge}`);
console.log(`PASS (half = 0): ${emrs.halfMistakes === 0}`);

// Test 9: NVS JSA - all errors full, 1x error deduction
const nvs = run('nvs-jsa-typing', typed, 'NVS JSA');
console.log('\n=== NVS JSA ===');
console.log(`Net WPM: ${nvs.netWpm}`);
console.log(`Half Errors: ${nvs.halfMistakes} (should be 0 for NVS)`);
console.log(`Badge: ${nvs.categoryEvaluation.evaluationBadge}`);
console.log(`PASS (half = 0): ${nvs.halfMistakes === 0}`);

// Test 10: CSIR JSA - 5% ignorable, excess × 10-word penalty
const csir = run('csir-jsa-typing', typed, 'CSIR JSA');
console.log('\n=== CSIR JSA ===');
console.log(`Net WPM: ${csir.netWpm}`);
console.log(`Half Errors: ${csir.halfMistakes} (should be 0 for CSIR)`);
console.log(`Badge: ${csir.categoryEvaluation.evaluationBadge}`);
console.log(`PASS (half = 0): ${csir.halfMistakes === 0}`);

console.log('\n✅ All formula checks complete');

