'use client';

import {useEffect, useSyncExternalStore} from 'react';

import {LOCAL_STORAGE_KEYS} from '@/features/landing/storage/storage-keys';
import {readLocal, removeLocal, writeLocal} from '@/lib/safe-storage';
import type {TelemetryConsentState} from '@/features/telemetry/types';

// consent의 단일 진실 공급원은 메모리 상태에 두고, localStorage는 영속화 계층으로만 사용한다.
export const TELEMETRY_CONSENT_STORAGE_KEY = LOCAL_STORAGE_KEYS.TELEMETRY_CONSENT;

export interface TelemetryConsentSnapshot {
  consentState: TelemetryConsentState;
  synced: boolean;
}

type TelemetryConsentListener = () => void;
type PersistedTelemetryConsentState = Exclude<TelemetryConsentState, 'UNKNOWN'>;

const listeners = new Set<TelemetryConsentListener>();
const INITIAL_CONSENT_SNAPSHOT: TelemetryConsentSnapshot = {
  consentState: 'UNKNOWN',
  synced: false
};

let consentSnapshot: TelemetryConsentSnapshot = INITIAL_CONSENT_SNAPSHOT;
let storageBridgeInstalled = false;

function emitConsentSnapshotChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function updateConsentSnapshot(nextSnapshot: TelemetryConsentSnapshot): TelemetryConsentSnapshot {
  if (
    consentSnapshot.consentState === nextSnapshot.consentState &&
    consentSnapshot.synced === nextSnapshot.synced
  ) {
    return consentSnapshot;
  }

  consentSnapshot = nextSnapshot;
  emitConsentSnapshotChange();
  return consentSnapshot;
}

function resolveStoredConsentState(): TelemetryConsentState {
  const rawValue = readLocal(TELEMETRY_CONSENT_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return 'UNKNOWN';
  }

  const raw = rawValue.trim().toUpperCase();
  return raw === 'OPTED_IN' ? 'OPTED_IN' : 'OPTED_OUT';
}

function persistConsentState(nextState: PersistedTelemetryConsentState): void {
  try {
    writeLocal(TELEMETRY_CONSENT_STORAGE_KEY, nextState);
  } catch {
    // 저장 실패 시에도 메모리 상태는 유지해 same-tab 동작을 우선 보장한다.
  }
}

function handleStorageChange(event: StorageEvent): void {
  if (event.key !== null && event.key !== TELEMETRY_CONSENT_STORAGE_KEY) {
    return;
  }

  syncTelemetryConsentSource();
}

export function getTelemetryConsentSnapshot(): TelemetryConsentSnapshot {
  return consentSnapshot;
}

export function subscribeToTelemetryConsent(listener: TelemetryConsentListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function ensureTelemetryConsentSourceSync(): TelemetryConsentSnapshot {
  if (typeof window !== 'undefined' && !storageBridgeInstalled) {
    window.addEventListener('storage', handleStorageChange);
    storageBridgeInstalled = true;
  }

  return syncTelemetryConsentSource();
}

export function syncTelemetryConsentSource(): TelemetryConsentSnapshot {
  return updateConsentSnapshot({
    consentState: resolveStoredConsentState(),
    synced: true
  });
}

export function setTelemetryConsentState(nextState: PersistedTelemetryConsentState): TelemetryConsentSnapshot {
  persistConsentState(nextState);

  return updateConsentSnapshot({
    consentState: nextState,
    synced: true
  });
}

export function resetTelemetryConsentSourceForTests(): void {
  consentSnapshot = INITIAL_CONSENT_SNAPSHOT;
  storageBridgeInstalled = false;

  try {
    removeLocal(TELEMETRY_CONSENT_STORAGE_KEY);
  } catch {
    // 테스트 정리 단계에서는 저장소 실패를 무시한다.
  }

  emitConsentSnapshotChange();
}

export function useTelemetryConsentSource(): TelemetryConsentSnapshot {
  const snapshot = useSyncExternalStore(
    subscribeToTelemetryConsent,
    getTelemetryConsentSnapshot,
    getTelemetryConsentSnapshot
  );

  useEffect(() => {
    ensureTelemetryConsentSourceSync();
  }, []);

  return snapshot;
}
