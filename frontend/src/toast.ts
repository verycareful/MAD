// ═══════════════════════════════════════════════════════════════════════════
// MAD Explorer v2 - Transient bottom-center toast
// ═══════════════════════════════════════════════════════════════════════════

import { TOAST_MS } from './constants';

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string): void {
  const el = document.getElementById('toast')!;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), TOAST_MS);
}
