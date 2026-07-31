/**
 * Free a TCP port before Nest starts (avoids Windows EADDRINUSE from stale watch children).
 * Usage: node scripts/free-port.mjs [port]
 */
const { execSync } = require('child_process');

const port = Number(process.argv[2] || process.env.PORT || 3000);

function pidsListeningOn(p) {
  if (process.platform === 'win32') {
    try {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        // e.g. TCP    0.0.0.0:3000  ...  LISTENING  1234
        const m = line.match(new RegExp(`:${p}\\s+.+LISTENING\\s+(\\d+)\\s*$`, 'i'));
        if (m) pids.add(Number(m[1]));
      }
      return [...pids].filter((pid) => pid > 0);
    } catch {
      return [];
    }
  }

  try {
    const out = execSync(`lsof -ti tcp:${p} -sTCP:LISTEN`, {
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

const pids = pidsListeningOn(port);
for (const pid of pids) {
  if (pid === process.pid) continue;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    // eslint-disable-next-line no-console
    console.log(`[free-port] freed :${port} (killed pid ${pid})`);
  } catch {
    /* already gone */
  }
}

if (pids.length === 0) {
  // eslint-disable-next-line no-console
  console.log(`[free-port] :${port} was free`);
}
