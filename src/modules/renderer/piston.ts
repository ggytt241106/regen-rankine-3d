// ============================================================
// 活塞+连杆 — 曲柄滑块机构，活塞沿Y轴往复，连杆跟随
// ============================================================
import * as THREE from 'three';

const PISTON_R = 0.7;
const PISTON_H = 0.2;
const ROD_R = 0.07;

export class PistonRod {
  group: THREE.Group;
  private pistonHead: THREE.Mesh;
  private rod: THREE.Mesh;
  private wristPin: THREE.Mesh;

  constructor(x: number) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, 0);

    // 活塞头
    const headGeo = new THREE.CylinderGeometry(PISTON_R, PISTON_R, PISTON_H, 40);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xcccdd8, metalness: 0.7, roughness: 0.3,
    });
    this.pistonHead = new THREE.Mesh(headGeo, headMat);
    this.pistonHead.castShadow = true;
    this.group.add(this.pistonHead);

    // 活塞环 (3道)
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(PISTON_R + 0.02, 0.025, 8, 40);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, metalness: 0.95, roughness: 0.15,
      }));
      ring.position.y = PISTON_H / 2 - 0.04 - i * 0.05;
      ring.rotation.x = Math.PI / 2;
      this.pistonHead.add(ring);
    }

    // 连杆
    const rodGeo = new THREE.CylinderGeometry(ROD_R, ROD_R, 1, 12);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0x6a7a8a, metalness: 0.8, roughness: 0.25,
    });
    this.rod = new THREE.Mesh(rodGeo, rodMat);
    this.rod.castShadow = true;
    this.group.add(this.rod);

    // 活塞销
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12);
    this.wristPin = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({
      color: 0x999999, metalness: 0.85, roughness: 0.2,
    }));
    this.wristPin.rotation.z = Math.PI / 2;
    this.group.add(this.wristPin);
  }

  update(crankAngle: number, crankY: number, crankR: number, rodLen: number): void {
    const sinA = Math.sin(crankAngle);
    const cosA = Math.cos(crankAngle);
    const pistonY = crankR * cosA + Math.sqrt(rodLen * rodLen - crankR * crankR * sinA * sinA) + crankY;

    this.pistonHead.position.y = pistonY;
    this.wristPin.position.y = pistonY;

    const crankPinX = crankR * Math.sin(crankAngle);
    const crankPinY = crankY + crankR * cosA;

    const midX = crankPinX / 2;
    const midY = (pistonY + crankPinY) / 2;
    const dx = 0 - crankPinX;
    const dy = pistonY - crankPinY;
    const len = Math.sqrt(dx * dx + dy * dy);

    this.rod.position.set(midX, midY, 0);
    this.rod.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    this.rod.scale.y = len / 1;
  }
}