// ============================================================
// 进排气门 — 单个气缸的进气门+排气门，按冲程时序开闭
// ============================================================
import * as THREE from 'three';
import type { StrokePhase } from '../../types';

const VALVE_R = 0.18;
const VALVE_H = 0.12;
const STEM_R = 0.04;
const STEM_L = 0.45;
const VALVE_Y = 1.6;      // 气门座Y (缸盖上方)
const LIFT = 0.25;        // 最大升程

export class ValvePair {
  group: THREE.Group;
  private intakeHead: THREE.Mesh;
  private exhaustHead: THREE.Mesh;

  constructor(x: number) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, 0);

    // 进气门 (Z轴正侧, 蓝色调)
    const intakeGroup = new THREE.Group();
    intakeGroup.position.set(0, VALVE_Y, 0.28);
    this.intakeHead = this.buildValve(intakeGroup, 0x5577aa);
    this.group.add(intakeGroup);

    // 排气门 (Z轴负侧, 暖色调)
    const exhaustGroup = new THREE.Group();
    exhaustGroup.position.set(0, VALVE_Y, -0.28);
    this.exhaustHead = this.buildValve(exhaustGroup, 0x997766);
    this.group.add(exhaustGroup);
  }

  private buildValve(parent: THREE.Group, color: number): THREE.Mesh {
    const headGeo = new THREE.CylinderGeometry(VALVE_R, VALVE_R, VALVE_H, 24);
    const headMat = new THREE.MeshStandardMaterial({ color, metalness: 0.65, roughness: 0.35 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = -VALVE_H / 2;
    head.castShadow = true;
    parent.add(head);

    const stemGeo = new THREE.CylinderGeometry(STEM_R, STEM_R, STEM_L, 10);
    const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({
      color: 0x999999, metalness: 0.8, roughness: 0.2,
    }));
    stem.position.y = STEM_L / 2;
    stem.castShadow = true;
    parent.add(stem);

    return head;
  }

  update(phase: StrokePhase, crankAngle: number): void {
    const a = crankAngle % (4 * Math.PI);
    const t = (a % Math.PI) / Math.PI;

    // 进气门: 进气冲程打开
    const intakeOpen = phase === 'intake';
    const iLift = intakeOpen ? LIFT * (t < 0.75 ? t / 0.75 : (1 - t) / 0.25) : 0;
    this.intakeHead.position.y = -VALVE_H / 2 - iLift;

    // 排气门: 排气冲程打开
    const exhaustOpen = phase === 'exhaust';
    const eLift = exhaustOpen ? LIFT * (t < 0.75 ? t / 0.75 : (1 - t) / 0.25) : 0;
    this.exhaustHead.position.y = -VALVE_H / 2 - eLift;
  }
}