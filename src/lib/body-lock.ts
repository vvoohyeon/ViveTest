let lockCount = 0;
let previousOverflow = '';

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  lockCount += 1;
}

export function unlockBodyScroll(options?: {force?: boolean}): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (options?.force) {
    lockCount = 0;
    document.body.style.overflow = previousOverflow;
    return;
  }

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}
