import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeGoldenState, makeEnemy, runScenario } from './goldenHarness';

/**
 * Golden Master characterization baseline.
 *
 * Freezes the current runRaidTick behavior as committed JSON transcripts.
 * These files are the regression contract for the Phase 3 AsyncGenerator
 * conversion — any change to simulation behavior (intentional or not) shows up
 * as a diff here. Regenerate with: vitest run -u
 */

const GOLDEN_DIR = "../__golden__";

const TERMINAL_STATUSES = ["kia", "extracted"];

const assertTranscriptInvariants = (result: ReturnType<typeof runScenario>) => {
  const lines = JSON.parse(result.transcript) as Array<{
    status: string;
    killsByTier: Record<string, number>;
    pmc: { hp: number[]; energy: number; hydration: number };
  }>;

  expect(lines.length).toBe(result.ticks);
  expect(TERMINAL_STATUSES).toContain(result.finalStatus);
  expect(lines[lines.length - 1].status).toBe(result.finalStatus);

  for (const line of lines) {
    for (const hp of line.pmc.hp) expect(hp).toBeGreaterThanOrEqual(0);
    expect(line.pmc.energy).toBeGreaterThanOrEqual(0);
    expect(line.pmc.energy).toBeLessThanOrEqual(100);
    expect(line.pmc.hydration).toBeGreaterThanOrEqual(0);
    expect(line.pmc.hydration).toBeLessThanOrEqual(100);
    for (const value of Object.values(line.killsByTier)) expect(value).toBeGreaterThanOrEqual(0);
  }
};

describe('Golden Master characterization baseline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extraction run: fresh deploy through map, encounters, and extract', async () => {
    const result = runScenario(4, () => {});
    await expect(result.transcript).toMatchFileSnapshot(`${GOLDEN_DIR}/scenario-extraction.json`);
    expect(result.finalStatus).toBe("extracted");
    expect(result.ticks).toBeLessThan(300);
    assertTranscriptInvariants(result);
  });

  it('combat run: preset combat against a deterministic Scav until resolution', async () => {
    const result = runScenario(1337, (state) => {
      state.activeRaid.status = "combat";
      state.activeRaid.combatTarget = makeEnemy();
    });
    await expect(result.transcript).toMatchFileSnapshot(`${GOLDEN_DIR}/scenario-combat.json`);
    expect(result.finalStatus).toBe("extracted");
    expect(result.ticks).toBeLessThan(300);
    assertTranscriptInvariants(result);
  });

  it('dehydration KIA run: hydration collapse triggers the death pipeline', async () => {
    const result = runScenario(7, (state) => {
      state.pmc.hydration = 0;
    });
    await expect(result.transcript).toMatchFileSnapshot(`${GOLDEN_DIR}/scenario-dehydration.json`);
    expect(result.finalStatus).toBe("kia");
    expect(result.ticks).toBe(1);
    assertTranscriptInvariants(result);
  });
});
