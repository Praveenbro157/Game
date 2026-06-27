/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GAMES_LIST, GameMetadata, Player, Lobby, LeaderboardEntry, ChatMessage } from './types';
import ArcadeLobby from './components/ArcadeLobby';
import ThreeGameContainer from './components/ThreeGameContainer';
import { Gamepad2, Radio, Info, Trophy, Sparkles, LogOut, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_KEY = 'arcade_portal_profile_v2';

export default function App() {
  // Application screens: 'lobby' | 'playing'
  const [screen, setScreen] = useState<'lobby' | 'playing'>('lobby');
  
  // Player Profile
  const [playerProfile, setPlayerProfile] = useState<{
    name: string;
    avatar: string;
    wins: number;
    totalGames: number;
    robux: number;
    bodyColor: string;
    accessory: 'none' | 'halo' | 'wings' | 'crown' | 'horns';
    trail: 'none' | 'plasma' | 'flame' | 'sparkles' | 'matrix';
    inventory: string[];
  }>(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Ensure defaults for older profiles
        if (parsed.robux === undefined) parsed.robux = 500;
        if (!parsed.bodyColor) parsed.bodyColor = '#3b82f6';
        if (!parsed.accessory) parsed.accessory = 'none';
        if (!parsed.trail) parsed.trail = 'none';
        if (!parsed.inventory) parsed.inventory = ['#3b82f6', '#ef4444', '#10b981'];
        return parsed;
      } catch (e) {}
    }
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return {
      name: `Gamer_${randNum}`,
      avatar: "🎮",
      wins: 0,
      totalGames: 0,
      robux: 500,
      bodyColor: '#3b82f6',
      accessory: 'none',
      trail: 'none',
      inventory: ['#3b82f6', '#ef4444', '#10b981']
    };
  });

  // Save profile to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playerProfile));
  }, [playerProfile]);

  // Unique client-side generated Player ID to identify session connections
  const [playerId] = useState(() => `player_${Math.random().toString(36).substring(2, 9)}`);

  // Websocket state
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [matchmakingGameId, setMatchmakingGameId] = useState<string | null>(null);
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Establish real-time connection to server with fallback pathways
  useEffect(() => {
    let reconnectTimeout: any;
    let attemptSlash = false;
    let activeSocket: WebSocket | null = null;
    let isDestroyed = false;

    function connect() {
      if (isDestroyed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = attemptSlash ? `${protocol}//${host}/` : `${protocol}//${host}/ws`;
      
      console.log(`Establishing WebSocket Connection to ${wsUrl} (attemptSlash: ${attemptSlash})`);
      const socket = new WebSocket(wsUrl);
      activeSocket = socket;
      wsRef.current = socket;

      socket.onopen = () => {
        if (isDestroyed) {
          socket.close();
          return;
        }
        console.log("WebSocket connected successfully!");
        setWsConnected(true);
        
        // Register current profile immediately on connection
        sendSocketMessage('update_profile', {
          name: playerProfile.name,
          avatar: playerProfile.avatar,
          wins: playerProfile.wins,
          totalGames: playerProfile.totalGames,
          bodyColor: playerProfile.bodyColor,
          accessory: playerProfile.accessory,
          trail: playerProfile.trail
        });

        // Query initial leaderboard for first game
        sendSocketMessage('get_leaderboard', {}, GAMES_LIST[0].id);
      };

      socket.onmessage = (event) => {
        if (isDestroyed) return;
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          switch (type) {
            case 'pong':
              // Keep alive success
              break;

            case 'lobby_matched':
              if (data && data.lobby) {
                console.log("MATCH FOUND! Starting 3D Arcade Match:", data.lobby);
                setActiveLobby(data.lobby);
                setMatchmakingGameId(null);
                setScreen('playing');
              }
              break;

            case 'lobby_update':
              if (data && data.lobby) {
                setActiveLobby(data.lobby);
              }
              break;

            case 'opponent_shot':
              // Forward shooter / laser messages to the global event listener for Three.js canvas loop to intercept immediately
              window.dispatchEvent(new CustomEvent('opponent_shot_event', { detail: data }));
              break;

            case 'leaderboard_data':
              if (data && data.leaderboards) {
                setLeaderboard(data.leaderboards);
              }
              break;

            case 'chat_history':
              if (data && data.history) {
                setChatMessages(data.history);
              }
              break;

            case 'lobby_chat_broadcast':
              if (data && data.message) {
                setChatMessages(prev => {
                  if (prev.some(m => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
              }
              break;

            case 'game_ended':
              if (data && data.lobby) {
                setActiveLobby(data.lobby);
                
                // Update stats and award Robux locally
                const isWinner = data.winnerId === playerId;
                const robuxReward = 150 + (isWinner ? 300 : 0);
                setPlayerProfile(prev => {
                  const updated = {
                    ...prev,
                    wins: prev.wins + (isWinner ? 1 : 0),
                    totalGames: prev.totalGames + 1,
                    robux: prev.robux + robuxReward
                  };
                  
                  // Instantly sync profile back to server
                  setTimeout(() => {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({
                        type: 'update_profile',
                        playerId,
                        data: {
                          name: updated.name,
                          avatar: updated.avatar,
                          wins: updated.wins,
                          totalGames: updated.totalGames,
                          bodyColor: updated.bodyColor,
                          accessory: updated.accessory,
                          trail: updated.trail
                        }
                      }));
                    }
                  }, 100);
                  
                  return updated;
                });
              }
              break;
          }
        } catch (e) {
          console.error("Failed to parse socket message:", e);
        }
      };

      socket.onclose = () => {
        if (isDestroyed) return;
        console.warn(`WebSocket disconnected from ${wsUrl}. Attempting automatic reconnection...`);
        setWsConnected(false);
        setMatchmakingGameId(null);
        // Toggle path attempt for the next connection attempt to negotiate route
        attemptSlash = !attemptSlash;
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.log(`WebSocket status info (reconnecting if needed) for ${wsUrl}:`, err);
      };
    }

    connect();

    // Ping keeper-alive interval
    const pingInterval = setInterval(() => {
      sendSocketMessage('ping', {});
    }, 15000);

    return () => {
      isDestroyed = true;
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (activeSocket) {
        activeSocket.close();
      }
      wsRef.current = null;
    };
  }, [playerId]);

  const sendSocketMessage = (type: string, data: any, gameId?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type,
        playerId,
        gameId,
        data
      }));
    }
  };

  // Profile update callback
  const handleUpdateProfile = (
    name: string,
    avatar: string,
    bodyColor?: string,
    accessory?: 'none' | 'halo' | 'wings' | 'crown' | 'horns',
    trail?: 'none' | 'plasma' | 'flame' | 'sparkles' | 'matrix',
    robux?: number,
    inventory?: string[]
  ) => {
    setPlayerProfile(prev => {
      const nextProfile = {
        ...prev,
        name,
        avatar,
        bodyColor: bodyColor ?? prev.bodyColor,
        accessory: accessory ?? prev.accessory,
        trail: trail ?? prev.trail,
        robux: robux ?? prev.robux,
        inventory: inventory ?? prev.inventory
      };
      
      // Send profile update to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'update_profile',
          playerId,
          data: {
            name: nextProfile.name,
            avatar: nextProfile.avatar,
            wins: nextProfile.wins,
            totalGames: nextProfile.totalGames,
            bodyColor: nextProfile.bodyColor,
            accessory: nextProfile.accessory,
            trail: nextProfile.trail
          }
        }));
      }
      return nextProfile;
    });
  };

  // Matchmaking callbacks
  const handleJoinMatchmaking = (game: GameMetadata) => {
    setMatchmakingGameId(game.id);
    sendSocketMessage('join_queue', {
      name: playerProfile.name,
      avatar: playerProfile.avatar,
      wins: playerProfile.wins,
      totalGames: playerProfile.totalGames
    }, game.id);
  };

  const handleCancelMatchmaking = () => {
    if (matchmakingGameId) {
      sendSocketMessage('leave_queue', {}, matchmakingGameId);
      setMatchmakingGameId(null);
    }
  };

  const handleRequestLeaderboard = (gameId: string) => {
    sendSocketMessage('get_leaderboard', {}, gameId);
  };

  const handleExitMatch = () => {
    setScreen('lobby');
    setActiveLobby(null);
  };

  const handlePlayOffline = (game: GameMetadata) => {
    const lobbyId = `offline_lobby_${Math.random().toString(36).substring(2, 9)}`;
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
      totalGames: Math.floor(Math.random() * 40) + 21
    };

    const lobby: Lobby = {
      id: lobbyId,
      gameId: game.id,
      players: [
        {
          id: playerId,
          name: playerProfile.name,
          avatar: playerProfile.avatar,
          score: 0,
          wins: playerProfile.wins,
          totalGames: playerProfile.totalGames,
          health: 100,
          x: game.category === 'arena' ? -15 : 0,
          y: 0.5,
          z: 0,
          color: playerProfile.bodyColor,
          bodyColor: playerProfile.bodyColor,
          accessory: playerProfile.accessory,
          trail: playerProfile.trail
        },
        {
          ...botPlayer,
          health: 100,
          x: game.category === 'arena' ? 15 : 0,
          y: 0.5,
          z: 0,
          color: botPlayer.bodyColor || '#ef4444'
        }
      ],
      status: 'playing',
      gameState: {
        startedAt: Date.now(),
        scoreLimit: 10,
        obstacles: []
      },
      createdAt: Date.now(),
      isBotMatch: true
    };

    setActiveLobby(lobby);
    setScreen('playing');
  };

  const activeGame = activeLobby ? GAMES_LIST.find(g => g.id === activeLobby.gameId) : null;
  const opponent = activeLobby ? activeLobby.players.find(p => p.id !== playerId) || null : null;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-slate-200 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* GEOMETRIC BALANCE APP HEADER */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-[#161625] border-b border-[#2A2A40] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500 rounded-sm flex items-center justify-center font-bold text-black text-xl">Ω</div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-cyan-400 font-sans">
              OMNIVERSE HUB
            </h1>
            <span className="hidden sm:block text-[9px] font-mono font-bold text-slate-500 tracking-[0.2em] -mt-1 uppercase">3D MULTIPLAYER REALM</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-8">
          <div className="hidden md:flex gap-4 bg-black/40 px-4 py-2 border border-[#2A2A40] rounded">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs font-mono text-slate-300 uppercase">MATCHMAKING: {wsConnected ? 'ON' : 'OFF'}</span>
            </div>
            <div className="w-[1px] h-4 bg-[#2A2A40]" />
            <div className="text-xs font-mono text-cyan-200 uppercase">Asia-East | 12ms</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-100 uppercase tracking-wide">{playerProfile.name}</div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-bold">Diamond Rank III</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-indigo-800 border-2 border-cyan-400 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              {playerProfile.avatar}
            </div>
          </div>
        </div>
      </header>

      {/* CORE CANVAS WORKSPACE SECTION */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {screen === 'lobby' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full h-full flex items-center justify-center"
            >
              <ArcadeLobby
                playerProfile={playerProfile}
                onUpdateProfile={handleUpdateProfile}
                onJoinMatchmaking={handleJoinMatchmaking}
                matchmakingGameId={matchmakingGameId}
                onCancelMatchmaking={handleCancelMatchmaking}
                leaderboardData={leaderboard}
                onRequestLeaderboard={handleRequestLeaderboard}
                wsConnected={wsConnected}
                chatMessages={chatMessages}
                onSendChatMessage={(text) => sendSocketMessage('lobby_chat', { text })}
                onPlayOffline={handlePlayOffline}
                playerId={playerId}
              />
            </motion.div>
          ) : (
            activeGame && activeLobby && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full h-[580px] sm:h-[620px] max-w-5xl mx-auto"
              >
                <ThreeGameContainer
                  game={activeGame}
                  lobby={activeLobby}
                  playerId={playerId}
                  opponent={opponent}
                  sendSocketMessage={sendSocketMessage}
                  onExit={handleExitMatch}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* GEOMETRIC BALANCE FOOTER METRICS INFO */}
      <footer className="h-auto md:h-12 py-4 md:py-0 bg-[#0A0A0F] border-t border-[#2A2A40] px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-center sm:text-left">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            SYSTEM STATUS: <span className="text-emerald-500 font-bold">NOMINAL</span>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            ACTIVE REALMS: <span className="text-white font-bold">50 ACTIVE PORTS</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono tracking-widest">
          OMNIVERSE ENGINE v2.4.0-STABLE
        </div>
      </footer>

    </div>
  );
}
