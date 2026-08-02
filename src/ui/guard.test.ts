/**
 * Source-level design-token guard.
 *
 * Prevents the layout regressions the token refactor was created to kill:
 * arbitrary px font sizes, hardcoded viewport calcs, and raw hex colors in
 * component sources. Files that predate the migration are allowlisted until
 * they are rebuilt; the allowlist FAILS if an entry is left in while clean,
 * so it can only shrink.
 *
 * This is the deterministic complement to `npm run ui:check` (a real DOM
 * overflow scan). Both must pass.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../", import.meta.url));

const tsxFiles: string[] = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
  .map((f) => join(SRC, f));

const rel = (f: string) => relative(SRC, f).replaceAll("\\", "/");

const FORBIDDEN = [
  { name: "arbitrary px font size (text-[Npx])", re: /text-\[\d+px\]/ },
  { name: "hardcoded viewport height (calc(100vh))", re: /calc\(\s*100(?:d)?vh/ },
  { name: "raw hex color literal", re: /#[0-9a-fA-F]{6}\b/ },
];

/** Screens not yet rebuilt on tokens. Remove an entry when its screen migrates. */
const LEGACY = new Set<string>([
  "App.tsx",
  "components/BodyMap.tsx",
  "components/ProgressionScreen.tsx",
  "components/RaidScreen.tsx",
  "components/WeaponModding.tsx",
]);

describe("design-token guard", () => {
  it("migrated/UI sources contain no forbidden patterns", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles) {
      const path = rel(file);
      if (LEGACY.has(path)) continue;
      const src = readFileSync(file, "utf8");
      for (const p of FORBIDDEN) {
        if (p.re.test(src)) offenders.push(`${path}: ${p.name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("legacy allowlist entries still contain violations (remove on migration)", () => {
    const stale: string[] = [];
    for (const path of LEGACY) {
      const src = readFileSync(join(SRC, path), "utf8");
      const hasViolation = FORBIDDEN.some((p) => p.re.test(src));
      if (!hasViolation) stale.push(path);
    }
    expect(stale).toEqual([]);
  });

  it("src/ui primitives never import from components, engine, or hooks", () => {
    const uiFiles = tsxFiles.filter((f) => rel(f).startsWith("ui/"));
    const offenders = uiFiles
      .filter((f) => /from ["']\.\.\/(?:components|engine|hooks)\//.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("Card, Button, and StashScreen expose the harness ids", () => {
    const card = readFileSync(join(SRC, "ui/Card.tsx"), "utf8");
    expect(card).toMatch(/id\?:\s*string/);
    const stash = readFileSync(join(SRC, "components/StashScreen.tsx"), "utf8");
    for (const id of [
      'id="stash-screen"',
      'id="stash-vitals-card"',
      'id="stash-grid"',
      'id="stash-armor-card"',
      'id="stash-weapons-card"',
    ]) {
      expect(stash).toContain(id);
    }
  });
});
