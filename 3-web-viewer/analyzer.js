(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProxyAnalyzer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isFiniteNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function toRounded(v, decimals) {
    if (!isFiniteNum(v)) return null;
    var factor = Math.pow(10, decimals == null ? 1 : decimals);
    return Math.round(v * factor) / factor;
  }

  function normalizeServerData(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.servers)) {
      throw new Error('Nieprawidłowy format JSON serwerów (brak tablicy "servers").');
    }
    if (!raw.matrix || typeof raw.matrix !== 'object') {
      throw new Error('Nieprawidłowy format JSON serwerów (brak obiektu "matrix").');
    }

    var servers = raw.servers
      .filter(function (s) {
        return s && (s.ip || s.id);
      })
      .map(function (s) {
        var ip = String(s.ip || s.id).trim();
        var country = String(s.country || '').trim();
        var datacenter = String(s.datacenter || '').trim();
        var label = String(s.label || '').trim();
        if (!label) {
          label = [country, datacenter].filter(Boolean).join(' · ') || ip;
        }
        return {
          id: String(s.id || ip).trim(),
          ip: ip,
          country: country,
          datacenter: datacenter,
          label: label,
          sshStatus: s.sshStatus || 'ok',
          sshError: s.sshError || null,
        };
      });

    return {
      schemaVersion: raw.schemaVersion || 1,
      isDemoData: Boolean(raw.isDemoData),
      generatedAt: raw.generatedAt || null,
      pingConfig: raw.pingConfig || null,
      servers: servers,
      matrix: raw.matrix,
    };
  }

  function extractPingValue(rawVal) {
    if (rawVal === null || rawVal === undefined) {
      return { avg: null, min: null, max: null, loss: 100 };
    }
    if (typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal >= 0) {
      return { avg: rawVal, min: rawVal, max: rawVal, loss: 0 };
    }
    if (typeof rawVal === 'string') {
      var trimmed = rawVal.trim().toLowerCase();
      if (trimmed === '' || trimmed === 'null' || trimmed === 'timeout' || trimmed === 'none' || trimmed === '-') {
        return { avg: null, min: null, max: null, loss: 100 };
      }
      var num = parseFloat(trimmed.replace(/ms$/i, '').trim());
      if (Number.isFinite(num) && num >= 0) {
        return { avg: num, min: num, max: num, loss: 0 };
      }
      return null;
    }
    if (typeof rawVal === 'object') {
      var avg = isFiniteNum(rawVal.avg) ? rawVal.avg : null;
      var median = isFiniteNum(rawVal.median) ? rawVal.median : avg;
      var min = isFiniteNum(rawVal.min) ? rawVal.min : avg;
      var max = isFiniteNum(rawVal.max) ? rawVal.max : avg;
      var loss = isFiniteNum(rawVal.loss) ? rawVal.loss : avg === null ? 100 : 0;
      if (avg === null && min !== null) avg = min;
      return { avg: avg, median: median, min: min, max: max, loss: loss };
    }
    return null;
  }

  function parsePlayerPings(rawText, servers) {
    var text = String(rawText || '').trim();
    if (!text) {
      return {
        pings: {},
        matchedCount: 0,
        totalKnown: servers.length,
        unrecognizedKeys: [],
        format: 'empty',
        error: null,
      };
    }

    var knownIps = {};
    servers.forEach(function (s) {
      knownIps[s.ip] = true;
    });

    var rawMap = null;
    var format = 'text';

    if (text[0] === '{') {
      try {
        var parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          if (parsed.pings && typeof parsed.pings === 'object' && !Array.isArray(parsed.pings)) {
            rawMap = parsed.pings;
            format = parsed.tool ? String(parsed.tool) : 'json-pings';
          } else if (parsed.results && typeof parsed.results === 'object' && !Array.isArray(parsed.results)) {
            rawMap = parsed.results;
            format = 'json-results';
          } else if (!Array.isArray(parsed)) {
            rawMap = parsed;
            format = 'json-flat';
          }
        }
      } catch (e) {
        return {
          pings: {},
          matchedCount: 0,
          totalKnown: servers.length,
          unrecognizedKeys: [],
          format: 'invalid-json',
          error: 'Niepoprawny JSON: ' + e.message,
        };
      }
    } else {
      rawMap = {};
      var lines = text.split(/\r?\n/);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line[0] === '#' || line[0] === ';') continue;

        // Format: "PL,OVH,1.2.3.4,24" or "1.2.3.4,24"
        if (line.indexOf(',') !== -1 && line.indexOf('=') === -1) {
          var cols = line.split(',').map(function (c) {
            return c.trim();
          });
          if (cols.length >= 2) {
            var lastVal = cols[cols.length - 1];
            var candidateIp = cols.length >= 3 && knownIps[cols[2]] ? cols[2] : cols[0];
            if (/^[A-Za-z0-9._:-]+$/.test(candidateIp)) {
              rawMap[candidateIp] = lastVal;
              continue;
            }
          }
        }

        // Format: "1.2.3.4=24", "1.2.3.4: 24ms", "2001:db8::1: 24ms", "1.2.3.4 24"
        var m =
          line.match(/^([A-Za-z0-9._:-]+)\s*=\s*(.+)$/) ||
          line.match(/^([A-Za-z0-9._:-]+?):\s+(.+)$/) ||
          line.match(/^([A-Za-z0-9._:-]+)\s+(.+)$/);
        if (m) {
          rawMap[m[1].trim()] = m[2].trim();
        }
      }
    }

    if (!rawMap) {
      return {
        pings: {},
        matchedCount: 0,
        totalKnown: servers.length,
        unrecognizedKeys: [],
        format: 'unknown',
        error: 'Nie udało się rozpoznać formatu danych pingu.',
      };
    }

    var pings = {};
    var unrecognizedKeys = [];
    var keys = Object.keys(rawMap);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k].trim();
      if (key === 'schemaVersion' || key === 'type' || key === 'tool' || key === 'generatedAt') continue;
      var entry = extractPingValue(rawMap[keys[k]]);
      if (!entry) continue;
      if (knownIps[key]) {
        pings[key] = entry;
      } else {
        unrecognizedKeys.push(key);
      }
    }

    var matchedCount = Object.keys(pings).length;
    return {
      pings: pings,
      matchedCount: matchedCount,
      totalKnown: servers.length,
      unrecognizedKeys: unrecognizedKeys,
      format: format,
      error: matchedCount === 0 ? 'Nie znaleziono żadnych pasujących adresów IP z listy serwerów.' : null,
    };
  }

  function readMetricValue(entry, metric) {
    if (!entry || typeof entry !== 'object') return null;
    if (metric === 'median' && isFiniteNum(entry.median)) return entry.median;
    if (metric === 'min' && isFiniteNum(entry.min)) return entry.min;
    if (metric === 'max' && isFiniteNum(entry.max)) return entry.max;
    if (isFiniteNum(entry.avg)) return entry.avg;
    if (isFiniteNum(entry.min)) return entry.min;
    return null;
  }

  function getServerPairMetric(matrix, fromIp, toIp, metric, allowReverseFallback) {
    if (fromIp === toIp) {
      return {
        value: 0,
        avg: 0,
        min: 0,
        max: 0,
        mdev: 0,
        loss: 0,
        isReverseFallback: false,
      };
    }

    var directEntry = matrix && matrix[fromIp] ? matrix[fromIp][toIp] : null;
    var directVal = readMetricValue(directEntry, metric);
    if (isFiniteNum(directVal)) {
      return {
        value: directVal,
        avg: isFiniteNum(directEntry.avg) ? directEntry.avg : directVal,
        min: isFiniteNum(directEntry.min) ? directEntry.min : directVal,
        max: isFiniteNum(directEntry.max) ? directEntry.max : directVal,
        mdev: isFiniteNum(directEntry.mdev) ? directEntry.mdev : null,
        loss: isFiniteNum(directEntry.loss) ? directEntry.loss : 0,
        isReverseFallback: false,
      };
    }

    if (allowReverseFallback) {
      var revEntry = matrix && matrix[toIp] ? matrix[toIp][fromIp] : null;
      var revVal = readMetricValue(revEntry, metric);
      if (isFiniteNum(revVal)) {
        return {
          value: revVal,
          avg: isFiniteNum(revEntry.avg) ? revEntry.avg : revVal,
          min: isFiniteNum(revEntry.min) ? revEntry.min : revVal,
          max: isFiniteNum(revEntry.max) ? revEntry.max : revVal,
          mdev: isFiniteNum(revEntry.mdev) ? revEntry.mdev : null,
          loss: isFiniteNum(revEntry.loss) ? revEntry.loss : 0,
          isReverseFallback: true,
        };
      }
    }

    return {
      value: null,
      avg: null,
      min: null,
      max: null,
      mdev: null,
      loss: directEntry && isFiniteNum(directEntry.loss) ? directEntry.loss : null,
      isReverseFallback: false,
    };
  }

  function readPlayerMetric(playerPings, ip, metric) {
    if (!playerPings || !playerPings[ip]) return null;
    var p = playerPings[ip];
    if (metric === 'median' && isFiniteNum(p.median)) return p.median;
    if (metric === 'min' && isFiniteNum(p.min)) return p.min;
    if (isFiniteNum(p.avg)) return p.avg;
    if (isFiniteNum(p.min)) return p.min;
    return null;
  }

  function normalizeMetricName(m) {
    if (m === 'min' || m === 'median') return m;
    return 'avg';
  }

  function evaluateCell(serverData, playerPings, proxyIp, targetIp, options) {
    var opts = options || {};
    var metric = normalizeMetricName(opts.metric);
    var allowReverse = opts.allowReverseFallback !== false;
    var threshold = isFiniteNum(opts.thresholdMs) ? opts.thresholdMs : 5;

    var hasPlayer = Boolean(playerPings && Object.keys(playerPings).length > 0);
    var playerToProxyMs = hasPlayer ? readPlayerMetric(playerPings, proxyIp, metric) : null;
    var directToTargetMs = hasPlayer ? readPlayerMetric(playerPings, targetIp, metric) : null;
    var directEntry = hasPlayer && playerPings[targetIp] ? playerPings[targetIp] : null;
    var proxyEntry = hasPlayer && playerPings[proxyIp] ? playerPings[proxyIp] : null;

    if (proxyIp === targetIp) {
      return {
        kind: 'self',
        proxyIp: proxyIp,
        targetIp: targetIp,
        playerToProxyMs: directToTargetMs,
        proxyToTargetMs: 0,
        directToTargetMs: directToTargetMs,
        totalViaProxyMs: directToTargetMs,
        deltaMs: 0,
        deltaPct: 0,
        proxyToTargetLoss: 0,
        mdev: 0,
        isReverseFallback: false,
        improves: false,
        slightlyImproves: false,
      };
    }

    var s2s = getServerPairMetric(serverData.matrix, proxyIp, targetIp, metric, allowReverse);

    if (!hasPlayer) {
      return {
        kind: isFiniteNum(s2s.value) ? 's2s_only' : 'unavailable',
        proxyIp: proxyIp,
        targetIp: targetIp,
        playerToProxyMs: null,
        proxyToTargetMs: s2s.value,
        directToTargetMs: null,
        totalViaProxyMs: null,
        deltaMs: null,
        deltaPct: null,
        proxyToTargetLoss: s2s.loss,
        mdev: s2s.mdev,
        isReverseFallback: s2s.isReverseFallback,
        improves: false,
        slightlyImproves: false,
      };
    }

    if (!isFiniteNum(s2s.value) || !isFiniteNum(playerToProxyMs)) {
      return {
        kind: 'unavailable',
        proxyIp: proxyIp,
        targetIp: targetIp,
        playerToProxyMs: playerToProxyMs,
        proxyToTargetMs: s2s.value,
        directToTargetMs: directToTargetMs,
        totalViaProxyMs: null,
        deltaMs: null,
        deltaPct: null,
        proxyToTargetLoss: s2s.loss,
        mdev: s2s.mdev,
        isReverseFallback: s2s.isReverseFallback,
        improves: false,
        slightlyImproves: false,
      };
    }

    var totalViaProxy = toRounded(playerToProxyMs + s2s.value, 1);

    // Direct connection timed out (100% loss), but proxy restores connectivity!
    if (!isFiniteNum(directToTargetMs)) {
      var rescued = directEntry && directEntry.loss === 100 && (!proxyEntry || proxyEntry.loss < 100);
      return {
        kind: rescued ? 'rescued' : 'no_direct',
        proxyIp: proxyIp,
        targetIp: targetIp,
        playerToProxyMs: playerToProxyMs,
        proxyToTargetMs: s2s.value,
        directToTargetMs: null,
        totalViaProxyMs: totalViaProxy,
        deltaMs: null,
        deltaPct: null,
        proxyToTargetLoss: s2s.loss,
        mdev: s2s.mdev,
        isReverseFallback: s2s.isReverseFallback,
        improves: Boolean(rescued),
        slightlyImproves: false,
      };
    }

    var delta = toRounded(totalViaProxy - directToTargetMs, 1);
    var deltaPct = directToTargetMs > 0 ? toRounded((delta / directToTargetMs) * 100, 1) : 0;

    return {
      kind: 'compared',
      proxyIp: proxyIp,
      targetIp: targetIp,
      playerToProxyMs: playerToProxyMs,
      proxyToTargetMs: s2s.value,
      directToTargetMs: directToTargetMs,
      totalViaProxyMs: totalViaProxy,
      deltaMs: delta,
      deltaPct: deltaPct,
      proxyToTargetLoss: s2s.loss,
      mdev: s2s.mdev,
      isReverseFallback: s2s.isReverseFallback,
      improves: delta <= -threshold,
      slightlyImproves: delta < 0 && delta > -threshold,
    };
  }

  function summarizeByTarget(serverData, playerPings, options) {
    var opts = options || {};
    var metric = normalizeMetricName(opts.metric);
    var threshold = isFiniteNum(opts.thresholdMs) ? opts.thresholdMs : 5;
    var servers = serverData.servers || [];
    var hasPlayer = Boolean(playerPings && Object.keys(playerPings).length > 0);

    var serverByIp = {};
    servers.forEach(function (s) {
      serverByIp[s.ip] = s;
    });

    var rows = [];
    var profitableProxySet = {};
    var bestByTargetIp = {};
    var improvedCount = 0;
    var anyGainCount = 0;
    var rescuedCount = 0;
    var bestOverall = null;

    servers.forEach(function (target) {
      var directMs = hasPlayer ? readPlayerMetric(playerPings, target.ip, metric) : null;
      var directLoss =
        hasPlayer && playerPings[target.ip] && isFiniteNum(playerPings[target.ip].loss)
          ? playerPings[target.ip].loss
          : null;

      var candidates = [];
      servers.forEach(function (proxy) {
        if (proxy.ip === target.ip) return;
        var cell = evaluateCell(serverData, playerPings, proxy.ip, target.ip, opts);
        if (cell.kind === 'compared' || cell.kind === 'rescued' || cell.kind === 'no_direct') {
          candidates.push({
            proxy: proxy,
            cell: cell,
          });
          if (cell.improves) {
            profitableProxySet[proxy.ip] = true;
          }
        }
      });

      candidates.sort(function (a, b) {
        return a.cell.totalViaProxyMs - b.cell.totalViaProxyMs;
      });

      var best = null;
      if (candidates.length > 0) {
        var top = candidates[0];
        if (top.cell.kind === 'rescued' || (top.cell.kind === 'compared' && top.cell.deltaMs < 0)) {
          best = top;
          bestByTargetIp[target.ip] = top.proxy.ip;
          anyGainCount += 1;
          if (top.cell.kind === 'rescued') {
            rescuedCount += 1;
            improvedCount += 1;
          } else if (top.cell.deltaMs <= -threshold) {
            improvedCount += 1;
          }
          if (
            top.cell.kind === 'compared' &&
            (!bestOverall || top.cell.deltaMs < bestOverall.cell.deltaMs)
          ) {
            bestOverall = { target: target, proxy: top.proxy, cell: top.cell };
          }
        }
      }

      rows.push({
        target: target,
        directMs: directMs,
        directLoss: directLoss,
        best: best,
        alternatives: candidates.slice(0, 3),
        meetsThreshold: Boolean(best && best.cell.improves),
      });
    });

    return {
      rows: rows,
      bestByTargetIp: bestByTargetIp,
      profitableProxyIps: Object.keys(profitableProxySet),
      stats: {
        totalTargets: servers.length,
        improvedCount: improvedCount,
        anyGainCount: anyGainCount,
        rescuedCount: rescuedCount,
        bestOverall: bestOverall,
      },
    };
  }

  return {
    normalizeServerData: normalizeServerData,
    parsePlayerPings: parsePlayerPings,
    getServerPairMetric: getServerPairMetric,
    evaluateCell: evaluateCell,
    summarizeByTarget: summarizeByTarget,
  };
});
