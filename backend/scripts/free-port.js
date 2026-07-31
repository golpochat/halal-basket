/**
 * Free a TCP port (and stale Nest watch siblings on Windows).
 * Used by start scripts and by main.ts before every listen (watch restarts).
 */
const { execSync } = require('child_process');

function pidsListeningOn(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const m = line.match(
          new RegExp(`:${port}\\s+.+LISTENING\\s+(\\d+)\\s*$`, 'i'),
        );
        if (m) pids.add(Number(m[1]));
      }
      return [...pids].filter((pid) => pid > 0);
    } catch {
      return [];
    }
  }

  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
    });
    return out
      .split(/\s+/)
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

/** Kill other Halal Basket Nest watch parents so only one watcher remains. */
function killDuplicateNestWatchers() {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(
      'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /FORMAT:CSV',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    );
    const self = process.pid;
    for (const line of out.split(/\r?\n/)) {
      if (!/nest\.js["']?\s+start\s+--watch/i.test(line)) continue;
      if (!/Halal Basket/i.test(line) && !/Halal-Basket/i.test(line)) {
        // workspace path may be encoded; also match backend nest
        if (!/backend/i.test(line)) continue;
      }
      const m = line.match(/,(\d+)\s*$/);
      const pid = m ? Number(m[1]) : 0;
      if (!pid || pid === self) continue;
      // Do not kill our own process tree parent indiscriminately when called from child —
      // only kill watchers when invoked from the start script (see freePort options).
      if (killPid(pid)) {
        // eslint-disable-next-line no-console
        console.log(`[free-port] killed duplicate nest --watch pid ${pid}`);
      }
    }
  } catch {
    /* wmic unavailable */
  }
}

/**
 * @param {number} port
 * @param {{ killDuplicateWatchers?: boolean }} [opts]
 */
function freePort(port, opts = {}) {
  const p = Number(port) || 3000;
  if (opts.killDuplicateWatchers) {
    killDuplicateNestWatchers();
  }

  const pids = pidsListeningOn(p);
  for (const pid of pids) {
    if (killPid(pid)) {
      // eslint-disable-next-line no-console
      console.log(`[free-port] freed :${p} (killed pid ${pid})`);
    }
  }

  if (pids.length === 0 && !opts.quiet) {
    // eslint-disable-next-line no-console
    console.log(`[free-port] :${p} was free`);
  }

  return pids;
}

module.exports = { freePort, pidsListeningOn, killPid };

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 3000);
  freePort(port, { killDuplicateWatchers: true });
}
