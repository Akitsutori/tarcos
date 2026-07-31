import { MapData, RoomTile } from "../../types";

// 6 Room Types for Procedural Generation (GDD Section 3)
export const ROOM_TEMPLATES = [
  { name: "Factory Floor", description: "An abandoned factory floor with conveyor belts and industrial machinery.", type: "factory_floor" },
  { name: "Offices", description: "A set of offices with overturned desks and filing cabinets.", type: "offices" },
  { name: "Garage", description: "A vehicle garage with oil stains and tool benches.", type: "garage" },
  { name: "Cafeteria", description: "A large cafeteria with overturned tables and scattered trays.", type: "cafeteria" },
  { name: "Server Room", description: "A cooled server room with blinking equipment racks.", type: "server_room" },
  { name: "Armory", description: "A weapons storage room with empty weapon racks.", type: "armory" }
];

// Map deployment specifications
export const ALL_MAPS: MapData[] = [
  {
    id: "factory",
    name: "Factory",
    description: "An abandoned chemical plant. Compact, chaotic, and dangerous. High scavenger activity.",
    difficulty: "Easy",
    stagesCount: 15, // GDD tile range: 15-22
    scavSpawnChance: 0.50,
    pmcSpawnChance: 0.15,
    bossSpawnChance: 0.10,
    bossName: "Tagilla",
    lootMultiplier: 1.0,
    levelRequired: 1,
    color: "amber"
  },
  {
    id: "customs",
    name: "Customs",
    description: "Industrial park near a major transit hub. Features offices, bridges, dorms, and open gas stations.",
    difficulty: "Medium",
    stagesCount: 17,
    scavSpawnChance: 0.55,
    pmcSpawnChance: 0.25,
    bossSpawnChance: 0.15,
    bossName: "Reshala",
    lootMultiplier: 1.5,
    levelRequired: 3,
    color: "emerald"
  },
  {
    id: "woods",
    name: "Woods",
    description: "Dense forest reservation. Sneaky long-range sniper engagements and camps hidden among mountains.",
    difficulty: "Medium",
    stagesCount: 18,
    scavSpawnChance: 0.45,
    pmcSpawnChance: 0.20,
    bossSpawnChance: 0.20,
    bossName: "Shturman",
    lootMultiplier: 1.8,
    levelRequired: 5,
    color: "green"
  },
  {
    id: "reserve",
    name: "Reserve",
    description: "A secret military base. Dense with high-tier weapon caches, bunkers, and armored raiders.",
    difficulty: "Hard",
    stagesCount: 20,
    scavSpawnChance: 0.60,
    pmcSpawnChance: 0.35,
    bossSpawnChance: 0.25,
    bossName: "Glukhar",
    lootMultiplier: 2.3,
    levelRequired: 8,
    color: "orange"
  },
  {
    id: "streets",
    name: "Streets of Tarkov",
    description: "The heart of the metropolis. Huge high-rise residential zones, hotels, dealerships, and extreme risk.",
    difficulty: "Insane",
    stagesCount: 22,
    scavSpawnChance: 0.65,
    pmcSpawnChance: 0.45,
    bossSpawnChance: 0.30,
    bossName: "Kaban",
    lootMultiplier: 3.2,
    levelRequired: 12,
    color: "rose"
  }
];

// Procedural Map Construction (GDD Section 3)
export const buildProceduralMap = (mapData: MapData): RoomTile[] => {
  // Tile size is a random value within the range defined (Factory 15, Customs 17, etc.)
  const roomCount = mapData.stagesCount;
  const tiles: RoomTile[] = [];

  for (let i = 0; i < roomCount; i++) {
    const randomTemplate = ROOM_TEMPLATES[Math.floor(Math.random() * ROOM_TEMPLATES.length)];
    tiles.push({ ...randomTemplate });
  }

  // Appending Extraction Zone (GDD: "An Extraction Zone is appended as the final tile.")
  tiles.push({
    name: "Extraction Zone",
    description: "Your path out of the zone is clear. Rush to extract before hostile forces locate you.",
    type: "extraction"
  });

  return tiles;
};
