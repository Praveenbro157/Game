/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Player, Lobby, GameMetadata } from '../types';
import { Shield, Heart, Zap, Award, Swords, RotateCcw, Volume2, VolumeX, Radio } from 'lucide-react';

interface ThreeGameContainerProps {
  game: GameMetadata;
  lobby: Lobby;
  playerId: string;
  opponent: Player | null;
  sendSocketMessage: (type: string, data: any) => void;
  onExit: () => void;
}

export default function ThreeGameContainer({
  game,
  lobby,
  playerId,
  opponent,
  sendSocketMessage,
  onExit
}: ThreeGameContainerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [localScore, setLocalScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [localHealth, setLocalHealth] = useState(100);
  const [oppHealth, setOppHealth] = useState(100);
  const [matchTime, setMatchTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  
  // Game states to pass between React and Three loops
  const localPlayerState = useRef<{ x: number; y: number; z: number; health: number; score: number }>({
    x: game.category === 'arena' ? -15 : 0,
    y: 0.5,
    z: 0,
    health: 100,
    score: 0
  });

  const oppPlayerState = useRef<{ x: number; y: number; z: number; health: number; score: number }>({
    x: game.category === 'arena' ? 15 : 0,
    y: 0.5,
    z: 0,
    health: 100,
    score: 0
  });

  // Projectiles & Obstacles lists
  const projectiles = useRef<Array<{ mesh: THREE.Mesh; dx: number; dz: number; owner: string }>>([]);
  const obstacles = useRef<Array<{ mesh: THREE.Mesh; type: 'coin' | 'hazard' | 'brick' | 'target'; speed: number; rotSpeed: number; active: boolean }>>([]);
  const particles = useRef<Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }>>([]);
  
  // Snake segments lists
  const localSnakeSegments = useRef<THREE.Mesh[]>([]);
  const oppSnakeSegments = useRef<THREE.Mesh[]>([]);
  const foodItems = useRef<THREE.Mesh[]>([]);

  // Sound generator using Web Audio API (highly robust, no external files needed!)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSynthSound = (type: 'laser' | 'hit' | 'score' | 'crash' | 'powerup') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'score') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'crash') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("Audio context error:", e);
    }
  };

  // Keyboard controls status
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update match timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!gameEnded) {
        setMatchTime(t => t + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameEnded]);

  // Synchronize incoming opponent movement and health updates from lobby
  useEffect(() => {
    if (opponent) {
      const oppLobbyData = lobby.players.find(p => p.id === opponent.id);
      if (oppLobbyData) {
        oppPlayerState.current.x = oppLobbyData.x ?? oppPlayerState.current.x;
        oppPlayerState.current.y = oppLobbyData.y ?? oppPlayerState.current.y;
        oppPlayerState.current.z = oppLobbyData.z ?? oppPlayerState.current.z;
        oppPlayerState.current.health = oppLobbyData.health ?? oppPlayerState.current.health;
        oppPlayerState.current.score = oppLobbyData.score ?? oppPlayerState.current.score;

        setOppHealth(oppPlayerState.current.health);
        setOppScore(oppPlayerState.current.score);
      }
    }
    const localLobbyData = lobby.players.find(p => p.id === playerId);
    if (localLobbyData) {
      localPlayerState.current.health = localLobbyData.health ?? localPlayerState.current.health;
      localPlayerState.current.score = localLobbyData.score ?? localPlayerState.current.score;

      setLocalHealth(localPlayerState.current.health);
      setLocalScore(localPlayerState.current.score);
    }

    if (lobby.status === 'ended') {
      const winner = lobby.players.find(p => p.health !== 0 && p.score >= Math.max(...lobby.players.map(x=>x.score)));
      setWinnerName(winner ? winner.name : 'Match Over');
      setGameEnded(true);
    }
  }, [lobby, opponent, playerId]);

  // THREEJS ENGINE BOOTSTRAPPING
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 550;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19'); // Elegant deep space theme
    scene.fog = new THREE.FogExp2('#0b0f19', 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    
    // Set camera angles based on Game Categories to give unique vibe!
    if (game.category === 'slither' || game.category === 'puzzle') {
      // Top down isometric projection
      camera.position.set(0, 32, 22);
      camera.lookAt(0, 0, 4);
    } else if (game.category === 'runner') {
      // Third person race track view
      camera.position.set(0, 6, 12);
      camera.lookAt(0, 1.5, -15);
    } else if (game.category === 'shooter') {
      // Back high perspective arcade shooter
      camera.position.set(0, 16, 18);
      camera.lookAt(0, 0, -4);
    } else {
      // MOBA / Arena battles (Strategic isometric camera)
      camera.position.set(0, 20, 16);
      camera.lookAt(0, 0, -2);
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight('#2a3454', 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#4f46e5', 1.85);
    dirLight.position.set(10, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const accentLight = new THREE.PointLight(game.color, 2, 50);
    accentLight.position.set(0, 5, 0);
    scene.add(accentLight);

    // Grid Helpers / Floor
    let floorMesh: THREE.Mesh;
    if (game.category === 'slither') {
      const gridHelper = new THREE.GridHelper(50, 50, '#10b981', '#1f2937');
      gridHelper.position.y = 0.05;
      scene.add(gridHelper);
      
      const floorGeo = new THREE.PlaneGeometry(50, 50);
      const floorMat = new THREE.MeshStandardMaterial({ color: '#060a13', roughness: 0.8 });
      floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);
    } else if (game.category === 'runner') {
      // Lane structure
      const runwayGeo = new THREE.PlaneGeometry(16, 200);
      const runwayMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.5 });
      const runway = new THREE.Mesh(runwayGeo, runwayMat);
      runway.rotation.x = -Math.PI / 2;
      runway.position.z = -80;
      runway.receiveShadow = true;
      scene.add(runway);

      // Lanes side-borders
      const borderGeo = new THREE.BoxGeometry(0.5, 0.8, 200);
      const borderMat = new THREE.MeshStandardMaterial({ color: game.color, emissive: game.color, emissiveIntensity: 0.2 });
      
      const leftBorder = new THREE.Mesh(borderGeo, borderMat);
      leftBorder.position.set(-8.25, 0.4, -80);
      scene.add(leftBorder);

      const rightBorder = new THREE.Mesh(borderGeo, borderMat);
      rightBorder.position.set(8.25, 0.4, -80);
      scene.add(rightBorder);
    } else {
      // Normal Battle Arena floor
      const arenaGeo = new THREE.CylinderGeometry(25, 25, 0.5, 32);
      const arenaMat = new THREE.MeshStandardMaterial({ color: '#131929', roughness: 0.6 });
      floorMesh = new THREE.Mesh(arenaGeo, arenaMat);
      floorMesh.position.y = -0.25;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // Arena neon circle limit ring
      const ringGeo = new THREE.RingGeometry(24.8, 25, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: game.color, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      scene.add(ring);
    }

    // CREATE PLAYERS IN THREE.JS
    // Local player visual mesh
    let localMesh: THREE.Group = new THREE.Group();
    const localBodyGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const localBodyMat = new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.2, metalness: 0.1 });
    const localBody = new THREE.Mesh(localBodyGeo, localBodyMat);
    localBody.position.y = 0.6;
    localBody.castShadow = true;
    localMesh.add(localBody);

    // Add glowing visor/headlight
    const visorGeo = new THREE.BoxGeometry(0.8, 0.25, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: '#60a5fa' });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.8, 0.55);
    localMesh.add(visor);

    scene.add(localMesh);
    localMesh.position.set(localPlayerState.current.x, 0.5, localPlayerState.current.z);

    // Opponent player visual mesh
    let oppMesh: THREE.Group = new THREE.Group();
    const oppBodyGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const oppBodyMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.2, metalness: 0.1 });
    const oppBody = new THREE.Mesh(oppBodyGeo, oppBodyMat);
    oppBody.position.y = 0.6;
    oppBody.castShadow = true;
    oppMesh.add(oppBody);

    const oppVisorGeo = new THREE.BoxGeometry(0.8, 0.25, 0.2);
    const oppVisorMat = new THREE.MeshBasicMaterial({ color: '#f87171' });
    const oppVisor = new THREE.Mesh(oppVisorGeo, oppVisorMat);
    oppVisor.position.set(0, 0.8, -0.55); // face back
    oppMesh.add(oppVisor);

    scene.add(oppMesh);
    oppMesh.position.set(oppPlayerState.current.x, 0.5, oppPlayerState.current.z);

    // CATEGORY SPECIFIC INITIALIZATION
    // 1. Food Orbs spawning for Grid Slither
    if (game.category === 'slither') {
      const orbGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const colors = ['#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#d946ef'];
      
      for (let i = 0; i < 15; i++) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const orbMat = new THREE.MeshStandardMaterial({
          color: randomColor,
          emissive: randomColor,
          emissiveIntensity: 0.6,
          roughness: 0.1
        });
        const food = new THREE.Mesh(orbGeo, orbMat);
        resetFoodPosition(food);
        scene.add(food);
        foodItems.current.push(food);
      }

      // Initialize initial snake segments
      const segGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      const segMat = new THREE.MeshStandardMaterial({ color: '#60a5fa', roughness: 0.3 });
      for (let i = 0; i < 3; i++) {
        const seg = new THREE.Mesh(segGeo, segMat);
        seg.position.set(localMesh.position.x, 0.5, localMesh.position.z + (i + 1));
        scene.add(seg);
        localSnakeSegments.current.push(seg);
      }

      // Opponent snake segments
      const oppSegMat = new THREE.MeshStandardMaterial({ color: '#f87171', roughness: 0.3 });
      for (let i = 0; i < 3; i++) {
        const seg = new THREE.Mesh(segGeo, oppSegMat);
        seg.position.set(oppMesh.position.x, 0.5, oppMesh.position.z + (i + 1));
        scene.add(seg);
        oppSnakeSegments.current.push(seg);
      }
    }

    // 2. Obstacles / Items spawning for Infinite Runner
    if (game.category === 'runner') {
      // Spawn items along lanes (Lanes coordinates: -4, 0, 4)
      const laneX = [-4, 0, 4];
      const hazardGeo = new THREE.BoxGeometry(2, 2, 2);
      const coinGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16);
      coinGeo.rotateX(Math.PI / 2);

      for (let i = 0; i < 15; i++) {
        const isHazard = Math.random() < 0.45;
        const targetZ = -30 - i * 18;
        const targetX = laneX[Math.floor(Math.random() * laneX.length)];

        if (isHazard) {
          const hazardMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.1, emissive: '#b91c1c', emissiveIntensity: 0.3 });
          const haz = new THREE.Mesh(hazardGeo, hazardMat);
          haz.position.set(targetX, 1, targetZ);
          scene.add(haz);
          obstacles.current.push({ mesh: haz, type: 'hazard', speed: 0.25, rotSpeed: 0.01, active: true });
        } else {
          const coinMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.1, metalness: 0.8, emissive: '#d97706', emissiveIntensity: 0.3 });
          const coin = new THREE.Mesh(coinGeo, coinMat);
          coin.position.set(targetX, 1, targetZ);
          scene.add(coin);
          obstacles.current.push({ mesh: coin, type: 'coin', speed: 0.25, rotSpeed: 0.05, active: true });
        }
      }
    }

    // 3. Invader Spawners for Shooter
    if (game.category === 'shooter') {
      const invaderGeo = new THREE.BoxGeometry(1.6, 0.8, 1.2);
      const invaderMat = new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#047857', emissiveIntensity: 0.3 });
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
          const inv = new THREE.Mesh(invaderGeo, invaderMat);
          inv.position.set(-14 + col * 4, 0.8, -15 - row * 4);
          scene.add(inv);
          obstacles.current.push({ mesh: inv, type: 'target', speed: 0.02, rotSpeed: 0, active: true });
        }
      }
    }

    // 4. Bricks and Ball for Brick Puzzle
    if (game.category === 'puzzle') {
      // Create rows of bricks in front
      const brickGeo = new THREE.BoxGeometry(2.2, 0.8, 1);
      const colors = ['#f43f5e', '#d946ef', '#3b82f6', '#10b981', '#eab308'];
      
      for (let row = 0; row < 4; row++) {
        const brickColor = colors[row % colors.length];
        const brickMat = new THREE.MeshStandardMaterial({ color: brickColor, roughness: 0.1 });
        
        for (let col = 0; col < 9; col++) {
          const brick = new THREE.Mesh(brickGeo, brickMat);
          brick.position.set(-12 + col * 3, 0.6, -10 - row * 2.2);
          scene.add(brick);
          obstacles.current.push({ mesh: brick, type: 'brick', speed: 0, rotSpeed: 0, active: true });
        }
      }

      // Create high-bouncing Chrome Sphere (Ball)
      const ballGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const ballMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.9, roughness: 0.05 });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(0, 0.6, 0);
      scene.add(ball);

      // Store physics data on ball
      obstacles.current.push({
        mesh: ball,
        type: 'coin', // treat as coin-physics trigger in collision loops
        speed: 0.35,  // standard velocity
        rotSpeed: 0.1,
        active: true
      });
      
      // Keep velocity vectors on the ball ref directly
      (ball as any).velX = 0.15;
      (ball as any).velZ = -0.25;
    }

    function resetFoodPosition(food: THREE.Mesh) {
      food.position.set(
        (Math.random() - 0.5) * 44,
        0.5,
        (Math.random() - 0.5) * 44
      );
    }

    // Particle explosion spawner
    function spawnExplosion(x: number, y: number, z: number, colorStr: string, count = 12) {
      const partGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const partMat = new THREE.MeshBasicMaterial({ color: colorStr });
      
      for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(partGeo, partMat);
        p.position.set(x, y, z);
        scene.add(p);
        
        particles.current.push({
          mesh: p,
          vx: (Math.random() - 0.5) * 0.4,
          vy: Math.random() * 0.4 + 0.1,
          vz: (Math.random() - 0.5) * 0.4,
          life: 1.0 // 100% life
        });
      }
    }

    // Shoots local projectile (Arena & Shooter)
    const handleShoot = () => {
      if (gameEnded) return;
      playSynthSound('laser');
      
      const pGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: '#60a5fa' });
      const p = new THREE.Mesh(pGeo, pMat);
      
      // Calculate shooting vector based on visor direction or mouse pointer
      // For simplicity, default to straight ahead or movement heading
      let dx = 0;
      let dz = -1;

      if (keys.current['a'] || keys.current['arrowleft']) dx = -1;
      if (keys.current['d'] || keys.current['arrowright']) dx = 1;
      if (keys.current['w'] || keys.current['arrowup']) dz = -1;
      if (keys.current['s'] || keys.current['arrowdown']) dz = 1;

      if (dx === 0 && dz === 0) dz = -1; // Default forward
      const length = Math.sqrt(dx * dx + dz * dz);
      dx /= length;
      dz /= length;

      // Position at player nose
      p.position.set(localMesh.position.x + dx * 1.5, 0.8, localMesh.position.z + dz * 1.5);
      scene.add(p);

      projectiles.current.push({
        mesh: p,
        dx: dx * 0.65,
        dz: dz * 0.65,
        owner: playerId
      });

      // Synchronize shoot to lobby socket
      sendSocketMessage('shoot_projectile', {
        lobbyId: lobby.id,
        x: localMesh.position.x,
        z: localMesh.position.z,
        dirX: dx,
        dirZ: dz
      });
    };

    // Listen to click to shoot for MOBA/Shooter
    const handleMouseClick = () => {
      if (game.category === 'arena' || game.category === 'shooter') {
        handleShoot();
      }
    };
    
    mountRef.current?.addEventListener('click', handleMouseClick);

    // Track active opponent projectile sync
    // We can hook a custom event or check on lobby updates if they shot
    // To make it fully reactive, we listen to opponent_shot from the lobby
    // By storing a callback on the global window or a custom listener
    const handleOpponentShot = (e: any) => {
      const data = e.detail;
      playSynthSound('laser');
      
      const pGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: '#f87171' });
      const p = new THREE.Mesh(pGeo, pMat);

      p.position.set(data.x + data.dirX * 1.5, 0.8, data.z + data.dirZ * 1.5);
      scene.add(p);

      projectiles.current.push({
        mesh: p,
        dx: data.dirX * 0.65,
        dz: data.dirZ * 0.65,
        owner: 'opponent'
      });
    };

    window.addEventListener('opponent_shot_event', handleOpponentShot);

    // --- GAME RENDERING FRAME LOOP ---
    let animFrameId: number;
    let slitherTimer = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      // 1. UPDATE LOCAL PLAYER POSITION (DIFFERENT BY GENRE)
      if (!gameEnded) {
        let dx = 0;
        let dz = 0;

        if (keys.current['a'] || keys.current['arrowleft']) dx = -1;
        if (keys.current['d'] || keys.current['arrowright']) dx = 1;
        
        // For standard arena / slither, support Z movement too
        if (game.category !== 'runner' && game.category !== 'shooter') {
          if (keys.current['w'] || keys.current['arrowup']) dz = -1;
          if (keys.current['s'] || keys.current['arrowdown']) dz = 1;
        }

        // Apply velocities
        if (game.category === 'runner') {
          // Lane changing mechanics (A / D sliding between lanes -4, 0, 4)
          const targetX = dx * 4;
          localMesh.position.x = THREE.MathUtils.lerp(localMesh.position.x, targetX, 0.22);
          
          // Hover jumping in runner
          if ((keys.current[' '] || keys.current['w'] || keys.current['arrowup']) && localMesh.position.y <= 0.6) {
            playSynthSound('laser');
            (localMesh as any).vy = 0.35; // velocity up
          }
          
          if ((localMesh as any).vy !== undefined) {
            localMesh.position.y += (localMesh as any).vy;
            (localMesh as any).vy -= 0.022; // gravity
            if (localMesh.position.y <= 0.5) {
              localMesh.position.y = 0.5;
              (localMesh as any).vy = undefined;
            }
          }
        } else if (game.category === 'shooter') {
          // Clamp plane movement horizontal
          localMesh.position.x = Math.max(-16, Math.min(16, localMesh.position.x + dx * 0.28));
        } else {
          // Standard circular Arena boundary clamp
          const speed = game.category === 'slither' ? 0.16 : 0.22;
          const nextX = localMesh.position.x + dx * speed;
          const nextZ = localMesh.position.z + dz * speed;

          const distFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
          if (game.category === 'slither') {
            // Keep on square board
            localMesh.position.x = Math.max(-24, Math.min(24, nextX));
            localMesh.position.z = Math.max(-24, Math.min(24, nextZ));
          } else {
            // Circle boundary limit
            if (distFromCenter < 24.2) {
              localMesh.position.x = nextX;
              localMesh.position.z = nextZ;
            }
          }

          // Orient player visor mesh to direction of movement
          if (dx !== 0 || dz !== 0) {
            const angle = Math.atan2(dx, dz);
            localMesh.rotation.y = angle;
          }
        }

        // Synchronize local coordinates to server periodically
        localPlayerState.current.x = localMesh.position.x;
        localPlayerState.current.z = localMesh.position.z;

        // Keep local position synchronized to remote lobby periodically
        if (Math.random() < 0.25) {
          sendSocketMessage('update_position', {
            lobbyId: lobby.id,
            x: localMesh.position.x,
            y: localMesh.position.y,
            z: localMesh.position.z,
            dirX: dx,
            dirZ: dz,
            score: localPlayerState.current.score
          });
        }
      }

      // 2. RENDERING OPPONENT COORDINATES
      // Lerp opponent position towards synchronized coordinates
      oppMesh.position.x = THREE.MathUtils.lerp(oppMesh.position.x, oppPlayerState.current.x, 0.25);
      oppMesh.position.y = THREE.MathUtils.lerp(oppMesh.position.y, oppPlayerState.current.y, 0.25);
      oppMesh.position.z = THREE.MathUtils.lerp(oppMesh.position.z, oppPlayerState.current.z, 0.25);

      // Opponent visor heading alignment
      const oppLobby = lobby.players.find(p => p.id !== playerId);
      if (oppLobby && oppLobby.dirX !== undefined && oppLobby.dirZ !== undefined) {
        if (oppLobby.dirX !== 0 || oppLobby.dirZ !== 0) {
          const angle = Math.atan2(oppLobby.dirX, oppLobby.dirZ);
          oppMesh.rotation.y = angle;
        }
      }

      // 3. SECTOR SPECIFIC LOOPS
      // Slither snake trails and eating logic
      if (game.category === 'slither') {
        slitherTimer++;
        if (slitherTimer >= 4 && !gameEnded) {
          slitherTimer = 0;

          // Update snake segments follow head
          let prevX = localMesh.position.x;
          let prevZ = localMesh.position.z;

          for (let i = 0; i < localSnakeSegments.current.length; i++) {
            const seg = localSnakeSegments.current[i];
            const tempX = seg.position.x;
            const tempZ = seg.position.z;
            seg.position.set(prevX, 0.5, prevZ);
            prevX = tempX;
            prevZ = tempZ;
          }

          // Opponent segments trail follow
          let prevOppX = oppMesh.position.x;
          let prevOppZ = oppMesh.position.z;
          for (let i = 0; i < oppSnakeSegments.current.length; i++) {
            const seg = oppSnakeSegments.current[i];
            const tempX = seg.position.x;
            const tempZ = seg.position.z;
            seg.position.set(prevOppX, 0.5, prevOppZ);
            prevOppX = tempX;
            prevOppZ = tempZ;
          }
        }

        // Check food collisions
        foodItems.current.forEach(food => {
          food.rotation.y += 0.04;
          food.rotation.x += 0.01;

          // Distance to local head
          const localDist = localMesh.position.distanceTo(food.position);
          if (localDist < 1.4) {
            playSynthSound('score');
            spawnExplosion(food.position.x, 0.5, food.position.z, '#10b981', 8);
            resetFoodPosition(food);

            // Grow segment locally
            const segGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
            const segMat = new THREE.MeshStandardMaterial({ color: '#60a5fa', roughness: 0.3 });
            const newSeg = new THREE.Mesh(segGeo, segMat);
            const lastSeg = localSnakeSegments.current[localSnakeSegments.current.length - 1] || localMesh;
            newSeg.position.set(lastSeg.position.x, 0.5, lastSeg.position.z);
            scene.add(newSeg);
            localSnakeSegments.current.push(newSeg);

            // Update scores
            localPlayerState.current.score += 1;
            setLocalScore(localPlayerState.current.score);
            sendSocketMessage('game_event', {
              lobbyId: lobby.id,
              event: 'score_update',
              score: localPlayerState.current.score
            });
          }

          // Distance to opponent head
          const oppDist = oppMesh.position.distanceTo(food.position);
          if (oppDist < 1.4) {
            playSynthSound('hit');
            spawnExplosion(food.position.x, 0.5, food.position.z, '#ef4444', 8);
            resetFoodPosition(food);

            // Opponent grow segment
            const segGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
            const oppSegMat = new THREE.MeshStandardMaterial({ color: '#f87171', roughness: 0.3 });
            const newSeg = new THREE.Mesh(segGeo, oppSegMat);
            const lastSeg = oppSnakeSegments.current[oppSnakeSegments.current.length - 1] || oppMesh;
            newSeg.position.set(lastSeg.position.x, 0.5, lastSeg.position.z);
            scene.add(newSeg);
            oppSnakeSegments.current.push(newSeg);
          }
        });

        // Check self body crashes
        localSnakeSegments.current.forEach((seg, index) => {
          if (index > 2 && localMesh.position.distanceTo(seg.position) < 0.6) {
            // Crashed!
            playSynthSound('crash');
            spawnExplosion(localMesh.position.x, 0.5, localMesh.position.z, '#3b82f6', 20);
            sendSocketMessage('game_event', {
              lobbyId: lobby.id,
              event: 'snake_crash'
            });
          }
        });
      }

      // Infinite Runner mechanics (moving hazards)
      if (game.category === 'runner') {
        obstacles.current.forEach(obs => {
          if (!obs.active) return;
          
          // Animate sliding down the runway towards player
          obs.mesh.position.z += obs.speed * 1.5;
          obs.mesh.rotation.y += obs.rotSpeed;

          // If obstacle goes past, wrap around in front dynamically!
          if (obs.mesh.position.z > 15) {
            obs.mesh.position.z = -120 - Math.random() * 20;
            const laneX = [-4, 0, 4];
            obs.mesh.position.x = laneX[Math.floor(Math.random() * laneX.length)];
            obs.active = true;
            obs.mesh.visible = true;
          }

          // Check hit collisions
          const distToLocal = localMesh.position.distanceTo(obs.mesh);
          if (distToLocal < 1.6 && obs.active) {
            obs.active = false;
            obs.mesh.visible = false;

            if (obs.type === 'coin') {
              playSynthSound('score');
              spawnExplosion(obs.mesh.position.x, 1, obs.mesh.position.z, '#f59e0b', 10);
              localPlayerState.current.score += 2;
              setLocalScore(localPlayerState.current.score);
              sendSocketMessage('game_event', {
                lobbyId: lobby.id,
                event: 'score_update',
                score: localPlayerState.current.score
              });
            } else {
              // Hit hazardous block!
              playSynthSound('hit');
              spawnExplosion(obs.mesh.position.x, 1, obs.mesh.position.z, '#ef4444', 15);
              localPlayerState.current.score = Math.max(0, localPlayerState.current.score - 3);
              setLocalScore(localPlayerState.current.score);
              sendSocketMessage('game_event', {
                lobbyId: lobby.id,
                event: 'score_update',
                score: localPlayerState.current.score
              });
            }
          }
        });
      }

      // Top-Down Shooter alien invader loops
      if (game.category === 'shooter') {
        obstacles.current.forEach(obs => {
          if (!obs.active) return;

          // Slide invaders down slowly
          obs.mesh.position.z += obs.speed * 0.4;
          
          // Rotate slightly for visuals
          obs.mesh.rotation.y += 0.02;

          // Wrap if reaches bottom bounds
          if (obs.mesh.position.z > 8) {
            obs.mesh.position.z = -25 - Math.random() * 10;
            obs.mesh.position.x = (Math.random() - 0.5) * 28;
          }

          // Check player collision
          if (localMesh.position.distanceTo(obs.mesh) < 1.6) {
            playSynthSound('crash');
            spawnExplosion(obs.mesh.position.x, 0.8, obs.mesh.position.z, '#ef4444', 15);
            obs.mesh.position.z = -25 - Math.random() * 10;
            localPlayerState.current.score = Math.max(0, localPlayerState.current.score - 2);
            setLocalScore(localPlayerState.current.score);
          }
        });
      }

      // Puzzle: 3D Ball Physics brick breaker loops
      if (game.category === 'puzzle') {
        const ball = obstacles.current.find(o => o.mesh.geometry.type === 'SphereGeometry')?.mesh;
        if (ball) {
          // Move ball by velocity vector
          ball.position.x += (ball as any).velX;
          ball.position.z += (ball as any).velZ;

          // Wall bounces
          if (ball.position.x < -16) {
            ball.position.x = -16;
            (ball as any).velX *= -1;
            playSynthSound('hit');
          }
          if (ball.position.x > 16) {
            ball.position.x = 16;
            (ball as any).velX *= -1;
            playSynthSound('hit');
          }
          if (ball.position.z < -25) {
            ball.position.z = -25;
            (ball as any).velZ *= -1;
            playSynthSound('hit');
          }

          // Back wall boundary - drop out score reset
          if (ball.position.z > 14) {
            playSynthSound('crash');
            spawnExplosion(ball.position.x, 0.6, ball.position.z, '#ef4444', 16);
            ball.position.set(0, 0.6, -2);
            (ball as any).velX = (Math.random() - 0.5) * 0.3;
            (ball as any).velZ = -0.22;
            localPlayerState.current.score = Math.max(0, localPlayerState.current.score - 2);
            setLocalScore(localPlayerState.current.score);
          }

          // Bounce off local sliding paddle (player craft)
          const distToPaddle = ball.position.distanceTo(localMesh.position);
          if (distToPaddle < 2.0 && (ball as any).velZ > 0) {
            playSynthSound('powerup');
            (ball as any).velZ *= -1.05; // speed multiplier
            // Add spin based on paddle displacement hit offset
            const offset = ball.position.x - localMesh.position.x;
            (ball as any).velX += offset * 0.12;
            ball.position.z = localMesh.position.z - 0.8;
          }

          // Bounce off bricks and crush them
          obstacles.current.forEach(obs => {
            if (obs.type === 'brick' && obs.active) {
              const d = ball.position.distanceTo(obs.mesh);
              if (d < 1.8) {
                obs.active = false;
                obs.mesh.visible = false;
                (ball as any).velZ *= -1;
                
                playSynthSound('score');
                spawnExplosion(obs.mesh.position.x, 0.6, obs.mesh.position.z, obs.mesh.material.color.getStyle(), 10);
                
                localPlayerState.current.score += 5;
                setLocalScore(localPlayerState.current.score);
                sendSocketMessage('game_event', {
                  lobbyId: lobby.id,
                  event: 'score_update',
                  score: localPlayerState.current.score
                });
              }
            }
          });
        }
      }

      // 4. PROJECTILE PHYSICS & MOBA SHOOT TARGET MATCHING
      for (let i = projectiles.current.length - 1; i >= 0; i--) {
        const p = projectiles.current[i];
        p.mesh.position.x += p.dx;
        p.mesh.position.z += p.dz;

        // Auto clean far projectiles
        const dist = Math.sqrt(p.mesh.position.x * p.mesh.position.x + p.mesh.position.z * p.mesh.position.z);
        if (dist > 50) {
          scene.remove(p.mesh);
          projectiles.current.splice(i, 1);
          continue;
        }

        // Projectile vs Invader collision (Top Down Shooter)
        if (game.category === 'shooter' && p.owner === playerId) {
          let hitAny = false;
          obstacles.current.forEach(obs => {
            if (obs.type === 'target' && obs.active) {
              const d = p.mesh.position.distanceTo(obs.mesh);
              if (d < 1.8) {
                obs.active = false;
                obs.mesh.visible = false;
                scene.remove(p.mesh);
                projectiles.current.splice(i, 1);
                hitAny = true;
                
                playSynthSound('score');
                spawnExplosion(obs.mesh.position.x, 0.8, obs.mesh.position.z, '#10b981', 12);

                localPlayerState.current.score += 3;
                setLocalScore(localPlayerState.current.score);
                sendSocketMessage('game_event', {
                  lobbyId: lobby.id,
                  event: 'score_update',
                  score: localPlayerState.current.score
                });
              }
            }
          });
          if (hitAny) continue;
        }

        // Projectile hit player logic (Arena Battles)
        if (game.category === 'arena') {
          if (p.owner === playerId) {
            // Check hit opponent
            const d = p.mesh.position.distanceTo(oppMesh.position);
            if (d < 1.5) {
              playSynthSound('hit');
              spawnExplosion(p.mesh.position.x, 0.8, p.mesh.position.z, '#ef4444', 16);
              scene.remove(p.mesh);
              projectiles.current.splice(i, 1);

              // Notify server of hit
              sendSocketMessage('hit_player', {
                lobbyId: lobby.id,
                victimId: opponent?.id,
                damage: 20
              });
              continue;
            }
          } else {
            // Check hit local player
            const d = p.mesh.position.distanceTo(localMesh.position);
            if (d < 1.5) {
              playSynthSound('hit');
              spawnExplosion(p.mesh.position.x, 0.8, p.mesh.position.z, '#3b82f6', 16);
              scene.remove(p.mesh);
              projectiles.current.splice(i, 1);

              // Inform victim hit locally
              sendSocketMessage('hit_player', {
                lobbyId: lobby.id,
                victimId: playerId,
                damage: 20
              });
              continue;
            }
          }
        }
      }

      // 5. ANIMATE EXPLOSION PARTICLES
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        p.vy -= 0.015; // simple gravity

        p.life -= 0.035;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particles.current.splice(i, 1);
        }
      }

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP FUNCTION
    return () => {
      cancelAnimationFrame(animFrameId);
      
      // Remove listeners
      mountRef.current?.removeEventListener('click', handleMouseClick);
      window.removeEventListener('opponent_shot_event', handleOpponentShot);

      // Clean Three.js geometries
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (renderer && renderer.domElement && mountRef.current) {
        if (mountRef.current.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, [game.id, playerId, opponent?.id]);

  return (
    <div className="relative w-full h-full bg-[#0A0A0F] flex flex-col justify-between overflow-hidden rounded-sm border-2 border-[#2A2A40] shadow-2xl">
      {/* 3D Visual Viewport */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* Top Floating Dashboard Overlays */}
      <div className="relative z-10 w-full p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex flex-row items-center justify-between">
        
        {/* Local Player stats card */}
        <div className="flex items-center gap-3 bg-black/85 backdrop-blur-md px-4 py-2 rounded-sm border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <span className="text-xl">{lobby.players.find(p => p.id === playerId)?.avatar || '🎮'}</span>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider">YOU (P1)</div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-1">
              {lobby.players.find(p => p.id === playerId)?.name}
            </div>
            {game.category === 'arena' && (
              <div className="w-24 bg-gray-950 h-1.5 rounded-sm mt-1 overflow-hidden flex">
                <div 
                  className="bg-cyan-500 h-full transition-all duration-150" 
                  style={{ width: `${localHealth}%` }} 
                />
              </div>
            )}
          </div>
          <div className="ml-2 pl-3 border-l border-slate-800 flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono tracking-widest font-bold">Score</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">{localScore}</span>
          </div>
        </div>

        {/* Center Match Stats */}
        <div className="flex flex-col items-center bg-black/90 backdrop-blur-md px-5 py-2 rounded-sm border border-[#2A2A40]">
          <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-bold">MATCH TIME</span>
          <span className="text-md font-mono font-bold text-cyan-400">
            {Math.floor(matchTime / 60)}:{(matchTime % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] text-cyan-200 font-bold px-2 py-0.5 rounded-sm bg-cyan-500/10 border border-cyan-500/20 mt-1 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            Competitive LIVE
          </span>
        </div>

        {/* Opponent player stats card */}
        <div className="flex items-center gap-3 bg-black/85 backdrop-blur-md px-4 py-2 rounded-sm border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
          <div className="mr-2 pr-3 border-r border-slate-800 flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono tracking-widest font-bold">Score</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{oppScore}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-rose-400 font-bold tracking-wider">OPPONENT (P2)</div>
            <div className="text-sm font-bold text-slate-100">
              {opponent ? opponent.name : 'Simulated Bot'}
            </div>
            {game.category === 'arena' && (
              <div className="w-24 bg-gray-950 h-1.5 rounded-sm mt-1 overflow-hidden flex justify-end">
                <div 
                  className="bg-rose-500 h-full transition-all duration-150" 
                  style={{ width: `${oppHealth}%` }} 
                />
              </div>
            )}
          </div>
          <span className="text-xl">{opponent ? opponent.avatar : '🤖'}</span>
        </div>
      </div>

      {/* Floating Interactive Bottom HUD controls indicator */}
      <div className="relative z-10 w-full p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex flex-row items-end justify-between">
        <div className="bg-black/85 backdrop-blur-md p-3.5 rounded-sm border border-[#2A2A40] max-w-sm pointer-events-auto">
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">CONTROLS INSTRUCTION</div>
          <p className="text-xs text-slate-300 font-medium">{game.controls}</p>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-black border border-[#2A2A40] hover:border-cyan-500/50 rounded-sm text-slate-400 hover:text-white transition"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          
          <button 
            onClick={onExit}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold font-mono text-xs uppercase rounded-sm flex items-center gap-2 shadow-[0_0_10px_rgba(244,63,94,0.3)] transition"
          >
            Leave Match
          </button>
        </div>
      </div>

      {/* MATCH ENDED VICTORY / DEFEAT MODAL OVERLAY */}
      {gameEnded && (
        <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#0F0F1A] border-2 border-cyan-500 p-8 rounded-sm max-w-md w-full text-center shadow-[0_0_25px_rgba(34,211,238,0.25)] relative">
            <Award className="w-16 h-16 mx-auto text-cyan-400 animate-pulse mb-4" />
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-300 tracking-wider uppercase italic font-sans mb-1">
              MATCH CONCLUDED
            </h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-6">REAL-TIME COMPETITIVE STANDINGS</p>
            
            <div className="space-y-3 mb-6">
              <div className="bg-[#0A0A0F] p-3 rounded-sm border border-[#2A2A40] flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-400">🏆 Winner</span>
                <span className="text-md font-extrabold text-cyan-400 uppercase italic">{winnerName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0A0A0F] p-2.5 rounded-sm border border-[#2A2A40]/80 text-center">
                  <span className="block text-[9px] text-slate-500 uppercase font-mono font-bold">YOUR SCORE</span>
                  <span className="text-lg font-bold text-cyan-400">{localScore}</span>
                </div>
                <div className="bg-[#0A0A0F] p-2.5 rounded-sm border border-[#2A2A40]/80 text-center">
                  <span className="block text-[9px] text-slate-500 uppercase font-mono font-bold">OPPONENT SCORE</span>
                  <span className="text-lg font-bold text-rose-400">{oppScore}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onExit}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(8,145,178,0.3)] transition"
            >
              <RotateCcw className="w-4 h-4 text-black" />
              Back to Arcade Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
