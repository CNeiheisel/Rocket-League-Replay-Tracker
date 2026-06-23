import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { environment } from '../../environments/environment';

interface ShowcaseFrame {
  time: number;
  ball: { x: number; y: number; z: number } | null;
  players: { name: string; team: string; x: number; y: number; z: number }[];
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

// Real Rocket League field dimensions in Unreal units
const FIELD_LENGTH = 10240;
const FIELD_WIDTH = 8192;
const FIELD_HEIGHT = 2044;
const BALL_RADIUS = 92;
const CAR_LENGTH = 120;
const CAR_WIDTH = 85;
const CAR_HEIGHT = 36;
const SCALE = 0.05;

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
  private carMeshes = new Map<string, THREE.Mesh>();
  private labelObjects = new Map<string, CSS2DObject>();
  private replay: ShowcaseReplay | null = null;
  private currentFrameIndex = 0;
  private elapsedPlaybackTime = 0;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private playbackSpeed = 1;
  private resizeObserver: ResizeObserver | null = null;

  // Camera orbit state
  private cameraAngle = 0;
  private readonly CAMERA_RADIUS = 420;
  private readonly CAMERA_HEIGHT = 280;
  private readonly CAMERA_ORBIT_SPEED = 0.04; // radians per second

  private readonly teamColors: Record<string, number> = {
    blue: 0x3b82f6,
    orange: 0xf97316,
    unknown: 0x999999
  };

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadReplay();
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvasContainer.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    // Remove label renderer DOM element
    this.labelRenderer?.domElement.remove();
  }

  async loadReplay(): Promise<void> {
    try {
      this.replay = await firstValueFrom(
        this.http.get<ShowcaseReplay>(`${environment.apiUrl}/showcase-replay`)
      );
      this.mapName = this.formatMapName(this.replay.map_name);
      this.blueScore = this.replay.blue_score;
      this.orangeScore = this.replay.orange_score;
      this.playerNames = [...new Set(this.replay.frames[0]?.players.map(p => p.name) ?? [])];
      this.loading = false;
      this.setupCarsFromFirstFrame();
      this.startAnimation();
    } catch (err) {
      console.error('Failed to load showcase replay:', err);
      this.error = 'Could not load the replay preview.';
      this.loading = false;
    }
  }

  private formatMapName(raw: string): string {
    return raw
      .replace(/_P$/i, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
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
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);
    this.scene.fog = new THREE.FogExp2(0x0a0e14, 0.0012);

    // Camera — angled 3D perspective view
    this.camera = new THREE.PerspectiveCamera(55, width / height, 1, 3000);
    this.camera.position.set(this.CAMERA_RADIUS, this.CAMERA_HEIGHT, 0);
    this.camera.lookAt(0, 0, 0);

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // CSS2D label renderer — overlaid on top of the WebGL canvas
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 1.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(300, 500, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.4);
    fillLight.position.set(-200, 200, -200);
    this.scene.add(fillLight);

    this.buildField();
    this.buildBall();
  }

  private buildField(): void {
    const fw = FIELD_WIDTH * SCALE;
    const fl = FIELD_LENGTH * SCALE;
    const fh = FIELD_HEIGHT * SCALE;

    // Ground
    const groundGeo = new THREE.PlaneGeometry(fw, fl);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d3d28,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Field lines — center circle, center line, box lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });

    // Center line
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(fw, 1.5), lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.1;
    this.scene.add(centerLine);

    // Center circle (ring)
    const circleGeo = new THREE.RingGeometry(40, 42, 64);
    const circle = new THREE.Mesh(circleGeo, lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.1;
    this.scene.add(circle);

    // Sideline walls (transparent)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x223344,
      transparent: true,
      opacity: 0.15,
      roughness: 0.8
    });

    // Side walls
    [-1, 1].forEach(side => {
      const wallGeo = new THREE.BoxGeometry(2, fh, fl);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(side * fw / 2, fh / 2, 0);
      this.scene.add(wall);
    });

    // End walls
    [-1, 1].forEach(side => {
      const wallGeo = new THREE.BoxGeometry(fw, fh, 2);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(0, fh / 2, side * fl / 2);
      this.scene.add(wall);
    });

    // Goals — orange and blue glowing goal lines
    [-1, 1].forEach(side => {
      const isBlue = side === -1;
      const color = isBlue ? this.teamColors.blue : this.teamColors.orange;

      // Goal back wall
      const goalWidth = FIELD_WIDTH * 0.22 * SCALE;
      const goalHeight = 120 * SCALE;
      const goalMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
      const goalBack = new THREE.Mesh(new THREE.PlaneGeometry(goalWidth, goalHeight), goalMat);
      goalBack.position.set(0, goalHeight / 2, side * (fl / 2 + 1));
      goalBack.rotation.y = side === -1 ? 0 : Math.PI;
      this.scene.add(goalBack);

      // Goal floor line
      const goalLine = new THREE.Mesh(
        new THREE.PlaneGeometry(goalWidth, 2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
      );
      goalLine.rotation.x = -Math.PI / 2;
      goalLine.position.set(0, 0.2, side * fl / 2);
      this.scene.add(goalLine);

      // Team label at goal
      const labelDiv = document.createElement('div');
      labelDiv.textContent = isBlue ? 'BLUE' : 'ORANGE';
      labelDiv.style.cssText = `
        color: ${isBlue ? '#3b82f6' : '#f97316'};
        font-size: 11px;
        font-weight: 700;
        font-family: monospace;
        letter-spacing: 2px;
        text-shadow: 0 0 8px ${isBlue ? '#3b82f6' : '#f97316'};
        pointer-events: none;
      `;
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, goalHeight + 5, side * fl / 2);
      this.scene.add(label);
    });
  }

  private buildBall(): void {
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS * SCALE, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x222222
    });
    this.ball = new THREE.Mesh(ballGeo, ballMat);
    this.ball.castShadow = true;
    this.scene.add(this.ball);
  }

  private setupCarsFromFirstFrame(): void {
    if (!this.replay || this.replay.frames.length === 0) return;

    // Find first frame that has all players
    const firstFrame = this.replay.frames[0];
    const carGeo = new THREE.BoxGeometry(
      CAR_LENGTH * SCALE,
      CAR_HEIGHT * SCALE,
      CAR_WIDTH * SCALE
    );

    for (const player of firstFrame.players) {
      const color = this.teamColors[player.team] ?? this.teamColors.unknown;

      // Car body
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.5,
        emissive: color,
        emissiveIntensity: 0.12
      });
      const mesh = new THREE.Mesh(carGeo, mat);
      mesh.castShadow = true;
      mesh.position.set(player.x * SCALE, player.z * SCALE, player.y * SCALE);
      this.scene.add(mesh);
      this.carMeshes.set(player.name, mesh);

      // Player name label — floats above the car
      const labelDiv = document.createElement('div');
      labelDiv.textContent = player.name;
      labelDiv.style.cssText = `
        color: ${player.team === 'blue' ? '#60a5fa' : player.team === 'orange' ? '#fb923c' : '#ffffff'};
        font-size: 12px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        background: rgba(0,0,0,0.55);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid ${player.team === 'blue' ? '#3b82f680' : player.team === 'orange' ? '#f9731680' : '#ffffff40'};
        white-space: nowrap;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      `;
      const labelObj = new CSS2DObject(labelDiv);
      // Position label above the car (in local space — y offset above car height)
      labelObj.position.set(0, CAR_HEIGHT * SCALE + 8, 0);
      mesh.add(labelObj); // attach to car so it follows automatically
      this.labelObjects.set(player.name, labelObj);
    }
  }

  private startAnimation(): void {
    this.lastTimestamp = performance.now();
    const step = (timestamp: number) => {
      if (!this.isPlaying || !this.replay) return;

      const elapsedMs = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      const deltaSeconds = elapsedMs / 1000;

      this.advanceFrame(deltaSeconds);

      // Slowly orbit camera around the center for a dynamic 3D showcase feel
      this.cameraAngle += this.CAMERA_ORBIT_SPEED * deltaSeconds;
      this.camera.position.set(
        Math.sin(this.cameraAngle) * this.CAMERA_RADIUS,
        this.CAMERA_HEIGHT,
        Math.cos(this.cameraAngle) * this.CAMERA_RADIUS
      );
      this.camera.lookAt(0, 20, 0);

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

    const startTime = frames[0]?.time ?? 0;
    const targetTime = startTime + this.elapsedPlaybackTime;

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

    if (frame.ball) {
      this.ball.position.set(
        frame.ball.x * SCALE,
        frame.ball.z * SCALE,
        frame.ball.y * SCALE
      );
    }

    for (const player of frame.players) {
      const mesh = this.carMeshes.get(player.name);
      if (mesh) {
        mesh.position.set(
          player.x * SCALE,
          player.z * SCALE,
          player.y * SCALE
        );
      }
    }
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }
}