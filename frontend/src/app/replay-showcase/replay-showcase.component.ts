import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { environment } from '../../environments/environment';

interface ShowcaseFrame {
  time: number;
  ball: { x: number; y: number; z: number } | null;
  players: { name: string; team: string; x: number; y: number; z: number; rx?: number; ry?: number; rz?: number; rw?: number }[];
}

interface ShowcaseReplay {
  duration: number;
  frame_count: number;
  map_name: string;
  team_size: number;
  blue_score: number;
  orange_score: number;
  goals: { time: number; player: string; team: string }[];
  frames: ShowcaseFrame[];
}

const FIELD_LENGTH = 10240;
const FIELD_WIDTH  = 8192;
const FIELD_HEIGHT = 2044;
const BALL_RADIUS  = 92;
const CAR_LENGTH   = 120;
const CAR_WIDTH    = 85;
const CAR_HEIGHT   = 36;
const SCALE        = 0.05;
const CAR_SCALE    = 3.5; // Cars rendered larger than real scale so they're clearly visible

@Component({
  selector: 'app-replay-showcase',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './replay-showcase.component.html',
  styleUrls: ['./replay-showcase.component.css']
})
export class ReplayShowcaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  loading = true;
  error = '';
  mapName = '';
  blueScore = 0;
  orangeScore = 0;
  bluePlayers: string[] = [];
  orangePlayers: string[] = [];
  isPlaying = true;
  currentTime = '5:00';
  private finalBlueScore = 0;
  private finalOrangeScore = 0;
  private wallClockElapsed = 0;
  private kickoffStarted = false;
  private initialCarPositions = new Map<string, { x: number; y: number; z: number }>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private ball!: THREE.Mesh;
  private carGroups = new Map<string, THREE.Group>();
  private labelObjects = new Map<string, CSS2DObject>();
  private boostTrails = new Map<string, THREE.Points>();
  private boostTrailPositions = new Map<string, { positions: Float32Array; index: number }>();
  private readonly TRAIL_LENGTH = 20;
  private replay: ShowcaseReplay | null = null;
  private currentFrameIndex = 0;
  private elapsedPlaybackTime = 0;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private playbackSpeed = 1;
  private resizeObserver: ResizeObserver | null = null;
  private sceneReady = false;
  private pendingSetupCars = false;

  private readonly teamColors: Record<string, number> = {
    blue:    0x3b82f6,
    orange:  0xf97316,
    unknown: 0x888888
  };

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void { this.loadReplay(); }

  ngAfterViewInit(): void {
    this.initScene();
    this.sceneReady = true;
    // If replay loaded before scene was ready, set up cars now
    if (this.pendingSetupCars) {
      this.pendingSetupCars = false;
      this.setupCars();
      this.startAnimation();
    }
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvasContainer.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.labelRenderer?.domElement.remove();
  }

  async loadReplay(): Promise<void> {
    try {
      this.replay = await firstValueFrom(
        this.http.get<ShowcaseReplay>(`${environment.apiUrl}/showcase-replay`)
      );
      this.mapName     = this.formatMapName(this.replay.map_name);
      // Start scores at 0 — they increment as goals are scored during playback
      this.blueScore   = 0;
      this.orangeScore = 0;
      this.finalBlueScore   = this.replay.blue_score;
      this.finalOrangeScore = this.replay.orange_score;

      const firstPopulatedFrame = this.replay.frames.find(f => f.players.length > 0);
      const allPlayers = firstPopulatedFrame?.players ?? [];
      this.bluePlayers   = allPlayers.filter(p => p.team === 'blue').map(p => p.name);
      this.orangePlayers = allPlayers.filter(p => p.team === 'orange').map(p => p.name);
      this.loading = false;
      if (this.sceneReady) {
        this.setupCars();
        this.startAnimation();
      } else {
        this.pendingSetupCars = true;
      }
    } catch (err) {
      console.error('Failed to load showcase replay:', err);
      this.error = 'Could not load the replay preview.';
      this.loading = false;
    }
  }

  private formatMapName(raw: string): string {
    return raw.replace(/_P$/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  togglePlayback(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.lastTimestamp = performance.now();
      this.startAnimation();
    } else if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private initScene(): void {
    const container = this.canvasContainer.nativeElement;
    const width  = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c12);
    this.scene.fog = new THREE.Fog(0x080c12, 600, 1400);

    // Fixed angled camera — looking from one corner down at the field
    this.camera = new THREE.PerspectiveCamera(55, width / height, 1, 2000);
    this.camera.position.set(280, 320, 340);
    this.camera.lookAt(0, 0, 0);

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // CSS2D label renderer
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top  = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0x304060, 2.0));

    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(300, 500, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 1500;
    sun.shadow.camera.left = -400;
    sun.shadow.camera.right = 400;
    sun.shadow.camera.top   = 600;
    sun.shadow.camera.bottom = -600;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x4466cc, 0.5);
    fillLight.position.set(-200, 300, -200);
    this.scene.add(fillLight);

    this.buildField();
    this.buildBall();
  }

  private buildField(): void {
    const fw = FIELD_WIDTH  * SCALE;
    const fl = FIELD_LENGTH * SCALE;
    const fh = FIELD_HEIGHT * SCALE;

    // Green turf
    const turf = new THREE.Mesh(
      new THREE.PlaneGeometry(fw, fl),
      new THREE.MeshStandardMaterial({ color: 0x0c3b22, roughness: 0.95 })
    );
    turf.rotation.x = -Math.PI / 2;
    turf.receiveShadow = true;
    this.scene.add(turf);

    // Field line material
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });

    // Center line
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(fw, 1.5), lineMat);
    cl.rotation.x = -Math.PI / 2;
    cl.position.y = 0.05;
    this.scene.add(cl);

    // Center circle
    const ring = new THREE.Mesh(new THREE.RingGeometry(38, 40, 64), lineMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    // Walls — low opacity so you can see through them
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0.3, roughness: 0.9 });

    // Side walls (along field length)
    [-1, 1].forEach(s => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2, fh, fl + 4), wallMat);
      w.position.set(s * (fw / 2 + 1), fh / 2, 0);
      this.scene.add(w);
    });

    // End walls (across field width)
    [-1, 1].forEach(s => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(fw + 4, fh, 2), wallMat);
      w.position.set(0, fh / 2, s * (fl / 2 + 1));
      this.scene.add(w);
    });

    // Ceiling (very faint)
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(fw, fl),
      new THREE.MeshBasicMaterial({ color: 0x112233, transparent: true, opacity: 0.08 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = fh;
    this.scene.add(ceiling);

    // Goals — real RL dimensions: 1786 wide x 642 tall x 880 deep
    const GOAL_W = 1786 * SCALE;
    const GOAL_H = 642  * SCALE;
    const GOAL_D = 880  * SCALE;

    [-1, 1].forEach(side => {
      const isBlue   = side === -1;
      const color    = isBlue ? this.teamColors.blue : this.teamColors.orange;
      const hexColor = isBlue ? '#3b82f6' : '#f97316';

      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.22, side: THREE.DoubleSide
      });
      const lineMat2 = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });

      // The goal sits just outside the end wall.
      // side = -1 → blue goal at -Z end; side = +1 → orange goal at +Z end
      const gz = side * (fl / 2 + GOAL_D / 2); // center Z of goal box

      // Back wall
      const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_H), mat);
      back.position.set(0, GOAL_H / 2, side * (fl / 2 + GOAL_D));
      this.scene.add(back);

      // Left wall
      const leftW = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_D, GOAL_H), mat);
      leftW.rotation.y = Math.PI / 2;
      leftW.position.set(-GOAL_W / 2, GOAL_H / 2, gz);
      this.scene.add(leftW);

      // Right wall
      const rightW = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_D, GOAL_H), mat);
      rightW.rotation.y = -Math.PI / 2;
      rightW.position.set( GOAL_W / 2, GOAL_H / 2, gz);
      this.scene.add(rightW);

      // Roof
      const roofG = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_D), mat);
      roofG.rotation.x = Math.PI / 2;
      roofG.position.set(0, GOAL_H, gz);
      this.scene.add(roofG);

      // Floor inside net
      const floorG = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_D), mat);
      floorG.rotation.x = -Math.PI / 2;
      floorG.position.set(0, 0.1, gz);
      this.scene.add(floorG);

      // Goal mouth outline (the opening facing the field) — bright edge lines
      const mouthPoints = [
        new THREE.Vector3(-GOAL_W / 2, 0,       side * fl / 2),
        new THREE.Vector3( GOAL_W / 2, 0,       side * fl / 2),
        new THREE.Vector3( GOAL_W / 2, GOAL_H,  side * fl / 2),
        new THREE.Vector3(-GOAL_W / 2, GOAL_H,  side * fl / 2),
        new THREE.Vector3(-GOAL_W / 2, 0,       side * fl / 2),
      ];
      const mouthGeo = new THREE.BufferGeometry().setFromPoints(mouthPoints);
      this.scene.add(new THREE.Line(mouthGeo, lineMat2));

      // Crossbar (top edge of mouth)
      const crossbarGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-GOAL_W / 2, GOAL_H, side * fl / 2),
        new THREE.Vector3( GOAL_W / 2, GOAL_H, side * fl / 2),
      ]);
      this.scene.add(new THREE.Line(crossbarGeo, lineMat2));

      // Goal line on turf (glowing stripe at mouth)
      const goalLine = new THREE.Mesh(
        new THREE.PlaneGeometry(GOAL_W, 2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
      );
      goalLine.rotation.x = -Math.PI / 2;
      goalLine.position.set(0, 0.2, side * fl / 2);
      this.scene.add(goalLine);

      // Team label above goal
      const div = document.createElement('div');
      div.textContent = isBlue ? '🔵 BLUE' : '🟠 ORANGE';
      div.style.cssText = `
        color:${hexColor};font-size:11px;font-weight:800;
        font-family:monospace;letter-spacing:2px;
        text-shadow:0 0 10px ${hexColor};pointer-events:none;
      `;
      const label = new CSS2DObject(div);
      label.position.set(0, GOAL_H + 8, side * (fl / 2 + GOAL_D / 2));
      this.scene.add(label);
    });
  }

  private buildBall(): void {
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * SCALE * 2.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.3, emissive: 0x333333 })
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
  }

  // Build a car group: body + roof + wheels + name label
  private buildCar(player: { name: string; team: string; x: number; y: number; z: number }): THREE.Group {
    const color    = this.teamColors[player.team] ?? this.teamColors.unknown;
    const hexColor = player.team === 'blue' ? '#60a5fa' : player.team === 'orange' ? '#fb923c' : '#cccccc';

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.55,
      emissive: color,
      emissiveIntensity: 0.15
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.1
    });

    const cw = CAR_WIDTH  * SCALE * CAR_SCALE;
    const cl = CAR_LENGTH * SCALE * CAR_SCALE;
    const ch = CAR_HEIGHT * SCALE * CAR_SCALE;

    // Main body — length along X since Unreal identity forward is +X in Three.js
    const body = new THREE.Mesh(new THREE.BoxGeometry(cl, ch, cw), bodyMat);
    body.position.y = ch / 2;
    body.castShadow = true;
    group.add(body);

    // Roof / cockpit
    const roofW = cw * 0.7;
    const roofL = cl * 0.55;
    const roofH = ch * 0.7;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(roofL, roofH, roofW), bodyMat);
    roof.position.set(0, ch + roofH / 2, 0);
    roof.castShadow = true;
    group.add(roof);

    // Windshield — front of car is +X
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(roofL * 0.3, roofH * 0.8, roofW * 0.98), glassMat);
    windshield.position.set(roofL * 0.35, ch + roofH / 2, 0);
    group.add(windshield);

    // Rear window — rear is -X
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(roofL * 0.25, roofH * 0.7, roofW * 0.98), glassMat);
    rearWindow.position.set(-roofL * 0.35, ch + roofH / 2, 0);
    group.add(rearWindow);

    // 4 Wheels — X for front/rear, Z for left/right
    const wheelR   = ch * 0.55;
    const wheelThk = cw * 0.18;
    const wheelMat = darkMat;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelThk, 16);
    const wheelPositions = [
      [ cl * 0.35, wheelR,  cw * 0.55],
      [ cl * 0.35, wheelR, -cw * 0.55],
      [-cl * 0.35, wheelR,  cw * 0.55],
      [-cl * 0.35, wheelR, -cw * 0.55],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);
    }

    // Boost exhaust glow (small emissive sphere at rear)
    const boostMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const boost = new THREE.Mesh(new THREE.SphereGeometry(ch * 0.3, 8, 8), boostMat);
    boost.position.set(-cl * 0.55, ch * 0.5, 0);
    group.add(boost);

    // Player name label — added to SCENE (not car group) so it never
    // rotates with the car during flips/wall rides. We update its world
    // position manually each frame based on the car's world position.
    const div = document.createElement('div');
    div.textContent = player.name;
    div.style.cssText = `
      color:${hexColor};
      font-size:12px;font-weight:700;
      font-family:'Inter',sans-serif;
      background:rgba(0,0,0,0.6);
      padding:2px 7px;border-radius:4px;
      border:1px solid ${hexColor}88;
      white-space:nowrap;pointer-events:none;
      text-shadow:0 1px 3px rgba(0,0,0,0.9);
    `;
    const labelObj = new CSS2DObject(div);
    labelObj.position.set(
      player.x * SCALE,
      player.z * SCALE + 18,
      player.y * SCALE
    );
    this.scene.add(labelObj);
    this.labelObjects.set(player.name, labelObj);

    return group;
  }

  private setupCars(): void {
    if (!this.replay || this.replay.frames.length === 0) return;

    const firstFrame = this.replay.frames.find(f => f.players.length > 0);
    if (!firstFrame) return;

    for (const player of firstFrame.players) {
      const group = this.buildCar(player);
      group.position.set(player.x * SCALE, player.z * SCALE, player.y * SCALE);
      this.scene.add(group);
      this.carGroups.set(player.name, group);
      // Store initial position to detect when kickoff movement begins
      this.initialCarPositions.set(player.name, { x: player.x, y: player.y, z: player.z });

      // Boost trail — a particle system that records recent car positions
      const color = this.teamColors[player.team] ?? this.teamColors.unknown;
      const trailPositions = new Float32Array(this.TRAIL_LENGTH * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

      const sizes = new Float32Array(this.TRAIL_LENGTH);
      for (let i = 0; i < this.TRAIL_LENGTH; i++) sizes[i] = 3 * (1 - i / this.TRAIL_LENGTH);
      trailGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const trailMat = new THREE.PointsMaterial({
        color,
        size: 2.5,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
        depthWrite: false
      });
      const trail = new THREE.Points(trailGeo, trailMat);
      trail.visible = false; // hidden until car starts moving
      this.scene.add(trail);
      this.boostTrails.set(player.name, trail);
      this.boostTrailPositions.set(player.name, {
        positions: trailPositions,
        index: 0
      });
    }
  }

  private startAnimation(): void {
    this.lastTimestamp = performance.now();
    const step = (timestamp: number) => {
      if (!this.isPlaying || !this.replay) return;

      const delta = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      this.advanceFrame(delta);
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);

      this.animationFrameId = requestAnimationFrame(step);
    };
    this.animationFrameId = requestAnimationFrame(step);
  }

  private advanceFrame(deltaSeconds: number): void {
    if (!this.replay) return;
    const frames = this.replay.frames;

    this.elapsedPlaybackTime += deltaSeconds * this.playbackSpeed;
    const targetTime = (frames[0]?.time ?? 0) + this.elapsedPlaybackTime;

    while (
      this.currentFrameIndex < frames.length - 1 &&
      frames[this.currentFrameIndex + 1].time <= targetTime
    ) {
      this.currentFrameIndex++;
    }

    if (this.currentFrameIndex >= frames.length - 1) {
      this.currentFrameIndex = 0;
      this.elapsedPlaybackTime = 0;
      this.wallClockElapsed = 0;
      this.kickoffStarted = false;
      this.blueScore   = 0;
      this.orangeScore = 0;
    }

    const frame = frames[this.currentFrameIndex];

    // Score: count goals whose timestamp has passed
    let currentBlue = 0;
    let currentOrange = 0;
    if (this.replay.goals?.length) {
      for (const goal of this.replay.goals) {
        if (goal.time <= frame.time) {
          if (goal.team === 'blue') currentBlue++;
          else currentOrange++;
        }
      }
    }

    // If a new goal was just scored, pause the clock until next kickoff
    const totalGoalsBefore = this.blueScore + this.orangeScore;
    const totalGoalsNow    = currentBlue + currentOrange;
    if (totalGoalsNow > totalGoalsBefore) {
      this.kickoffStarted = false;
    }

    this.blueScore   = currentBlue;
    this.orangeScore = currentOrange;

    // Detect kickoff movement — also works for post-goal kickoffs since
    // kickoffStarted was reset above when the goal was scored.
    // Use ball movement rather than car movement since cars sometimes
    // drift slightly before the actual kickoff countdown ends.
    if (!this.kickoffStarted && frame.players.length > 0) {
      for (const p of frame.players) {
        const init = this.initialCarPositions.get(p.name);
        if (init) {
          const dx = p.x - init.x;
          const dy = p.y - init.y;
          if (Math.sqrt(dx * dx + dy * dy) > 50) {
            this.kickoffStarted = true;
            // Update initial positions to current so post-goal kickoff
            // detection works relative to the new kickoff spawn point
            for (const fp of frame.players) {
              this.initialCarPositions.set(fp.name, { x: fp.x, y: fp.y, z: fp.z });
            }
            break;
          }
        }
      }
    }

    // Only tick the clock once kickoff movement has started
    if (this.kickoffStarted) {
      this.wallClockElapsed += deltaSeconds * this.playbackSpeed;
    }

    // Clock: RL games are 5 minutes (300s). The replay may include pre-game
    // and post-game time making it longer than 300s. We cap the countdown
    // at 300s and use wall-clock elapsed so it ticks between goals too.
    const GAME_DURATION = 300;
    const remaining = Math.max(0, GAME_DURATION - this.wallClockElapsed);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    this.currentTime = `${mins}:${secs.toString().padStart(2, '0')}`;

    const ballPos = frame.ball
      ? new THREE.Vector3(frame.ball.x * SCALE, frame.ball.z * SCALE, frame.ball.y * SCALE)
      : null;

    if (ballPos) {
      this.ball.position.copy(ballPos);
    }

    for (const p of frame.players) {
      const group = this.carGroups.get(p.name);
      if (group) {
        group.position.set(p.x * SCALE, p.z * SCALE, p.y * SCALE);

        if (p.rx != null && p.rw != null) {
          // Full quaternion rotation for correct orientation at all times
          // (kickoff, driving, aerials, wall rides, flips).
          //
          // Verified against kickoff data:
          // prstn (0,-4608) rz=0.7071 rw=0.7071 → Three.js (0, 0.7071, 0, 0.7071)
          // = +90° around Y → rotates car +X forward to face +Z ✅
          // opp_bomb (0,4608) rz=-0.7071 rw=0.7071 → (0,-0.7071,0,0.7071)
          // = -90° around Y → car faces -Z ✅
          //
          // Axis mapping Unreal(left-hand Z-up) → Three.js(right-hand Y-up):
          //   Unreal X (pitch) → Three.js X  (same)
          //   Unreal Y (roll)  → Three.js Z  (negated for handedness flip)
          //   Unreal Z (yaw)   → Three.js Y  (up axis swap)
          const q = new THREE.Quaternion(
            -(p.rx ?? 0),   // pitch: negate to fix flip direction
            -(p.rz ?? 0),   // yaw:   Unreal Z → Three.js Y (negated)
            -(p.ry ?? 0),   // roll:  Unreal Y → Three.js -Z
              p.rw ?? 1
          ).normalize();
          group.quaternion.copy(q);
        }

        // Update label world position
        const label = this.labelObjects.get(p.name);
        if (label) {
          label.position.set(p.x * SCALE, p.z * SCALE + 28, p.y * SCALE);
        }

        // Update boost trail — record car position each frame, show trail
        // only when car is moving fast (boosting) by checking speed via
        // distance from previous position. Trail fades older positions.
        const trail = this.boostTrails.get(p.name);
        const trailData = this.boostTrailPositions.get(p.name);
        if (trail && trailData) {
          const px = p.x * SCALE;
          const py = p.z * SCALE;
          const pz = p.y * SCALE;

          // Check speed: distance moved since last recorded trail point
          const lastIdx = ((trailData.index - 1 + this.TRAIL_LENGTH) % this.TRAIL_LENGTH) * 3;
          const dx = px - trailData.positions[lastIdx];
          const dz = pz - trailData.positions[lastIdx + 2];
          const speed = Math.sqrt(dx * dx + dz * dz);

          // Only show trail when moving fast enough (boosting threshold)
          if (speed > 0.8) {
            trail.visible = true;
            const i = trailData.index * 3;
            trailData.positions[i]     = px;
            trailData.positions[i + 1] = py;
            trailData.positions[i + 2] = pz;
            trailData.index = (trailData.index + 1) % this.TRAIL_LENGTH;
            (trail.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
          } else {
            trail.visible = false;
          }
        }
      }
    }
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;
    const container = this.canvasContainer.nativeElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }
}