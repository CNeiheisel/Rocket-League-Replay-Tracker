import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as THREE from 'three';
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
const FIELD_LENGTH = 10240; // y axis (goal to goal)
const FIELD_WIDTH = 8192;   // x axis (sideline to sideline)
const BALL_RADIUS = 92;
const CAR_LENGTH = 120;
const CAR_WIDTH = 85;
const CAR_HEIGHT = 36;

// Scale factor: Unreal units are large, scale down for a sane Three.js scene
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
  private ball!: THREE.Mesh;
  private carMeshes = new Map<string, THREE.Mesh>();
  private replay: ShowcaseReplay | null = null;
  private currentFrameIndex = 0;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private playbackSpeed = 1;
  private resizeObserver: ResizeObserver | null = null;

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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);
    this.scene.fog = new THREE.Fog(0x0a0e14, 800, 1600);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 3000);
    this.camera.position.set(0, 340, 520);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404050, 1.2);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.1);
    directional.position.set(200, 400, 200);
    this.scene.add(directional);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-200, 200, -200);
    this.scene.add(fillLight);

    // Field
    const fieldGeometry = new THREE.PlaneGeometry(FIELD_WIDTH * SCALE, FIELD_LENGTH * SCALE);
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f3d2e,
      roughness: 0.9,
      metalness: 0.05
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    this.scene.add(field);

    // Center line
    const lineGeometry = new THREE.PlaneGeometry(FIELD_WIDTH * SCALE, 2);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.1;
    this.scene.add(centerLine);

    // Goals (simple colored end markers)
    [-1, 1].forEach(side => {
      const goalGeometry = new THREE.PlaneGeometry(FIELD_WIDTH * 0.3 * SCALE, 4);
      const goalMaterial = new THREE.MeshBasicMaterial({
        color: side === -1 ? this.teamColors.blue : this.teamColors.orange,
        transparent: true,
        opacity: 0.4
      });
      const goalLine = new THREE.Mesh(goalGeometry, goalMaterial);
      goalLine.rotation.x = -Math.PI / 2;
      goalLine.position.set(0, 0.1, side * (FIELD_LENGTH / 2) * SCALE);
      this.scene.add(goalLine);
    });

    // Ball
    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS * SCALE, 24, 24);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.4,
      metalness: 0.1
    });
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
    this.scene.add(this.ball);
  }

  private setupCarsFromFirstFrame(): void {
    if (!this.replay || this.replay.frames.length === 0) return;

    const firstFrame = this.replay.frames[0];
    const carGeometry = new THREE.BoxGeometry(
      CAR_LENGTH * SCALE,
      CAR_HEIGHT * SCALE,
      CAR_WIDTH * SCALE
    );

    for (const player of firstFrame.players) {
      const color = this.teamColors[player.team] ?? this.teamColors.unknown;
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
      const mesh = new THREE.Mesh(carGeometry, material);
      mesh.position.set(player.x * SCALE, player.z * SCALE, player.y * SCALE);
      this.carMeshes.set(player.name, mesh);
      this.scene.add(mesh);
    }
  }

  private startAnimation(): void {
    this.lastTimestamp = performance.now();
    const step = (timestamp: number) => {
      if (!this.isPlaying || !this.replay) return;

      const elapsedMs = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      this.advanceFrame(elapsedMs / 1000);
      this.renderer.render(this.scene, this.camera);

      this.animationFrameId = requestAnimationFrame(step);
    };
    this.animationFrameId = requestAnimationFrame(step);
  }

  private elapsedPlaybackTime = 0;

  private advanceFrame(deltaSeconds: number): void {
    if (!this.replay) return;
    const frames = this.replay.frames;

    // Accumulate real elapsed time across calls instead of recomputing
    // relative to the current frame's own timestamp (which never grows
    // and caused playback to freeze on frame 0 permanently).
    this.elapsedPlaybackTime += deltaSeconds * this.playbackSpeed;

    const startTime = frames[0]?.time ?? 0;
    const targetTime = startTime + this.elapsedPlaybackTime;

    while (
      this.currentFrameIndex < frames.length - 1 &&
      frames[this.currentFrameIndex + 1].time <= targetTime
    ) {
      this.currentFrameIndex++;
    }

    // Loop back to start when reaching the end
    if (this.currentFrameIndex >= frames.length - 1) {
      this.currentFrameIndex = 0;
      this.elapsedPlaybackTime = 0;
    }

    const frame = frames[this.currentFrameIndex];

    if (frame.ball) {
      this.ball.position.set(frame.ball.x * SCALE, frame.ball.z * SCALE, frame.ball.y * SCALE);
    }

    for (const player of frame.players) {
      const mesh = this.carMeshes.get(player.name);
      if (mesh) {
        mesh.position.set(player.x * SCALE, player.z * SCALE, player.y * SCALE);
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
  }
}