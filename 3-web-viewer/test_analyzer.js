const assert = require('assert');
const analyzer = require('./analyzer.js');

const demoRaw = {
  schemaVersion: 1,
  isDemoData: true,
  servers: [
    { id: '1.2.3.4', country: 'PL', datacenter: 'OVH', ip: '1.2.3.4', label: 'PL · OVH' },
    { id: '2.3.4.5', country: 'DE', datacenter: 'Hetzner', ip: '2.3.4.5', label: 'DE · Hetzner' },
    { id: '3.4.5.6', country: 'NL', datacenter: 'Leaseweb', ip: '3.4.5.6', label: 'NL · Leaseweb' },
    { id: '4.5.6.7', country: 'UK', datacenter: 'DigitalOcean', ip: '4.5.6.7', label: 'UK · DigitalOcean' },
    { id: '5.6.7.8', country: 'USA-East', datacenter: 'OVH', ip: '5.6.7.8', label: 'USA-East · OVH' },
    { id: '6.7.8.9', country: 'USA-West', datacenter: 'DigitalOcean', ip: '6.7.8.9', label: 'USA-West · DigitalOcean' },
    { id: '7.8.9.10', country: 'BR', datacenter: 'AWS', ip: '7.8.9.10', label: 'BR · AWS' },
    { id: '8.9.10.11', country: 'SG', datacenter: 'Vultr', ip: '8.9.10.11', label: 'SG · Vultr' },
  ],
  matrix: {
    '5.6.7.8': {
      '1.2.3.4': { avg: 103.8, min: 103.0, max: 104.9, loss: 0 },
    },
  },
};
const data = analyzer.normalizeServerData(demoRaw);

assert.strictEqual(data.servers.length, 8);
assert.strictEqual(data.isDemoData, true);

// 1. Parse rich JSON from ping-servers.bat / ping-servers.php (including 0ms localhost-like value)
const richParsed = analyzer.parsePlayerPings(
  JSON.stringify({
    schemaVersion: 1,
    type: 'player-pings',
    tool: 'ping-servers.bat',
    pings: {
      '1.2.3.4': { avg: 0, min: 0, max: 0, loss: 0 },
      '5.6.7.8': { avg: 112, min: 110, max: 114, loss: 0 },
      '7.8.9.10': { avg: null, min: null, max: null, loss: 100 },
      '99.99.99.99': { avg: 50, min: 50, max: 50, loss: 0 },
    },
  }),
  data.servers
);
assert.strictEqual(richParsed.matchedCount, 3);
assert.strictEqual(richParsed.pings['1.2.3.4'].avg, 0);
assert.strictEqual(richParsed.pings['7.8.9.10'].loss, 100);
assert.deepStrictEqual(richParsed.unrecognizedKeys, ['99.99.99.99']);

// 2. Parse text / CSV formats
const textParsed = analyzer.parsePlayerPings(
  '1.2.3.4=240\n5.6.7.8: 115ms\nPL,OVH,4.5.6.7,195\n',
  data.servers
);
assert.strictEqual(textParsed.matchedCount, 3);
assert.strictEqual(textParsed.pings['1.2.3.4'].avg, 240);
assert.strictEqual(textParsed.pings['5.6.7.8'].avg, 115);
assert.strictEqual(textParsed.pings['4.5.6.7'].avg, 195);

// 3. Evaluate cell: BR player -> USA-East (115ms) -> PL (103.8ms) = 218.8ms vs direct 240ms => -21.2ms saved!
const cell = analyzer.evaluateCell(data, textParsed.pings, '5.6.7.8', '1.2.3.4', {
  metric: 'avg',
  thresholdMs: 5,
});
assert.strictEqual(cell.kind, 'compared');
assert.strictEqual(cell.totalViaProxyMs, 218.8);
assert.strictEqual(cell.deltaMs, -21.2);
assert.strictEqual(cell.improves, true);

// 4. Self diagonal
const selfCell = analyzer.evaluateCell(data, textParsed.pings, '1.2.3.4', '1.2.3.4');
assert.strictEqual(selfCell.kind, 'self');
assert.strictEqual(selfCell.deltaMs, 0);

// 5. Rescued connection (direct 100% loss, reachable via proxy)
const rescuedSummary = analyzer.summarizeByTarget(
  data,
  {
    '1.2.3.4': { avg: null, min: null, max: null, loss: 100 },
    '5.6.7.8': { avg: 115, min: 113, max: 118, loss: 0 },
  },
  { thresholdMs: 5 }
);
const plRow = rescuedSummary.rows.find((r) => r.target.ip === '1.2.3.4');
assert(plRow.best);
assert.strictEqual(plRow.best.proxy.ip, '5.6.7.8');
assert.strictEqual(plRow.best.cell.kind, 'rescued');
assert.strictEqual(rescuedSummary.stats.rescuedCount, 1);

// 6. Reverse direction fallback when proxy->target is missing
const asymData = analyzer.normalizeServerData({
  servers: [
    { ip: '10.0.0.1', country: 'A', datacenter: 'DC1' },
    { ip: '10.0.0.2', country: 'B', datacenter: 'DC2' },
  ],
  matrix: {
    '10.0.0.1': {},
    '10.0.0.2': { '10.0.0.1': { avg: 20, min: 19, max: 21, loss: 0 } },
  },
});
const revOn = analyzer.getServerPairMetric(asymData.matrix, '10.0.0.1', '10.0.0.2', 'avg', true);
assert.strictEqual(revOn.value, 20);
assert.strictEqual(revOn.isReverseFallback, true);
const revOff = analyzer.getServerPairMetric(asymData.matrix, '10.0.0.1', '10.0.0.2', 'avg', false);
assert.strictEqual(revOff.value, null);

// 7. Median metric
const medData = analyzer.normalizeServerData({
  servers: [
    { ip: '10.0.0.1', country: 'A', datacenter: 'DC1' },
    { ip: '10.0.0.2', country: 'B', datacenter: 'DC2' },
  ],
  matrix: {
    '10.0.0.1': { '10.0.0.2': { avg: 11.0, median: 4.0, min: 3.9, max: 39.0, loss: 0 } },
    '10.0.0.2': { '10.0.0.1': { avg: 4.0, median: 4.0, min: 3.9, max: 4.1, loss: 0 } },
  },
});
const medCell = analyzer.evaluateCell(
  medData,
  {
    '10.0.0.1': { avg: 25, median: 24, min: 23, loss: 0 },
    '10.0.0.2': { avg: 33, median: 32, min: 31, loss: 0 },
  },
  '10.0.0.1',
  '10.0.0.2',
  { metric: 'median', thresholdMs: 2 }
);
assert.strictEqual(medCell.totalViaProxyMs, 28);
assert.strictEqual(medCell.deltaMs, -4);

console.log('ALL ANALYZER TESTS PASSED');
