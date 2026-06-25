// ============================================================
// 底部控制栏 — 播放/暂停、重置 (SVG图标 + 暗色主题)
// ============================================================
import { parameterStore } from '../../store/parameters';

const ICON_PLAY = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const ICON_PAUSE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
const ICON_RESET = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.5 17.5A9 9 0 1 0 2 12"/></svg>`;

export class ControlBar {
  private container: HTMLElement;
  private unsub: (() => void) | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.render();
    this.unsub = parameterStore.subscribe(() => this.updateUI());
  }

  private render(): void {
    const { animation } = parameterStore;
    this.container.innerHTML = `
      <div class="control-bar">
        <button class="btn btn--dark btn--icon" id="btn-play" title="播放/暂停 (空格)">
          ${animation.isPlaying ? ICON_PAUSE : ICON_PLAY}
        </button>
        <button class="btn btn--dark btn--icon" id="btn-reset" title="重置 (R)">
          ${ICON_RESET}
        </button>
        <span class="control-bar__hint">空格: 播放/暂停 &nbsp; R: 重置 &nbsp; V: 切换视图</span>
      </div>
    `;

    document.getElementById('btn-play')!.addEventListener('click', () => {
      parameterStore.setAnimation({ isPlaying: !parameterStore.animation.isPlaying });
    });
    document.getElementById('btn-reset')!.addEventListener('click', () => {
      parameterStore.setAnimation({ crankAngle: 0, phase: 'intake', isPlaying: false });
    });
  }

  private updateUI(): void {
    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
      playBtn.innerHTML = parameterStore.animation.isPlaying ? ICON_PAUSE : ICON_PLAY;
    }
  }

  dispose(): void { this.unsub?.(); }
}