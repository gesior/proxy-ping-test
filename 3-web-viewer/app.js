(function () {
  'use strict';

  var PA = window.ProxyAnalyzer;

  var I18N = {
    pl: {
      title: 'Proxy Ping Analyzer',
      subtitle: 'Porównaj bezpośredni ping do serwerów z trasą przez serwery proxy (macierz każdy-do-każdego).',
      loadServerJsonBtn: 'Wgraj server-pings.json',
      demoBannerTitle: 'Dane przykładowe (demo):',
      demoBannerText:
        'Wyświetlane są przykładowe pomiary serwer↔serwer. Podmień plik <code>data/server-pings.json</code> (lub kliknij „Wgraj server-pings.json”), aby użyć własnych wyników z <code>collect_pings.py</code>.',
      step1Title: '1. Twój ping do serwerów',
      step1Desc:
        'Uruchom <code>ping-servers.bat</code> (lub <code>ping-servers.php</code>) na swoim komputerze, a następnie wklej wynik ze schowka poniżej.',
      pasteClipboardBtn: 'Wklej ze schowka',
      uploadPlayerBtn: 'Wgraj my-pings.json',
      clearBtn: 'Wyczyść',
      demoPresetsLabel: 'Przykłady testowe:',
      presetBR: 'Gracz z Brazylii (słaba trasa do EU)',
      presetPL: 'Gracz z Polski (niski ping w EU)',
      directPingsHeading: 'Twoje bezpośrednie pingi (ms)',
      directPingsHint: 'Możesz też wpisać/zmienić ręcznie',
      step2Title: '2. Gdzie proxy najbardziej pomaga?',
      step2Desc:
        'Najlepsze znalezione proxy dla każdego serwera docelowego. Kliknij wiersz, aby podświetlić kolumnę w tabeli poniżej.',
      copySummaryBtn: 'Kopiuj podsumowanie',
      colTarget: 'Serwer docelowy',
      colDirect: 'Bezpośrednio',
      colBestProxy: 'Najlepsze proxy',
      colRoute: 'Rozbicie trasy (Gracz→Proxy + Proxy→Cel)',
      colViaProxy: 'Łącznie przez proxy',
      colDelta: 'Zysk / Strata',
      colAlternatives: 'Kolejne opcje',
      step3Title: '3. Tabela każdy-do-każdego (Proxy × Serwer docelowy)',
      step3DescNoPlayer:
        'Aktualnie wyświetlane są pingi między serwerami. Wklej swój ping w kroku 1, aby zobaczyć +/- ms przez każde proxy.',
      step3DescWithPlayer:
        'Ujemna wartość zielona (np. -28 ms) oznacza oszczędność czasu przy połączeniu przez proxy. Gwiazdka ★ oznacza najlepsze proxy dla danego celu.',
      viewModeLabel: 'Widok komórek',
      modeFull: 'Delta (+/- ms) + Suma + S2S',
      modeDelta: 'Tylko zysk / strata (+/- ms)',
      modeTotal: 'Tylko łączny ping przez proxy',
      modeS2S: 'Tylko ping serwer ↔ serwer',
      metricLabel: 'Metryka',
      metricAvg: 'Średni (avg)',
      metricMedian: 'Mediana (median)',
      metricMin: 'Minimalny (min)',
      thresholdLabel: 'Próg opłacalności',
      filterRowLabel: 'Filtruj wiersze (Proxy)',
      filterColLabel: 'Filtruj kolumny (Cel)',
      onlyProfitable: 'Tylko opłacalne proxy',
      reverseFallback: 'Użyj odwrotnego (Cel→Proxy), gdy brak Proxy→Cel',
      onlyPingAsProxy: 'Testuj serwery onlyping jako proxy',
      onlyPingTooltip: 'Serwer bez dostępu SSH (onlyping) — pingowany z serwerów SSH i od gracza; jako proxy używa odwrotnego pomiaru Cel→Proxy (~)',
      reverseOnlyPingNote: 'onlyping: użyto pomiaru Cel→Proxy',
      reverseFallbackNote: 'kierunek odwrotny Cel→Proxy',
      bothOnlyPingUnavailable: 'oba serwery onlyping — brak pomiaru S2S między nimi',
      onlyPingReverseDisabled: 'onlyping — włącz „Użyj odwrotnego (Cel→Proxy)”, aby przetestować jako proxy',
      noMeasurement: 'brak pomiaru',
      swapAxesBtn: 'Zamień osie',
      inspectorDefault:
        'Najedź na dowolną komórkę w tabeli, aby zobaczyć dokładne wyliczenie ścieżki.',
      legBest: '★ Najlepsze proxy dla celu',
      legGain: 'Oszczędność (≥ próg)',
      legSlight: 'Minimalny zysk (< próg)',
      legWorse: 'Wolniej przez proxy (+ms)',
      legSelf: 'Bezpośrednio (Proxy = Cel)',
      legRescued: 'Odzyskane (brak trasy bezp.)',
      modalTitle: 'Załaduj plik server-pings.json',
      modalDesc:
        'Wybierz plik wygenerowany przez <code>1-ssh-ping-collector/collect_pings.py</code> lub wklej jego zawartość JSON poniżej.',
      modalChooseFile: 'Wybierz plik .json',
      modalApply: 'Zastosuj dane serwerów',
      directWord: 'Bezpośrednio',
      rescuedWord: 'Odzyskane',
      noImprovement: 'Lepiej bezpośrednio',
      none: 'Brak',
      kpiImproved: 'Cele z zyskiem przez proxy',
      kpiBestSaving: 'Największa oszczędność',
      kpiRescued: 'Odzyskane połączenia',
      kpiPlayerCount: 'Zbadane serwery',
    },
    en: {
      title: 'Proxy Ping Analyzer',
      subtitle: 'Compare direct server latency against routing through proxy servers (every-to-every matrix).',
      loadServerJsonBtn: 'Load server-pings.json',
      demoBannerTitle: 'Sample demo data:',
      demoBannerText:
        'Showing sample server-to-server measurements. Replace <code>data/server-pings.json</code> (or click "Load server-pings.json") with your real output from <code>collect_pings.py</code>.',
      step1Title: '1. Your ping to servers',
      step1Desc:
        'Run <code>ping-servers.bat</code> (or <code>ping-servers.php</code>) on your PC and paste the copied result below.',
      pasteClipboardBtn: 'Paste from clipboard',
      uploadPlayerBtn: 'Upload my-pings.json',
      clearBtn: 'Clear',
      demoPresetsLabel: 'Demo presets:',
      presetBR: 'Brazil player (poor EU route)',
      presetPL: 'Poland player (low EU ping)',
      directPingsHeading: 'Your direct pings (ms)',
      directPingsHint: 'You can also edit numbers manually',
      step2Title: '2. Where does a proxy help most?',
      step2Desc:
        'Best proxy server for each target server. Click a row to highlight that target column below.',
      copySummaryBtn: 'Copy summary',
      colTarget: 'Target server',
      colDirect: 'Direct',
      colBestProxy: 'Best proxy',
      colRoute: 'Path breakdown (You→Proxy + Proxy→Target)',
      colViaProxy: 'Total via proxy',
      colDelta: 'Gain / Loss',
      colAlternatives: 'Alternatives',
      step3Title: '3. Every-to-every matrix (Proxy × Target server)',
      step3DescNoPlayer:
        'Showing server-to-server pings. Paste your pings in step 1 to see +/- ms savings through each proxy.',
      step3DescWithPlayer:
        'Negative green values (e.g. -28 ms) mean time saved using that proxy. Star ★ marks the best proxy for each target.',
      viewModeLabel: 'Cell display',
      modeFull: 'Delta (+/- ms) + Total + S2S',
      modeDelta: 'Delta only (+/- ms)',
      modeTotal: 'Total via proxy only',
      modeS2S: 'Server ↔ server only',
      metricLabel: 'Metric',
      metricAvg: 'Average (avg)',
      metricMedian: 'Median (median)',
      metricMin: 'Minimum (min)',
      thresholdLabel: 'Gain threshold',
      filterRowLabel: 'Filter rows',
      filterColLabel: 'Filter columns',
      onlyProfitable: 'Only beneficial proxies',
      reverseFallback: 'Use reverse (Target→Proxy) if Proxy→Target missing',
      onlyPingAsProxy: 'Test onlyping servers as proxies',
      onlyPingTooltip: 'Server without SSH access (onlyping) — pinged from SSH servers and player; as a proxy uses reverse Target→Proxy estimate (~)',
      reverseOnlyPingNote: 'onlyping: estimated from Target→Proxy',
      reverseFallbackNote: 'reverse Target→Proxy',
      bothOnlyPingUnavailable: 'both servers are onlyping — no S2S measurement between them',
      onlyPingReverseDisabled: 'onlyping — enable "Use reverse (Target→Proxy)" to test as proxy',
      noMeasurement: 'no measurement',
      swapAxesBtn: 'Swap axes',
      inspectorDefault: 'Hover any cell in the matrix to inspect the exact path calculation.',
      legBest: '★ Best proxy for target',
      legGain: 'Savings (≥ threshold)',
      legSlight: 'Minor gain (< threshold)',
      legWorse: 'Slower via proxy (+ms)',
      legSelf: 'Direct (Proxy = Target)',
      legRescued: 'Rescued (direct timed out)',
      modalTitle: 'Load server-pings.json',
      modalDesc:
        'Choose the JSON file generated by <code>1-ssh-ping-collector/collect_pings.py</code> or paste it below.',
      modalChooseFile: 'Choose .json file',
      modalApply: 'Apply server data',
      directWord: 'Direct',
      rescuedWord: 'Rescued',
      noImprovement: 'Direct is best',
      none: 'None',
      kpiImproved: 'Targets improved by proxy',
      kpiBestSaving: 'Biggest ping reduction',
      kpiRescued: 'Rescued unreachable targets',
      kpiPlayerCount: 'Measured servers',
    },
  };

  var state = {
    lang: 'en',
    serverData: null,
    playerPings: null,
    viewMode: 'full',
    metric: 'avg',
    thresholdMs: 5,
    filterRow: '',
    filterCol: '',
    onlyProfitable: false,
    allowReverseFallback: true,
    allowOnlyPingAsProxy: true,
    swapAxes: false,
    highlightedTargetIp: null,
  };

  var els = {
    datasetStatus: document.getElementById('datasetStatus'),
    demoBanner: document.getElementById('demoBanner'),
    playerInput: document.getElementById('playerInput'),
    playerFileInput: document.getElementById('playerFileInput'),
    playerParseStatus: document.getElementById('playerParseStatus'),
    directPingsGrid: document.getElementById('directPingsGrid'),
    btnPasteClipboard: document.getElementById('btnPasteClipboard'),
    btnClearPlayer: document.getElementById('btnClearPlayer'),
    btnPresetBR: document.getElementById('btnPresetBR'),
    btnPresetPL: document.getElementById('btnPresetPL'),
    summarySection: document.getElementById('summarySection'),
    kpiRow: document.getElementById('kpiRow'),
    summaryBody: document.getElementById('summaryBody'),
    btnCopySummary: document.getElementById('btnCopySummary'),
    matrixSubtitle: document.getElementById('matrixSubtitle'),
    viewModeSelect: document.getElementById('viewModeSelect'),
    metricSelect: document.getElementById('metricSelect'),
    thresholdSelect: document.getElementById('thresholdSelect'),
    filterRowInput: document.getElementById('filterRowInput'),
    filterColInput: document.getElementById('filterColInput'),
    chkOnlyProfitable: document.getElementById('chkOnlyProfitable'),
    chkReverseFallback: document.getElementById('chkReverseFallback'),
    onlyPingProxyWrap: document.getElementById('onlyPingProxyWrap'),
    chkOnlyPingAsProxy: document.getElementById('chkOnlyPingAsProxy'),
    btnSwapAxes: document.getElementById('btnSwapAxes'),
    cellInspector: document.getElementById('cellInspector'),
    matrixTable: document.getElementById('matrixTable'),
    btnToggleLang: document.getElementById('btnToggleLang'),
    btnOpenServerModal: document.getElementById('btnOpenServerModal'),
    btnCloseServerModal: document.getElementById('btnCloseServerModal'),
    serverModal: document.getElementById('serverModal'),
    serverModalBackdrop: document.getElementById('serverModalBackdrop'),
    serverFileInput: document.getElementById('serverFileInput'),
    serverJsonPaste: document.getElementById('serverJsonPaste'),
    serverModalError: document.getElementById('serverModalError'),
    btnApplyServerJson: document.getElementById('btnApplyServerJson'),
  };

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || I18N.pl[key] || key;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtMs(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    return (Math.round(val * 10) / 10) + ' ms';
  }

  function fmtSignedMs(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    var rounded = Math.round(val * 10) / 10;
    if (rounded > 0) return '+' + rounded + ' ms';
    return rounded + ' ms';
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    els.btnToggleLang.textContent = state.lang === 'pl' ? 'EN' : 'PL';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (key === 'step3DescNoPlayer' && hasPlayerPings()) {
        nodes[i].textContent = t('step3DescWithPlayer');
      } else if (
        key === 'demoBannerText' ||
        key === 'step1Desc' ||
        key === 'modalDesc'
      ) {
        nodes[i].innerHTML = t(key);
      } else {
        nodes[i].textContent = t(key);
      }
    }
  }

  function hasPlayerPings() {
    return Boolean(state.playerPings && Object.keys(state.playerPings).length > 0);
  }

  function renderOnlyPingBadge(srv) {
    if (!srv || !srv.onlyPing) return '';
    return '<span class="badge-onlyping" title="' + escapeHtml(t('onlyPingTooltip')) + '">onlyping</span>';
  }

  function updateDatasetStatus() {
    if (!state.serverData) return;
    var srvCount = state.serverData.servers.length;
    var onlyPingCount = state.serverData.servers.filter(function (s) {
      return s.onlyPing;
    }).length;
    var gen = state.serverData.generatedAt
      ? state.serverData.generatedAt.replace('T', ' ').replace('Z', ' UTC')
      : '';
    var countText = srvCount + (onlyPingCount > 0 ? ' (' + onlyPingCount + ' onlyping)' : '');
    els.datasetStatus.textContent =
      (state.lang === 'pl' ? 'Serwery: ' : 'Servers: ') +
      countText +
      (gen ? ' · ' + gen : '');
  }

  function setServerData(raw) {
    state.serverData = PA.normalizeServerData(raw);
    var demoPresetsEl = document.querySelector('.demo-presets');
    if (state.serverData.isDemoData) {
      els.demoBanner.classList.remove('hidden');
      if (demoPresetsEl) demoPresetsEl.classList.remove('hidden');
    } else {
      els.demoBanner.classList.add('hidden');
      if (demoPresetsEl) demoPresetsEl.classList.add('hidden');
    }

    var hasOnlyPing = state.serverData.servers.some(function (s) {
      return s.onlyPing;
    });
    if (els.onlyPingProxyWrap) {
      els.onlyPingProxyWrap.classList.toggle('hidden', !hasOnlyPing);
    }

    updateDatasetStatus();

    if (els.playerInput.value.trim()) {
      parseAndApplyPlayerText(els.playerInput.value);
    } else {
      renderDirectPingsEditor();
      renderAnalysis();
    }
  }

  function loadInitialServerData() {
    if (window.PROXY_PING_DATA) {
      try {
        setServerData(window.PROXY_PING_DATA);
      } catch (e) {
        console.error(e);
      }
    }

    if (window.location.protocol !== 'file:') {
      fetch('data/server-pings.json', { cache: 'no-store' })
        .then(function (resp) {
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          return resp.json();
        })
        .then(function (json) {
          setServerData(json);
        })
        .catch(function (err) {
          if (!state.serverData) {
            els.datasetStatus.textContent = 'Missing data/server-pings.json';
            console.warn('Could not fetch data/server-pings.json:', err);
          }
        });
    }
  }

  function parseAndApplyPlayerText(rawText) {
    if (!state.serverData) return;
    var trimmed = String(rawText || '').trim();
    if (!trimmed) {
      state.playerPings = null;
      els.playerParseStatus.textContent = '';
      els.playerParseStatus.className = 'parse-status muted';
      renderDirectPingsEditor();
      renderAnalysis();
      return;
    }

    var res = PA.parsePlayerPings(trimmed, state.serverData.servers);
    if (res.error) {
      state.playerPings = null;
      els.playerParseStatus.textContent = res.error;
      els.playerParseStatus.className = 'parse-status err';
    } else {
      state.playerPings = res.pings;
      var msg =
        state.lang === 'pl'
          ? 'Rozpoznano ping dla ' + res.matchedCount + ' / ' + res.totalKnown + ' serwerów.'
          : 'Matched pings for ' + res.matchedCount + ' / ' + res.totalKnown + ' servers.';
      if (res.unrecognizedKeys.length > 0) {
        msg +=
          (state.lang === 'pl' ? ' Pominięto nieznane IP: ' : ' Ignored unknown IPs: ') +
          res.unrecognizedKeys.slice(0, 5).join(', ');
      }
      els.playerParseStatus.textContent = msg;
      els.playerParseStatus.className = 'parse-status ok';
    }

    renderDirectPingsEditor();
    renderAnalysis();
  }

  function renderDirectPingsEditor() {
    if (!state.serverData) return;
    var servers = state.serverData.servers;
    var html = servers
      .map(function (srv) {
        var entry = state.playerPings && state.playerPings[srv.ip];
        var val = entry && typeof entry[state.metric] === 'number' ? entry[state.metric] : '';
        return (
          '<div class="direct-ping-chip">' +
          '  <div class="srv-name" title="' + escapeHtml(srv.label) + '">' + escapeHtml(srv.label) + '</div>' +
          '  <div class="srv-ip">' + escapeHtml(srv.ip) + renderOnlyPingBadge(srv) + '</div>' +
          '  <div class="chip-input-row">' +
          '    <input type="number" min="0" step="0.1" data-manual-ip="' + escapeHtml(srv.ip) + '" value="' + escapeHtml(val) + '" placeholder="ms" />' +
          '    <span class="muted small">ms</span>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');
    els.directPingsGrid.innerHTML = html;
  }

  function renderAnalysis() {
    if (!state.serverData) return;
    var hasPlayer = hasPlayerPings();
    els.matrixSubtitle.textContent = hasPlayer ? t('step3DescWithPlayer') : t('step3DescNoPlayer');

    var summary = PA.summarizeByTarget(state.serverData, state.playerPings, {
      metric: state.metric,
      thresholdMs: state.thresholdMs,
      allowReverseFallback: state.allowReverseFallback,
      allowOnlyPingAsProxy: state.allowOnlyPingAsProxy,
    });

    if (hasPlayer) {
      els.summarySection.classList.remove('hidden');
      renderSummary(summary);
    } else {
      els.summarySection.classList.add('hidden');
    }

    renderMatrix(summary);
  }

  function renderSummary(summary) {
    var st = summary.stats;
    var measuredCount = state.serverData.servers.filter(function (s) {
      return state.playerPings && state.playerPings[s.ip];
    }).length;

    var bestSavingHtml = '<div class="kpi-value">—</div><div class="kpi-sub">' + escapeHtml(t('none')) + '</div>';
    if (st.bestOverall) {
      var bo = st.bestOverall;
      bestSavingHtml =
        '<div class="kpi-value gain">' +
        escapeHtml(fmtSignedMs(bo.cell.deltaMs)) +
        ' (' +
        escapeHtml(bo.cell.deltaPct) +
        '%)</div>' +
        '<div class="kpi-sub">' +
        escapeHtml(bo.target.label) +
        ' ← ' +
        escapeHtml(bo.proxy.label) +
        '</div>';
    }

    var kpis =
      '<div class="kpi-box">' +
      '  <div class="kpi-label">' + escapeHtml(t('kpiImproved')) + '</div>' +
      '  <div class="kpi-value ' + (st.improvedCount > 0 ? 'gain' : '') + '">' + st.improvedCount + ' / ' + st.totalTargets + '</div>' +
      '  <div class="kpi-sub">' + escapeHtml(t('thresholdLabel')) + ': ≥ ' + state.thresholdMs + ' ms</div>' +
      '</div>' +
      '<div class="kpi-box">' +
      '  <div class="kpi-label">' + escapeHtml(t('kpiBestSaving')) + '</div>' +
      bestSavingHtml +
      '</div>' +
      '<div class="kpi-box">' +
      '  <div class="kpi-label">' + escapeHtml(t('kpiPlayerCount')) + '</div>' +
      '  <div class="kpi-value">' + measuredCount + ' / ' + st.totalTargets + '</div>' +
      '  <div class="kpi-sub">' +
      (st.rescuedCount > 0
        ? escapeHtml(t('kpiRescued')) + ': ' + st.rescuedCount
        : escapeHtml(t('metricLabel')) + ': ' + state.metric) +
      '</div>' +
      '</div>';

    els.kpiRow.innerHTML = kpis;

    var rowsHtml = summary.rows
      .map(function (row) {
        var directBadge =
          row.directMs != null
            ? escapeHtml(fmtMs(row.directMs))
            : row.directLoss === 100
              ? '<span class="badge badge-neutral">100% loss</span>'
              : '—';

        var bestCellHtml = '<span class="muted">' + escapeHtml(t('noImprovement')) + '</span>';
        var routeHtml = '—';
        var viaHtml = '—';
        var deltaHtml = '<span class="badge badge-neutral">0 ms</span>';

        if (row.best) {
          var b = row.best;
          bestCellHtml = '<strong>★ ' + escapeHtml(b.proxy.label) + '</strong>' + renderOnlyPingBadge(b.proxy);
          var revMark = b.cell.isReverseFallback ? ' ~' : '';
          routeHtml =
            escapeHtml(fmtMs(b.cell.playerToProxyMs)) +
            ' + ' +
            escapeHtml(fmtMs(b.cell.proxyToTargetMs)) +
            revMark;
          viaHtml = '<strong>' + escapeHtml(fmtMs(b.cell.totalViaProxyMs)) + '</strong>';

          if (b.cell.kind === 'rescued') {
            deltaHtml = '<span class="badge badge-rescued">' + escapeHtml(t('rescuedWord')) + '</span>';
          } else if (b.cell.improves) {
            deltaHtml =
              '<span class="badge badge-gain">' +
              escapeHtml(fmtSignedMs(b.cell.deltaMs)) +
              ' (' +
              escapeHtml(b.cell.deltaPct) +
              '%)</span>';
          } else {
            deltaHtml =
              '<span class="badge badge-slight">' +
              escapeHtml(fmtSignedMs(b.cell.deltaMs)) +
              '</span>';
          }
        }

        var altsHtml = row.alternatives
          .slice(row.best ? 1 : 0, 3)
          .map(function (alt) {
            var d = alt.cell.kind === 'rescued' ? t('rescuedWord') : fmtSignedMs(alt.cell.deltaMs);
            return escapeHtml(alt.proxy.label) + renderOnlyPingBadge(alt.proxy) + ' (' + escapeHtml(d) + ')';
          })
          .join(' · ');

        return (
          '<tr data-target-ip="' + escapeHtml(row.target.ip) + '">' +
          '  <td><strong>' + escapeHtml(row.target.label) + '</strong>' + renderOnlyPingBadge(row.target) + ' <span class="hdr-ip">' + escapeHtml(row.target.ip) + '</span></td>' +
          '  <td>' + directBadge + '</td>' +
          '  <td>' + bestCellHtml + '</td>' +
          '  <td>' + routeHtml + '</td>' +
          '  <td>' + viaHtml + '</td>' +
          '  <td>' + deltaHtml + '</td>' +
          '  <td class="muted small">' + (altsHtml || '—') + '</td>' +
          '</tr>'
        );
      })
      .join('');

    els.summaryBody.innerHTML = rowsHtml;
  }

  function serverMatchesFilter(srv, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    return (
      srv.label.toLowerCase().indexOf(q) !== -1 ||
      srv.country.toLowerCase().indexOf(q) !== -1 ||
      srv.datacenter.toLowerCase().indexOf(q) !== -1 ||
      srv.ip.toLowerCase().indexOf(q) !== -1 ||
      (srv.onlyPing && 'onlyping'.indexOf(q) !== -1)
    );
  }

  function renderMatrix(summary) {
    var servers = state.serverData.servers;
    var hasPlayer = hasPlayerPings();
    var mode = hasPlayer ? state.viewMode : 's2s';
    var profitableSet = {};
    summary.profitableProxyIps.forEach(function (ip) {
      profitableSet[ip] = true;
    });

    var rowQuery = state.filterRow.trim();
    var colQuery = state.filterCol.trim();

    var rowServers = servers.filter(function (s) {
      if (!serverMatchesFilter(s, rowQuery)) return false;
      if (!state.swapAxes && !state.allowOnlyPingAsProxy && s.onlyPing) return false;
      if (!state.swapAxes && state.onlyProfitable && hasPlayer) {
        return Boolean(profitableSet[s.ip]);
      }
      return true;
    });

    var colServers = servers.filter(function (s) {
      if (!serverMatchesFilter(s, colQuery)) return false;
      if (state.swapAxes && !state.allowOnlyPingAsProxy && s.onlyPing) return false;
      if (state.swapAxes && state.onlyProfitable && hasPlayer) {
        return Boolean(profitableSet[s.ip]);
      }
      return true;
    });

    var cornerText = state.swapAxes
      ? (state.lang === 'pl' ? 'Cel ↓  \\  Proxy →' : 'Target ↓  \\  Proxy →')
      : (state.lang === 'pl' ? 'Proxy ↓  \\  Cel →' : 'Proxy ↓  \\  Target →');

    var theadHtml = '<thead><tr><th class="corner-cell">' + escapeHtml(cornerText) + '</th>';
    colServers.forEach(function (colSrv) {
      var colPing =
        hasPlayer && state.playerPings[colSrv.ip]
          ? state.playerPings[colSrv.ip][state.metric]
          : null;
      var colLoss =
        hasPlayer && state.playerPings[colSrv.ip] ? state.playerPings[colSrv.ip].loss : null;
      var pingTag = '';
      if (hasPlayer) {
        if (typeof colPing === 'number') {
          pingTag = '<div class="hdr-ping">' + escapeHtml(fmtMs(colPing)) + '</div>';
        } else if (colLoss === 100) {
          pingTag = '<div class="hdr-ping dead">timeout</div>';
        } else {
          pingTag = '<div class="hdr-ping">—</div>';
        }
      }
      var hlClass =
        !state.swapAxes && state.highlightedTargetIp === colSrv.ip ? ' col-highlighted' : '';
      theadHtml +=
        '<th class="' + hlClass + '" data-col-ip="' + escapeHtml(colSrv.ip) + '">' +
        '  <div class="hdr-title">' + escapeHtml(colSrv.label) + renderOnlyPingBadge(colSrv) + '</div>' +
        '  <div class="hdr-ip">' + escapeHtml(colSrv.ip) + '</div>' +
        pingTag +
        '</th>';
    });
    theadHtml += '</tr></thead>';

    var tbodyHtml = '<tbody>';
    rowServers.forEach(function (rowSrv) {
      var rowPing =
        hasPlayer && state.playerPings[rowSrv.ip]
          ? state.playerPings[rowSrv.ip][state.metric]
          : null;
      var rowLoss =
        hasPlayer && state.playerPings[rowSrv.ip] ? state.playerPings[rowSrv.ip].loss : null;
      var rowTag = '';
      if (hasPlayer) {
        if (typeof rowPing === 'number') {
          rowTag = '<div class="hdr-ping">' + escapeHtml(fmtMs(rowPing)) + '</div>';
        } else if (rowLoss === 100) {
          rowTag = '<div class="hdr-ping dead">timeout</div>';
        } else {
          rowTag = '<div class="hdr-ping">—</div>';
        }
      }

      tbodyHtml += '<tr>';
      tbodyHtml +=
        '<th class="row-header" data-row-ip="' + escapeHtml(rowSrv.ip) + '">' +
        '  <div class="hdr-title">' + escapeHtml(rowSrv.label) + renderOnlyPingBadge(rowSrv) + '</div>' +
        '  <div class="hdr-ip">' + escapeHtml(rowSrv.ip) + '</div>' +
        rowTag +
        '</th>';

      colServers.forEach(function (colSrv) {
        var proxySrv = state.swapAxes ? colSrv : rowSrv;
        var targetSrv = state.swapAxes ? rowSrv : colSrv;
        var cell = PA.evaluateCell(state.serverData, state.playerPings, proxySrv.ip, targetSrv.ip, {
          metric: state.metric,
          thresholdMs: state.thresholdMs,
          allowReverseFallback: state.allowReverseFallback,
        });

        var isBest =
          hasPlayer && summary.bestByTargetIp[targetSrv.ip] === proxySrv.ip;

        var cls = 'matrix-cell';
        if (cell.kind === 'self') cls += ' cell-self';
        else if (cell.kind === 'rescued') cls += ' cell-rescued';
        else if (cell.kind === 'compared') {
          if (cell.improves) cls += ' cell-gain';
          else if (cell.slightlyImproves) cls += ' cell-slight';
          else if (cell.deltaMs > 0) cls += ' cell-worse';
          else cls += ' cell-self';
        } else if (cell.kind === 'unavailable') {
          cls += ' cell-unavailable';
        }

        if (isBest) cls += ' cell-best';
        if (!state.swapAxes && state.highlightedTargetIp === targetSrv.ip) {
          cls += ' col-highlighted';
        }

        var inner = renderCellContent(cell, mode, isBest);

        tbodyHtml +=
          '<td class="' +
          cls +
          '" data-proxy-ip="' +
          escapeHtml(proxySrv.ip) +
          '" data-target-ip="' +
          escapeHtml(targetSrv.ip) +
          '" data-col-ip="' +
          escapeHtml(colSrv.ip) +
          '" data-row-ip="' +
          escapeHtml(rowSrv.ip) +
          '">' +
          inner +
          '</td>';
      });
      tbodyHtml += '</tr>';
    });
    tbodyHtml += '</tbody>';

    els.matrixTable.innerHTML = theadHtml + tbodyHtml;
  }

  function renderCellContent(cell, mode, isBest) {
    var star = isBest ? '<span class="best-star">★</span>' : '';
    var rev = cell.isReverseFallback ? ' ~' : '';

    if (cell.kind === 'self') {
      if (mode === 's2s') return '<div class="c-main">—</div>';
      var directTxt = cell.directToTargetMs != null ? fmtMs(cell.directToTargetMs) : '—';
      return '<div class="c-main">' + escapeHtml(t('directWord')) + '</div><div class="c-sub">' + escapeHtml(directTxt) + '</div>';
    }

    if (cell.kind === 's2s_only' || mode === 's2s') {
      if (cell.proxyToTargetMs == null) return '<div class="c-main">—</div>';
      return (
        '<div class="c-main">' +
        escapeHtml(fmtMs(cell.proxyToTargetMs)) +
        escapeHtml(rev) +
        '</div>' +
        (cell.proxyToTargetLoss > 0
          ? '<div class="c-sub">loss ' + escapeHtml(cell.proxyToTargetLoss) + '%</div>'
          : '')
      );
    }

    if (cell.kind === 'rescued') {
      return (
        '<div class="c-main">' +
        star +
        escapeHtml(t('rescuedWord')) +
        '</div><div class="c-sub">' +
        escapeHtml(fmtMs(cell.totalViaProxyMs)) +
        escapeHtml(rev) +
        '</div>'
      );
    }

    if (cell.kind === 'no_direct') {
      return (
        '<div class="c-main">' +
        escapeHtml(fmtMs(cell.totalViaProxyMs)) +
        '</div><div class="c-sub">S2S: ' +
        escapeHtml(fmtMs(cell.proxyToTargetMs)) +
        escapeHtml(rev) +
        '</div>'
      );
    }

    if (cell.kind !== 'compared') {
      return '<div class="c-main">—</div>';
    }

    if (mode === 'delta') {
      return '<div class="c-main">' + star + escapeHtml(fmtSignedMs(cell.deltaMs)) + '</div>';
    }
    if (mode === 'total') {
      return (
        '<div class="c-main">' +
        star +
        escapeHtml(fmtMs(cell.totalViaProxyMs)) +
        '</div><div class="c-sub">vs ' +
        escapeHtml(fmtMs(cell.directToTargetMs)) +
        '</div>'
      );
    }

    // Default 'full' mode
    return (
      '<div class="c-main">' +
      star +
      escapeHtml(fmtSignedMs(cell.deltaMs)) +
      '</div>' +
      '<div class="c-sub">' +
      escapeHtml(fmtMs(cell.totalViaProxyMs)) +
      ' vs ' +
      escapeHtml(fmtMs(cell.directToTargetMs)) +
      '</div>' +
      '<div class="c-sub">S2S: ' +
      escapeHtml(fmtMs(cell.proxyToTargetMs)) +
      escapeHtml(rev) +
      '</div>'
    );
  }

  function updateInspector(proxyIp, targetIp) {
    if (!state.serverData) return;
    var byIp = {};
    state.serverData.servers.forEach(function (s) {
      byIp[s.ip] = s;
    });
    var pSrv = byIp[proxyIp];
    var tSrv = byIp[targetIp];
    if (!pSrv || !tSrv) return;

    var cell = PA.evaluateCell(state.serverData, state.playerPings, proxyIp, targetIp, {
      metric: state.metric,
      thresholdMs: state.thresholdMs,
      allowReverseFallback: state.allowReverseFallback,
    });

    if (cell.kind === 'self') {
      els.cellInspector.innerHTML =
        '<strong>' +
        escapeHtml(tSrv.label) +
        '</strong>' + renderOnlyPingBadge(tSrv) + ' — ' +
        escapeHtml(t('directWord')) +
        (cell.directToTargetMs != null ? ': <strong>' + escapeHtml(fmtMs(cell.directToTargetMs)) + '</strong>' : '');
      return;
    }

    var revNoteHtml = cell.isReverseFallback
      ? ' <span class="muted">(' +
        escapeHtml(pSrv.onlyPing ? t('reverseOnlyPingNote') : t('reverseFallbackNote')) +
        ')</span>'
      : '';

    if (cell.kind === 's2s_only') {
      els.cellInspector.innerHTML =
        '<strong>' +
        escapeHtml(pSrv.label) +
        '</strong>' + renderOnlyPingBadge(pSrv) + ' → <strong>' +
        escapeHtml(tSrv.label) +
        '</strong>' + renderOnlyPingBadge(tSrv) + ': <strong>' +
        escapeHtml(fmtMs(cell.proxyToTargetMs)) +
        '</strong>' +
        revNoteHtml +
        (cell.proxyToTargetLoss != null ? ' · loss: ' + escapeHtml(cell.proxyToTargetLoss) + '%' : '');
      return;
    }

    if (cell.kind === 'compared') {
      var cls = cell.deltaMs < 0 ? 'badge-gain' : 'badge-neutral';
      var youProxyLbl = state.lang === 'pl' ? 'Gracz→Proxy' : 'You→Proxy';
      var proxyTargetLbl = state.lang === 'pl' ? 'Proxy→Cel' : 'Proxy→Target';
      var targetLbl = state.lang === 'pl' ? 'Cel' : 'Target';
      els.cellInspector.innerHTML =
        '<span>Proxy: <strong>' +
        escapeHtml(pSrv.label) +
        '</strong>' + renderOnlyPingBadge(pSrv) + ' → ' + targetLbl + ': <strong>' +
        escapeHtml(tSrv.label) +
        '</strong>' + renderOnlyPingBadge(tSrv) + '</span>' +
        '<span>| ' + youProxyLbl + ': <strong>' +
        escapeHtml(fmtMs(cell.playerToProxyMs)) +
        '</strong> + ' + proxyTargetLbl + ': <strong>' +
        escapeHtml(fmtMs(cell.proxyToTargetMs)) +
        (cell.isReverseFallback ? ' ~' : '') +
        '</strong>' + revNoteHtml + ' = <strong>' +
        escapeHtml(fmtMs(cell.totalViaProxyMs)) +
        '</strong></span>' +
        '<span>| ' +
        escapeHtml(t('colDirect')) +
        ': <strong>' +
        escapeHtml(fmtMs(cell.directToTargetMs)) +
        '</strong></span>' +
        '<span class="badge ' +
        cls +
        '">' +
        escapeHtml(fmtSignedMs(cell.deltaMs)) +
        ' (' +
        escapeHtml(cell.deltaPct) +
        '%)</span>';
      return;
    }

    if (cell.kind === 'rescued') {
      var targetLbl2 = state.lang === 'pl' ? 'Cel' : 'Target';
      els.cellInspector.innerHTML =
        '<span>Proxy: <strong>' +
        escapeHtml(pSrv.label) +
        '</strong>' + renderOnlyPingBadge(pSrv) + ' → ' + targetLbl2 + ': <strong>' +
        escapeHtml(tSrv.label) +
        '</strong>' + renderOnlyPingBadge(tSrv) + '</span>' +
        '<span class="badge badge-rescued">' +
        escapeHtml(t('rescuedWord')) +
        ': ' +
        escapeHtml(fmtMs(cell.totalViaProxyMs)) +
        (cell.isReverseFallback ? ' ~' : '') +
        '</span>' +
        revNoteHtml;
      return;
    }

    if (cell.kind === 'no_direct') {
      var targetLbl3 = state.lang === 'pl' ? 'Cel' : 'Target';
      els.cellInspector.innerHTML =
        '<span>Proxy: <strong>' +
        escapeHtml(pSrv.label) +
        '</strong>' + renderOnlyPingBadge(pSrv) + ' → ' + targetLbl3 + ': <strong>' +
        escapeHtml(tSrv.label) +
        '</strong>' + renderOnlyPingBadge(tSrv) + '</span>' +
        '<span>| <strong>' +
        escapeHtml(fmtMs(cell.totalViaProxyMs)) +
        '</strong>' +
        revNoteHtml +
        '</span>';
      return;
    }

    var unavailableReason = t('noMeasurement');
    if (pSrv.onlyPing && tSrv.onlyPing) {
      unavailableReason = t('bothOnlyPingUnavailable');
    } else if (pSrv.onlyPing && !state.allowReverseFallback && cell.proxyToTargetMs == null) {
      unavailableReason = t('onlyPingReverseDisabled');
    }

    els.cellInspector.innerHTML =
      '<span>' +
      escapeHtml(pSrv.label) +
      renderOnlyPingBadge(pSrv) +
      ' → ' +
      escapeHtml(tSrv.label) +
      renderOnlyPingBadge(tSrv) +
      ': <span class="muted">' +
      escapeHtml(unavailableReason) +
      '</span></span>';
  }

  function loadDemoPreset(region) {
    if (!state.serverData) return;
    var preset;
    if (region === 'BR') {
      // Gracz z Brazylii: świetny ping do BR (18ms) i niezły do USA-East (112ms),
      // ale bezpośredni routing do EU (PL/DE/UK) gorszy niż przez USA-East!
      preset = {
        schemaVersion: 1,
        type: 'player-pings',
        tool: 'demo-br',
        pings: {
          '1.2.3.4': { avg: 252, min: 249, max: 256, loss: 0 },
          '2.3.4.5': { avg: 238, min: 235, max: 241, loss: 0 },
          '3.4.5.6': { avg: 231, min: 228, max: 235, loss: 0 },
          '4.5.6.7': { avg: 224, min: 221, max: 229, loss: 0 },
          '5.6.7.8': { avg: 112, min: 110, max: 115, loss: 0 },
          '6.7.8.9': { avg: 168, min: 165, max: 171, loss: 0 },
          '7.8.9.10': { avg: 18, min: 17, max: 20, loss: 0 },
          '8.9.10.11': { avg: 345, min: 340, max: 352, loss: 0 },
        },
      };
    } else {
      // Gracz z Polski: świetny ping lokalnie (21ms PL, 34ms DE), ale gorsza trasa bezpośrednia do USA-West / SG
      preset = {
        schemaVersion: 1,
        type: 'player-pings',
        tool: 'demo-pl',
        pings: {
          '1.2.3.4': { avg: 21, min: 20, max: 22, loss: 0 },
          '2.3.4.5': { avg: 34, min: 33, max: 36, loss: 0 },
          '3.4.5.6': { avg: 39, min: 38, max: 41, loss: 0 },
          '4.5.6.7': { avg: 47, min: 45, max: 49, loss: 0 },
          '5.6.7.8': { avg: 138, min: 136, max: 141, loss: 0 },
          '6.7.8.9': { avg: 199, min: 196, max: 204, loss: 0 },
          '7.8.9.10': { avg: 245, min: 242, max: 250, loss: 0 },
          '8.9.10.11': { avg: 224, min: 220, max: 229, loss: 0 },
        },
      };
    }
    var txt = JSON.stringify(preset, null, 2);
    els.playerInput.value = txt;
    parseAndApplyPlayerText(txt);
  }

  // Event listeners
  els.playerInput.addEventListener('input', function () {
    parseAndApplyPlayerText(els.playerInput.value);
  });

  els.btnPasteClipboard.addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      els.playerInput.focus();
      els.playerParseStatus.textContent =
        state.lang === 'pl' ? 'Użyj Ctrl+V w polu tekstowym powyżej.' : 'Press Ctrl+V in the text box above.';
      els.playerParseStatus.className = 'parse-status muted';
      return;
    }
    navigator.clipboard
      .readText()
      .then(function (txt) {
        els.playerInput.value = txt;
        parseAndApplyPlayerText(txt);
      })
      .catch(function () {
        els.playerInput.focus();
        els.playerParseStatus.textContent =
          state.lang === 'pl'
            ? 'Brak dostępu do schowka — wklej ręcznie (Ctrl+V).'
            : 'Clipboard access denied — please paste manually (Ctrl+V).';
        els.playerParseStatus.className = 'parse-status err';
      });
  });

  els.playerFileInput.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      els.playerInput.value = String(reader.result || '');
      parseAndApplyPlayerText(els.playerInput.value);
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  els.btnClearPlayer.addEventListener('click', function () {
    els.playerInput.value = '';
    state.highlightedTargetIp = null;
    parseAndApplyPlayerText('');
  });

  els.btnPresetBR.addEventListener('click', function () {
    loadDemoPreset('BR');
  });
  els.btnPresetPL.addEventListener('click', function () {
    loadDemoPreset('PL');
  });

  els.directPingsGrid.addEventListener('input', function (e) {
    var input = e.target;
    if (!input || !input.hasAttribute('data-manual-ip')) return;
    var ip = input.getAttribute('data-manual-ip');
    if (!state.playerPings) state.playerPings = {};
    var valStr = input.value.trim();
    if (valStr === '') {
      delete state.playerPings[ip];
    } else {
      var num = parseFloat(valStr);
      if (Number.isFinite(num) && num >= 0) {
        state.playerPings[ip] = { avg: num, median: num, min: num, max: num, loss: 0 };
      }
    }
    if (!hasPlayerPings()) state.playerPings = null;
    renderAnalysis();
  });

  els.summaryBody.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-target-ip]');
    if (!tr) return;
    var ip = tr.getAttribute('data-target-ip');
    state.highlightedTargetIp = state.highlightedTargetIp === ip ? null : ip;
    renderAnalysis();
    var targetHdr = els.matrixTable.querySelector('th[data-col-ip="' + CSS.escape(ip) + '"]');
    if (targetHdr) {
      targetHdr.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });

  els.btnCopySummary.addEventListener('click', function () {
    if (!state.serverData || !hasPlayerPings()) return;
    var summary = PA.summarizeByTarget(state.serverData, state.playerPings, {
      metric: state.metric,
      thresholdMs: state.thresholdMs,
      allowReverseFallback: state.allowReverseFallback,
      allowOnlyPingAsProxy: state.allowOnlyPingAsProxy,
    });
    var lines = ['Proxy Ping Summary (' + state.metric + ', threshold >= ' + state.thresholdMs + 'ms):'];
    summary.rows.forEach(function (r) {
      var d = r.directMs != null ? r.directMs + 'ms' : 'timeout';
      var tLabel = r.target.label + (r.target.onlyPing ? ' [onlyping]' : '');
      if (r.best) {
        var pLabel = r.best.proxy.label + (r.best.proxy.onlyPing ? ' [onlyping]' : '');
        var delta = r.best.cell.kind === 'rescued' ? 'RESCUED' : fmtSignedMs(r.best.cell.deltaMs);
        var tilde = r.best.cell.isReverseFallback ? ' ~' : '';
        lines.push(
          '- ' +
            tLabel +
            ' (' +
            r.target.ip +
            '): direct ' +
            d +
            ' -> via ' +
            pLabel +
            ' = ' +
            r.best.cell.totalViaProxyMs +
            'ms' +
            tilde +
            ' (' +
            delta +
            ')'
        );
      } else {
        lines.push('- ' + tLabel + ' (' + r.target.ip + '): direct ' + d + ' (best)');
      }
    });
    var txt = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt);
      var orig = els.btnCopySummary.textContent;
      els.btnCopySummary.textContent = state.lang === 'pl' ? 'Skopiowano!' : 'Copied!';
      setTimeout(function () {
        els.btnCopySummary.textContent = orig;
      }, 1500);
    }
  });

  // Matrix controls
  els.viewModeSelect.addEventListener('change', function () {
    state.viewMode = els.viewModeSelect.value;
    renderAnalysis();
  });
  els.metricSelect.addEventListener('change', function () {
    state.metric = els.metricSelect.value;
    renderDirectPingsEditor();
    renderAnalysis();
  });
  els.thresholdSelect.addEventListener('change', function () {
    state.thresholdMs = parseInt(els.thresholdSelect.value, 10) || 5;
    renderAnalysis();
  });
  els.filterRowInput.addEventListener('input', function () {
    state.filterRow = els.filterRowInput.value;
    renderAnalysis();
  });
  els.filterColInput.addEventListener('input', function () {
    state.filterCol = els.filterColInput.value;
    renderAnalysis();
  });
  els.chkOnlyProfitable.addEventListener('change', function () {
    state.onlyProfitable = els.chkOnlyProfitable.checked;
    renderAnalysis();
  });
  els.chkReverseFallback.addEventListener('change', function () {
    state.allowReverseFallback = els.chkReverseFallback.checked;
    renderAnalysis();
  });
  if (els.chkOnlyPingAsProxy) {
    els.chkOnlyPingAsProxy.addEventListener('change', function () {
      state.allowOnlyPingAsProxy = els.chkOnlyPingAsProxy.checked;
      renderAnalysis();
    });
  }
  els.btnSwapAxes.addEventListener('click', function () {
    state.swapAxes = !state.swapAxes;
    renderAnalysis();
  });

  els.matrixTable.addEventListener('mouseover', function (e) {
    var td = e.target.closest('td.matrix-cell');
    if (!td) return;
    var proxyIp = td.getAttribute('data-proxy-ip');
    var targetIp = td.getAttribute('data-target-ip');
    var colIp = td.getAttribute('data-col-ip');
    var rowIp = td.getAttribute('data-row-ip');

    var prev = els.matrixTable.querySelectorAll('th.hover-hdr');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('hover-hdr');

    var colHdr = els.matrixTable.querySelector('thead th[data-col-ip="' + CSS.escape(colIp) + '"]');
    var rowHdr = els.matrixTable.querySelector('tbody th[data-row-ip="' + CSS.escape(rowIp) + '"]');
    if (colHdr) colHdr.classList.add('hover-hdr');
    if (rowHdr) rowHdr.classList.add('hover-hdr');

    updateInspector(proxyIp, targetIp);
  });

  // Language switcher
  els.btnToggleLang.addEventListener('click', function () {
    state.lang = state.lang === 'pl' ? 'en' : 'pl';
    applyLanguage();
    updateDatasetStatus();
    renderAnalysis();
  });

  // Server JSON Modal
  function openModal() {
    els.serverModalError.textContent = '';
    els.serverModal.classList.remove('hidden');
  }
  function closeModal() {
    els.serverModal.classList.add('hidden');
  }
  els.btnOpenServerModal.addEventListener('click', openModal);
  els.btnCloseServerModal.addEventListener('click', closeModal);
  els.serverModalBackdrop.addEventListener('click', closeModal);
  els.serverFileInput.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      els.serverJsonPaste.value = String(reader.result || '');
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  els.btnApplyServerJson.addEventListener('click', function () {
    els.serverModalError.textContent = '';
    try {
      var parsed = JSON.parse(els.serverJsonPaste.value);
      setServerData(parsed);
      closeModal();
    } catch (err) {
      els.serverModalError.textContent = err.message;
    }
  });

  applyLanguage();
  loadInitialServerData();
})();
