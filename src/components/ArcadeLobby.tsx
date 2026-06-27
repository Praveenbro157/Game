/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GAMES_LIST, GameMetadata, GameCategory, LeaderboardEntry, Player, ChatMessage } from '../types';
import { 
  Search, Gamepad2, Trophy, Users, Award, Radio, ChevronRight, Sparkles, 
  Sword, Shield, Cpu, Activity, Zap, Play, CheckCircle2, RefreshCw, Star,
  MessageSquare, Send, X, MessageCircle, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArcadeLobbyProps {
  playerProfile: {
    name: string;
    avatar: string;
    wins: number;
    totalGames: number;
    robux: number;
    bodyColor: string;
    accessory: 'none' | 'halo' | 'wings' | 'crown' | 'horns';
    trail: 'none' | 'plasma' | 'flame' | 'sparkles' | 'matrix';
    inventory: string[];
  };
  onUpdateProfile: (
    name: string,
    avatar: string,
    bodyColor?: string,
    accessory?: 'none' | 'halo' | 'wings' | 'crown' | 'horns',
    trail?: 'none' | 'plasma' | 'flame' | 'sparkles' | 'matrix',
    robux?: number,
    inventory?: string[]
  ) => void;
  onJoinMatchmaking: (game: GameMetadata) => void;
  matchmakingGameId: string | null;
  onCancelMatchmaking: () => void;
  leaderboardData: LeaderboardEntry[];
  onRequestLeaderboard: (gameId: string) => void;
  wsConnected: boolean;
  chatMessages: ChatMessage[];
  onSendChatMessage: (text: string) => void;
  onPlayOffline: (game: GameMetadata) => void;
  playerId: string;
}

const CATALOG_ACCESSORIES = [
  { id: 'halo', name: 'Glowing Angel Halo', type: 'accessory', icon: '😇', cost: 250, desc: 'A bright rotating halo hovering above your head!' },
  { id: 'wings', name: 'Cyber Crystal Wings', type: 'accessory', icon: '🦋', cost: 400, desc: 'Ethereal pixelated wings that scale with your speed!' },
  { id: 'crown', name: 'Royal Gold Crown', type: 'accessory', icon: '👑', cost: 350, desc: 'A sovereign crown fit for the arena champions!' },
  { id: 'horns', name: 'Demon Ember Horns', type: 'accessory', icon: '😈', cost: 300, desc: 'Two flaming horns that emit dynamic red particles!' }
];

const CATALOG_TRAILS = [
  { id: 'plasma', name: 'Neon Plasma Trail', type: 'trail', icon: '⚡', cost: 300, desc: 'Spawns electric neon blue voxels behind you!' },
  { id: 'flame', name: 'Raging Fire Trail', type: 'trail', icon: '🔥', cost: 450, desc: 'Leave a trail of blazing hot voxel fire as you run!' },
  { id: 'sparkles', name: 'Sovereign Star Sparkles', type: 'trail', icon: '⭐', cost: 500, desc: 'Gilded star sparkles floating along your coordinate path!' },
  { id: 'matrix', name: 'Matrix Code Hack', type: 'trail', icon: '💚', cost: 600, desc: 'Streams green falling binary code coordinates!' }
];

const CATALOG_COLORS = [
  { id: '#06b6d4', name: 'Neon Cyan Skin', type: 'color', icon: '🎨', cost: 100, desc: 'Repaint your blocky chassis in electric neon cyan!' },
  { id: '#ec4899', name: 'Hot Pink Skin', type: 'color', icon: '🎨', cost: 100, desc: 'A vibrant cyber pink theme!' },
  { id: '#8b5cf6', name: 'Aether Purple Skin', type: 'color', icon: '🎨', cost: 100, desc: 'Deep cosmic void violet!' },
  { id: '#10b981', name: 'Emerald Lime Skin', type: 'color', icon: '🎨', cost: 100, desc: 'Toxic green high-visibility shell!' },
  { id: '#ef4444', name: 'Crimson Fury Skin', type: 'color', icon: '🎨', cost: 100, desc: 'Aggressive crimson red outer paint!' },
  { id: '#f59e0b', name: 'Solar Amber Skin', type: 'color', icon: '🎨', cost: 100, desc: 'Blazing bright solar flare gold!' }
];

const CATEGORY_TABS: { value: 'all' | GameCategory; label: string; icon: any }[] = [
  { value: 'all', label: 'All 50 Games', icon: Gamepad2 },
  { value: 'arena', label: '3D MOBA & Arena', icon: Sword },
  { value: 'slither', label: '3D Grid Slither', icon: Activity },
  { value: 'runner', label: '3D Runner & Racer', icon: Zap },
  { value: 'shooter', label: '3D Voxel Shooters', icon: TargetIcon }, // will define custom or use existing
  { value: 'puzzle', label: '3D Block Puzzles', icon: Cpu }
];

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

const AVATARS = ["🎮", "🛸", "👾", "🤖", "⚔️", "🛡️", "🐉", "🔮", "⚡", "🌟", "🐱", "🦊", "🐯", "🦖", "🚀"];

export default function ArcadeLobby({
  playerProfile,
  onUpdateProfile,
  onJoinMatchmaking,
  matchmakingGameId,
  onCancelMatchmaking,
  leaderboardData,
  onRequestLeaderboard,
  wsConnected,
  chatMessages,
  onSendChatMessage,
  onPlayOffline,
  playerId
}: ArcadeLobbyProps) {
  const [activeTab, setActiveTab] = useState<'all' | GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameMetadata>(GAMES_LIST[0]);
  const [editingName, setEditingName] = useState(playerProfile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(playerProfile.avatar);
  const [isSaved, setIsSaved] = useState(false);

  // Lobby top level navigation: 'explore' | 'catalog'
  const [lobbyView, setLobbyView] = useState<'explore' | 'catalog'>('explore');

  // Interactive Reviews/Comments state
  const [gameReviews, setGameReviews] = useState<Record<string, { author: string; avatar: string; text: string; rating: number; date: string }[]>>(() => {
    const reviews: Record<string, any[]> = {};
    const defaultReviews = [
      { author: "Builderman_X", avatar: "👷", text: "Literally better than Bloxburg. The physics are so smooth, love it!", rating: 5, date: "Today" },
      { author: "NoobSlayer_99", avatar: "⚔️", text: "Who wants to play VIP private server with me? Type in chat!", rating: 4, date: "Yesterday" },
      { author: "Guest_3490", avatar: "👽", text: "Got an epic highscore of 12. Bot AI tried to block me but failed miserably lol", rating: 5, date: "2 days ago" },
      { author: "AdoptMe_Fan", avatar: "🐱", text: "The neon trail effects are absolutely beautiful! Best Roblox clone ever", rating: 5, date: "3 days ago" }
    ];
    GAMES_LIST.forEach(g => {
      reviews[g.id] = [...defaultReviews];
    });
    return reviews;
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentRating, setNewCommentRating] = useState(5);

  const [vipServerActive, setVipServerActive] = useState<string | null>(null);

  // Upvote system state
  const [gameVotes, setGameVotes] = useState<Record<string, { up: number; total: number; userVoted?: 'up' | 'down' }>>(() => {
    const votes: Record<string, any> = {};
    GAMES_LIST.forEach(g => {
      // Deterministic ratings
      const baseRating = 85 + (g.title.charCodeAt(0) % 11); // 85% to 96%
      const totalVotes = 240 + (g.title.charCodeAt(1) % 40) * 15;
      const upVotes = Math.floor(totalVotes * (baseRating / 100));
      votes[g.id] = { up: upVotes, total: totalVotes };
    });
    return votes;
  });

  const handleVote = (gameId: string, direction: 'up' | 'down') => {
    setGameVotes(prev => {
      const current = prev[gameId] || { up: 100, total: 110 };
      if (current.userVoted === direction) return prev; // Already voted this way

      let nextUp = current.up;
      let nextTotal = current.total;

      if (!current.userVoted) {
        nextTotal += 1;
        if (direction === 'up') nextUp += 1;
      } else {
        // Toggle vote
        if (direction === 'up') {
          nextUp += 1;
        } else {
          nextUp -= 1;
        }
      }

      return {
        ...prev,
        [gameId]: { up: nextUp, total: nextTotal, userVoted: direction }
      };
    });
  };

  const handlePurchaseItem = (item: { id: string; cost: number; type: string }) => {
    if (playerProfile.robux >= item.cost) {
      const nextRobux = playerProfile.robux - item.cost;
      const nextInventory = [...playerProfile.inventory, item.id];
      // Automatically equip the purchased item too!
      if (item.type === 'color') {
        onUpdateProfile(playerProfile.name, playerProfile.avatar, item.id, playerProfile.accessory, playerProfile.trail, nextRobux, nextInventory);
      } else if (item.type === 'accessory') {
        onUpdateProfile(playerProfile.name, playerProfile.avatar, playerProfile.bodyColor, item.id as any, playerProfile.trail, nextRobux, nextInventory);
      } else if (item.type === 'trail') {
        onUpdateProfile(playerProfile.name, playerProfile.avatar, playerProfile.bodyColor, playerProfile.accessory, item.id as any, nextRobux, nextInventory);
      }
    } else {
      alert("Not enough Robux! Play matches and win to earn more R$!");
    }
  };

  const handleEquipItem = (item: { id: string; type: string }) => {
    if (item.type === 'color') {
      onUpdateProfile(playerProfile.name, playerProfile.avatar, item.id, playerProfile.accessory, playerProfile.trail);
    } else if (item.type === 'accessory') {
      onUpdateProfile(playerProfile.name, playerProfile.avatar, playerProfile.bodyColor, item.id as any, playerProfile.trail);
    } else if (item.type === 'trail') {
      onUpdateProfile(playerProfile.name, playerProfile.avatar, playerProfile.bodyColor, playerProfile.accessory, item.id as any);
    }
  };

  // Chat Widget States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [lastSeenMsgCount, setLastSeenMsgCount] = useState(0);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      setLastSeenMsgCount(chatMessages.length);
    }
  }, [chatMessages.length, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [chatMessages, isChatOpen]);

  const unreadCount = chatMessages.length - lastSeenMsgCount;
  const hasUnread = unreadCount > 0 && !isChatOpen;

  // Auto request leaderboard when selected game changes
  useEffect(() => {
    onRequestLeaderboard(selectedGame.id);
  }, [selectedGame.id]);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(editingName, selectedAvatar);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Filter the 50 games list
  const filteredGames = GAMES_LIST.filter(game => {
    const matchesCategory = activeTab === 'all' || game.category === activeTab;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      
      {/* LEFT SIDEBAR: User Profile & Selected Game Leaderboard details */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        className="lg:col-span-4 space-y-6"
      >
        
        {/* User Profile Card */}
        <div className="bg-[#0F0F1A] border border-[#2A2A40] rounded p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
          <h2 className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Arcade Player Card
          </h2>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="w-16 h-16 rounded bg-slate-900 border-2 border-cyan-500 flex items-center justify-center text-4xl shadow-[inset_0_0_10px_rgba(34,211,238,0.2)] relative overflow-hidden hover:scale-105 transition">
                  {selectedAvatar}
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">GAMER NICKNAME</label>
                <input 
                  type="text" 
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  maxLength={15}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A40] focus:border-cyan-500 px-3 py-1.5 rounded-sm text-slate-100 font-semibold text-sm outline-none transition" 
                />
              </div>
            </div>

            {/* Avatar Select list */}
            <div>
              <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-2">CHOOSE AVATAR CHARACTER</span>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-8 h-8 rounded-sm flex items-center justify-center text-lg transition ${
                      selectedAvatar === av 
                        ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400 scale-110 shadow-[0_0_10px_rgba(34,211,238,0.25)]' 
                        : 'bg-[#0A0A0F] border border-[#2A2A40] hover:border-slate-700 hover:text-slate-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center py-2 border-t border-b border-[#2A2A40] my-2">
              <div className="bg-[#0A0A0F]/60 p-1.5 rounded border border-[#2A2A40]/50">
                <span className="block text-[8px] text-slate-500 uppercase font-mono tracking-widest font-bold">WINS</span>
                <span className="text-sm font-bold text-yellow-500 font-mono">{playerProfile.wins}</span>
              </div>
              <div className="bg-[#0A0A0F]/60 p-1.5 rounded border border-[#2A2A40]/50">
                <span className="block text-[8px] text-slate-500 uppercase font-mono tracking-widest font-bold">GAMES</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">{playerProfile.totalGames}</span>
              </div>
              <div className="bg-[#0A0A0F]/60 p-1.5 rounded border border-[#2A2A40]/50 flex flex-col justify-center items-center">
                <span className="block text-[8px] text-slate-500 uppercase font-mono tracking-widest font-bold">ROBUX</span>
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                  <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-0.5 rounded-sm">R$</span>
                  {playerProfile.robux}
                </span>
              </div>
            </div>

            {/* Equipped Items Info */}
            <div className="bg-black/30 p-2.5 rounded border border-[#2A2A40]/40 text-[9px] font-mono space-y-1 text-slate-400">
              <div className="flex justify-between items-center">
                <span>CHASSIS SKIN:</span>
                <span className="font-bold flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700" style={{ backgroundColor: playerProfile.bodyColor }} />
                  {playerProfile.bodyColor.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>ACCESSORY:</span>
                <span className="font-bold text-cyan-400 uppercase">{playerProfile.accessory.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>EQUIPPED TRAIL:</span>
                <span className="font-bold text-yellow-500 uppercase">{playerProfile.trail.toUpperCase()}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-sm shadow-[0_0_15px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2 hover:scale-[1.01] transition"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Profile Updated
                </>
              ) : (
                'Save Profile Updates'
              )}
            </button>
          </form>
        </div>

        {/* Game Stats & Active Lobbies Info */}
        <div className="bg-[#0F0F1A] border border-[#2A2A40] rounded p-5 shadow-xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-[#2A2A40] pb-2 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            Lobby Scores: {selectedGame.title}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {leaderboardData.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">NO SCORES REGISTERED YET</p>
                <p className="text-[9px] text-slate-600 mt-1">Conquer the first place in this arena!</p>
              </div>
            ) : (
              leaderboardData.map((entry, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-2 rounded border transition ${
                    index === 0 
                      ? 'bg-cyan-950/30 border-l-2 border-cyan-500 text-cyan-200' 
                      : 'bg-slate-900/50 border-l-2 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold w-4 text-center text-cyan-500">
                      0{index + 1}
                    </span>
                    <span className="text-lg">{entry.avatar}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">{entry.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{entry.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-cyan-400">{entry.score} pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* RIGHT MAIN CATALOG CONTENT: 50 Games listing & Roblox Avatar Catalog */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="lg:col-span-8 space-y-6"
      >
        
        {/* Roblox View Tab Selector */}
        <div className="flex border-b border-[#2A2A40]/80 pb-1 gap-4">
          <button
            onClick={() => setLobbyView('explore')}
            className={`pb-2.5 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition select-none cursor-pointer ${
              lobbyView === 'explore' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Explore Games (50 Active Worlds)
          </button>
          <button
            onClick={() => setLobbyView('catalog')}
            className={`pb-2.5 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition select-none cursor-pointer ${
              lobbyView === 'catalog' 
                ? 'border-yellow-500 text-yellow-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
            Avatar Shop & Catalog
          </button>
        </div>

        {lobbyView === 'explore' ? (
          <>
            {/* Top bar with Search & Category Tabs */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Search Input */}
                <div className="relative w-full md:max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-slate-500" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search 50 launchable 3D games..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0F0F1A] border border-[#2A2A40] focus:border-cyan-500 pl-9 pr-4 py-2 rounded-sm text-slate-200 placeholder-slate-600 text-sm outline-none transition" 
                  />
                </div>

                {/* App Header Status */}
                <div className="flex gap-4 bg-black/40 px-4 py-2 border border-[#2A2A40] rounded font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-slate-400 text-[10px] uppercase font-bold">SERVER STATUS: NOMINAL</span>
                  </div>
                  <div className="w-[1px] h-4 bg-slate-700" />
                  <div className="text-[10px] text-cyan-200 font-bold uppercase">PLAYERS: {420 + GAMES_LIST.length} ONLINE</div>
                </div>
              </div>

              {/* Category Tabs Scroll Grid */}
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TABS.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-2 border transition cursor-pointer select-none ${
                        activeTab === tab.value 
                          ? 'bg-cyan-600 text-black border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]' 
                          : 'bg-[#0F0F1A] hover:bg-slate-800/80 text-gray-400 border-[#2A2A40] hover:border-slate-700'
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Game list grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar border border-[#2A2A40]/30 p-2 rounded-sm bg-black/15">
              {filteredGames.length === 0 ? (
                <div className="col-span-2 text-center py-20 bg-[#0F0F1A] border border-[#2A2A40] rounded-sm">
                  <Gamepad2 className="w-12 h-12 text-slate-700 mx-auto mb-2 animate-spin" />
                  <p className="text-sm font-semibold text-slate-400">No matching arcade games found</p>
                  <p className="text-xs text-slate-600 mt-1">Try refining your keyword search filter!</p>
                </div>
              ) : (
                filteredGames.map((game, idx) => {
                  const votes = gameVotes[game.id] || { up: 100, total: 110 };
                  const ratingPercent = votes.total > 0 ? Math.round((votes.up / votes.total) * 100) : 100;
                  return (
                    <motion.div 
                      key={game.id} 
                      onClick={() => {
                        setSelectedGame(game);
                        setVipServerActive(null);
                      }}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.25), ease: 'easeOut' }}
                      whileHover={{ 
                        y: -3, 
                        borderColor: selectedGame.id === game.id ? '#22d3ee' : '#3b82f6',
                        boxShadow: '0 8px 20px -5px rgba(6, 182, 212, 0.15)',
                        backgroundColor: '#161625'
                      }}
                      whileTap={{ scale: 0.98 }}
                      className={`group text-left p-4 rounded-sm border cursor-pointer relative flex flex-col justify-between h-[190px] transition-colors ${
                        selectedGame.id === game.id 
                          ? 'bg-[#161625] border-cyan-500 shadow-[inset_0_0_15px_rgba(34,211,238,0.15)]' 
                          : 'bg-[#0F0F1A] border-[#2A2A40]'
                      }`}
                    >
                      {/* Visual Category Glow Indicator */}
                      <div 
                        className="absolute top-0 left-0 w-1 h-full rounded-l" 
                        style={{ backgroundColor: game.color }} 
                      />

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-slate-900 border" style={{ borderColor: game.color, color: game.color }}>
                            {game.category.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                            👍 {ratingPercent}% Rating
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition">
                          {game.title}
                        </h3>
                        
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {game.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center border-t border-[#2A2A40]/60 pt-2.5 mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                          <span>{game.playerCount} playing</span>
                        </div>

                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Select Game
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* ROBLOX AVATAR SHOP / CATALOG VIEW */
          <div className="space-y-6 bg-[#0E0E17]/90 border border-[#2A2A40]/80 rounded p-6 shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-2xl rounded-full" />
            
            <div className="flex items-center justify-between border-b border-[#2A2A40] pb-3">
              <div>
                <h3 className="text-md font-black text-yellow-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-bounce" />
                  ROBLOX ITEM SHOP & CUSTOMIZATION
                </h3>
                <p className="text-xs text-slate-400">Earn free Robux (R$) by playing and winning match queues, then buy premium gears!</p>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded px-3.5 py-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-1 rounded-sm">R$</span>
                <span className="text-sm font-black text-emerald-300 font-mono">{playerProfile.robux}</span>
              </div>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Accessory Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                  👑 Premium Hats & Accessories
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATALOG_ACCESSORIES.map(item => {
                    const isPurchased = playerProfile.inventory.includes(item.id);
                    const isEquipped = playerProfile.accessory === item.id;
                    return (
                      <div key={item.id} className="bg-black/40 border border-slate-800/80 p-3 rounded flex items-center justify-between gap-3 hover:border-[#2A2A40] transition">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">
                            {item.icon}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-100 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 leading-snug block">{item.desc}</span>
                          </div>
                        </div>
                        <div>
                          {isEquipped ? (
                            <span className="px-3 py-1.5 bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono text-[9px] font-black rounded-sm block text-center uppercase">Equipped</span>
                          ) : isPurchased ? (
                            <button
                              onClick={() => handleEquipItem(item)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer transition"
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchaseItem(item)}
                              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black font-mono text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer flex items-center gap-1 transition"
                            >
                              <span>R$</span> {item.cost}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trail Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                  ⚡ Voxel Motion Trails
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATALOG_TRAILS.map(item => {
                    const isPurchased = playerProfile.inventory.includes(item.id);
                    const isEquipped = playerProfile.trail === item.id;
                    return (
                      <div key={item.id} className="bg-black/40 border border-slate-800/80 p-3 rounded flex items-center justify-between gap-3 hover:border-[#2A2A40] transition">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl">
                            {item.icon}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-100 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 leading-snug block">{item.desc}</span>
                          </div>
                        </div>
                        <div>
                          {isEquipped ? (
                            <span className="px-3 py-1.5 bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono text-[9px] font-black rounded-sm block text-center uppercase">Equipped</span>
                          ) : isPurchased ? (
                            <button
                              onClick={() => handleEquipItem(item)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer transition"
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchaseItem(item)}
                              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black font-mono text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer flex items-center gap-1 transition"
                            >
                              <span>R$</span> {item.cost}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skin Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                  🎨 Character Skins & Shaders
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATALOG_COLORS.map(item => {
                    const isPurchased = playerProfile.inventory.includes(item.id);
                    const isEquipped = playerProfile.bodyColor === item.id;
                    return (
                      <div key={item.id} className="bg-black/40 border border-slate-800/80 p-3 rounded flex items-center justify-between gap-3 hover:border-[#2A2A40] transition">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded flex items-center justify-center text-xl border" style={{ backgroundColor: item.id, borderColor: item.id }}>
                            {item.icon}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-100 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 leading-snug block">{item.desc}</span>
                          </div>
                        </div>
                        <div>
                          {isEquipped ? (
                            <span className="px-3 py-1.5 bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono text-[9px] font-black rounded-sm block text-center uppercase">Equipped</span>
                          ) : isPurchased ? (
                            <button
                              onClick={() => handleEquipItem(item)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer transition"
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchaseItem(item)}
                              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black font-mono text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer flex items-center gap-1 transition"
                            >
                              <span>R$</span> {item.cost}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Selected Game Launch Panel */}
        {selectedGame && (
          <motion.div 
            key={selectedGame.id}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-gradient-to-br from-[#161625] via-[#0F0F1A] to-black border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.15),inset_0_0_20px_rgba(34,211,238,0.25)] rounded-sm p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 blur-3xl rounded-full" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold uppercase font-mono border border-cyan-500/30">
                    3D {selectedGame.category.toUpperCase()} SERVER
                  </span>
                  <span className="text-xs text-slate-600 font-mono">|</span>
                  {wsConnected ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Lobby Server Connected
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-bold flex items-center gap-1.5" title="You are offline or the websocket is blocked. You can still use 'Play Solo vs Bot'!">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Server Offline (Play Offline Activated)
                    </span>
                  )}
                  <span className="text-xs text-slate-600 font-mono">|</span>
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                    <button onClick={() => handleVote(selectedGame.id, 'up')} className="text-slate-400 hover:text-emerald-400 transition cursor-pointer select-none">👍</button>
                    <span className="font-mono text-slate-300">
                      {Math.round(((gameVotes[selectedGame.id]?.up || 1) / (gameVotes[selectedGame.id]?.total || 1)) * 100)}%
                    </span>
                    <button onClick={() => handleVote(selectedGame.id, 'down')} className="text-slate-400 hover:text-rose-400 transition cursor-pointer select-none">👎</button>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase leading-tight font-sans">
                  LAUNCH {selectedGame.title}
                </h2>
                <p className="text-xs text-slate-300">
                  {selectedGame.description}
                </p>

                {/* VIP Server Panel */}
                <div className="bg-slate-950/40 p-3 rounded border border-yellow-500/20 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <span className="font-black text-yellow-500 block text-[11px] tracking-wide font-mono">🔒 VIP PRIVATE SERVER MANAGER</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Generate a free VIP server to bypass queues!</span>
                    </div>
                    {vipServerActive ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-black bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded border border-yellow-500/30">
                          {vipServerActive}
                        </span>
                        <button
                          onClick={() => {
                            // Instant offline launch with bot representing the private server!
                            onPlayOffline(selectedGame);
                          }}
                          className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-black rounded-sm uppercase tracking-wider transition"
                        >
                          Join VIP
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCreateVipServer(selectedGame.id)}
                        className="px-2.5 py-1 bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-black rounded-sm uppercase tracking-wider transition cursor-pointer"
                      >
                        Create VIP
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-black/40 px-3.5 py-2.5 rounded border border-slate-700/50 font-mono text-xs text-slate-300">
                  <span className="font-bold text-cyan-400 uppercase block text-[9px] tracking-wider mb-1">CONTROLS INSTRUCTION</span>
                  {selectedGame.controls}
                </div>
              </div>

              {/* Matchmaking Launch buttons */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3 min-w-[200px] z-10">
                {matchmakingGameId === selectedGame.id ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-black/60 rounded border border-cyan-500/40 text-center w-full">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                    <span className="text-xs text-slate-200 font-mono font-bold tracking-wider animate-pulse">MATCHMAKING...</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">Searching lobby pairs</span>
                    <button
                      onClick={onCancelMatchmaking}
                      className="mt-4 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-500/30 hover:text-white font-mono text-[10px] font-bold rounded transition"
                    >
                      Cancel Search
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onJoinMatchmaking(selectedGame)}
                      disabled={!wsConnected}
                      className={`w-full px-6 py-3.5 font-extrabold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition active:scale-95 ${
                        wsConnected
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:scale-[1.02]'
                          : 'bg-slate-800 text-slate-550 border border-slate-700 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Join Queue Match
                    </button>

                    <button
                      onClick={() => onPlayOffline(selectedGame)}
                      className="w-full px-6 py-3.5 bg-slate-850 hover:bg-slate-800 text-slate-100 font-extrabold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 border border-slate-750 hover:border-slate-600 transition hover:scale-[1.02] active:scale-95"
                    >
                      <Gamepad2 className="w-4 h-4 text-cyan-400" />
                      Play Solo vs Bot
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Game Comments Panel */}
            <div className="mt-6 border-t border-[#2A2A40]/60 pt-4 space-y-3 relative z-10">
              <span className="font-mono text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] block">💬 PLAYER REVIEWS & SERVER COMMENTS</span>
              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {(gameReviews[selectedGame.id] || []).map((review, rIdx) => (
                  <div key={rIdx} className="bg-black/40 p-2.5 rounded border border-[#2A2A40]/40 flex gap-2.5 text-[11px]">
                    <div className="text-lg flex-shrink-0">{review.avatar}</div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-300">{review.author}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">{"★".repeat(review.rating)}</span>
                          <span className="text-slate-600 font-mono">| {review.date}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 font-sans leading-relaxed">
                        {review.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddComment(selectedGame.id); }} className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Post an interactive review comment on this game..."
                  maxLength={100}
                  className="flex-1 bg-slate-900/90 border border-slate-750 focus:border-cyan-500 rounded px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black px-4 py-1.5 rounded-sm text-xs font-black uppercase tracking-wide transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </form>
            </div>
          </motion.div>
        )}

      </motion.div>

      {/* FLOATING LOBBY RECRUIT CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-[100] font-sans">
        <AnimatePresence>
          {isChatOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-80 sm:w-96 h-[420px] bg-[#0d0d18]/95 backdrop-blur-md border-2 border-cyan-500/40 rounded shadow-[0_10px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#17172c] to-[#0e0e1a] px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black tracking-widest text-white uppercase font-mono">LOBBY RECRUIT CHAT</span>
                  {wsConnected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Connected to lobby server" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Offline - Chat is disabled" />
                  )}
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageCircle className="w-10 h-10 text-slate-700 mb-2 animate-bounce" />
                    <p className="text-xs text-slate-400 font-mono">NO RECRUIT MESSAGES</p>
                    <p className="text-[10px] text-slate-600 mt-1">Be the first player to send a message in the global lobby queue!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.playerId === playerId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 max-w-[85%] ${
                          isMe ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <div className="w-7 h-7 bg-[#1c1c30] border border-cyan-500/20 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {msg.senderAvatar}
                        </div>
                        <div className="space-y-0.5">
                          <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                            <span className="font-bold text-slate-300">{msg.senderName}</span>
                            <span className="text-slate-600 font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`p-2.5 rounded text-xs leading-relaxed font-sans ${
                              isMe
                                ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 rounded-tr-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-black/40 border-t border-slate-800">
                {wsConnected ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      onSendChatMessage(chatInput.trim());
                      setChatInput('');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type recruit message..."
                      maxLength={100}
                      className="flex-1 bg-slate-900/80 border border-slate-750 focus:border-cyan-500/50 rounded px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="bg-cyan-600 hover:bg-cyan-500 text-black px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3 h-3 fill-black text-black" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-amber-500 bg-amber-950/20 rounded border border-amber-500/20 text-center font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    CHAT UNAVAILABLE OFFLINE
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              layoutId="lobby-chat-trigger"
              onClick={() => setIsChatOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-indigo-800 hover:from-cyan-500 hover:to-indigo-700 text-black hover:text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-[0_4px_20px_rgba(8,145,178,0.45)] cursor-pointer select-none transition-all border border-cyan-400/50"
            >
              <div className="relative">
                <MessageSquare className="w-4 h-4 fill-current text-black" />
                {hasUnread && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border border-black animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-black uppercase tracking-wider font-mono">LOBBY CHAT</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}
