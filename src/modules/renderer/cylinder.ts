// ============================================================
// 气缸体 — 半透明外壳，可透视内部工质流体
// ============================================================
import * as THREE from 'three';

const RADIUS = 0.75;
const HEIGHT = 2.4;
const SEG = 48;

export class CylinderBody {
  group: THREE.Group;

  constructor(x: number) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, 0);

    // 气缸壁 — 半透明，可透视内部工质
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc8ccd6,
      metalness: 0.85,
      roughness: 0.22,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xb0b4be, metalness: 0.92, roughness: 0.16,
    });

    // 气缸壁
    const wallGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, SEG, 1, true);
    const wall = new THREE.Mesh(wallGeo, bodyMat);
    wall.renderOrder = 2;
    wall.castShadow = false;
    wall.receiveShadow = true;
    this.group.add(wall);

    // 顶面
    const topGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, 0.12, SEG);
    const top = new THREE.Mesh(topGeo, headMat);
    top.position.y = HEIGHT / 2;
    top.castShadow = true;
    this.group.add(top);

    // 底面
    const bottomGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, 0.1, SEG);
    const bottom = new THREE.Mesh(bottomGeo, headMat);
    bottom.position.y = -HEIGHT / 2;
    bottom.receiveShadow = true;
    this.group.add(bottom);

    // 散热片 (3圈)
    for (let i = 0; i < 3; i++) {
      const finGeo = new THREE.TorusGeometry(RADIUS + 0.08, 0.05, 8, SEG);
      const fin = new THREE.Mesh(finGeo, headMat);
      fin.position.y = 0.4 + i * 0.55;
      fin.rotation.x = Math.PI / 2;
      fin.castShadow = true;
      this.group.add(fin);
    }
  }
}