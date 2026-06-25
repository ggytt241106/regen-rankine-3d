// ============================================================
// 工质流体粒子系统 — 四冲程完整可视化
//   蓝(低温进气) → 青→黄→橙→红(高温燃烧) 温度色标
//   进气/排气粒子流动轨迹清晰可见
// ============================================================
import * as THREE from 'three';
import { temperatureToColor } from '../thermodynamics';
import type { StrokePhase } from '../../types';

const CYL_R = 0.58;
const PARTICLE_R = 0.055;
const PARTICLE_COUNT = 120;
const FLOW_COUNT = 30;

interface CylParticle {
  mesh: THREE.Mesh;
  alive: boolean;
  y: number;        // 0=piston, 1=head
  r: number;        // radial distance
  a: number;        // angle
  phase: number;    // micro-motion phase
  age: number;
}

export class FluidMesh {
  group: THREE.Group;
  private cylParticles: CylParticle[] = [];
  private cylMats: THREE.MeshPhongMaterial[] = [];

  // 进气道流动粒子
  private intakeGroup: THREE.Group;
  private intakeMeshes: THREE.Mesh[] = [];
  private intakeMats: THREE.MeshPhongMaterial[] = [];

  // 排气道流动粒子
  private exhaustGroup: THREE.Group;
  private exhaustMeshes: THREE.Mesh[] = [];
  private exhaustMats: THREE.MeshPhongMaterial[] = [];

  constructor(x: number) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, 0);

    // ---- 缸内粒子 ----
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        emissive: 0x000000,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const geo = new THREE.SphereGeometry(PARTICLE_R, 8, 6);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 0;
      this.group.add(mesh);
      this.cylMats.push(mat);
      this.cylParticles.push({
        mesh,
        alive: true,
        y: Math.random(),
        r: Math.sqrt(Math.random()) * CYL_R,
        a: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        age: Math.random() * 10,
      });
    }

    // ---- 进气道粒子 ----
    this.intakeGroup = new THREE.Group();
    this.group.add(this.intakeGroup);
    for (let i = 0; i < FLOW_COUNT; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        emissive: 0x000000,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const geo = new THREE.SphereGeometry(0.04, 6, 4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 0;
      this.intakeGroup.add(mesh);
      this.intakeMeshes.push(mesh);
      this.intakeMats.push(mat);
    }

    // ---- 排气道粒子 ----
    this.exhaustGroup = new THREE.Group();
    this.group.add(this.exhaustGroup);
    for (let i = 0; i < FLOW_COUNT; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0xff6644,
        emissive: 0x000000,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const geo = new THREE.SphereGeometry(0.04, 6, 4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 0;
      this.exhaustGroup.add(mesh);
      this.exhaustMeshes.push(mesh);
      this.exhaustMats.push(mat);
    }
  }

  update(
    state: { volume: number; temperature: number; pressure: number },
    cylTop: number,
    cylBottom: number,
    phase: StrokePhase,
    _crankAngle: number,
  ): void {
    const maxH = cylTop - cylBottom;
    const fluidH = Math.max(0.1, state.volume * maxH * 0.84);
    const pistonY = cylBottom + (maxH - fluidH) * 0.06;
    const color = temperatureToColor(state.temperature);
    const a = _crankAngle % (4 * Math.PI);
    const strokeT = (a % Math.PI) / Math.PI;

    const volumeFrac = Math.min(1, Math.max(0.08, state.volume));
    const activeCount = Math.floor(PARTICLE_COUNT * volumeFrac);

    // ---- 缸内粒子 ----
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.cylParticles[i];
      const mat = this.cylMats[i];
      p.age += 0.016;

      if (i < activeCount) {
        p.alive = true;
        p.mesh.visible = true;

        // 冲程粒子行为
        if (phase === 'intake') {
          // 进气: 粒子从顶部(进气门)流入，向下扩散
          if (p.age < 0.5) {
            p.y = 0.95 - p.age * 1.8;
            p.r = Math.sqrt(Math.random()) * CYL_R * 0.6;
          } else {
            p.y += (Math.random() * 0.6 - p.y) * 0.04;
            p.r += (Math.sqrt(Math.random()) * CYL_R * 0.8 - p.r) * 0.03;
          }
        } else if (phase === 'compression') {
          // 压缩: 向上聚集，体积缩小
          p.y += (0.9 - p.y) * 0.07;
          p.r *= 0.994;
        } else if (phase === 'power') {
          // 做功: 剧烈膨胀，向下扩散
          p.y += (0.05 - p.y) * 0.06;
          p.r *= 1.004;
          // 燃烧湍流
          p.a += (Math.random() - 0.5) * 0.08;
        } else if (phase === 'exhaust') {
          // 排气: 向上移出
          p.y += 0.03;
          p.r += (CYL_R * 0.3 - p.r) * 0.05;
        }

        p.y = Math.max(0.0, Math.min(1.0, p.y));
        p.r = Math.max(0.04, Math.min(CYL_R, p.r));

        // 热运动微动
        const agitation = phase === 'power' ? 0.025 : 0.012;
        const mx = Math.sin(p.age * 4 + p.phase) * agitation;
        const mz = Math.cos(p.age * 3.5 + p.phase) * agitation;

        const worldY = pistonY + p.y * fluidH;
        p.mesh.position.set(
          Math.cos(p.a) * p.r + mx,
          worldY,
          Math.sin(p.a) * p.r + mz,
        );

        mat.color.set(color);
        mat.emissive?.set(color);
        mat.opacity = 0.6 + Math.random() * 0.25;
      } else {
        // 超出容积的粒子: 排气阶段移出
        if (p.alive && phase === 'exhaust') {
          p.y += 0.05;
          if (p.y > 1.2) {
            p.alive = false;
            p.mesh.visible = false;
          } else {
            const worldY = pistonY + p.y * fluidH;
            p.mesh.position.set(
              Math.cos(p.a) * p.r,
              worldY,
              Math.sin(p.a) * p.r,
            );
            mat.opacity = Math.max(0, mat.opacity - 0.04);
          }
        } else {
          p.mesh.visible = false;
        }
      }
    }

    // ---- 进气道流动粒子 (进气冲程) ----
    const showIntake = phase === 'intake';
    for (let i = 0; i < FLOW_COUNT; i++) {
      const mesh = this.intakeMeshes[i];
      const mat = this.intakeMats[i];
      if (showIntake) {
        mesh.visible = true;
        const prog = ((i / FLOW_COUNT) + strokeT * 0.5 + performance.now() * 0.0003) % 1;
        // 从进气道(上方) → 进气门 → 缸内
        const startY = cylTop + 0.45;
        const endY = pistonY + fluidH * 0.5;
        const y = startY + (endY - startY) * prog;
        const z = 0.28 * (1 - prog);
        mesh.position.set(
          Math.sin(i * 2.1 + performance.now() * 0.002) * 0.18,
          y,
          z,
        );
        mat.color.set('#4488ff');
        mesh.scale.setScalar(0.3 + prog * 0.7);
        mat.opacity = 0.55 * (1 - Math.abs(prog - 0.4) * 1.7);
      } else {
        mesh.visible = false;
      }
    }

    // ---- 排气道流动粒子 (排气冲程) ----
    const showExhaust = phase === 'exhaust';
    for (let i = 0; i < FLOW_COUNT; i++) {
      const mesh = this.exhaustMeshes[i];
      const mat = this.exhaustMats[i];
      if (showExhaust) {
        mesh.visible = true;
        const prog = ((i / FLOW_COUNT) + strokeT * 0.5 + performance.now() * 0.0003) % 1;
        // 从缸内 → 排气门 → 排气道(上方)
        const startY = pistonY + fluidH * 0.4;
        const endY = cylTop + 0.45;
        const y = startY + (endY - startY) * prog;
        const z = -0.28 * Math.min(1, prog * 1.3);
        mesh.position.set(
          Math.cos(i * 2.3 + performance.now() * 0.002) * 0.18,
          y,
          z,
        );
        const exhaustColor = temperatureToColor(Math.max(600, state.temperature * 0.7));
        mat.color.set(exhaustColor);
        mesh.scale.setScalar(0.4 + prog * 0.6);
        mat.opacity = 0.55 * Math.min(1, prog * 3) * Math.min(1, (1 - prog) * 4);
      } else {
        mesh.visible = false;
      }
    }
  }
}