import {readSession, removeSession, writeSession} from '@/lib/safe-storage';

export function instructionSeenKey(variant: string): string {
  return `vivetest-test-instruction-seen:${variant}`;
}

export function markInstructionSeen(variant: string): void {
  writeSession(instructionSeenKey(variant), 'true');
}

export function clearInstructionSeen(variant: string): void {
  removeSession(instructionSeenKey(variant));
}

export function hasSeenInstruction(variant: string): boolean {
  return readSession(instructionSeenKey(variant)) === 'true';
}
