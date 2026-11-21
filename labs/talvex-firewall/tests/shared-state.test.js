/* Phase 3: one config, everything follows it. Run: node labs/talvex-firewall/tests/shared-state.test.js */
const assert = require('assert');
const { SIM, CLI, MISSIONS } = require('./load')();
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const run = (st, text) => { const sh = new CLI.Shell(() => st, () => {}); for (const l of text.trim().split('\n')) sh.exec(l.trim()); };
const mis = id => MISSIONS.find(m => m.id === id);
const pass = (st, id) => mis(id).check(st).every(x => x.ok);

t('a route change moves Policy Lookup and hit counts', () => {
  const st = SIM.seed(), q = { srcintf: 'port2', srcip: '10.10.10.20', dstip: '8.8.8.8', proto: 'tcp', port: 443 };
  let R = SIM.lookup(st, q); assert.equal(R.verdict, 'accept'); assert.equal(R.egress, 'port1');
  const hits = st.policies.find(p => p.id === R.policyId).hits, logs = st.logs.traffic.length;
  SIM.record(st, q, R); assert.equal(st.policies.find(p => p.id === R.policyId).hits, hits + 1);
  run(st, 'config router static\nedit 1\nset status disable\nnext\nend');
  R = SIM.lookup(st, q); assert.equal(R.verdict, 'deny'); assert.match(R.reason, /no route/);
  SIM.record(st, q, R); assert.equal(st.logs.traffic.length, logs, 'a no-route drop never reaches a policy, so the forward log stays quiet (as on FortiOS)');
});
t('a policy change moves Policy Lookup and the matching policy', () => {
  const st = SIM.seed(); run(st, 'config firewall policy\nedit 3\nset status disable\nnext\nend');
  const R = SIM.lookup(st, { srcintf: 'port2', srcip: '10.10.10.30', dstip: '8.8.8.8', proto: 'tcp', port: 443 });
  assert.equal(R.policyId, 1, 'policy 1 now catches it, and it still shadows Printer-Block (2) below it'); assert.equal(R.verdict, 'accept');
});
t('the Recon answer for "the rule that eats everything" follows the hit counts', () => {
  const st = SIM.seed(); st.answers.r3 = '3'; assert.ok(pass(st, 'r3'));
  st.policies.find(p => p.id === 1).hits = 999999; assert.ok(!pass(st, 'r3')); st.answers.r3 = '1'; assert.ok(pass(st, 'r3'));
});
t('trusted hosts decide who can log in, per account, through the same lookup', () => {
  const st = SIM.seed();
  assert.ok(SIM.adminLogin(st, { user: 'admin', srcip: '185.220.101.47' }).ok, 'WAN HTTPS is open at the start: the 3 AM login');
  run(st, 'config system interface\nedit port1\nset allowaccess ping\nnext\nend');
  const r = SIM.adminLogin(st, { user: 'admin', srcip: '185.220.101.47' }); assert.ok(!r.ok); assert.equal(r.stage, 'network');
  run(st, 'config system admin\nedit admin\nset trusthost1 10.10.10.0 255.255.255.0\nnext\nend');
  assert.ok(!SIM.adminLogin(st, { user: 'admin', srcip: '10.20.0.15', srcintf: 'port2', dstip: '10.10.10.1' }).ok);
  assert.ok(SIM.adminLogin(st, { user: 'admin', srcip: '10.10.10.20' }).ok);
});
t('an admin profile is what an account can do', () => {
  const st = SIM.seed();
  run(st, 'config system accprofile\nedit helpdesk\nset fwgrp read\nset loggrp read\nnext\nend\nconfig system admin\nedit helpdesk-user\nset accprofile helpdesk\nset password Hd-Lab-Pass-2026\nset trusthost1 10.10.10.0 255.255.255.0\nnext\nend');
  assert.ok(SIM.adminCan(st, 'helpdesk-user', 'fwgrp', 'read')); assert.ok(!SIM.adminCan(st, 'helpdesk-user', 'fwgrp', 'read-write'));
  assert.ok(pass(st, 'm2'));
  run(st, 'config system accprofile\nedit helpdesk\nset fwgrp read-write\nnext\nend'); assert.ok(!pass(st, 'm2'), 'widening the profile breaks least privilege');
});
t('syslog only counts when the collector is really reachable', () => {
  const st = SIM.seed();
  run(st, 'config log syslogd setting\nset status enable\nset server 10.10.10.50\nset port 514\nset mode udp\nset severity information\nend');
  assert.ok(SIM.syslog(st).ok); assert.ok(pass(st, 'm1'));
  run(st, 'config system interface\nedit port2\nset status down\nnext\nend');
  assert.ok(!SIM.syslog(st).ok, 'LAN down: no route to FS01'); assert.ok(!pass(st, 'm1'));
});
t('bringing the tunnel up changes the Azure view of the connection', () => {
  const { NIGHTMARE } = require('./load')();
  const st = NIGHTMARE.baseline(); assert.equal(SIM.azConn(st).status, 'Connected');
  st.vpn.phase1[0].status = 'disable'; assert.notEqual(SIM.azConn(st).status, 'Connected');
});
t('live threats start from the config that exists, not from a ticked-off mission', () => {
  const { SIM: S2, CLI: C2, LIVE } = require('./load')();
  const st = S2.seed(); const sh = new C2.Shell(() => st, () => {});
  assert.ok(!st.missions.n4, 'mission never marked done');
  for (const l of 'config system interface\nedit ENG-VLAN20\nset vdom root\nset interface port2\nset vlanid 20\nset ip 10.20.0.1 255.255.255.0\nset role lan\nset alias ENG\nset allowaccess ping\nnext\nend'.split('\n')) sh.exec(l);
  LIVE.start(st, {}); LIVE.stop();
  assert.ok(st.threats['t-lateral'] && st.threats['t-lateral'].active, 'the kiosk probe starts once ENG-VLAN20 exists');
});
console.log(`${n} passed`);
