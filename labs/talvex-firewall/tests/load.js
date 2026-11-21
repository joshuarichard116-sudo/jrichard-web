/* Loads the lab's engine (every <script> block except the UI) into a Node vm, with no DOM.
   Usage: const { SIM, CLI, MISSIONS, LIVE, NIGHTMARE } = require('./load')(); */
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(file) {
  const html = fs.readFileSync(file || path.join(__dirname, '..', 'index.html'), 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(b => !/\/\* =+ UI =+ \*\//.test(b));
  const ctx = { console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, Date, Math, JSON };
  ctx.window = ctx; vm.createContext(ctx);
  const names = ['SIM', 'CLI', 'MISSIONS', 'LIVE', 'TELE', 'NIGHTMARE', 'CATS', 'NMX'];
  vm.runInContext(blocks.join('\n;\n') + `\n;this.__X = {${names.map(n => `${n}: typeof ${n} === 'undefined' ? null : ${n}`).join(', ')}};`, ctx, { filename: 'talvex-lab.js' });
  return ctx.__X;
};
