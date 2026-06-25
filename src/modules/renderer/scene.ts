// ============================================================
// 引擎3D场景总控 — 直列四缸四冲程发动机
//   支持完整视图 / 剖面视图 (clipping plane 真实切割)
// ============================================================
import * as THREE from 'three';
import type { ViewMode } from '../../types';
import { CylinderBody } from './cylinder';
import { PistonRod } from './piston';
import { ValvePair } from './valves';
import { FluidMesh } from './fluid';
import { CameraControls } from './controls';
import { parameterStore } from '../../store/parameters';
import { computeOttoCycle, computeFluidState } from '../thermodynamics';

// ---- 发动机几何参数 ----
const CYL_SPACING = 2.2;          // 缸心距
const CYL_RADIUS = 0.75;
const CYL_HEIGHT = 2.4;
const CYL_TOP = 1.5;
const CYL_BOTTOM = CYL_TOP - CYL_HEIGHT;  // -0.9
const CRANK_Y = -2.4;             // 曲轴中心Y
const CRANK_R = 0.85;             // 曲柄半径
const ROD_LEN = 2.2;              // 连杆长度
const FIRING_ORDER = [0, 3, 1, 2]; // 1-3-4-2 点火顺序
const CYL_ANGLE_OFFSETS = [0, Math.PI, 2 * Math.PI, 3 * Math.PI]; // 各缸曲轴相位差

interface CylinderAssembly {
  body: CylinderBody;
  piston: PistonRod;
  valves: ValvePair;
  fluid: FluidMesh;
  x: number;
}

export class EngineScene {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: CameraControls;

  viewMode: ViewMode = 'full';
  private cylinders: CylinderAssembly[] = [];
  private crankshaftGroup: THREE.Group;
  private engineBlock: THREE.Group;
  private animFrameId: number | null = null;
  private lastTime = 0;

  // 裁剪平面 (剖面视图用)
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private allMaterials: THREE.Material[] = [];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;

    // ---- 场景 ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08080c);
    this.scene.fog = new THREE.Fog(0x08080c, 10, 38);

    // ---- 相机 ----
    this.camera = new THREE.PerspectiveCamera(
      40, this.container.clientWidth / this.container.clientHeight, 0.1, 80
    );
    this.camera.position.set(4, 0.5, 14);
    this.camera.lookAt(0, -0.5, 0);

    // ---- 渲染器 ----
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    // ---- 光照 ----
    this.setupLights();

    // ---- 地面 ----
    const grid = new THREE.GridHelper(16, 32, 0x2a2a35, 0x14141a);
    grid.position.y = -4.5;
    this.scene.add(grid);

    // ---- 发动机构建 ----
    this.engineBlock = this.buildEngineBlock();
    this.scene.add(this.engineBlock);

    this.crankshaftGroup = this.buildCrankshaft();
    this.scene.add(this.crankshaftGroup);

    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * CYL_SPACING;
      const cyl: CylinderAssembly = {
        body: new CylinderBody(x),
        piston: new PistonRod(x),
        valves: new ValvePair(x),
        fluid: new FluidMesh(x),
        x,
      };
      this.scene.add(cyl.body.group);
      this.scene.add(cyl.piston.group);
      this.scene.add(cyl.valves.group);
      this.scene.add(cyl.fluid.group);
      this.cylinders.push(cyl);
    }

    // 收集所有材质用于裁剪
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        this.allMaterials.push(...mats);
      }
    });

    // ---- 相机交互 ----
    this.controls = new CameraControls(this.camera, this.renderer.domElement);

    // ---- 窗口自适应 ----
    window.addEventListener('resize', this.onResize);

    // ---- 渲染循环 ----
    this.lastTime = performance.now();
    this.animate();

    // ---- 温度色条图例 ----
    this.createTempLegend();
  }

  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0x445566, 0.7));
    this.scene.add(new THREE.HemisphereLight(0x8899bb, 0x334455, 0.45));

    const key = new THREE.DirectionalLight(0xffeedd, 1.0);
    key.position.set(8, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -12; key.shadow.camera.right = 12;
    key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0001;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8899cc, 0.35);
    fill.position.set(-3, 2, -2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(0, 0, 10);
    this.scene.add(rim);
  }

  private buildEngineBlock(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, metalness: 0.85, roughness: 0.3 });

    // 发动机缸体底座
    const blockGeo = new THREE.BoxGeometry(CYL_SPACING * 4 + 0.8, 0.5, 2.4);
    const block = new THREE.Mesh(blockGeo, mat);
    block.position.y = CYL_BOTTOM - 0.4;
    block.castShadow = true; block.receiveShadow = true;
    group.add(block);

    // 缸盖
    const headGeo = new THREE.BoxGeometry(CYL_SPACING * 4 + 0.8, 0.3, 2.2);
    const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0x4e4e58, metalness: 0.9, roughness: 0.25 }));
    head.position.y = CYL_TOP + 0.15;
    head.castShadow = true;
    group.add(head);

    // 油底壳
    const panGeo = new THREE.BoxGeometry(CYL_SPACING * 4 + 0.4, 0.35, 2.0);
    const pan = new THREE.Mesh(panGeo, new THREE.MeshStandardMaterial({ color: 0x2e2e36, metalness: 0.75, roughness: 0.4 }));
    pan.position.y = CYL_BOTTOM - 0.7;
    pan.castShadow = true;
    group.add(pan);

    return group;
  }

  private buildCrankshaft(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, metalness: 0.92, roughness: 0.22 });

    // 主轴
    const shaftGeo = new THREE.CylinderGeometry(0.15, 0.15, CYL_SPACING * 4 + 1.5, 24);
    const shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.y = CRANK_Y;
    shaft.castShadow = true;
    group.add(shaft);

    // 飞轮
    const flywheelGeo = new THREE.TorusGeometry(0.65, 0.14, 16, 48);
    const flywheel = new THREE.Mesh(flywheelGeo, new THREE.MeshStandardMaterial({ color: 0x485a68, metalness: 0.88, roughness: 0.28 }));
    flywheel.rotation.x = Math.PI / 2;
    flywheel.position.set(CYL_SPACING * 2.5, CRANK_Y, 0);
    flywheel.castShadow = true;
    flywheel.name = 'flywheel';
    group.add(flywheel);

    // 曲柄臂 (每个气缸位置)
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * CYL_SPACING;
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, CRANK_R, 12);
      const arm = new THREE.Mesh(armGeo, mat);
      arm.position.set(x, CRANK_Y, 0);
      arm.rotation.z = Math.PI / 2;
      arm.name = `crank-arm-${i}`;
      group.add(arm);

      // 配重
      const cwGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
      const cw = new THREE.Mesh(cwGeo, mat);
      cw.position.set(x, CRANK_Y - CRANK_R * 0.6, 0);
      cw.name = `counterweight-${i}`;
      group.add(cw);
    }

    return group;
  }

  // ---- 动画循环 ----
  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (parameterStore.animation.isPlaying) {
      const omega = (parameterStore.params.rpm * 2 * Math.PI) / 60;
      let newAngle = parameterStore.animation.crankAngle + omega * dt;
      if (newAngle >= 4 * Math.PI) newAngle -= 4 * Math.PI;
      parameterStore.setAnimation({
        crankAngle: newAngle,
        phase: parameterStore.getStrokePhase(newAngle),
      });
    }

    this.syncEngine();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private syncEngine(): void {
    const { params, animation } = parameterStore;
    const cycle = computeOttoCycle(params);
    const baseAngle = animation.crankAngle;

    for (let i = 0; i < 4; i++) {
      const cylAngle = baseAngle + CYL_ANGLE_OFFSETS[i];
      const fluidState = computeFluidState(params, cycle, cylAngle);
      const phase = parameterStore.getStrokePhase(cylAngle);

      this.cylinders[i].piston.update(cylAngle, CRANK_Y, CRANK_R, ROD_LEN);
      this.cylinders[i].valves.update(phase, cylAngle);
      this.cylinders[i].fluid.update(fluidState, CYL_TOP, CYL_BOTTOM, phase, cylAngle);

      // 曲柄臂旋转
      const arm = this.crankshaftGroup.getObjectByName(`crank-arm-${i}`);
      if (arm) arm.rotation.z = Math.PI / 2 + cylAngle;

      const cw = this.crankshaftGroup.getObjectByName(`counterweight-${i}`);
      if (cw) {
        cw.position.x = this.cylinders[i].x + CRANK_R * 0.6 * Math.sin(cylAngle);
        cw.position.y = CRANK_Y - CRANK_R * 0.6 * Math.cos(cylAngle);
      }
    }

    // 飞轮旋转
    const flywheel = this.crankshaftGroup.getObjectByName('flywheel');
    if (flywheel) flywheel.rotation.z = baseAngle;
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    const clipPlanes = mode === 'section' ? [this.clipPlane] : null;
    for (const mat of this.allMaterials) {
      mat.clippingPlanes = clipPlanes;
      mat.clipShadows = mode === 'section';
      mat.needsUpdate = true;
    }
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private createTempLegend(): void {
    const legend = document.createElement('div');
    legend.id = 'temp-legend';
    legend.innerHTML = `
      <div style="
        position:absolute; bottom:16px; right:16px; z-index:15;
        background:rgba(18,18,26,0.85); backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,0.08); border-radius:8px;
        padding:10px 12px; font-size:11px; color:#9a9aa8;
        display:flex; align-items:center; gap:8px;
        pointer-events:none; user-select:none;
      ">
        <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
          <span style="color:#ff4444; font-size:10px; font-weight:600;">高温</span>
          <div style="
            width:12px; height:100px; border-radius:6px;
            background:linear-gradient(to bottom,
              #ff2222,#ff5522,#ff8800,#ffbb00,#ddcc22,#88bb33,#33aa77,#3388cc,#3366ee
            );
          "></div>
          <span style="color:#4488ff; font-size:10px; font-weight:600;">低温</span>
        </div>
        <div style="display:flex; flex-direction:column; font-size:10px; color:#777; line-height:1.5;">
          <span>~2800K</span>
          <span style="visibility:hidden">|</span>
          <span style="visibility:hidden">|</span>
          <span style="visibility:hidden">|</span>
          <span style="visibility:hidden">|</span>
          <span style="visibility:hidden">|</span>
          <span style="visibility:hidden">|</span>
          <span style="visibility:hidden">|</span>
          <span>~300K</span>
        </div>
      </div>
    `;
    this.container.appendChild(legend);
  }

  dispose(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.clear();
    window.removeEventListener('resize', this.onResize);
  }
}