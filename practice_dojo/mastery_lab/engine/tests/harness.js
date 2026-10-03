// Logic harness: runs an artboard's Component class against the real engine (no DOM, no template rendering).
const fs = require('fs');
globalThis.window = globalThis;
require('./lab/lab.js');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const m = src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/);
class DCLogic { constructor(p) { this.props = p || {}; this.state = {}; } setState(u, cb) { const v = typeof u === 'function' ? u(this.state) : u; this.state = Object.assign({}, this.state, v); if (cb) cb(); } forceUpdate() {} }
const Component = new Function('DCLogic', 'React', m[1] + '\n;return Component;')(DCLogic, {});
// check every {{hole}} in the template resolves
const tpl = src.slice(src.indexOf('<x-dc>'), src.lastIndexOf('</x-dc>'));
const holes = [...new Set([...tpl.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(x => x[1]))];
const c = new Component({});
c.componentDidMount && c.componentDidMount();
const script = (process.argv[3] || '').split('§').filter(Boolean);
const lookup = (vals, path) => path.split('.').reduce((o, k) => o == null ? o : o[k], vals);
function check(label) {
  const vals = c.renderVals();
  const scopes = { top: vals };
  // loop variables: find <sc-for list="{{x}}" as="y">
  const loops = [...tpl.matchAll(/<sc-for list="\{\{\s*([\w.]+)\s*\}\}" as="(\w+)"/g)].map(x => ({ list: x[1], as: x[2] }));
  const missing = [];
  for (const h of holes) {
    if (/^(true|false|\d+)$/.test(h)) continue;
    const head = h.split('.')[0];
    const loop = loops.find(l => l.as === head);
    if (loop) {
      const arr = lookup(vals, loop.list) || (() => { for (const l2 of loops) { const outer = lookup(vals, l2.list); if (Array.isArray(outer)) for (const o of outer) { const v = lookup({ [l2.as]: o }, loop.list); if (Array.isArray(v)) return v; } } return null; })();
      if (!Array.isArray(arr)) { missing.push(h + ' (loop ' + loop.list + ' not array)'); continue; }
      if (arr.length && arr.every(it => lookup({ [head]: it }, h) === undefined)) missing.push(h);
      continue;
    }
    if (h === '$index') continue;
    if (lookup(vals, h) === undefined) missing.push(h);
  }
  console.log(`[${label}] holes ${holes.length}, unresolved: ${missing.length ? missing.join(', ') : 'none'}`);
  return vals;
}
(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  await wait(50);
  check('mount');
  for (const step of script) {
    if (step.startsWith('wait')) { await wait(+step.slice(4)); continue; }
    if (step.startsWith('eval:')) { const v = c.renderVals(); new Function('c', 'v', step.slice(5))(c, v); continue; }
  }
  const v = check('end');
  if (process.env.DUMP) console.log(JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x, 1).slice(0, +process.env.DUMP));
  process.exit(0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
