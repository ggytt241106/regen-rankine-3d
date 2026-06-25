// ============================================================
// 视图切换按钮 — 完整发动机 / 剖面视图 (SVG图标)
// ============================================================
import type { ViewMode } from '../../types';
import type { EngineScene } from '../../modules/renderer';

const ICON_SECTION = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`;
const ICON_FULL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;

export class ViewToggle {
  private container: HTMLElement;
  private engine: EngineScene;
  private mode: ViewMode = 'full';

  constructor(containerId: string, engine: EngineScene) {
    this.container = document.getElementById(containerId)!;
    this.engine = engine;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <button class="btn btn--dark" id="btn-view-mode">
        ${this.mode === 'full' ? ICON_SECTION : ICON_FULL}
        <span style="margin-left:6px">${this.mode === 'full' ? '剖面视图' : '完整视图'}</span>
      </button>
    `;
    document.getElementById('btn-view-mode')!.addEventListener('click', () => {
      this.mode = this.mode === 'full' ? 'section' : 'full';
      this.engine.setViewMode(this.mode);
      this.render();
    });
  }
}