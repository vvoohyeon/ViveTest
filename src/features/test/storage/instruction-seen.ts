export function instructionSeenKey(variant: string): string {
  return `vivetest-test-instruction-seen:${variant}`;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function markInstructionSeen(variant: string): void {
  const storage = getSessionStorage();
  storage?.setItem(instructionSeenKey(variant), 'true');
}

export function clearInstructionSeen(variant: string): void {
  const storage = getSessionStorage();
  storage?.removeItem(instructionSeenKey(variant));
}

export function hasSeenInstruction(variant: string): boolean {
  const storage = getSessionStorage();
  return storage?.getItem(instructionSeenKey(variant)) === 'true';
}
