// ============================================================
// 应用入口 — 从上到下平铺布局 (暗色主题)
//   3D模型 → PV图 → TS图 → 静态原理说明 → 动态工况数据 → 控制栏
// ============================================================
import { EngineScene } from './modules/renderer';
import { SliderPanel } from './components/SliderPanel';
import { ChartPanel } from './components/ChartPanel';
import { ControlBar } from './components/ControlBar';
import { ViewToggle } from './components/ViewToggle';
import { parameterStore } from './store/parameters';
import { computeOttoCycle, getCycleDescription } from './modules/thermodynamics';
import type { StrokePhase } from './types';

const PHASE_NAMES: Record<StrokePhase, string> = {
  intake: '进气冲程',
  compression: '压缩冲程',
  power: '做功冲程',
  exhaust: '排气冲程',
};

const PHASE_COLORS: Record<StrokePhase, string> = {
  intake: '#6699ff',
  compression: '#ffaa00',
  power: '#ff5555',
  exhaust: '#888888',
};

export function initApp(): void {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <div class="layout">
      <!-- 3D 发动机展示区 -->
      <section class="section-3d">
        <div id="canvas-container" class="canvas-container"></div>
        <div id="view-toggle" class="view-toggle-float"></div>
      </section>

      <!-- 参数面板 (固定左侧) -->
      <aside class="aside-sliders">
        <div id="slider-panel"></div>
      </aside>

      <!-- 图表区 -->
      <section class="section-charts">
        <div id="pv-chart" class="chart-block"></div>
        <div id="ts-chart" class="chart-block"></div>
      </section>

      <!-- 第一行：静态循环热力参数（仅参数变化时更新） -->
      <section class="section-desc">
        <div id="description" class="desc-text"></div>
      </section>

      <!-- 第二行：实时动态工况数据（高频更新，独立行避免抖动） -->
      <section class="section-dynamic">
        <div id="dynamic-info" class="dynamic-text"></div>
      </section>

      <!-- 底部控制栏 -->
      <footer class="section-controls">
        <div id="control-bar"></div>
      </footer>
    </div>
  `;

  // 初始化各模块
  const engine = new EngineScene('canvas-container');
  new SliderPanel('slider-panel');
  new ChartPanel();
  new ViewToggle('view-toggle', engine);
  new ControlBar('control-bar');

  // 静态说明：仅在参数变化时更新（带节流250ms，减少不必要的重绘）
  updateDescription();
  let descThrottle = 0;
  parameterStore.subscribe(() => {
    const now = performance.now();
    if (now - descThrottle > 250) {
      descThrottle = now;
      updateDescription();
    }
  });

  // 动态工况：高频更新但节流到 ~100ms，独立行不影响静态文字
  updateDynamicInfo();
  let dynThrottle = 0;
  let dynPending = false;
  parameterStore.subscribe(() => {
    if (!dynPending) {
      dynPending = true;
      requestAnimationFrame(() => {
        const now = performance.now();
        if (now - dynThrottle > 100) {
          dynThrottle = now;
          updateDynamicInfo();
        }
        dynPending = false;
      });
    }
  });

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        parameterStore.setAnimation({ isPlaying: !parameterStore.animation.isPlaying });
        break;
      case 'r':
        parameterStore.setAnimation({ crankAngle: 0, phase: 'intake', isPlaying: false });
        break;
      case 'v':
        engine.setViewMode(engine.viewMode === 'full' ? 'section' : 'full');
        break;
    }
  });
}

// ---- 静态说明（热力参数、过程方程）----
function updateDescription(): void {
  const el = document.getElementById('description');
  if (!el) return;
  const cycle = computeOttoCycle(parameterStore.params);
  el.innerHTML = getCycleDescription(cycle);
}

// ---- 动态工况（曲轴转角、冲程、转速）----
function updateDynamicInfo(): void {
  const el = document.getElementById('dynamic-info');
  if (!el) return;
  const { animation, params } = parameterStore;
  const angleDeg = (animation.crankAngle * 180) / Math.PI;
  const crankDeg = angleDeg % 720;
  const phase = animation.phase;
  const color = PHASE_COLORS[phase];
  const cycle = computeOttoCycle(params);
  const { states } = cycle;

  el.innerHTML = `
    <span style="color:#888">实时工况</span>
    &nbsp;|&nbsp;
    曲轴转角: <b>${crankDeg.toFixed(1)}°</b>
    &nbsp;|&nbsp;
    当前冲程: <b style="color:${color}">${PHASE_NAMES[phase]}</b>
    &nbsp;|&nbsp;
    转速: <b>${params.rpm} rpm</b>
    &nbsp;|&nbsp;
    P₁=${states[0].P.toFixed(0)}kPa
    T₁=${states[0].T.toFixed(0)}K
    P₂=${states[1].P.toFixed(0)}kPa
    T₂=${states[1].T.toFixed(0)}K
    P₃=${states[2].P.toFixed(0)}kPa
    T₃=${states[2].T.toFixed(0)}K
    P₄=${states[3].P.toFixed(0)}kPa
    T₄=${states[3].T.toFixed(0)}K
  `;
}