// ============================================================
// 左侧参数滑动调节面板 (暗色主题)
// ============================================================
import type { OttoParams } from '../../types';
import {
  parameterStore, PARAM_RANGES, PARAM_LABELS, PARAM_UNITS, DEFAULT_PARAMS,
} from '../../store/parameters';

export class SliderPanel {
  private container: HTMLElement;
  private unsub: (() => void) | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.render();
    this.unsub = parameterStore.subscribe(() => this.updateDisplay());
  }

  private render(): void {
    const params = parameterStore.params;
    const keys = Object.keys(PARAM_RANGES) as (keyof OttoParams)[];

    this.container.innerHTML = `
      <div class="param-panel">
        <h3 class="param-panel__title">热力参数</h3>
        ${keys.map(key => {
          const r = PARAM_RANGES[key];
          const unit = PARAM_UNITS[key];
          return `
            <div class="param-item">
              <div class="param-item__header">
                <span>${PARAM_LABELS[key]}</span>
                <span class="param-item__value" data-param="${key}">${params[key]} ${unit}</span>
              </div>
              <input type="range" class="param-item__slider" data-param="${key}"
                min="${r.min}" max="${r.max}" step="${r.step}" value="${params[key]}" />
              <div class="param-item__range">
                <span>${r.min}${unit ? ' ' + unit : ''}</span>
                <span>${r.max}${unit ? ' ' + unit : ''}</span>
              </div>
            </div>`;
        }).join('')}
        <div class="param-panel__actions">
          <button class="btn btn--dark" id="btn-reset-params">重置参数</button>
        </div>
      </div>
    `;

    this.container.querySelectorAll<HTMLInputElement>('.param-item__slider').forEach(input => {
      input.addEventListener('input', (e) => {
        const key = input.dataset.param as keyof OttoParams;
        parameterStore.setParam(key, parseFloat((e.target as HTMLInputElement).value));
      });
    });

    this.container.querySelector('#btn-reset-params')!.addEventListener('click', () => {
      parameterStore.resetParams();
      this.container.querySelectorAll<HTMLInputElement>('.param-item__slider').forEach(input => {
        const key = input.dataset.param as keyof OttoParams;
        input.value = String(DEFAULT_PARAMS[key]);
      });
    });
  }

  private updateDisplay(): void {
    const params = parameterStore.params;
    this.container.querySelectorAll<HTMLElement>('.param-item__value').forEach(el => {
      const key = el.dataset.param as keyof OttoParams;
      if (key) el.textContent = `${params[key]} ${PARAM_UNITS[key]}`;
    });
    this.container.querySelectorAll<HTMLInputElement>('.param-item__slider').forEach(input => {
      const key = input.dataset.param as keyof OttoParams;
      if (key) input.value = String(params[key]);
    });
  }

  dispose(): void { this.unsub?.(); }
}