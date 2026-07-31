import { Quest } from "../../types";

// Trader Quest database (25 unique quests matching GDD Section 14)
export const ALL_QUESTS: Quest[] = [
  // PRAPOR (10 quests)
  { id: "prapor_01", name: "Debut", trader: "prapor", type: "Kill", target: "Scav", count: 5, progress: 0, completed: false, rewardXp: 80 },
  { id: "prapor_02", name: "Counter-Sniper", trader: "prapor", type: "Kill", target: "PMC", count: 3, progress: 0, completed: false, rewardXp: 150 },
  { id: "prapor_03", name: "Big Score", trader: "prapor", type: "Kill", target: "Killa", count: 1, progress: 0, completed: false, rewardXp: 300 },
  { id: "prapor_04", name: "Pocket Watch", trader: "prapor", type: "Find", target: "golden_pocket_watch", count: 1, progress: 0, completed: false, rewardXp: 150 },
  { id: "prapor_05", name: "Bronze Age", trader: "prapor", type: "Find", target: "bronze_pocket_watch", count: 1, progress: 0, completed: false, rewardXp: 120 },
  { id: "prapor_06", name: "Tissue Issues", trader: "prapor", type: "Find", target: "toilet_paper", count: 1, progress: 0, completed: false, rewardXp: 300 },
  { id: "prapor_07", name: "Big Game Hunter", trader: "prapor", type: "Kill", target: "Boss", count: 1, progress: 0, completed: false, rewardXp: 400 },
  { id: "prapor_08", name: "Pocket Change", trader: "prapor", type: "Collect", target: "5000", count: 5000, progress: 0, completed: false, rewardXp: 250 },
  { id: "prapor_09", name: "Full Auto", trader: "prapor", type: "Kill", target: "PMC", count: 5, progress: 0, completed: false, rewardXp: 200 },
  { id: "prapor_10", name: "Scav Massacre", trader: "prapor", type: "Kill", target: "Scav", count: 15, progress: 0, completed: false, rewardXp: 350 },

  // THERAPIST (7 quests)
  { id: "therapist_01", name: "Explorer", trader: "therapist", type: "Extract", target: "Any", count: 3, progress: 0, completed: false, rewardXp: 60 },
  { id: "therapist_02", name: "Scrap Metal", trader: "therapist", type: "Collect", target: "2000", count: 2000, progress: 0, completed: false, rewardXp: 50 },
  { id: "therapist_03", name: "Deep Pockets", trader: "therapist", type: "Extract", target: "Any", count: 5, progress: 0, completed: false, rewardXp: 100 },
  { id: "therapist_04", name: "Back Pain", trader: "therapist", type: "Extract", target: "Any", count: 6, progress: 0, completed: false, rewardXp: 120 },
  { id: "therapist_05", name: "The Doctor is Out", trader: "therapist", type: "Extract", target: "no_medkit", count: 1, progress: 0, completed: false, rewardXp: 200 },
  { id: "therapist_06", name: "Blood Bank", trader: "therapist", type: "Valuables", target: "Valuables", count: 8, progress: 0, completed: false, rewardXp: 150 },
  { id: "therapist_07", name: "Check-up", trader: "therapist", type: "Extract", target: "Any", count: 8, progress: 0, completed: false, rewardXp: 160 },

  // RAGMAN (8 quests)
  { id: "ragman_01", name: "Collector", trader: "ragman", type: "Valuables", target: "Valuables", count: 3, progress: 0, completed: false, rewardXp: 100 },
  { id: "ragman_02", name: "Lend-Lease", trader: "ragman", type: "Find", target: "ledx", count: 1, progress: 0, completed: false, rewardXp: 200 },
  { id: "ragman_03", name: "Hardware", trader: "ragman", type: "Valuables", target: "Valuables", count: 6, progress: 0, completed: false, rewardXp: 150 },
  { id: "ragman_04", name: "Tetriz Hunter", trader: "ragman", type: "Find", target: "tetriz", count: 1, progress: 0, completed: false, rewardXp: 180 },
  { id: "ragman_05", name: "Rags to Riches", trader: "ragman", type: "Valuables", target: "Valuables", count: 12, progress: 0, completed: false, rewardXp: 200 },
  { id: "ragman_06", name: "Fashionably Late", trader: "ragman", type: "Collect", target: "4000", count: 4000, progress: 0, completed: false, rewardXp: 180 },
  { id: "ragman_07", name: "Threadbare", trader: "ragman", type: "Valuables", target: "Valuables", count: 5, progress: 0, completed: false, rewardXp: 120 },
  { id: "ragman_08", name: "Hand-Me-Down", trader: "ragman", type: "Extract", target: "Any", count: 5, progress: 0, completed: false, rewardXp: 110 }
];
