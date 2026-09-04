// Headless-Chromium driver for local verification of this app.
//
// There is no chromium-cli in the Claude Code container, but Playwright's
// Chromium is pre-installed under /opt/pw-browsers. The directory is version
// suffixed (chromium-1194, ...) and the bare `chromium/` path does NOT exist,
// so the binary is discovered rather than hardcoded — a browser bump would
// otherwise break this silently.
//
// Usage:
//   node drive.mjs <path> [screenshotName]        quick screenshot of one route
//   import { withPage } from "./drive.mjs"        drive it yourself
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

// playwright-core is deliberately not a project dependency, so it is installed
// into a scratch directory instead. Node resolves imports relative to THIS
// file (inside the repo), not the cwd, so a bare import would miss that install
// entirely — resolve it from PW_DIR explicitly.
function loadChromium() {
  try {
    return createRequire(import.meta.url)("playwright-core").chromium;
  } catch {}
  const dir = process.env.PW_DIR;
  if (!dir) {
    throw new Error(
      "playwright-core not found. Install it in a scratch dir and point PW_DIR at that dir:\n" +
        "  cd \"$SCRATCH\" && npm init -y >/dev/null && npm i playwright-core\n" +
        "  PW_DIR=\"$SCRATCH\" node <this script> /budget"
    );
  }
  return createRequire(join(dir, "package.json"))("playwright-core").chromium;
}

const chromium = loadChromium();

const BASE = process.env.APP_URL || "http://localhost:3000";
const ROOT = "/opt/pw-browsers";

export function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const dir = readdirSync(ROOT).find((d) => /^chromium-\d+$/.test(d));
  if (!dir) throw new Error(`No chromium-<version> under ${ROOT}: ${readdirSync(ROOT).join(", ")}`);
  const bin = join(ROOT, dir, "chrome-linux", "chrome");
  if (!existsSync(bin)) throw new Error(`Chromium missing at ${bin}`);
  return bin;
}

// The agent proxy makes some outbound requests fail; those console errors are
// environment noise, not app errors, so they are filtered out of `errors`.
const NOISE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY/;

export async function withPage(fn, { viewport = { width: 1280, height: 1400 } } = {}) {
  const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--no-sandbox"] });
  const errors = [];
  try {
    const page = await (await browser.newContext({ viewport })).newPage();
    page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    // Next compiles routes on demand, so the first navigation can take 10s+.
    page.goto_ = (path) => page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const result = await fn(page, errors);
    return { result, errors };
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2] || "/dashboard";
  const name = process.argv[3] || path.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "page";
  const out = `${process.env.SHOT_DIR || "."}/${name}.png`;
  const { errors } = await withPage(async (page) => {
    await page.goto_(path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: out, fullPage: true });
  });
  console.log(`screenshot: ${out}`);
  console.log("console errors:", errors.length ? errors : "none");
}
