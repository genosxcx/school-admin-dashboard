import { Component, Input } from '@angular/core';

// The NadaSoft mark: the "nun" letter shape with a coral dot, plus the wordmark.
@Component({
  selector: 'app-ns-logo',
  standalone: true,
  template: `
    <span class="ns-logo" [class.inverted]="inverted" [style.--size.px]="size">
      <svg class="mark" viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="11" class="tile" />
        <path
          d="M10 17v4a10 10 0 0 0 20 0v-4"
          fill="none"
          class="nun"
          stroke-width="4.5"
          stroke-linecap="round"
        />
        <circle cx="20" cy="11" r="3.4" class="dot" />
      </svg>
      @if (showWord) {
        <span class="word" dir="ltr">nadasoft</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ns-logo {
      --size: 34px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--ns-ink);
    }
    .mark {
      width: var(--size);
      height: var(--size);
      flex-shrink: 0;
      transition: transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
    }
    .ns-logo:hover .mark {
      transform: rotate(-8deg) scale(1.06);
    }
    .tile {
      fill: var(--ns-ink);
    }
    .nun {
      stroke: #fff;
    }
    .dot {
      fill: var(--ns-accent);
    }
    .inverted {
      color: #fff;
    }
    .inverted .tile {
      fill: #fff;
    }
    .inverted .nun {
      stroke: var(--ns-ink);
    }
    .word {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: calc(var(--size) * 0.62);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
    }
  `,
})
export class NsLogo {
  @Input() size = 34;
  @Input() inverted = false;
  @Input() showWord = true;
}
