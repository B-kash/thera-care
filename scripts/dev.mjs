/**
 * FR-03: one-path local dev from repo root.
 * - Postgres on 5433: if already reachable, skip Docker (no restart).
 * - Else: `docker compose up -d --no-recreate`
 * - seed .env / .env.local from *.example when missing
 * - npm install in backend + frontend when node_modules missing **or** package-lock
 *   fingerprint changed since last dev run (branch switch). First run with both
 *   node_modules present but no stamp: writes stamp only (no reinstall).
 * - After lock-driven reinstall: remove frontend/.next (stale Turbopack cache).
 *   Opt out: THERA_SKIP_CLEAN_NEXT=1
 * - Force reinstall + clean: THERA_SYNC_DEPS=1
 * - prisma migrate + generate (optional THERA_SKIP_MIGRATE=1)
 *
 * Run modes after setup:
 * - Default: Nest + Next in this terminal (stdio inherit, no pipe buffering).
 * - THERA_PREFIX_LOGS=1: one terminal, `concurrently` prefixes [api] / [web].
 * - THERA_SPLIT_TERMINALS=1 + win32: opens two cmd windows (web, then API). Docker
 *   already ran in this shell; close each window to stop that server. This process exits.
 */
import { createHash } from "node:crypto";
import { spawn, execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const backendRoot = join(root, "backend");
const frontendRoot = join(root, "frontend");

const DB_HOST = "127.0.0.1";
const DB_PORT = 5433;
const WAIT_MS = 90_000;

const skipMigrate =
  process.env.THERA_SKIP_MIGRATE === "1" ||
  process.env.THERA_SKIP_MIGRATE === "true";

const prefixLogs =
  process.env.THERA_PREFIX_LOGS === "1" ||
  process.env.THERA_PREFIX_LOGS === "true";

const splitTerminals =
  process.env.THERA_SPLIT_TERMINALS === "1" ||
  process.env.THERA_SPLIT_TERMINALS === "true";

const lockStampPath = join(root, ".thera-dev-lock-stamp");
const forceSyncDeps =
  process.env.THERA_SYNC_DEPS === "1" ||
  process.env.THERA_SYNC_DEPS === "true";
const skipCleanNext =
  process.env.THERA_SKIP_CLEAN_NEXT === "1" ||
  process.env.THERA_SKIP_CLEAN_NEXT === "true";

function lockFingerprint() {
  const chunks = [backendRoot, frontendRoot].map((dir) => {
    const p = join(dir, "package-lock.json");
    return existsSync(p) ? readFileSync(p) : Buffer.alloc(0);
  });
  return createHash("sha256").update(Buffer.concat(chunks)).digest("hex");
}

function readLockStamp() {
  try {
    return readFileSync(lockStampPath, "utf8").trim();
  } catch {
    return "";
  }
}

function writeLockStamp(fp) {
  writeFileSync(lockStampPath, `${fp}\n`, "utf8");
}

function runRoot(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true });
}

function runIn(cwd, cmd) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

function probePortOpen(host, port, connectMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, connectMs);
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      const socket = net.createConnection({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(
            new Error(
              `Postgres not accepting connections on ${host}:${port} within ${timeoutMs}ms. Is Docker running and port ${port} free?`,
            ),
          );
          return;
        }
        setTimeout(attempt, 500);
      });
    }
    attempt();
  });
}

function ensureFileFromExample(targetPath, examplePath, label) {
  if (existsSync(targetPath)) return;
  if (!existsSync(examplePath)) {
    throw new Error(`Missing ${examplePath}; cannot create ${label}`);
  }
  copyFileSync(examplePath, targetPath);
  console.log(`Created ${label} from example.`);
}

/** `cmd /k` string: escape double-quotes for paths inside "...". */
function cmdQuoteInner(p) {
  return p.replace(/"/g, '""');
}

/**
 * Windows only: new console per command. Parent does not own child lifecycle (no Ctrl+C here).
 * Order: web first, API second (Docker + migrate already ran in parent).
 *
 * `start` requires a **quoted** title as first arg; unquoted `TheraWeb` is treated as an .exe path
 * → "Windows cannot find 'TheraWeb'" popup.
 */
function launchWindowsSplitTerminals(webLine, apiLine, env) {
  const cmdShell = process.env.ComSpec || "cmd.exe";
  const run = (title, inner) => {
    const safeTitle = title.replace(/"/g, "'");
    const line = `start "${safeTitle}" cmd /k ${JSON.stringify(inner)}`;
    execSync(line, { cwd: root, env, shell: cmdShell, stdio: "ignore" });
  };
  run("Thera Web", webLine);
  run("Thera API", apiLine);
}

async function runSetup() {
  const dbAlreadyUp = await probePortOpen(DB_HOST, DB_PORT);
  if (dbAlreadyUp) {
    console.log(
      `${DB_HOST}:${DB_PORT} already accepts connections — skipping Docker Compose (no container restart).\n`,
    );
  } else {
    console.log(
      "Postgres not reachable — starting stack with Docker (no recreate if containers exist)…",
    );
    try {
      runRoot("docker compose up -d --no-recreate");
    } catch {
      console.error(
        "\nDocker Compose failed. Install Docker Desktop / engine, then retry.\n",
      );
      process.exit(1);
    }
    console.log(`Waiting for ${DB_HOST}:${DB_PORT}…`);
    await waitForPort(DB_HOST, DB_PORT, WAIT_MS);
    console.log("Database port is open.\n");
  }

  ensureFileFromExample(
    join(backendRoot, ".env"),
    join(backendRoot, ".env.example"),
    "backend/.env",
  );
  ensureFileFromExample(
    join(frontendRoot, ".env.local"),
    join(frontendRoot, ".env.example"),
    "frontend/.env.local",
  );

  const fp = lockFingerprint();
  const stamp = readLockStamp();
  const backendNm = join(backendRoot, "node_modules");
  const frontendNm = join(frontendRoot, "node_modules");
  const bothNm = existsSync(backendNm) && existsSync(frontendNm);
  const depsStale = Boolean(fp) && Boolean(stamp) && fp !== stamp;
  const coldStart = !bothNm;

  if (!stamp && bothNm && !forceSyncDeps) {
    writeLockStamp(fp);
    console.log(
      "Lock stamp initialized (.thera-dev-lock-stamp). Future runs reinstall when package-lock.json changes.\n",
    );
  } else if (forceSyncDeps || coldStart || depsStale) {
    if (forceSyncDeps) {
      console.log("THERA_SYNC_DEPS=1 — reinstalling backend + frontend…\n");
    } else if (depsStale) {
      console.log(
        "package-lock.json changed since last dev run — reinstalling deps (branch switch?).\n",
      );
    }
    if (!existsSync(backendNm) || forceSyncDeps || depsStale) {
      console.log("Installing backend dependencies…\n");
      runIn(backendRoot, "npm install");
    }
    if (!existsSync(frontendNm) || forceSyncDeps || depsStale) {
      console.log("Installing frontend dependencies…\n");
      runIn(frontendRoot, "npm install");
    }
    if ((depsStale || forceSyncDeps) && !skipCleanNext) {
      const nextDir = join(frontendRoot, ".next");
      if (existsSync(nextDir)) {
        console.log("Removing frontend/.next (stale build cache)…\n");
        rmSync(nextDir, { recursive: true, force: true });
      }
    }
    if (fp) writeLockStamp(fp);
  }

  if (skipMigrate) {
    console.log(
      "Skipping Prisma (THERA_SKIP_MIGRATE=1). Run `cd backend && npx prisma migrate deploy` when you need migrations.\n",
    );
  } else {
    console.log("Applying Prisma migrations…\n");
    runIn(backendRoot, "npx prisma migrate deploy");
    console.log("");
    runIn(backendRoot, "npx prisma generate");
    console.log("");
  }
}

const env = {
  ...process.env,
  BACKEND_INTERNAL_URL:
    process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:4000",
};

await runSetup();

if (splitTerminals && process.platform === "win32") {
  const apiCmd = `cd /d "${cmdQuoteInner(backendRoot)}" && npm run start:dev`;
  const webCmd = `cd /d "${cmdQuoteInner(frontendRoot)}" && npm run dev`;
  console.log(
    "Opening two windows: TheraWeb (frontend), TheraAPI (backend). Docker + migrate already ran in this shell.\n" +
      "Close each window to stop that app. This shell exits — Ctrl+C here does not stop those windows.\n",
  );
  launchWindowsSplitTerminals(webCmd, apiCmd, env);
  process.exit(0);
}

if (splitTerminals && process.platform !== "win32") {
  console.warn(
    "\nTHERA_SPLIT_TERMINALS=1 only auto-opens new consoles on Windows.\n" +
      "On macOS/Linux: open two terminals yourself, or use THERA_PREFIX_LOGS=1 for prefixed logs in one terminal.\n" +
      "Continuing in this terminal…\n",
  );
}

if (prefixLogs) {
  if (!existsSync(join(root, "node_modules", "concurrently"))) {
    console.error(
      "\nMissing root devDependency `concurrently`. From repo root run: npm install\n" +
        "Then: THERA_PREFIX_LOGS=1 npm run dev\n",
    );
    process.exit(1);
  }
  console.log(
    "Starting api + web with prefixed logs (THERA_PREFIX_LOGS=1). Ctrl+C stops both.\n",
  );
  const mux = spawn("npm", ["run", "dev:multiplex"], {
    cwd: root,
    shell: true,
    stdio: "inherit",
    env,
  });
  mux.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => {
    mux.kill("SIGTERM");
    setTimeout(() => process.exit(0), 500).unref();
  });
  process.on("SIGTERM", () => mux.kill("SIGTERM"));
} else {
  const api = spawn("npm", ["run", "start:dev"], {
    cwd: backendRoot,
    shell: true,
    stdio: "inherit",
    env,
  });

  const web = spawn("npm", ["run", "dev"], {
    cwd: frontendRoot,
    shell: true,
    stdio: "inherit",
    env,
  });

  console.log(
    "API: http://localhost:4000  ·  Web: http://localhost:3000  ·  Ctrl+C stops both.\n",
  );

  let shuttingDown = false;
  let childExitHandled = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} — stopping dev servers…`);
    api.kill("SIGTERM");
    web.kill("SIGTERM");
    setTimeout(() => process.exit(0), 1500).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  function onChildExit(label, code, sig) {
    if (shuttingDown) return;
    if (childExitHandled) return;
    childExitHandled = true;
    if (code !== 0 && code !== null) {
      console.error(`\n[${label}] exited (${sig ?? code})`);
    }
    try {
      web.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    try {
      api.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    process.exit(code === 0 || code === null ? 0 : code ?? 1);
  }

  api.on("exit", (code, sig) => onChildExit("api", code, sig));
  web.on("exit", (code, sig) => onChildExit("web", code, sig));
}
