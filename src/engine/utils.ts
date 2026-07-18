import { RaidLog } from "../types";

/**
 * Creates a standard log entry with padded timestamp.
 * 
 * @param message The text content of the log
 * @param type Category of log for styling
 * @param elapsedSeconds Elapsed time in the raid
 * @returns Formatted RaidLog object
 */
export const createLog = (message: string, type: RaidLog["type"], elapsedSeconds: number): RaidLog => {
  const min = Math.floor(elapsedSeconds / 60);
  const sec = elapsedSeconds % 60;
  const timestamp = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return {
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    message,
    type
  };
};
