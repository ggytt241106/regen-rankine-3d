// ============================================================
// 相机控制 — 鼠标拖拽旋转 + 滚轮缩放 (带阻尼平滑)
// ============================================================
import * as THREE from 'three';

const LERP_FACTOR = 0.12;     // 阻尼系数 (越小越平滑)
const ROTATE_SPEED = 0.006;   // 旋转灵敏度
const ZOOM_SPEED = 0.012;     // 缩放灵敏度

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private dom: HTMLElement;
  private dragging = false;
  private last = { x: 0, y: 0 };

  // 目标球坐标 (用户输入直接修改)
  private target = { theta: 0.25, phi: 1.1, radius: 14 };
  // 当前球坐标 (lerp到target)
  private current = { theta: 0.25, phi: 1.1, radius: 14 };

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.camera = camera;
    this.dom = dom;
    this.dom.style.cursor = 'grab';

    this.dom.addEventListener('mousedown', this.onDown);
    this.dom.addEventListener('mousemove', this.onMove);
    this.dom.addEventListener('mouseup', this.onUp);
    this.dom.addEventListener('wheel', this.onWheel, { passive: false });
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onDown = (e: MouseEvent): void => {
    this.dragging = true;
    this.last.x = e.clientX;
    this.last.y = e.clientY;
    this.dom.style.cursor = 'grabbing';
  };

  private onMove = (e: MouseEvent): void => {
    if (!this.dragging) return;
    this.target.theta -= (e.clientX - this.last.x) * ROTATE_SPEED;
    this.target.phi   -= (e.clientY - this.last.y) * ROTATE_SPEED;
    this.target.phi    = Math.max(0.2, Math.min(1.5, this.target.phi));
    this.last.x = e.clientX;
    this.last.y = e.clientY;
  };

  private onUp = (): void => {
    this.dragging = false;
    this.dom.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.target.radius += e.deltaY * ZOOM_SPEED;
    this.target.radius = Math.max(5, Math.min(28, this.target.radius));
  };

  update(): void {
    // 阻尼平滑: current 向 target 做线性插值
    const f = LERP_FACTOR;
    this.current.theta  += (this.target.theta  - this.current.theta)  * f;
    this.current.phi    += (this.target.phi    - this.current.phi)    * f;
    this.current.radius += (this.target.radius - this.current.radius) * f;

    const { theta, phi, radius } = this.current;
    this.camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
    this.camera.position.y = radius * Math.cos(phi);
    this.camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.lookAt(0, -0.5, 0);
  }

  dispose(): void {
    this.dom.removeEventListener('mousedown', this.onDown);
    this.dom.removeEventListener('mousemove', this.onMove);
    this.dom.removeEventListener('mouseup', this.onUp);
    this.dom.removeEventListener('wheel', this.onWheel);
  }
}