'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from 'react';
import {createPortal} from 'react-dom';

import {useBodyScrollLock} from '@/features/ui/body-scroll-lock';
import {
  resolveSheetDurationMs,
  SHEET_ENTER_DURATION_MS,
  SHEET_EXIT_DURATION_MS,
  SHEET_RESIZE_DURATION_MS,
  type SheetCloseReason
} from '@/features/ui/sheet-motion';
import {
  initialSheetPhase,
  isSheetInteractive,
  isSheetMounted,
  nextSheetPhase,
  sheetPhaseSettleMs,
  type SheetPhase
} from '@/features/ui/sheet-phase';
import {useInertSiblings} from '@/features/ui/use-inert-siblings';
import {useOverlayHistoryEntry} from '@/features/ui/use-overlay-history-entry';
import {useSheetSwipe} from '@/features/ui/use-sheet-swipe';

import styles from '@/features/ui/bottom-sheet.module.css';
import hiddenControlStyles from '@/features/ui/visually-hidden.module.css';

// 시트 프리미티브 — 명세 §3-4. **카드 시트와 instruction 시트가 이 하나를 쓴다.** 다른 것은
// 셋뿐이고 그 셋은 prop 이다: grabber · 제스처 닫기(backdrop 탭 · 스와이프 다운) · history 항목.
// 두 시트가 CSS 나 포커스 처리를 따로 갖게 되면 이 프리미티브가 잘못 만들어진 것이다.

function subscribeNever(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface BottomSheetProps {
  open: boolean;
  /** 층 식별자 — history 항목과 testid 접미사에 쓴다. */
  layerId: string;
  titleId: string;
  /** 닫힘 요청. **프리미티브는 스스로 닫지 않는다** — 소비자가 요청을 받아 상태를 바꾼다.
   *  instruction 시트의 `Esc` no-op(BQ-41)이 이 분리 위에서 성립한다. */
  onCloseRequest: (reason: SheetCloseReason) => void;
  /** 시각적으로 숨긴 마지막 탭 스톱 닫기 버튼의 접근 가능한 이름. */
  closeLabel: string;
  children: ReactNode;
  header?: ReactNode;
  actionRow?: ReactNode;
  /** 모달 시트는 grabber 를 두지 않는다 — 끌어 내릴 수 있다는 약속이기 때문이다(명세 §2-3). */
  grabber?: boolean;
  /** backdrop 탭과 스와이프 다운으로 닫히는가. 모달 시트는 거짓이다. */
  dismissible?: boolean;
  /** 시스템 뒤로가기가 이 층을 닫는가(규칙 3). instruction 시트만 거짓이다. */
  historyEntry?: boolean;
  /** 랜딩 진입에서는 첫 페인트에 이미 열려 있다 — 전환 자체가 모션이므로 다시 올라오지 않는다. */
  skipEnterMotion?: boolean;
  reducedMotion?: boolean;
  /** 단계 전환에서 높이만 움직인다(instruction → qualifier). */
  animatesResize?: boolean;
  /** 단계 키가 바뀌면 포커스를 컨테이너로 되돌린다 — 눌렀던 버튼이 언마운트되기 때문이다. */
  stepKey?: string | number;
  className?: string;
  testId?: string;
  /** 위상이 바뀔 때마다 알린다 — 계약 표면(`data-mobile-phase`)이 시트의 시간을 그대로 읽는다. */
  onPhaseChange?: (phase: SheetPhase) => void;
}

export function BottomSheet({
  open,
  layerId,
  titleId,
  onCloseRequest,
  closeLabel,
  children,
  header,
  actionRow,
  grabber = true,
  dismissible = true,
  historyEntry = true,
  skipEnterMotion = false,
  reducedMotion = false,
  animatesResize = false,
  stepKey = 'default',
  className,
  testId,
  onPhaseChange
}: BottomSheetProps) {
  // 포탈은 클라이언트에서만 성립한다. 랜딩 진입의 instruction 시트처럼 **첫 렌더부터 열려 있는**
  // 시트가 있으므로 이 판정을 생략할 수 없다 — 서버에서 `document` 를 만지면 렌더가 깨진다.
  const mounted = useSyncExternalStore(subscribeNever, getClientSnapshot, getServerSnapshot);
  const [phase, setPhase] = useState<SheetPhase>(() => initialSheetPhase({open, skipEnterMotion}));
  const [previousOpen, setPreviousOpen] = useState(open);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // **이탈은 렌더 중에 판정한다.** effect 에서 켜면 활성이 거짓이 된 커밋에 한 번 언마운트되고
  // 다음 커밋에 다시 마운트되며, 그 재마운트가 등장 애니메이션을 다시 걸어 이탈이 거꾸로
  // 재생된다 — 끝 값만 보는 단언도 스크린샷도 전부 초록이다(L38).
  if (previousOpen !== open) {
    setPreviousOpen(open);
    const resolved = nextSheetPhase({phase, open, skipEnterMotion});
    if (resolved !== phase) {
      setPhase(resolved);
    }
  }

  useEffect(() => {
    const settleMs = sheetPhaseSettleMs(phase);
    if (settleMs === null) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setPhase((current) => {
          if (current === 'entering') {
            return 'open';
          }
          if (current === 'closing') {
            return 'closed';
          }
          return current;
        });
      },
      resolveSheetDurationMs(settleMs, reducedMotion)
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, reducedMotion]);

  // 위상 보고는 effect 로 한다 — 렌더 중에 부모의 상태를 바꾸면 React 가 경고하고, 보고는
  // 커밋된 위상에 대한 것이어야 한다.
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);
  useEffect(() => {
    onPhaseChangeRef.current?.(phase);
  }, [phase]);

  const interactive = isSheetInteractive(phase);

  const requestClose = useCallback(
    (reason: SheetCloseReason) => {
      onCloseRequest(reason);
    },
    [onCloseRequest]
  );

  const swipe = useSheetSwipe({
    enabled: dismissible && interactive,
    sheetRef,
    onClose: useCallback(() => {
      requestClose('swipe');
    }, [requestClose])
  });

  useBodyScrollLock(layerId, isSheetMounted(phase));
  useInertSiblings(container, isSheetMounted(phase));
  useOverlayHistoryEntry({
    layerId,
    open,
    enabled: historyEntry,
    onPopClose: useCallback(() => {
      requestClose('history');
    }, [requestClose])
  });

  // 열릴 때 그 전에 포커스가 있던 곳을 적고, 닫힌 **뒤에** 거기로 돌려보낸다(명세 §3-4).
  // 카드 시트는 카드로, instruction 재진입은 칩으로 간다.
  //
  // 기준이 `open` 이 아니라 **시트가 트리에 있는가**인 것은 형식이 아니다. `open` 이 거짓이 되는
  // 커밋에서 시트는 아직 이탈 중이고 그 아래 층은 여전히 `inert` 다 — `inert` 안의 원소에 건
  // `focus()` 는 아무 일도 하지 않으므로, 그 시점에 돌려보내면 포커스가 `body` 에 남는다.
  // 이 훅은 `useInertSiblings` 보다 **뒤에** 선언돼 있어 cleanup 도 뒤에 돈다: 그때는 이미
  // `inert` 가 걷혀 있다.
  const sheetMounted = isSheetMounted(phase);
  useEffect(() => {
    if (!sheetMounted) {
      return;
    }

    const previous = document.activeElement;
    restoreFocusRef.current =
      previous instanceof HTMLElement && previous !== document.body ? previous : null;

    return () => {
      const target = restoreFocusRef.current;
      if (target?.isConnected) {
        target.focus({preventScroll: true});
      }
    };
  }, [sheetMounted]);

  // 포커스는 **시트 컨테이너**로 들어온다 — 첫 컨트롤이 아니다. Enter 한 번이 곧 답이 되면 안 된다.
  // `mounted` 를 의존성에 넣는 것은 형식이 아니다: 첫 렌더는 포탈 전이라 `null` 을 돌려주므로
  // `sheetRef.current` 가 없고, 그 사실을 반영하지 않으면 이 effect 는 한 번 헛돌고 끝난다.
  const shouldFocusSheet = mounted && interactive;
  useEffect(() => {
    if (!shouldFocusSheet) {
      return;
    }
    sheetRef.current?.focus({preventScroll: true});
  }, [shouldFocusSheet, stepKey]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose('escape');
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const sheet = sheetRef.current;
      if (!sheet) {
        return;
      }

      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === sheet) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [requestClose]
  );

  if (!mounted || !isSheetMounted(phase)) {
    return null;
  }

  const style = {
    '--sheet-enter-ms': `${resolveSheetDurationMs(SHEET_ENTER_DURATION_MS, reducedMotion)}ms`,
    '--sheet-exit-ms': `${resolveSheetDurationMs(SHEET_EXIT_DURATION_MS, reducedMotion)}ms`,
    '--sheet-resize-ms': `${resolveSheetDurationMs(SHEET_RESIZE_DURATION_MS, reducedMotion)}ms`,
    '--sheet-drag-offset': `${swipe.offsetPx}px`
  } as CSSProperties;

  return createPortal(
    <div
      ref={(node) => {
        containerRef.current = node;
        setContainer(node);
      }}
      className="fixed inset-0 z-[1200]"
      data-slot="sheetLayer"
      data-layer-id={layerId}
      style={style}
    >
      <div
        className={styles.scrim}
        data-state={phase}
        data-slot="sheetScrim"
        data-testid={testId ? `${testId}-scrim` : undefined}
        onClick={dismissible && interactive ? () => requestClose('backdrop') : undefined}
      />
      <div
        ref={sheetRef}
        className={className ? `${styles.sheet} ${className}` : styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-state={phase}
        data-slot="sheet"
        data-dragging={swipe.dragging ? 'true' : 'false'}
        data-resizes={animatesResize ? 'true' : 'false'}
        data-testid={testId}
        inert={!interactive}
        onKeyDown={handleKeyDown}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
      >
        {grabber ? (
          <div className={styles.grabber} data-slot="sheetGrabber" aria-hidden="true">
            <span className={styles.grabberBar} />
          </div>
        ) : null}
        {header ? (
          <div className={styles.header} data-slot="sheetHeader">
            {header}
          </div>
        ) : null}
        <div className={styles.body} data-slot="sheetBody">
          {children}
        </div>
        {actionRow ? (
          <div className={styles.actionRow} data-slot="sheetActionRow">
            {actionRow}
          </div>
        ) : null}
        {/* 보조기술은 「빈 곳」을 탭할 수 없다. 마지막 탭 스톱의 숨은 닫기가 그 길이다
            (규칙 3). 보이지 않으므로 「보이는 X 를 두지 않는다」와 충돌하지 않는다. */}
        <button
          type="button"
          className={hiddenControlStyles.hiddenControl}
          data-slot="sheetHiddenClose"
          onClick={() => requestClose('control')}
        >
          {closeLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
