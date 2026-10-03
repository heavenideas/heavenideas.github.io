// Runs every plugins/tests/*.test.js with node and reports. Exit code 1 if any fail.
//   node practice_dojo/plugins/tests/run.js
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let failed = 0;
for (const f of files) {
    const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
    const ok = r.status === 0;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}`);
    if (!ok) console.log((r.stdout || '') + (r.stderr || ''));
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
