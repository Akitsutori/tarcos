import { RaidLog } from "../types";

/**
 * Log id source. Log ids are cosmetic (React keys, debug tooling), so they
 * must NOT draw from the simulation's Math.random stream — otherwise adding a
 * log line would shift every subsequent combat roll and change raid outcomes,
 * and goldens would need re-baselining for pure log edits.
 *
 * Ids are scoped per tick: the generator resets the sequence at every tick
 * boundary via resetLogSequence(), and a per-`elapsedSeconds` sequence counter
 * disambiguates the multiple logs created within one tick. Because
 * `elapsedSeconds` strictly increases across ticks (TICK_SECONDS_MIN > 0), ids
 * stay unique within a raid's accumulated log list, and an identical run
 * replayed in the same process produces identical ids (e.g. the
 * generator-drain vs wrapper equality test).
 */
let lastLogSecond: number | null = null;
let logIdSeq = 0;

/**
 * Resets the log id sequence. Called by the raid-tick generator at the start
 * of every tick so each tick's logs begin at sequence 1.
 */
export const resetLogSequence = (): void => {
  lastLogSecond = null;
  logIdSeq = 0;
};

/**
 * Creates a standard log entry with padded timestamp.
 * 
 * @param message The text content of the log
 * @param type Category of log for styling
 * @param elapsedSeconds Elapsed time in the raid
 * @returns Formatted RaidLog object
 */
export const createLog = (message: string, type: RaidLog["type"], elapsedSeconds: number): RaidLog => {
  if (elapsedSeconds !== lastLogSecond) {
    lastLogSecond = elapsedSeconds;
    logIdSeq = 0;
  }
  logIdSeq++;
  const min = Math.floor(elapsedSeconds / 60);
  const sec = elapsedSeconds % 60;
  const timestamp = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return {
    id: `log_${elapsedSeconds}_${logIdSeq}`,
    timestamp,
    message,
    type
  };
};
