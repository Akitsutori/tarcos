/**
 * ui:check — real-DOM layout verification for the tokenized screens.
 *
 * Boots a Vite dev server on a throwaway port, drives the app with
 * Playwright against the system Edge/Chrome (no browser download needed),
 * navigates to the Stash tab, and asserts no clipped overflow / page scroll
 * at a desktop reference size (1920x1080) and a high-res size (2560x1440).
 *
 * Contract being verified:
 *   - the page never scrolls (layout is viewport-anchored via h-app-viewport)
 *   - every overflow lives inside a bounded, internally-scrolling column,
 *     so the weapons vault can never sit under the page footer
 *   - at 1440p the whole sidebar fits with zero internal scroll
 *
 * Usage: npm run ui:check   (exit code 0 = clean, 1 = a check failed)
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright-core";

const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const VITE_BIN = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`Vite dev server did not respond on ${url}`);
}

async function launchBrowser() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* try next channel */
    }
  }
  return chromium.launch();
}

const results = [];
const report = (viewport, label, ok, detail = "") => {
  results.push({ ok });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`${tag}  [${viewport}] ${label}${detail ? `   (${detail})` : ""}`);
};

async function measureStash(page) {
  return page.evaluate(() => {
    const isSpilling = (el) => {
      const s = getComputedStyle(el);
      return el.scrollWidth > el.clientWidth + 2 && (s.overflowX === "visible" || s.overflowX === "clip");
    };
    const verticalSpill = (el) => {
      const s = getComputedStyle(el);
      return el.scrollHeight > el.clientHeight + 2 && (s.overflowY === "visible" || s.overflowY === "clip");
    };
    const rectOf = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    };
    const scope = document.getElementById("stash-screen") || document.body;
    const horiz = [...scope.querySelectorAll("*")]
      .filter(isSpilling)
      .slice(0, 8)
      .map((el) => el.id || el.className?.toString().slice(0, 40) || el.tagName);
    const vspill = [...scope.querySelectorAll("*")].filter(verticalSpill).length;
    const catBtns = [...scope.querySelectorAll('[id^="stash-cat-"]')];
    const catLines = catBtns.length ? new Set(catBtns.map((b) => b.offsetTop)).size : null;
    const doc = document.documentElement;
    const grid = document.getElementById("stash-grid");
    const sidebar = document.getElementById("stash-sidebar");
    const sRect = sidebar?.getBoundingClientRect();
    return {
      docScrollW: doc.scrollWidth,
      docScrollH: doc.scrollHeight,
      vw: window.innerWidth,
      vh: window.innerHeight,
      horiz,
      vspill,
      catLines,
      vitals: rectOf("stash-vitals-card"),
      armor: rectOf("stash-armor-card"),
      vault: rectOf("stash-weapons-card"),
      sidebar: sRect ? { top: Math.round(sRect.top), bottom: Math.round(sRect.bottom) } : null,
      sidebarScrolls: sidebar ? sidebar.scrollHeight - sidebar.clientHeight : null,
      gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      gridItems: grid ? grid.children.length : null,
    };
  });
}

async function runViewport(browser, width, height, expectFullFit) {
  const page = await browser.newPage({ viewport: { width, height } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) pageErrors.push(m.text());
  });

  await page.goto(BASE + "/", { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector("#tab-stash-btn", { timeout: 15000 });
  await page.click("#tab-stash-btn");
  await page.waitForSelector("#stash-screen", { timeout: 15000 });
  await page.waitForTimeout(800);

  const vp = `${width}x${height}`;
  const m = await measureStash(page);

  report(vp, "no page-level horizontal overflow", m.docScrollW <= m.vw, `${m.docScrollW} <= ${m.vw}`);
  report(vp, "no page-level vertical scroll", m.docScrollH <= m.vh + 1, `${m.docScrollH} <= ${m.vh}`);
  report(vp, "no clipped horizontal overflow inside #stash-screen", m.horiz.length === 0, m.horiz.join(", ") || "clean");
  report(vp, "no invisible vertical spill inside #stash-screen", m.vspill === 0, String(m.vspill));
  report(vp, "vitals strip fully on screen", !!m.vitals && m.vitals.top >= 0 && m.vitals.bottom <= m.vh, JSON.stringify(m.vitals));
  report(
    vp,
    "sidebar bounded on screen (vault can never sit under the footer)",
    !!m.sidebar && m.sidebar.bottom <= m.vh + 1,
    m.sidebar ? `bottom=${m.sidebar.bottom} <= ${m.vh}` : "sidebar missing"
  );
  report(
    vp,
    "armor card at top of the scrollable sidebar (reachable)",
    !!m.armor && !!m.sidebar && m.armor.top >= m.sidebar.top - 2,
    `armor.top=${m.armor?.top} sidebar.top=${m.sidebar?.top}`
  );
  report(
    vp,
    "weapons vault reachable inside sidebar (above footer, scrollable)",
    !!m.vault && !!m.sidebar && m.vault.top >= m.sidebar.top - 2,
    `vault.top=${m.vault?.top} sidebar scroll=${m.sidebarScrolls}px`
  );
  report(vp, "category bar is a single line", m.catLines === 1, `lines=${m.catLines}`);
  report(
    vp,
    "item grid uses token column count (2)",
    !!m.gridCols && m.gridCols.trim().split(/\s+/).length === 2,
    m.gridCols ? `${m.gridCols} (${m.gridItems} items)` : "grid not rendered (empty stash)"
  );
  if (expectFullFit) {
    report(vp, "sidebar fits with negligible internal scroll at 1440p (<= 8px)", m.sidebarScrolls !== null && m.sidebarScrolls <= 8, `${m.sidebarScrolls}px`);
  }
  report(vp, "no page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | ") || "clean");

  await page.close();
}

const dev = spawn(process.execPath, [VITE_BIN, "--port", String(PORT), "--host", "127.0.0.1", "--strictPort"], {
  cwd: process.cwd(),
  stdio: "ignore",
  windowsHide: true,
});

let browser;
try {
  await waitForServer(BASE + "/");
  browser = await launchBrowser();
  await runViewport(browser, 1920, 1080, false);
  await runViewport(browser, 2560, 1440, true);
} catch (e) {
  console.error("\nui:check harness error:", e.message || e);
  results.push({ ok: false });
} finally {
  if (browser) await browser.close().catch(() => {});
  dev.kill();
  await sleep(300);
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? "\nui:check OK — layout fits and scrolls only inside bounded columns" : `\nui:check FAILED — ${failed} check(s) failing`);
process.exit(failed === 0 ? 0 : 1);
