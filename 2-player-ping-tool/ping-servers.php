<?php
declare(strict_types=1);

/**
 * Proxy Ping Test - Player Tool (PHP CLI)
 * =======================================
 * This script is 100% transparent and easy to audit:
 * - Runs ONLY the system `ping` command (no file downloads and no network
 *   uploads).
 * - Queries servers in parallel (8 at a time by default), finishing in a few
 *   seconds even for large server lists.
 * - Saves results to `my-pings.json` and copies them to the clipboard.
 *
 * Usage:
 *   php ping-servers.php
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run in a terminal (PHP CLI): php ping-servers.php\n");
    exit(1);
}

$options = parseCliArgs($argv);
$serversFile = $options['servers'] ?? (__DIR__ . DIRECTORY_SEPARATOR . 'servers.txt');
$outFile     = $options['out'] ?? (__DIR__ . DIRECTORY_SEPARATOR . 'my-pings.json');
$count       = max(1, (int)($options['count'] ?? 20));
$warmup      = max(0, (int)($options['warmup'] ?? 3));
$timeoutMs   = max(200, (int)($options['timeout'] ?? 1500));
$concurrency = max(1, (int)($options['concurrency'] ?? 8));
$noClip      = (bool)($options['no-clip'] ?? false);

$servers = is_file($serversFile) ? loadServersFromFile($serversFile) : [];
if ($servers === []) {
    $servers = getEmbeddedServers();
}

if ($servers === []) {
    fwrite(STDERR, "[ERROR] No servers to test. Please populate servers.txt.\n");
    exit(1);
}

$total = count($servers);
echo "============================================================================\n";
echo "  Server Ping Test ({$total} servers, {$count} packets, concurrency: {$concurrency})\n";
echo "============================================================================\n\n";

$results = runParallelPings($servers, $count, $warmup, $timeoutMs, $concurrency);

$pingsPayload = [];
foreach ($servers as $idx => $srv) {
    $ip = $srv['ip'];
    $res = $results[$ip] ?? ['avg' => null, 'min' => null, 'max' => null, 'loss' => 100.0];
    $pingsPayload[$ip] = $res;

    $num = $idx + 1;
    $label = "{$srv['country']} - {$srv['datacenter']} ({$ip})";
    if ($res['avg'] !== null) {
        echo "[{$num}/{$total}] {$label} -> {$res['avg']} ms (min: {$res['min']}, max: {$res['max']}, loss: {$res['loss']}%)\n";
    } else {
        echo "[{$num}/{$total}] {$label} -> TIMEOUT / NO REPLY (loss: {$res['loss']}%)\n";
    }
}

$payload = [
    'schemaVersion' => 1,
    'type'          => 'player-pings',
    'generatedAt'   => gmdate('Y-m-d\TH:i:s\Z'),
    'tool'          => 'ping-servers.php',
    'pings'         => $pingsPayload,
];

$json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
if (file_put_contents($outFile, $json) === false) {
    fwrite(STDERR, "[ERROR] Failed to write output file: {$outFile}\n");
    exit(1);
}

echo "\n============================================================================\n";
echo "  FINISHED!\n";
echo "  Results saved to: {$outFile}\n";
if (!$noClip && copyToClipboard($json)) {
    echo "  Results have been automatically COPIED TO CLIPBOARD (Ctrl+V).\n";
} else {
    echo "  Copy the contents of my-pings.json and paste it on the website.\n";
}
echo "============================================================================\n";
exit(0);

// -----------------------------------------------------------------------------
// Embedded server list (updated by collect_pings.py --sync-player-dir)
// -----------------------------------------------------------------------------

function getEmbeddedServers(): array
{
    return [
// === EMBEDDED_SERVERS_START ===
    ['country' => 'OVH', 'datacenter' => 'Canada', 'ip' => '158.69.209.112'],
    ['country' => 'Oracle', 'datacenter' => 'Germany', 'ip' => '141.144.226.122'],
    ['country' => 'Hetzner', 'datacenter' => 'Germany', 'ip' => '195.201.151.197'],
    ['country' => 'OVH', 'datacenter' => 'Germany', 'ip' => '57.129.112.208'],
    ['country' => 'OVH', 'datacenter' => 'France', 'ip' => '51.178.27.242'],
    ['country' => 'OVH', 'datacenter' => 'Poland', 'ip' => '54.37.128.135'],
    ['country' => 'OVH', 'datacenter' => 'United Kingdom', 'ip' => '57.129.154.151'],
    ['country' => 'OVH', 'datacenter' => 'US-East', 'ip' => '51.81.87.10'],
    ['country' => 'BR-digital', 'datacenter' => 'Brazil', 'ip' => '201.16.9.3'],
    ['country' => 'AWS', 'datacenter' => 'Brazil (DynamoDB)', 'ip' => '35.71.106.131'],
    ['country' => 'AWS', 'datacenter' => 'Brazil (S3)', 'ip' => '3.5.232.31'],
    ['country' => 'GCP', 'datacenter' => 'Brazil (Storage REP)', 'ip' => '34.1.97.34'],
    ['country' => 'GCP', 'datacenter' => 'Brazil (Compute REP)', 'ip' => '34.190.238.132'],
    ['country' => 'Azure', 'datacenter' => 'Brazil (ACR)', 'ip' => '191.234.139.23'],
    ['country' => 'Azure', 'datacenter' => 'Brazil (SQL)', 'ip' => '191.234.142.160'],
    ['country' => 'Oracle', 'datacenter' => 'Brazil (SaoPaulo)', 'ip' => '134.70.84.3'],
    ['country' => 'Oracle', 'datacenter' => 'Brazil (Vinhedo)', 'ip' => '134.70.140.1'],
    ['country' => 'Vultr', 'datacenter' => 'Brazil (SaoPaulo)', 'ip' => '216.238.98.118'],
    ['country' => 'DataPacket', 'datacenter' => 'Brazil (Equinix SP4)', 'ip' => '138.199.4.1'],
// === EMBEDDED_SERVERS_END ===
    ];
}

function loadServersFromFile(string $path): array
{
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return [];
    }

    $servers = [];
    $seen = [];
    foreach ($lines as $i => $line) {
        if ($i === 0) {
            $line = preg_replace('/^\xEF\xBB\xBF/', '', $line);
        }
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || $line[0] === ';') {
            continue;
        }
        $parts = array_map('trim', explode(',', $line));
        if (count($parts) < 3) {
            continue;
        }
        [$country, $dc, $ip] = $parts;
        if (in_array(strtolower($ip), ['ip', 'ip address', 'adres ip', 'host'], true)) {
            continue;
        }
        // Bezpieczna walidacja celu przed przekazaniem do ping
        if (!preg_match('/^[A-Za-z0-9._:-]+$/', $ip) || isset($seen[$ip])) {
            continue;
        }
        $seen[$ip] = true;
        $servers[] = [
            'country'    => $country,
            'datacenter' => $dc,
            'ip'         => $ip,
        ];
    }
    return $servers;
}

function buildPingCommand(string $ip, int $count, int $timeoutMs): array
{
    $isIpv6 = strpos($ip, ':') !== false;
    if (PHP_OS_FAMILY === 'Windows') {
        $cmd = ['ping'];
        if ($isIpv6) {
            $cmd[] = '-6';
        }
        array_push($cmd, '-n', (string)$count, '-w', (string)$timeoutMs, $ip);
        return $cmd;
    }

    if (PHP_OS_FAMILY === 'Darwin') {
        $bin = $isIpv6 ? 'ping6' : 'ping';
        return [$bin, '-n', '-c', (string)$count, '-i', '0.2', '-W', (string)$timeoutMs, $ip];
    }

    // Linux / BSD
    $timeoutSec = max(1, (int)ceil($timeoutMs / 1000));
    $cmd = ['ping'];
    if ($isIpv6) {
        $cmd[] = '-6';
    }
    array_push($cmd, '-n', '-c', (string)$count, '-i', '0.2', '-W', (string)$timeoutSec, $ip);
    return $cmd;
}

function runParallelPings(array $servers, int $count, int $warmup, int $timeoutMs, int $concurrency): array
{
    $queue = array_values($servers);
    $running = [];
    $results = [];
    $totalPackets = $count + $warmup;

    $startNext = static function () use (&$queue, &$running, $totalPackets, $timeoutMs): void {
        if ($queue === []) {
            return;
        }
        $srv = array_shift($queue);
        $ip = $srv['ip'];
        $cmd = buildPingCommand($ip, $totalPackets, $timeoutMs);

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($proc)) {
            $results[$ip] = ['avg' => null, 'median' => null, 'min' => null, 'max' => null, 'loss' => 100.0];
            return;
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $running[$ip] = [
            'proc'   => $proc,
            'stdout' => $pipes[1],
            'stderr' => $pipes[2],
            'outBuf' => '',
            'errBuf' => '',
        ];
    };

    while ($queue !== [] || $running !== []) {
        while (count($running) < $concurrency && $queue !== []) {
            $startNext();
        }

        foreach ($running as $ip => &$job) {
            $out = stream_get_contents($job['stdout']);
            if ($out !== false && $out !== '') {
                $job['outBuf'] .= $out;
            }
            $err = stream_get_contents($job['stderr']);
            if ($err !== false && $err !== '') {
                $job['errBuf'] .= $err;
            }

            $status = proc_get_status($job['proc']);
            if (!$status['running']) {
                $outRest = stream_get_contents($job['stdout']);
                $errRest = stream_get_contents($job['stderr']);
                if ($outRest !== false) {
                    $job['outBuf'] .= $outRest;
                }
                if ($errRest !== false) {
                    $job['errBuf'] .= $errRest;
                }
                fclose($job['stdout']);
                fclose($job['stderr']);
                proc_close($job['proc']);

                $results[$ip] = parsePingOutput($job['outBuf'] . "\n" . $job['errBuf'], $warmup);
                unset($running[$ip]);
            }
        }
        unset($job);

        if ($running !== []) {
            usleep(20000);
        }
    }

    return $results;
}

function calcMedian(array $values): float
{
    sort($values);
    $n = count($values);
    $mid = intdiv($n, 2);
    if ($n % 2 === 1) {
        return round((float)$values[$mid], 2);
    }
    return round(((float)$values[$mid - 1] + (float)$values[$mid]) / 2.0, 2);
}

function extractPerPacketRtts(string $output): array
{
    $samples = [];
    // Linux / macOS: "time=3.95 ms"
    if (preg_match_all('/\btime\s*([=<])\s*([0-9.]+)\s*ms/i', $output, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $m) {
            $samples[] = $m[1] === '<' ? 0.0 : (float)$m[2];
        }
        return $samples;
    }
    // Windows (niezalezny od jezyka): "...=25ms TTL=56" lub "...<1ms TTL=128"
    if (preg_match_all('/([=<])\s*([0-9.]+)\s*(?:ms|мс|мсек)?\s+TTL=/i', $output, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $m) {
            $samples[] = $m[1] === '<' ? 0.0 : (float)$m[2];
        }
    }
    return $samples;
}

function parsePingOutput(string $output, int $warmup = 0): array
{
    $loss = null;
    $sentCount = null;
    if (preg_match('/(\d+)\s+packets?\s+transmitted,\s+(\d+)\s+(?:packets?\s+)?received.*?(\d+(?:\.\d+)?)%\s+(?:packet\s+)?loss/i', $output, $m)) {
        $sentCount = (int)$m[1];
        $loss = round((float)$m[3], 2);
    } elseif (preg_match('/(\d+(?:\.\d+)?)%\s+(?:packet\s+)?loss/i', $output, $m)) {
        $loss = round((float)$m[1], 2);
    }

    $lines = preg_split('/\r?\n/', $output) ?: [];
    $inStats = false;
    $winLoss = 100.0;
    $winSummary = null;

    foreach ($lines as $line) {
        $trim = trim($line);
        if ($trim === '') {
            continue;
        }
        $eqParts = explode('=', $trim);
        if (strpos($trim, '(') !== false && count($eqParts) >= 4) {
            $inStats = true;
            $sent = extractFirstInt($eqParts[1]);
            $lostPart = explode('(', $eqParts[3])[0];
            $lost = extractFirstInt($lostPart);
            if ($sent !== null && $sent > 0 && $lost !== null) {
                $sentCount = $sent;
                $winLoss = round(($lost * 100.0) / $sent, 2);
            }
        } elseif ($inStats && count($eqParts) >= 4) {
            $min = extractFirstInt($eqParts[1]);
            $max = extractFirstInt($eqParts[2]);
            $avg = extractFirstInt($eqParts[3]);
            if ($avg !== null) {
                $winSummary = [
                    'avg'  => (float)$avg,
                    'min'  => $min !== null ? (float)$min : (float)$avg,
                    'max'  => $max !== null ? (float)$max : (float)$avg,
                    'loss' => $winLoss,
                ];
            }
        }
    }

    $samples = extractPerPacketRtts($output);
    if ($warmup > 0 && count($samples) > $warmup) {
        $steady = array_slice($samples, $warmup);
        $steadyLoss = $loss ?? $winLoss;
        if ($sentCount !== null && $sentCount > $warmup) {
            $measuredSent = $sentCount - $warmup;
            $measuredRecv = min(count($steady), $measuredSent);
            $steadyLoss = round((($measuredSent - $measuredRecv) / $measuredSent) * 100.0, 2);
        }
        return [
            'avg'    => round(array_sum($steady) / count($steady), 2),
            'median' => calcMedian($steady),
            'min'    => round(min($steady), 2),
            'max'    => round(max($steady), 2),
            'loss'   => $steadyLoss,
        ];
    }

    // Fallback do podsumowania
    if (preg_match('/(?:rtt|round-trip)\s+min\/avg\/max(?:\/(?:mdev|stddev))?\s*=\s*([0-9.]+)\/([0-9.]+)\/([0-9.]+)/i', $output, $m)) {
        return [
            'avg'    => round((float)$m[2], 2),
            'median' => $samples !== [] ? calcMedian($samples) : round((float)$m[2], 2),
            'min'    => round((float)$m[1], 2),
            'max'    => round((float)$m[3], 2),
            'loss'   => $loss ?? 0.0,
        ];
    }

    if ($winSummary !== null) {
        $winSummary['median'] = $samples !== [] ? calcMedian($samples) : $winSummary['avg'];
        return $winSummary;
    }

    return [
        'avg'    => null,
        'median' => null,
        'min'    => null,
        'max'    => null,
        'loss'   => $loss ?? $winLoss,
    ];
}

function extractFirstInt(string $text): ?int
{
    if (preg_match('/<?(\d+)/', $text, $m)) {
        return (int)$m[1];
    }
    return null;
}

function copyToClipboard(string $text): bool
{
    $candidates = [];
    if (PHP_OS_FAMILY === 'Windows') {
        $candidates[] = ['clip'];
    } elseif (PHP_OS_FAMILY === 'Darwin') {
        $candidates[] = ['pbcopy'];
    } else {
        $candidates[] = ['wl-copy'];
        $candidates[] = ['xclip', '-selection', 'clipboard'];
        $candidates[] = ['xsel', '--clipboard', '--input'];
    }

    foreach ($candidates as $cmd) {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = @proc_open($cmd, $descriptors, $pipes);
        if (is_resource($proc)) {
            fwrite($pipes[0], $text);
            fclose($pipes[0]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            if (proc_close($proc) === 0) {
                return true;
            }
        }
    }
    return false;
}

function parseCliArgs(array $argv): array
{
    $result = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (strpos($arg, '--') !== 0) {
            continue;
        }
        $body = substr($arg, 2);
        if (strpos($body, '=') !== false) {
            [$k, $v] = explode('=', $body, 2);
            $result[$k] = $v;
        } else {
            $result[$body] = true;
        }
    }
    return $result;
}
