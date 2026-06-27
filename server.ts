/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocket, WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { ClientMessage, ServerMessage, Player, Lobby, LeaderboardEntry } from "./src/types";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Path to persist leaderboard scores
const LEADERBOARD_FILE = path.join(process.cwd(), "leaderboards.json");

// Load leaderboards from disk or preseed with high-quality mock competitive scores
let leaderboards: LeaderboardEntry[] = [];

function loadLeaderboards() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
      leaderboards = JSON.parse(data);
    } else {
      preseedLeaderboards();
    }
  } catch (error) {
    console.error("Failed to load leaderboards, seeding default:", error);
    preseedLeaderboards();
  }
}

function saveLeaderboards() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboards, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save leaderboards:", error);
  }
}

function preseedLeaderboards() {
  const sampleNames = ["GlitchLord", "VoxelSlayer", "NeonPulse", "MatrixChaser", "QuantumWorm", "CyberSamurai", "TankBuster", "ApexStriker", "PixelMonarch", "StarCrusader"];
  const avatars = ["🎮", "🛸", "👾", "🤖", "⚔️", "🛡️", "🐉", "🔮", "⚡", "🌟"];
  const games = [
    { id: "arena-legend", title: "Arena Legend 3D" },
    { id: "grid-slither", title: "Grid Slither 3D" },
    { id: "cosmic-racer", title: "Cosmic Racer 3D" },
    { id: "subway-runner", title: "Subway Runner 3D" },
    { id: "galactic-defender", title: "Galactic Defender 3D" },
    { id: "tetra-3d", title: "Tetra 3D Fall" },
    { id: "block-breaker", title: "Block Breaker 3D" }
  ];

  leaderboards = [];
  
  games.forEach(g => {
    // Generate 5 competitive scores for each game
    for (let i = 0; i < 5; i++) {
      const rankScore = Math.floor((10 - i) * (g.id === "grid-slither" ? 30 : g.id === "tetra-3d" ? 1500 : 250) + Math.random() * 50);
      const nameIndex = Math.floor(Math.random() * sampleNames.length);
      leaderboards.push({
        name: sampleNames[nameIndex],
        score: rankScore,
        gameId: g.id,
        gameTitle: g.title,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
        avatar: avatars[nameIndex % avatars.length]
      });
    }
  });

  saveLeaderboards();
}

loadLeaderboards();

// Keep track of active connections
// playerId -> WebSocket
const activeConnections = new Map<string, WebSocket>();
// playerId -> Player info
const activePlayers = new Map<string, Player>();
// gameId -> Array of playerIds in queue
const matchmakingQueues = new Map<string, string[]>();
// lobbyId -> Lobby
const activeLobbies = new Map<string, Lobby>();

interface ChatMessage {
  id: string;
  playerId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
}
const lobbyChatHistory: ChatMessage[] = [];

// Start a periodic matchmaking monitor to pair users and handle bot fallbacks
setInterval(() => {
  matchmakingQueues.forEach((queue, gameId) => {
    // 1. First, pair up any real players in queue
    while (queue.length >= 2) {
      const p1Id = queue.shift()!;
      const p2Id = queue.shift()!;
      
      const p1 = activePlayers.get(p1Id);
      const p2 = activePlayers.get(p2Id);
      
      if (p1 && p2) {
        createLobby(gameId, p1, p2, false);
      }
    }
    
    // 2. If a single player is in queue and has been waiting, pair them with a highly responsive simulated Bot!
    // For simplicity, we can do this dynamically when they ask, or proactively here if they are in queue
  });
}, 1000);

function createLobby(gameId: string, p1: Player, p2: Player, isBotMatch: boolean): Lobby {
  const lobbyId = `lobby_${Math.random().toString(36).substring(2, 9)}`;
  
  // Set initial game parameters based on game category
  const lobby: Lobby = {
    id: lobbyId,
    gameId,
    players: [
      { ...p1, score: 0, health: 100, x: -15, y: 0.5, z: 0, color: p1.bodyColor || '#3b82f6' },
      { ...p2, score: 0, health: 100, x: 15, y: 0.5, z: 0, color: p2.bodyColor || '#ef4444' }
    ],
    status: 'playing',
    gameState: {
      startedAt: Date.now(),
      scoreLimit: 10,
      obstacles: []
    },
    createdAt: Date.now(),
    isBotMatch
  };

  activeLobbies.set(lobbyId, lobby);

  // Notify real players of match success
  const startMsg: ServerMessage = {
    type: 'lobby_matched',
    data: { lobby }
  };

  const ws1 = activeConnections.get(p1.id);
  if (ws1 && ws1.readyState === WebSocket.OPEN) {
    ws1.send(JSON.stringify(startMsg));
  }

  if (!isBotMatch) {
    const ws2 = activeConnections.get(p2.id);
    if (ws2 && ws2.readyState === WebSocket.OPEN) {
      ws2.send(JSON.stringify(startMsg));
    }
  } else {
    // Start bot decision logic loops
    runBotAILoop(lobbyId, p2.id);
  }

  console.log(`Matched Lobby ${lobbyId} for game ${gameId}. BotMatch=${isBotMatch}`);
  return lobby;
}

// Simulated active bot behavior loop
function runBotAILoop(lobbyId: string, botId: string) {
  const intervalId = setInterval(() => {
    const lobby = activeLobbies.get(lobbyId);
    if (!lobby || lobby.status === 'ended') {
      clearInterval(intervalId);
      return;
    }

    const bot = lobby.players.find(p => p.id === botId);
    const human = lobby.players.find(p => p.id !== botId);
    if (!bot || !human) return;

    // Based on the game mode, calculate movement simulation
    // Let's perform simple reactive adjustments towards human player
    if (bot.x !== undefined && human.x !== undefined && bot.z !== undefined && human.z !== undefined) {
      const dx = human.x - bot.x;
      const dz = human.z - bot.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1.5) {
        // Move towards human
        bot.x += (dx / dist) * 0.4;
        bot.z += (dz / dist) * 0.4;
        bot.dirX = dx / dist;
        bot.dirZ = dz / dist;
      }

      // In arena battle, bot occasionally fires projectile
      if (Math.random() < 0.12) {
        const angle = Math.atan2(dx, dz);
        // Simulate a projectile from bot
        const ws1 = activeConnections.get(human.id);
        if (ws1 && ws1.readyState === WebSocket.OPEN) {
          ws1.send(JSON.stringify({
            type: 'opponent_shot',
            data: {
              x: bot.x,
              z: bot.z,
              dirX: Math.sin(angle),
              dirZ: Math.cos(angle)
            }
          }));
        }
      }
    }

    // In Slither / Snake mode, bot grows over time or simulates eating
    if (Math.random() < 0.15) {
      bot.score += 1;
    }

    // Simulated chat comments from Bot in-game
    if (Math.random() < 0.05) {
      const botPhrases = [
        "GG! Nice move!",
        "You play well! Let's build together!",
        "This is just like Roblox!",
        "Can you beat my highscore?",
        "Noob! Joking, nice try!",
        "Watch out for that hazard!",
        "OOF!",
        "I love this voxel aesthetic!",
        "Let's play another round after this!",
        "Vibe check! 😎"
      ];
      bot.chatBubble = botPhrases[Math.floor(Math.random() * botPhrases.length)];
      bot.chatBubbleTime = Date.now();
    }

    // Broadcast the updated bot state to the human player
    const ws = activeConnections.get(human.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'lobby_update',
        data: { lobby }
      }));
    }

  }, 100);
}

// Initialize the WebSocket Server
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws: WebSocket) => {
  let authenticatedPlayerId: string | null = null;

  try {
    fs.appendFileSync(
      path.join(process.cwd(), "ws_debug.log"),
      `[CONNECTION] Time: ${new Date().toISOString()} | Connection established successfully\n`
    );
  } catch (e) {}

  ws.on("error", (err) => {
    try {
      fs.appendFileSync(
        path.join(process.cwd(), "ws_debug.log"),
        `[WS_ERROR] Time: ${new Date().toISOString()} | Player ${authenticatedPlayerId || "unknown"} error: ${err.message || err}\n`
      );
    } catch (e) {}
    console.error(`WebSocket server-side socket error for player ${authenticatedPlayerId || "unknown"}:`, err);
  });

  ws.on("message", (messageStr: string) => {
    try {
      const msg: ClientMessage = JSON.parse(messageStr);
      const { type, playerId, gameId, data } = msg;

      try {
        fs.appendFileSync(
          path.join(process.cwd(), "ws_debug.log"),
          `[MESSAGE_RECEIVED] Time: ${new Date().toISOString()} | Type: ${type} | Player: ${playerId || "unknown"} | Game: ${gameId || "none"}\n`
        );
      } catch (e) {}

      if (!playerId) return;
      authenticatedPlayerId = playerId;

      // Ensure client is stored with the latest active WebSocket connection
      activeConnections.set(playerId, ws);

      switch (type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'update_profile':
          if (data && data.name) {
            const player: Player = {
              id: playerId,
              name: data.name,
              avatar: data.avatar || "🎮",
              score: 0,
              wins: data.wins || 0,
              totalGames: data.totalGames || 0,
              bodyColor: data.bodyColor,
              accessory: data.accessory,
              trail: data.trail
            };
            activePlayers.set(playerId, player);
            console.log(`Player profile updated: ${player.name} (${playerId})`);

            // Send chat history to this connected player
            ws.send(JSON.stringify({
              type: 'chat_history',
              data: { history: lobbyChatHistory }
            }));
          }
          break;

        case 'lobby_chat':
          if (data && data.text) {
            const player = activePlayers.get(playerId) || {
              id: playerId,
              name: `Gamer_${playerId.slice(0, 4)}`,
              avatar: "🎮"
            };
            const chatMsg: ChatMessage = {
              id: `msg_${Math.random().toString(36).substring(2, 9)}`,
              playerId,
              senderName: player.name,
              senderAvatar: player.avatar,
              text: data.text,
              timestamp: Date.now()
            };
            
            lobbyChatHistory.push(chatMsg);
            if (lobbyChatHistory.length > 50) {
              lobbyChatHistory.shift();
            }

            // Broadcast to all active connections
            const broadcastMsg: ServerMessage = {
              type: 'lobby_chat_broadcast',
              data: { message: chatMsg }
            };

            activeConnections.forEach((wsClient) => {
              if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify(broadcastMsg));
              }
            });
          }
          break;

        case 'join_queue':
          if (gameId) {
            console.log(`Player ${playerId} joined queue for ${gameId}`);
            
            // Register player metadata if not exists
            if (!activePlayers.has(playerId)) {
              activePlayers.set(playerId, {
                id: playerId,
                name: data?.name || `Player_${playerId.slice(0, 4)}`,
                avatar: data?.avatar || "🎮",
                score: 0,
                wins: data?.wins || 0,
                totalGames: data?.totalGames || 0
              });
            }

            // Prevent joining queue twice
            let queue = matchmakingQueues.get(gameId) || [];
            if (!queue.includes(playerId)) {
              queue.push(playerId);
              matchmakingQueues.set(gameId, queue);
            }

            // Immediately check if we can pair
            if (queue.length >= 2) {
              const p1Id = queue.shift()!;
              const p2Id = queue.shift()!;
              const p1 = activePlayers.get(p1Id);
              const p2 = activePlayers.get(p2Id);
              if (p1 && p2) {
                createLobby(gameId, p1, p2, false);
              }
            } else {
              // Wait 3 seconds, if still alone, spawn a Bot match!
              setTimeout(() => {
                const currentQueue = matchmakingQueues.get(gameId) || [];
                if (currentQueue.includes(playerId)) {
                  // Remove from queue
                  matchmakingQueues.set(gameId, currentQueue.filter(id => id !== playerId));
                  
                  // Spawn Bot opponent
                  const p1 = activePlayers.get(playerId) || {
                    id: playerId,
                    name: `Gamer_${playerId.slice(0, 4)}`,
                    avatar: "🎮",
                    score: 0,
                    wins: 0,
                    totalGames: 0
                  };
                  const botNames = ["MegaBot_MLG", "VoxelSlayer_99", "AlphaCore_AI", "NeonGlider", "HydraSnake_3D", "CyberStriker", "ChronoMage"];
                  const botAvatars = ["🤖", "👾", "👽", "🧬", "🕸️", "☣️", "☄️"];
                  const randomBotName = botNames[Math.floor(Math.random() * botNames.length)];
                  const randomBotAvatar = botAvatars[Math.floor(Math.random() * botAvatars.length)];

                  const botPlayer: Player = {
                    id: `bot_${Math.random().toString(36).substring(2, 7)}`,
                    name: randomBotName,
                    avatar: randomBotAvatar,
                    score: 0,
                    wins: Math.floor(Math.random() * 20),
                    totalGames: Math.floor(Math.random() * 40) + 21,
                    bodyColor: ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#ef4444", "#a855f7"][Math.floor(Math.random() * 6)],
                    accessory: ["none", "halo", "wings", "crown", "horns"][Math.floor(Math.random() * 5)] as any,
                    trail: ["none", "plasma", "flame", "sparkles"][Math.floor(Math.random() * 4)] as any
                  };

                  createLobby(gameId, p1, botPlayer, true);
                }
              }, 3000);
            }
          }
          break;

        case 'leave_queue':
          if (gameId) {
            const queue = matchmakingQueues.get(gameId) || [];
            matchmakingQueues.set(gameId, queue.filter(id => id !== playerId));
            console.log(`Player ${playerId} left queue for ${gameId}`);
          }
          break;

        case 'update_position':
          if (data && data.lobbyId) {
            const lobby = activeLobbies.get(data.lobbyId);
            if (lobby && lobby.status === 'playing') {
              const p = lobby.players.find(pl => pl.id === playerId);
              if (p) {
                p.x = data.x;
                p.y = data.y;
                p.z = data.z;
                p.dirX = data.dirX;
                p.dirZ = data.dirZ;
                p.score = data.score ?? p.score;
              }

              // Relay position updates to the opponent in the same lobby
              const opponent = lobby.players.find(pl => pl.id !== playerId);
              if (opponent && !lobby.isBotMatch) {
                const wsOpp = activeConnections.get(opponent.id);
                if (wsOpp && wsOpp.readyState === WebSocket.OPEN) {
                  wsOpp.send(JSON.stringify({
                    type: 'opponent_moved',
                    data: {
                      playerId,
                      x: data.x,
                      y: data.y,
                      z: data.z,
                      dirX: data.dirX,
                      dirZ: data.dirZ,
                      score: data.score
                    }
                  }));
                }
              }
            }
          }
          break;

        case 'shoot_projectile':
          if (data && data.lobbyId) {
            const lobby = activeLobbies.get(data.lobbyId);
            if (lobby && lobby.status === 'playing') {
              const opponent = lobby.players.find(pl => pl.id !== playerId);
              if (opponent && !lobby.isBotMatch) {
                const wsOpp = activeConnections.get(opponent.id);
                if (wsOpp && wsOpp.readyState === WebSocket.OPEN) {
                  wsOpp.send(JSON.stringify({
                    type: 'opponent_shot',
                    data: {
                      x: data.x,
                      z: data.z,
                      dirX: data.dirX,
                      dirZ: data.dirZ
                    }
                  }));
                }
              }
            }
          }
          break;

        case 'hit_player':
          if (data && data.lobbyId) {
            const lobby = activeLobbies.get(data.lobbyId);
            if (lobby && lobby.status === 'playing') {
              const victim = lobby.players.find(pl => pl.id === data.victimId);
              if (victim) {
                victim.health = Math.max(0, (victim.health ?? 100) - data.damage);
                
                // If health reaches 0, credit score to the attacker
                if (victim.health <= 0) {
                  victim.health = 100; // Respawn
                  const attacker = lobby.players.find(pl => pl.id !== data.victimId);
                  if (attacker) {
                    attacker.score = (attacker.score ?? 0) + 1;
                    
                    // Check Victory conditions in Arena Battle (first to 10 points)
                    if (attacker.score >= 10) {
                      endLobbyMatch(lobby, attacker.id);
                      return;
                    }
                  }
                }

                // Broadcast lobby updates
                broadcastLobbyUpdate(lobby);
              }
            }
          }
          break;

        case 'game_event':
          // Catch-all for other dynamic game mechanics (e.g., snake crashing, coins collected)
          if (data && data.lobbyId) {
            const lobby = activeLobbies.get(data.lobbyId);
            if (lobby && lobby.status === 'playing') {
              if (data.event === 'score_update') {
                const p = lobby.players.find(pl => pl.id === playerId);
                if (p) p.score = data.score;
                
                // End game conditions
                if (data.score >= 15) { // e.g. target score for snake/runner
                  endLobbyMatch(lobby, playerId);
                  return;
                }
                broadcastLobbyUpdate(lobby);
              } else if (data.event === 'snake_crash') {
                // Deduct score or reset player snake
                const p = lobby.players.find(pl => pl.id === playerId);
                if (p) {
                  p.score = Math.max(0, p.score - 2);
                  p.health = 100;
                }
                broadcastLobbyUpdate(lobby);
              } else if (data.event === 'in_game_chat') {
                const p = lobby.players.find(pl => pl.id === playerId);
                if (p) {
                  p.chatBubble = data.text;
                  p.chatBubbleTime = Date.now();
                }
                broadcastLobbyUpdate(lobby);
              }
            }
          }
          break;

        case 'submit_score':
          if (data && gameId) {
            const entry: LeaderboardEntry = {
              name: data.name || "Anonymous",
              score: data.score,
              gameId,
              gameTitle: data.gameTitle || "Arcade Game",
              date: new Date().toLocaleDateString(),
              avatar: data.avatar || "🎮"
            };
            leaderboards.push(entry);
            // Sort and keep top 100 global scores
            leaderboards.sort((a, b) => b.score - a.score);
            if (leaderboards.length > 200) {
              leaderboards = leaderboards.slice(0, 200);
            }
            saveLeaderboards();
            
            // Broadcast matching leaderboards back
            sendLeaderboards(ws, gameId);
          }
          break;

        case 'get_leaderboard':
          if (gameId) {
            sendLeaderboards(ws, gameId);
          }
          break;
      }

    } catch (e) {
      console.error("Error processing websocket message:", e);
    }
  });

  ws.on("close", (code, reason) => {
    try {
      fs.appendFileSync(
        path.join(process.cwd(), "ws_debug.log"),
        `[WS_CLOSE] Time: ${new Date().toISOString()} | Player ${authenticatedPlayerId || "unknown"} closed. Code: ${code}, Reason: ${reason.toString() || "none"}\n`
      );
    } catch (e) {}
    if (authenticatedPlayerId) {
      if (activeConnections.get(authenticatedPlayerId) === ws) {
        activeConnections.delete(authenticatedPlayerId);
        console.log(`Connection closed and deleted for player ${authenticatedPlayerId}`);

        // Clean up player queues
        matchmakingQueues.forEach((queue, gameId) => {
          if (queue.includes(authenticatedPlayerId!)) {
            matchmakingQueues.set(gameId, queue.filter(id => id !== authenticatedPlayerId));
            console.log(`Cleaned queue for game ${gameId}`);
          }
        });

        // Handle running lobbies
        activeLobbies.forEach((lobby, lobbyId) => {
          if (lobby.status === 'playing') {
            const hasPlayer = lobby.players.some(p => p.id === authenticatedPlayerId);
            if (hasPlayer) {
              const remaining = lobby.players.find(p => p.id !== authenticatedPlayerId);
              if (remaining) {
                endLobbyMatch(lobby, remaining.id);
              } else {
                lobby.status = 'ended';
                activeLobbies.delete(lobbyId);
              }
            }
          }
        });
      } else {
        console.log(`Stale connection closed for player ${authenticatedPlayerId}, keeping active connection`);
      }
    }
  });
});

function broadcastLobbyUpdate(lobby: Lobby) {
  const updateMsg: ServerMessage = {
    type: 'lobby_update',
    data: { lobby }
  };
  lobby.players.forEach(p => {
    if (!p.id.startsWith("bot_")) {
      const ws = activeConnections.get(p.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(updateMsg));
      }
    }
  });
}

function endLobbyMatch(lobby: Lobby, winnerId: string) {
  lobby.status = 'ended';
  
  // Submit winner to leaderboard
  const winner = lobby.players.find(p => p.id === winnerId);
  const loser = lobby.players.find(p => p.id !== winnerId);
  
  if (winner) {
    winner.wins += 1;
    winner.totalGames += 1;
    
    // Auto submit to leaderboards
    const entry: LeaderboardEntry = {
      name: winner.name,
      score: winner.score,
      gameId: lobby.gameId,
      gameTitle: GAMES_LIST.find(g => g.id === lobby.gameId)?.title || "Battle Match",
      date: new Date().toLocaleDateString(),
      avatar: winner.avatar
    };
    leaderboards.push(entry);
    leaderboards.sort((a, b) => b.score - a.score);
    saveLeaderboards();
  }

  if (loser) {
    loser.totalGames += 1;
  }

  const endMsg: ServerMessage = {
    type: 'game_ended',
    data: { lobby, winnerId }
  };

  lobby.players.forEach(p => {
    if (!p.id.startsWith("bot_")) {
      const ws = activeConnections.get(p.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(endMsg));
      }
    }
  });

  console.log(`Lobby ${lobby.id} ended. Winner: ${winnerId}`);
}

function sendLeaderboards(ws: WebSocket, gameId: string) {
  const filtered = leaderboards.filter(e => e.gameId === gameId).slice(0, 10);
  ws.send(JSON.stringify({
    type: 'leaderboard_data',
    data: { gameId, leaderboards: filtered }
  }));
}

// REST endpoints
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    onlinePlayers: activePlayers.size,
    activeLobbies: activeLobbies.size
  });
});

app.get("/api/leaderboards", (req, res) => {
  res.json(leaderboards);
});

// Configure Vite integration for developer flow and standard file serving for production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.on("upgrade", (request, socket, head) => {
    const reqUrl = request.url || "";
    const pathname = reqUrl.split("?")[0].split("#")[0];
    const isWebSocket = request.headers.upgrade && request.headers.upgrade.toLowerCase() === "websocket";

    const logMsg = `[UPGRADE] Time: ${new Date().toISOString()} | Path: "${pathname}" | isWebSocket: ${isWebSocket} | Headers: ${JSON.stringify(request.headers)}\n`;
    try {
      fs.appendFileSync(path.join(process.cwd(), "ws_debug.log"), logMsg);
    } catch (e) {}

    console.log(`[UPGRADE] Connection request on path: "${pathname}", isWebSocket: ${isWebSocket}`);

    if (isWebSocket && (pathname === "/ws" || pathname === "/ws/" || pathname === "/")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Server actively running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to spin up full-stack server:", error);
});

// Helper imported games list just to prevent bundler problems
import { GAMES_LIST } from "./src/types";
