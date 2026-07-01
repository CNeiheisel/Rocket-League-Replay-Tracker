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
  playerNames: string[] = [];
  isPlaying = true;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private ball!: THREE.Mesh;
  private carGroups = new Map<string, THREE.Group>();
  private labelObjects = new Map<string, CSS2DObject>();
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
      this.mapName    = this.formatMapName(this.replay.map_name);
      this.blueScore  = this.replay.blue_score;
      this.orangeScore = this.replay.orange_score;

      // Find first frame that actually has all players (frame 0 may be empty
      // if player names hadn't resolved yet at the start of the replay)
      const firstPopulatedFrame = this.replay.frames.find(f => f.players.length > 0);
      this.playerNames = [...new Set(firstPopulatedFrame?.players.map(p => p.name) ?? [])];
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

    // Goals
    [-1, 1].forEach(side => {
      const isBlue  = side === -1;
      const color   = isBlue ? this.teamColors.blue : this.teamColors.orange;
      const hexColor = isBlue ? '#3b82f6' : '#f97316';

      const goalW  = FIELD_WIDTH * 0.22 * SCALE;
      const goalH  = 120 * SCALE;
      const goalMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });

      // Back panel
      const back = new THREE.Mesh(new THREE.PlaneGeometry(goalW, goalH), goalMat);
      back.position.set(0, goalH / 2, side * (fl / 2));
      this.scene.add(back);

      // Floor stripe
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(goalW, 2.5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.15, side * fl / 2);
      this.scene.add(stripe);

      // Team label floating above goal
      const div = document.createElement('div');
      div.textContent = isBlue ? 'BLUE' : 'ORANGE';
      div.style.cssText = `
        color:${hexColor};font-size:10px;font-weight:800;
        font-family:monospace;letter-spacing:3px;
        text-shadow:0 0 10px ${hexColor};pointer-events:none;
      `;
      const label = new CSS2DObject(div);
      label.position.set(0, goalH + 6, side * fl / 2);
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

    // Main body — built along Z axis (forward) to match Unreal Y→Three.js Z mapping
    const body = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cl), bodyMat);
    body.position.y = ch / 2;
    body.castShadow = true;
    group.add(body);

    // Roof / cockpit
    const roofW = cw * 0.7;
    const roofL = cl * 0.55;
    const roofH = ch * 0.7;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(roofW, roofH, roofL), bodyMat);
    roof.position.set(0, ch + roofH / 2, 0);
    roof.castShadow = true;
    group.add(roof);

    // Windshield — front of car is +Z
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(roofW * 0.98, roofH * 0.8, roofL * 0.3), glassMat);
    windshield.position.set(0, ch + roofH / 2, roofL * 0.35);
    group.add(windshield);

    // Rear window
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(roofW * 0.98, roofH * 0.7, roofL * 0.25), glassMat);
    rearWindow.position.set(0, ch + roofH / 2, -roofL * 0.35);
    group.add(rearWindow);

    // 4 Wheels — along Z for front/rear, X for left/right
    const wheelR   = ch * 0.55;
    const wheelThk = cw * 0.18;
    const wheelMat = darkMat;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelThk, 16);
    const wheelPositions = [
      [ cw * 0.55, wheelR,  cl * 0.35],
      [-cw * 0.55, wheelR,  cl * 0.35],
      [ cw * 0.55, wheelR, -cl * 0.35],
      [-cw * 0.55, wheelR, -cl * 0.35],
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
    boost.position.set(0, ch * 0.5, -cl * 0.55);
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

    // Use first frame that has players — frame 0 may be empty if
    // player name replication hadn't happened yet in the raw replay data
    const firstFrame = this.replay.frames.find(f => f.players.length > 0);
    if (!firstFrame) return;

    for (const player of firstFrame.players) {
      const group = this.buildCar(player);
      group.position.set(player.x * SCALE, player.z * SCALE, player.y * SCALE);
      this.scene.add(group);
      this.carGroups.set(player.name, group);
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
    }

    const frame = frames[this.currentFrameIndex];

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
          // Verified against actual kickoff quaternion data:
          // Unreal Z-up left-handed → Three.js Y-up right-handed
          // prstn  (0,-4608) rz=0.7071  rw=0.7071 → should face +Z ✓
          // opp_bomb (0,4608) rz=-0.7071 rw=0.7071 → should face -Z ✓
          // Morveu  diagonal  rz=-0.3827 rw=0.9239 → should face +45° ✓
          const q = new THREE.Quaternion(
             (p.ry ?? 0),   // Unreal pitch Y → Three.js X
            -(p.rz ?? 0),   // Unreal yaw Z  → Three.js Y (negated for handedness)
            -(p.rx ?? 0),   // Unreal roll X → Three.js Z (negated)
             (p.rw ?? 1)
          ).normalize();
          group.quaternion.copy(q);
        }

        // Update label world position — always upright, well above the car
        // regardless of car rotation/flips/wall rides
        const label = this.labelObjects.get(p.name);
        if (label) {
          label.position.set(
            p.x * SCALE,
            p.z * SCALE + 28,
            p.y * SCALE
          );
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