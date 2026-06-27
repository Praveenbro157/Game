/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameCategory = 'arena' | 'slither' | 'runner' | 'shooter' | 'puzzle';

export interface GameMetadata {
  id: string;
  title: string;
  category: GameCategory;
  description: string;
  controls: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  color: string;
  accentColor: string;
  icon: string;
  playerCount: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  health?: number;
  x?: number;
  y?: number;
  z?: number;
  dirX?: number;
  dirZ?: number;
  color?: string;
  wins: number;
  totalGames: number;
  ping?: number;
  bodyColor?: string;
  accessory?: 'none' | 'halo' | 'wings' | 'crown' | 'horns';
  trail?: 'none' | 'plasma' | 'flame' | 'sparkles' | 'matrix';
  chatBubble?: string;
  chatBubbleTime?: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  gameId: string;
  gameTitle: string;
  date: string;
  avatar: string;
}

export interface Lobby {
  id: string;
  gameId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'ended';
  gameState: any;
  createdAt: number;
  isBotMatch: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
}

// Network Message Types
export type ClientMessageType = 
  | 'join_queue'
  | 'leave_queue'
  | 'update_position'
  | 'shoot_projectile'
  | 'hit_player'
  | 'game_event'
  | 'get_leaderboard'
  | 'submit_score'
  | 'update_profile'
  | 'lobby_chat'
  | 'ping';

export interface ClientMessage {
  type: ClientMessageType;
  playerId: string;
  gameId?: string;
  data?: any;
}

export type ServerMessageType =
  | 'lobby_matched'
  | 'lobby_update'
  | 'game_start'
  | 'player_joined'
  | 'player_left'
  | 'opponent_moved'
  | 'opponent_shot'
  | 'opponent_hit'
  | 'game_ended'
  | 'leaderboard_data'
  | 'lobby_chat_broadcast'
  | 'chat_history'
  | 'pong';

export interface ServerMessage {
  type: ServerMessageType;
  data?: any;
}

// Database of 50 Games
export const GAMES_LIST: GameMetadata[] = [
  // --- Category: MOBA & Arena Battles (10 games) ---
  {
    id: 'arena-legend',
    title: 'Arena Legend 3D',
    category: 'arena',
    description: 'Control a powerful voxel warrior in a real-time multiplayer 3D battlefield. Fire energy bolts, capture the central power node, and out-maneuver your opponent.',
    controls: 'WASD to Move, Click to Aim & Shoot Energy Bolts.',
    difficulty: 'Hard',
    color: '#3b82f6', // blue
    accentColor: '#1d4ed8',
    icon: 'Sword',
    playerCount: 420
  },
  {
    id: 'hyper-brawl',
    title: 'Hyper Brawl Royale',
    category: 'arena',
    description: 'A vibrant 3D arena brawler. Collect weapon power-ups, activate shields, and knock your opponent out of the shifting hex ring.',
    controls: 'WASD to Move, Click to Strike with Shockwave.',
    difficulty: 'Medium',
    color: '#ef4444', // red
    accentColor: '#b91c1c',
    icon: 'Shield',
    playerCount: 295
  },
  {
    id: 'mecha-combat',
    title: 'Mecha Combat Arena',
    category: 'arena',
    description: 'Command a heavy steel mech equipped with high-density plasma turrets. Dodge missiles and secure the central reactor.',
    controls: 'WASD to Move, Click to fire Plasma Coils.',
    difficulty: 'Hard',
    color: '#06b6d4', // cyan
    accentColor: '#0891b2',
    icon: 'Cpu',
    playerCount: 180
  },
  {
    id: 'ninja-shadows',
    title: 'Ninja Shadows 3D',
    category: 'arena',
    description: 'Dash through the shadows, climb voxel temples, and engage in high-speed multiplayer shuriken throwdown.',
    controls: 'WASD to Dash, Click to throw Shuriken.',
    difficulty: 'Hard',
    color: '#111827', // dark grey
    accentColor: '#1f2937',
    icon: 'Ghost',
    playerCount: 215
  },
  {
    id: 'cyber-mage',
    title: 'Cyber Mage Duel',
    category: 'arena',
    description: 'Harness elemental sorcery combined with futuristic technology. Blast fireballs, summon ice barricades, and claim magic power.',
    controls: 'WASD to Move, Click to fire Fireballs.',
    difficulty: 'Medium',
    color: '#8b5cf6', // purple
    accentColor: '#6d28d9',
    icon: 'Sparkles',
    playerCount: 198
  },
  {
    id: 'tank-overlord',
    title: 'Tank Overlord 3D',
    category: 'arena',
    description: 'Drive customizable voxel tanks in a highly destructible 3D arena. Blast pillars to crush enemies or take direct aim.',
    controls: 'WASD to Drive, Click to aim & fire heavy Tank Shell.',
    difficulty: 'Medium',
    color: '#15803d', // green
    accentColor: '#166534',
    icon: 'ShieldAlert',
    playerCount: 310
  },
  {
    id: 'pirate-cannon',
    title: 'Pirate Cannon Clash',
    category: 'arena',
    description: 'Sail the high-voxel seas. Steer your battleship in a water arena, adjusting for velocity, and fire full canon broadsides.',
    controls: 'WASD to steer Ship, Click to fire Left/Right Cannons.',
    difficulty: 'Medium',
    color: '#0284c7', // sky
    accentColor: '#0369a1',
    icon: 'Compass',
    playerCount: 145
  },
  {
    id: 'gladiator-colosseum',
    title: 'Gladiator Colosseum',
    category: 'arena',
    description: 'Step into the dusty Roman sand arena. Raise your voxel shield, block incoming strikes, and lunge forward for victory.',
    controls: 'WASD to Circle, Click to Swing Broadsword.',
    difficulty: 'Hard',
    color: '#b45309', // amber
    accentColor: '#92400e',
    icon: 'Trophy',
    playerCount: 120
  },
  {
    id: 'monster-arena',
    title: 'Monster Arena Go',
    category: 'arena',
    description: 'Release wild voxel monsters into the battle arena. Charge up your beast energy and tackle opponents to steal their crystals.',
    controls: 'WASD to charge, Click to use Monster Breath.',
    difficulty: 'Easy',
    color: '#ea580c', // orange
    accentColor: '#c2410c',
    icon: 'Flame',
    playerCount: 240
  },
  {
    id: 'disc-wars',
    title: 'Futuristic Disc Wars',
    category: 'arena',
    description: 'Enter the neon grid. Throw bouncing energy discs at your opponent while leaping over incoming hazards.',
    controls: 'WASD to Move, Click to hurl Kinetic Disc.',
    difficulty: 'Medium',
    color: '#f43f5e', // rose
    accentColor: '#be123c',
    icon: 'Disc',
    playerCount: 165
  },

  // --- Category: Grid Slither & Snake (10 games) ---
  {
    id: 'grid-slither',
    title: 'Grid Slither 3D',
    category: 'slither',
    description: 'Our premier neon voxel Snake. Slither around a glowing 3D grid, devour luminous energy cells, and grow your tail to trap other snakes.',
    controls: 'WASD or Arrow Keys to change 3D Grid directions.',
    difficulty: 'Easy',
    color: '#10b981', // emerald
    accentColor: '#047857',
    icon: 'Activity',
    playerCount: 540
  },
  {
    id: 'voxel-anaconda',
    title: 'Voxel Anaconda 3D',
    category: 'slither',
    description: 'Navigate a lush tropical voxel forest. Eat juicy pixelated fruits, avoid massive stone ruins, and survive other wild snakes.',
    controls: 'WASD to slither through jungle clearings.',
    difficulty: 'Easy',
    color: '#22c55e', // green
    accentColor: '#15803d',
    icon: 'TreePine',
    playerCount: 380
  },
  {
    id: 'cyber-worm',
    title: 'Cyber Worm Tron',
    category: 'slither',
    description: 'Drive a glowing data-cycle that leaves a solid light-wall. Force other programs to crash into your path while speeding up.',
    controls: 'WASD to take sharp 90-degree vector turns.',
    difficulty: 'Hard',
    color: '#a855f7', // purple
    accentColor: '#7e22ce',
    icon: 'Cpu',
    playerCount: 410
  },
  {
    id: 'gummy-worm',
    title: 'Gummy Worm Rush',
    category: 'slither',
    description: 'Slither through a colorful candy land. Collect sugar drops, chocolate beans, and bypass giant jelly barriers.',
    controls: 'WASD to move, hold click to activate Sugar Boost.',
    difficulty: 'Easy',
    color: '#ec4899', // pink
    accentColor: '#be185d',
    icon: 'Candy',
    playerCount: 320
  },
  {
    id: 'dragon-tail',
    title: 'Dragon Tail Trails',
    category: 'slither',
    description: 'Fly a magnificent voxel dragon. Absorb fire embers to grow your golden dragon tail and freeze opponents in their tracks.',
    controls: 'WASD to fly, Click to spit Dragon Sparks.',
    difficulty: 'Medium',
    color: '#eab308', // yellow
    accentColor: '#a16207',
    icon: 'Flame',
    playerCount: 260
  },
  {
    id: 'deep-sea-eel',
    title: 'Deep Sea Eel 3D',
    category: 'slither',
    description: 'Plunge into the deepest abyss. Swim as a glowing bioluminescent eel, gathering floating plankton particles and dodging submarine mines.',
    controls: 'WASD to glide, Click to trigger Bio-electric pulse.',
    difficulty: 'Medium',
    color: '#06b6d4', // cyan
    accentColor: '#0891b2',
    icon: 'Waves',
    playerCount: 190
  },
  {
    id: 'train-conductor',
    title: 'Train Conductor 3D',
    category: 'slither',
    description: 'Chug along the railway. Collect colorful train carriages filled with cargo, and steer without crashing your own heavy cars.',
    controls: 'WASD to turn train, Click to blow steam Whistle.',
    difficulty: 'Medium',
    color: '#64748b', // slate
    accentColor: '#475569',
    icon: 'TrainFront',
    playerCount: 275
  },
  {
    id: 'circuit-crawler',
    title: 'Circuit Crawler 3D',
    category: 'slither',
    description: 'A micro-scale computer chip challenge. Crawl as an electrical current, charging logic gates and avoiding firewall purges.',
    controls: 'WASD to navigate gold circuits, Click to pulse speed.',
    difficulty: 'Hard',
    color: '#10b981', // emerald
    accentColor: '#047857',
    icon: 'Zap',
    playerCount: 155
  },
  {
    id: 'space-serpent',
    title: 'Space Serpent 3D',
    category: 'slither',
    description: 'Glide through an asteroid belt in deep space. Devour floating cosmic dust, absorb fuel nodes, and grow your star trail.',
    controls: 'WASD to steer in Zero-G orbit, Click to fire booster.',
    difficulty: 'Medium',
    color: '#3b82f6', // blue
    accentColor: '#1d4ed8',
    icon: 'Orbit',
    playerCount: 230
  },
  {
    id: 'glitch-crawler',
    title: 'Glitch Crawler 3D',
    category: 'slither',
    description: 'An abstract, surreal virtual world. Absorb retro bug reports to expand your glitch tail while fighting rendering artifacts.',
    controls: 'WASD to crawl, Click to scramble pixels.',
    difficulty: 'Hard',
    color: '#f43f5e', // rose
    accentColor: '#be123c',
    icon: 'ShieldAlert',
    playerCount: 112
  },

  // --- Category: Infinite Runner & Racer (10 games) ---
  {
    id: 'cosmic-racer',
    title: 'Cosmic Racer 3D',
    category: 'runner',
    description: 'Pilot a high-speed hyper-glide spacecraft down an infinite winding cosmic track. Dodge giant rotating rings and collect speed fuel.',
    controls: 'A/D or Left/Right Arrow to slide lanes. W to Boost.',
    difficulty: 'Hard',
    color: '#3b82f6', // blue
    accentColor: '#1d4ed8',
    icon: 'Rocket',
    playerCount: 490
  },
  {
    id: 'subway-runner',
    title: 'Subway Runner 3D',
    category: 'runner',
    description: 'Race down the tracks of a futuristic subway system. Leap over speeding maglev trains, slide under signs, and collect gold credits.',
    controls: 'A/D to swap lanes, W to Jump, S to Slide.',
    difficulty: 'Medium',
    color: '#ea580c', // orange
    accentColor: '#c2410c',
    icon: 'Footprints',
    playerCount: 610
  },
  {
    id: 'dino-dash',
    title: 'Dino Desert Dash 3D',
    category: 'runner',
    description: 'Control a fast voxel T-Rex charging through a prehistoric canyon. Jump over spiky cacti and slide under ancient pterodactyls.',
    controls: 'W or Up Arrow to jump, S or Down Arrow to duck.',
    difficulty: 'Easy',
    color: '#84cc16', // lime
    accentColor: '#65a30d',
    icon: 'Rabbit',
    playerCount: 350
  },
  {
    id: 'voxel-kart',
    title: 'Voxel Kart Derby 3D',
    category: 'runner',
    description: 'Draft behind rivals on a retro race course. Dodge oil slicks, jump off boosts, and collect turbo energy containers.',
    controls: 'A/D to steer kart lanes, W to engage nitro.',
    difficulty: 'Medium',
    color: '#ef4444', // red
    accentColor: '#b91c1c',
    icon: 'Car',
    playerCount: 470
  },
  {
    id: 'lava-leap',
    title: 'Lava Leap 3D',
    category: 'runner',
    description: 'The floor is literally boiling magma. Sprint along a disintegrating stone pathway, jump gaps, and secure glowing diamond keys.',
    controls: 'A/D to dodge lanes, W to leap over lava rivers.',
    difficulty: 'Hard',
    color: '#dc2626', // red
    accentColor: '#991b1b',
    icon: 'Flame',
    playerCount: 280
  },
  {
    id: 'cyberpunk-dash',
    title: 'Cyberpunk Dash 3D',
    category: 'runner',
    description: 'Run on top of skyscrapers in Neo-Tokyo. Vault over air conditioning units, glide down power-lines, and evade drone lights.',
    controls: 'A/D to swap rooftops, W to jump, S to slide.',
    difficulty: 'Hard',
    color: '#d946ef', // fuchsia
    accentColor: '#a21caf',
    icon: 'Navigation',
    playerCount: 395
  },
  {
    id: 'temple-escape',
    title: 'Temple Escape 3D',
    category: 'runner',
    description: 'A giant voxel boulder is chasing you! Rush down stone bridges, steer around tight crevices, and dodge ancient poison darts.',
    controls: 'A/D to shift side lanes, W to jump over spikes.',
    difficulty: 'Medium',
    color: '#d97706', // amber
    accentColor: '#b45309',
    icon: 'Map',
    playerCount: 330
  },
  {
    id: 'ski-slalom',
    title: 'Ski Slalom 3D',
    category: 'runner',
    description: 'Carve your way down an alpine mountain. Slide between red and blue slalom gates while dodging pine trees and frozen cabins.',
    controls: 'A/D or Mouse to carve left and right.',
    difficulty: 'Medium',
    color: '#0ea5e9', // sky
    accentColor: '#0369a1',
    icon: 'Snowflake',
    playerCount: 185
  },
  {
    id: 'sonic-surf',
    title: 'Sonic Surf 3D',
    category: 'runner',
    description: 'Surf inside a futuristic glass water pipe. Pivot around the inside of the cylinder to grab coins and dodge water purifiers.',
    controls: 'A/D to rotate around the inside pipe walls.',
    difficulty: 'Medium',
    color: '#06b6d4', // cyan
    accentColor: '#0891b2',
    icon: 'Compass',
    playerCount: 220
  },
  {
    id: 'pixel-jet',
    title: 'Pixel Jet Drift 3D',
    category: 'runner',
    description: 'Fly a supersonic jet inside a crumbling canyon. Roll side-to-side, bank around sharp turns, and avoid falling rock debris.',
    controls: 'A/D to roll jet lanes, W to fire rockets.',
    difficulty: 'Hard',
    color: '#f43f5e', // rose
    accentColor: '#be123c',
    icon: 'Plane',
    playerCount: 290
  },

  // --- Category: Rail/Top-down Voxel Shooters (10 games) ---
  {
    id: 'galactic-defender',
    title: 'Galactic Defender 3D',
    category: 'shooter',
    description: 'Pilot a starfighter at the bottom of the star sector. Defend against descending matrices of 3D voxel alien motherships.',
    controls: 'A/D to move Starfighter. Click or SPACE to fire Lasers.',
    difficulty: 'Medium',
    color: '#a855f7', // purple
    accentColor: '#7e22ce',
    icon: 'Shield',
    playerCount: 512
  },
  {
    id: 'voxel-invaders',
    title: 'Voxel Invaders 3D',
    category: 'shooter',
    description: 'Retro arcade classic reborn in full 3D voxels. Move beneath protective blocks and disintegrate descending neon bugs.',
    controls: 'A/D to slide, SPACE to shoot light cannons.',
    difficulty: 'Easy',
    color: '#10b981', // emerald
    accentColor: '#047857',
    icon: 'Gamepad2',
    playerCount: 430
  },
  {
    id: 'z-riot',
    title: 'Z-Riot Survival 3D',
    category: 'shooter',
    description: 'Hold the barricades. Mow down endless swarms of slow-moving voxel zombies approaching from the street depths.',
    controls: 'A/D to rotate turret, Click to fire Gatling Gun.',
    difficulty: 'Medium',
    color: '#ef4444', // red
    accentColor: '#b91c1c',
    icon: 'Skull',
    playerCount: 460
  },
  {
    id: 'helicopter-strike',
    title: 'Helicopter Strike 3D',
    category: 'shooter',
    description: 'Command an apache helicopter. Guard a desert convoy by blowing up hostile tanks and shooting down jetfighters.',
    controls: 'A/D to steer, Click to fire heavy Rockets.',
    difficulty: 'Medium',
    color: '#15803d', // green
    accentColor: '#166534',
    icon: 'ShieldAlert',
    playerCount: 245
  },
  {
    id: 'neon-laser',
    title: 'Neon Laser Blast 3D',
    category: 'shooter',
    description: 'An abstract geometric cyberspace environment. Evade colliding hyper-spheres, triangles, and shoot neon laser beams.',
    controls: 'A/D to slide, Click to emit high-freq Laser.',
    difficulty: 'Hard',
    color: '#06b6d4', // cyan
    accentColor: '#0891b2',
    icon: 'Zap',
    playerCount: 195
  },
  {
    id: 'bug-swarm',
    title: 'Bug Swarm Pest 3D',
    category: 'shooter',
    description: 'Infestation in Sector 7! Spray toxic canisters and fire sonic blasts to halt invading swarms of mechanical voxel beetles.',
    controls: 'A/D to slide, Click to fire Plasma Canisters.',
    difficulty: 'Medium',
    color: '#eab308', // yellow
    accentColor: '#a16207',
    icon: 'Bug',
    playerCount: 150
  },
  {
    id: 'retro-starfighter',
    title: 'Retro Star Fighter 3D',
    category: 'shooter',
    description: 'Blast through asteroid field blockades and enemy squadron scouts in a classic scrolling perspective.',
    controls: 'A/D to dodge, SPACE to fire double plasma rays.',
    difficulty: 'Easy',
    color: '#3b82f6', // blue
    accentColor: '#1d4ed8',
    icon: 'Flame',
    playerCount: 285
  },
  {
    id: 'western-gunfight',
    title: 'Western Gunfight 3D',
    category: 'shooter',
    description: 'Dodge behind saloon barrels. Draw your revolver faster than your opponent and make your shots count in this quickdraw duel.',
    controls: 'A/D to shift covers, Click to fire Revolver.',
    difficulty: 'Hard',
    color: '#b45309', // amber
    accentColor: '#92400e',
    icon: 'Target',
    playerCount: 170
  },
  {
    id: 'acid-rain',
    title: 'Acid Rain Assault 3D',
    category: 'shooter',
    description: 'Alien acid bubbles are falling from the sky. Shoot them to break them into smaller nodes while avoiding corrosive splatters.',
    controls: 'A/D to dodge acid, Click to shoot disintegrator rays.',
    difficulty: 'Hard',
    color: '#84cc16', // lime
    accentColor: '#65a30d',
    icon: 'CloudRain',
    playerCount: 130
  },
  {
    id: 'bunker-sentry',
    title: 'Bunker Sentry 3D',
    category: 'shooter',
    description: 'Protect the command outpost. Man a stationary flak cannon and blow up falling air-raid projectiles.',
    controls: 'A/D to tilt cannon, Click to launch flak shells.',
    difficulty: 'Medium',
    color: '#475569', // slate
    accentColor: '#334155',
    icon: 'Shield',
    playerCount: 210
  },

  // --- Category: Block/Physics Puzzle (10 games) ---
  {
    id: 'tetra-3d',
    title: 'Tetra 3D Fall',
    category: 'puzzle',
    description: 'Play block puzzle in full 3D! Drop and rotate voxel blocks into a transparent grid to complete horizontal sheets.',
    controls: 'A/D to move, W to rotate block, S to slam.',
    difficulty: 'Hard',
    color: '#ec4899', // pink
    accentColor: '#be185d',
    icon: 'Grid',
    playerCount: 480
  },
  {
    id: 'block-breaker',
    title: 'Block Breaker 3D',
    category: 'puzzle',
    description: 'Classic brick breaker in 3D perspective. Move your paddle along the horizontal bar and bounce the sphere to smash bricks.',
    controls: 'A/D or Mouse to slide Paddle, bounce the 3D Sphere.',
    difficulty: 'Easy',
    color: '#f59e0b', // amber
    accentColor: '#d97706',
    icon: 'Activity',
    playerCount: 520
  },
  {
    id: 'marble-balance',
    title: 'Marble Balance 3D',
    category: 'puzzle',
    description: 'Tilt the labyrinth board to guide a shiny chrome ball through a maze of obstacles, pits, and portals.',
    controls: 'A/D to tilt board left/right, W/S to tilt forward/backward.',
    difficulty: 'Medium',
    color: '#06b6d4', // cyan
    accentColor: '#0891b2',
    icon: 'LifeBuoy',
    playerCount: 205
  },
  {
    id: 'tower-stack',
    title: 'Tower Stack 3D',
    category: 'puzzle',
    description: 'Construct the tallest tower in the universe. Release swinging concrete blocks at the exact moment to balance them.',
    controls: 'SPACE or Click to drop the swinging block.',
    difficulty: 'Easy',
    color: '#10b981', // emerald
    accentColor: '#047857',
    icon: 'Layers',
    playerCount: 360
  },
  {
    id: 'physics-domino',
    title: 'Physics Domino 3D',
    category: 'puzzle',
    description: 'Set up beautiful domino setups in 3D space, trigger gravity triggers, and watch chain reactions cascade.',
    controls: 'Click to spawn dominos, click first tile to trigger.',
    difficulty: 'Easy',
    color: '#3b82f6', // blue
    accentColor: '#1d4ed8',
    icon: 'Play',
    playerCount: 140
  },
  {
    id: 'bubble-popper',
    title: 'Bubble Popper 3D',
    category: 'puzzle',
    description: 'Launch colored bubbles into a rotating 3D spherical constellation. Connect three or more of the same color to pop.',
    controls: 'A/D to aim, Click to shoot colored sphere.',
    difficulty: 'Easy',
    color: '#a855f7', // purple
    accentColor: '#7e22ce',
    icon: 'Sun',
    playerCount: 290
  },
  {
    id: 'voxel-jenga',
    title: 'Voxel Jenga 3D',
    category: 'puzzle',
    description: 'Carefully extract support blocks from a towering structure. Keep your hands steady or the tower will tumble!',
    controls: 'Click on a block to slide it out, watch center of mass.',
    difficulty: 'Hard',
    color: '#b45309', // amber
    accentColor: '#92400e',
    icon: 'Layers',
    playerCount: 190
  },
  {
    id: 'laser-refract',
    title: 'Laser Refract 3D',
    category: 'puzzle',
    description: 'Align floating prisms and mirrors in a 3D chamber. Route energy laser beams around blocks to charge power batteries.',
    controls: 'A/D to rotate chosen mirror, Click to select prisms.',
    difficulty: 'Hard',
    color: '#ea580c', // orange
    accentColor: '#c2410c',
    icon: 'Sparkles',
    playerCount: 165
  },
  {
    id: 'gravity-switch',
    title: 'Gravity Switch 3D',
    category: 'puzzle',
    description: 'A 3D perspective puzzle. Invert the vector direction of gravity to let your voxel sphere slip through complex mazes.',
    controls: 'SPACE or Click to flip gravity vectors up/down.',
    difficulty: 'Hard',
    color: '#ec4899', // pink
    accentColor: '#be185d',
    icon: 'ArrowDownUp',
    playerCount: 220
  },
  {
    id: 'rubik-cube',
    title: 'Rubik Speed Cube 3D',
    category: 'puzzle',
    description: 'A fully interactive, high-fidelity 3D rubik cube solver and speed challenge with global timers.',
    controls: 'Click and drag faces to rotate layer segments.',
    difficulty: 'Hard',
    color: '#64748b', // slate
    accentColor: '#475569',
    icon: 'Grid',
    playerCount: 180
  }
];
