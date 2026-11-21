/* Phase 4: categories, difficulty, state-based locks and auto-configure. Run: node labs/talvex-firewall/tests/categories.test.js */
const assert = require('assert');
const { SIM, CLI, MISSIONS, CATS } = require('./load')();
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('every mission is in exactly one category, with a difficulty', () => {
  const seen = {};
  for (const c of CATS.LIST) for (const id of c.missions) { assert.ok(!seen[id], id + ' twice'); seen[id] = c.name; }
  for (const m of MISSIONS) { assert.ok(seen[m.id], m.id + ' has no category'); assert.ok(CATS.LEVELS.includes(m.difficulty), m.id + ' difficulty'); assert.equal(m.tier, seen[m.id]); }
  assert.equal(Object.keys(seen).length, MISSIONS.length);
});
t('on a fresh lab, only categories with no config prerequisites are open', () => {
  const st = SIM.seed();
  const locked = CATS.LIST.filter(c => CATS.locked(st, c.name)).map(c => c.name);
  assert.deepEqual(locked, CATS.LIST.filter(c => c.needs.length).map(c => c.name));
});
t('locks follow the config, not clicks: building the DMZ by CLI clears that requirement', () => {
  const st = SIM.seed(); assert.ok(CATS.missing(st, 'Firewall policies').includes('dmz'));
  const sh = new CLI.Shell(() => st, () => {}); for (const l of MISSIONS.find(m => m.id === 'n3').cli.split('\n')) sh.exec(l.trim());
  assert.ok(!CATS.missing(st, 'Firewall policies').includes('dmz')); assert.ok(!st.missions.n3, 'no mission flag involved');
});
for (const c of CATS.LIST.filter(c => c.needs.length)) t(`auto-configure unlocks "${c.name}" from a fresh lab`, () => {
  const st = SIM.seed(), r = CATS.autoconfigure(st, c.name);
  assert.deepEqual(r.errors, []); assert.ok(r.ok, 'still missing: ' + CATS.missing(st, c.name).join(', '));
  for (const id of r.skipped) { assert.ok(st.missions[id].skipped); assert.ok(!st.missions[id].done); }
  const p = CATS.progress(st); assert.equal(p.done, 0, 'skipped missions never count as done');
});
t('auto-configure leaves config that is already right alone, and does not skip missions already done', () => {
  const st = SIM.seed(); const sh = new CLI.Shell(() => st, () => {}); for (const l of MISSIONS.find(m => m.id === 'n4').cli.split('\n')) sh.exec(l.trim());
  st.missions.n4 = { done: Date.now(), hints: 0 };
  const r = CATS.autoconfigure(st, 'Firewall policies'); assert.ok(!r.applied.includes('engvlan')); assert.ok(!r.skipped.includes('n4'));
});
console.log(`${n} passed`);
