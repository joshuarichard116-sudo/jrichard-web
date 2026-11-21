/* Phase 5: seeded Nightmare generator. Run: node labs/talvex-firewall/tests/nightmare.test.js */
const assert = require('assert');
const { SIM, CLI, NMX } = require('./load')();
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const base = NMX.baseline();
const bad = st => NMX.health(st).filter(h => !h.ok).map(h => h.id);

t('the Nightmare baseline is healthy with no workarounds', () => {
  assert.deepEqual(bad(base), []); assert.deepEqual(NMX.workarounds(base), []);
});
t('only scenarios whose requirements the lab supports are in the pool; every other pack id is skipped with a reason', () => {
  for (const id of NMX.POOL) assert.ok(NMX.PACK[id].requires.every(r => NMX.CAPS.includes(r)), id);
  for (const id of Object.keys(NMX.SKIPPED)) { assert.ok(!NMX.POOL.includes(id), id); assert.ok(NMX.SKIPPED[id].length > 10, id + ' reason'); }
  assert.equal(NMX.POOL.length + Object.keys(NMX.SKIPPED).length, 56);
});
t('every adapter variant: inject breaks something, the fix heals, undo restores', () => {
  for (const id of NMX.POOL) for (const v of NMX.ADAPTERS[id]) {
    const st = SIM.clone(base), rec = v.inject(st, NMX.rng(7), 3) || {};
    assert.ok(bad(st).length, `${id}/${v.key} broke nothing`);
    const fx = SIM.clone(st); v.fix(fx, rec); assert.ok(NMX.healthy(fx), `${id}/${v.key} fix: ${bad(fx)}`);
    const un = SIM.clone(st); v.undo(un, rec); assert.ok(NMX.healthy(un), `${id}/${v.key} undo: ${bad(un)}`);
  }
});
t('every level generates solvable runs with the right fault counts, and do_not_stack_with holds both ways', () => {
  for (let lvl = 1; lvl <= 6; lvl++) for (let s = 1; s <= 12; s++) {
    const { run } = NMX.generate({ level: lvl, seed: s * 7919, base });
    const L = NMX.LEVELS[lvl], top = run.faults.filter(f => !f.chainAfter);
    assert.ok(top.length >= L.min && top.length <= L.max, `L${lvl} count ${top.length}`);
    if (lvl === 1) assert.equal(run.faults[0].fix_steps_count, 1);
    if (lvl < 4) { assert.equal(run.plan.masks_used, 0); assert.equal(run.plan.chains_used, 0); }
    for (const a of run.faults) for (const b of run.faults) if (a !== b) assert.ok(!NMX.PACK[a.id].do_not_stack_with.includes(b.id), `${a.id} with ${b.id}`);
    assert.equal(run.solvability_proof.undo, 'verified (idempotent)');
  }
});
t('the same seed replays the same faults, variants and noise', () => {
  const a = NMX.generate({ level: 4, seed: 4242, base }).run, b = NMX.generate({ level: 4, seed: 4242, base }).run;
  assert.deepEqual(a.faults.map(f => f.id + f.variant), b.faults.map(f => f.id + f.variant));
  assert.deepEqual(a.noise.map(x => x.text), b.noise.map(x => x.text));
});
t('a full run: reference fixes in layer order finish it, chains are revealed, debrief is complete', () => {
  for (const seed of [11, 22, 33]) {
    const { state: st, run } = NMX.generate({ level: 6, seed, base });
    for (let guard = 0; guard < 20 && run.status === 'open'; guard++) {
      const f = run.faults.filter(x => x.armed && x.state !== 'fixed').sort((a, b) => a.layer - b.layer)[0];
      if (f) NMX.adapter(f).fix(st, f.rec);
      NMX.evaluate(st, run); NMX.evaluate(st, run);
    }
    assert.equal(run.status, 'done', 'seed ' + seed);
    const prof = NMX.newProfile(), d = NMX.finish(st, run, prof, 'done');
    assert.ok(d.score.total > 0); assert.equal(d.faults.length, run.faults.length);
    assert.equal(prof.runs, 1);
  }
});
t('undoAll puts a broken lab back to the healthy baseline', () => {
  const { state: st, run } = NMX.generate({ level: 5, seed: 99, base });
  assert.ok(!NMX.healthy(st)); assert.ok(NMX.undoAll(st, run));
});
t('lockout faults block the GUI but the CLI console still works', () => {
  for (const id of NMX.LOCKOUT) for (const v of NMX.ADAPTERS[id]) {
    const st = SIM.clone(base), rec = v.inject(st, NMX.rng(3), 4) || {};
    assert.ok(!SIM.adminLogin(st, { user: 'jrichard', srcip: '10.10.10.20', srcintf: 'port2', method: 'https' }).ok, id);
    const sh = new CLI.Shell(() => st, () => {}); assert.ok(/hostname|Version/i.test(sh.exec('get system status')), id + ' console');
    void rec;
  }
});
t('debrief labels simulated bugs with a version, low-confidence items as community-reported, lockouts with the real-world note', () => {
  const { state: st, run } = NMX.generate({ level: 1, seed: 5, base });
  const d = NMX.finish(st, run, NMX.newProfile(), 'quit'), f = d.faults[0];
  if (NMX.SIMULATED.includes(f.id)) assert.ok(/Simulated version-specific bug \(.*\d/.test(f.simulated));
  if (NMX.LOW_CONFIDENCE.includes(f.id)) assert.ok(/Community-reported/.test(f.learn_more));
  for (const id of NMX.SIMULATED) for (const v of NMX.ADAPTERS[id]) assert.ok(v.sim && /\d+\.\d+/.test(v.sim.version), id);
});
t('FGOPS-019: threshold 1 keeps re-locking; fixing it from the console releases the PC within the new duration', () => {
  const v = NMX.ADAPTERS['FGOPS-019'][0], st = SIM.clone(base); v.inject(st, NMX.rng(1), 3);
  const login = now => SIM.adminLogin(st, { user: 'jrichard', srcip: '10.10.10.20', srcintf: 'port2', method: 'https', now });
  const t0 = Date.now();
  assert.ok(!login(t0).ok); assert.ok(!login(t0 + 300000).ok, 'stale password re-locks after expiry');
  const sh = new CLI.Shell(() => st, () => {});
  for (const l of ['config system global', 'set admin-lockout-threshold 3', 'set admin-lockout-duration 60', 'end']) sh.exec(l);
  assert.ok(!login(t0 + 300000 + 10000).ok, 'current lock still runs'); assert.ok(login(t0 + 300000 + 61000).ok, 'released after 60s');
});
console.log(`\n${n} tests passed`);
