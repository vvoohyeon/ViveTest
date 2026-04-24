/**
 * @fileoverview Landing fixture — 랜딩 카드 메타데이터 소스.
 *
 * Q1 preview는 Questions fixture의 첫 번째 scoring question(scoring1)에서
 * 파생한다. Landing source는 카드 메타데이터(title, subtitle, tags,
 * instruction 등)만 관리한다.
 */
import type { VariantRegistrySourceCard } from "@/features/variant-registry/types";

export const variantRegistrySourceFixture: ReadonlyArray<VariantRegistrySourceCard> =
  [
    {
      seq: 10,
      type: "test",
      variant: "qmbti",
      attribute: "available",
      title: {
        en: "10m MBTI test",
        kr: "10분컷 MBTI",
      },
      subtitle: {
        en: "Find your default deep-work cadence.",
        kr: "내 기본 딥워크 리듬을 빠르게 찾아보세요.",
      },
      tags: {
        en: ["Rapid", "ipsum", "Lorem"],
        kr: ["순식간에", "쌉가능", "어서와"],
      },
      instruction: {
        en: "QMBTI opens with a quick personality rhythm check before you move into the main questions.",
        kr: "QMBTI는 본 문항에 들어가기 전에 작업 리듬 성향을 짧게 점검하는 테스트입니다.",
      },
      durationM: 3,
      sharedC: 2184,
      engagedC: 15236,
    },
    {
      seq: 20,
      type: "test",
      variant: "rhythm-b",
      attribute: "available",
      title: {
        en: "Focus Rhythm B Long String example here goes ipsum lorem varaint string edge case here example",
        kr: "집중 리듬 B Long String example here goes ipsum lorem varaint string edge case here example",
      },
      subtitle: {
        en: "LONGTOKENWITHOUTBREAKS_ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890_REPEAT_REPEAT_REPEAT",
        kr: "집중기준점_LONGTOKENWITHOUTBREAKS_ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890_REPEAT_REPEAT_REPEAT",
      },
      tags: {
        en: ["workflow", "ipsum lorem long tag", "Lorem long tag example"],
        kr: ["워크플로", "ipsum lorem long tag", "Lorem long tag example here"],
      },
      instruction: {
        en: "Rhythm B asks you to compare interruption patterns and pacing signals across your work blocks.",
        kr: "리듬 B는 작업 블록마다 방해 패턴과 페이스 신호를 비교하도록 구성된 테스트입니다.",
      },
      durationM: 4,
      sharedC: 982,
      engagedC: 8392,
    },
    {
      seq: 30,
      type: "test",
      variant: "debug-sample",
      attribute: "debug",
      title: {
        en: "Sample Debug Variant",
        kr: "샘플 디버그 변형",
      },
      subtitle: {
        en: "Internal reference card for QA and snapshots.",
        kr: "QA와 스냅샷 검증을 위한 내부 참조 카드입니다.",
      },
      tags: {},
      instruction: {
        en: "Debug Sample exists only for internal QA and uses a deterministic planning prompt.",
        kr: "디버그 샘플은 내부 QA 전용이며 결정형 계획 선호를 확인하는 프롬프트를 사용합니다.",
      },
      durationM: 2,
      sharedC: 74,
      engagedC: 640,
    },
    {
      seq: 40,
      type: "test",
      variant: "energy-check",
      attribute: "opt_out",
      title: {
        en: "Energy Allocation Check",
        kr: "에너지 배분 점검",
      },
      subtitle: {
        en: "Identify where your mental load leaks each day.",
        kr: "하루 동안 정신 에너지가 새는 지점을 찾아봅니다.",
      },
      tags: {
        en: ["energy", "planning"],
        kr: ["에너지", "계획"],
      },
      instruction: {
        en: "Energy Check maps where your daily load leaks and asks you to follow the strongest drain signal.",
        kr: "에너지 체크는 하루의 부담이 새는 지점을 추적하고 가장 큰 소모 신호를 따라가게 합니다.",
      },
      durationM: 5,
      sharedC: 1445,
      engagedC: 10448,
    },
    {
      seq: 50,
      type: "test",
      variant: "creativity-profile",
      attribute: "unavailable",
      title: {
        en: "Creativity Profile (Soon)",
        kr: "창의성 프로필 (곧 공개)",
      },
      subtitle: {
        en: "Upcoming variant under editorial review.",
        kr: "에디토리얼 검토 중인 예정 변형입니다.",
      },
      tags: {
        en: ["coming-soon"],
        kr: ["출시예정"],
      },
      instruction: {
        en: "Creativity Profile preview is a placeholder for the upcoming editorial release.",
        kr: "창의성 프로필은 곧 공개될 에디토리얼 버전용 임시 안내문을 사용합니다.",
      },
      durationM: 4,
      sharedC: 0,
      engagedC: 0,
    },
    {
      seq: 60,
      type: "test",
      variant: "burnout-risk",
      attribute: "hide",
      title: {
        en: "Burnout Risk Signal",
        kr: "번아웃 위험 신호",
      },
      subtitle: {
        en: "Upcoming resilience check for recurring fatigue patterns.",
        kr: "반복되는 피로 패턴을 살피는 회복탄력성 체크가 곧 추가됩니다.",
      },
      tags: {
        en: ["coming-soon", "wellbeing"],
        kr: ["출시예정", "웰빙"],
      },
      instruction: {
        en: "Burnout Risk preview is a placeholder for the future recovery-signal test.",
        kr: "번아웃 위험 신호 카드는 향후 회복 신호 테스트를 위한 임시 안내문을 사용합니다.",
      },
      durationM: 4,
      sharedC: 0,
      engagedC: 0,
    },
    {
      seq: 70,
      type: "test",
      variant: "egtt",
      attribute: "available",
      title: {
        en: "Estrogen vs Testosterone Test",
        kr: "에겐-테토 성향 테스트",
      },
      subtitle: {
        en: "Temporarily removed from the public catalog while content is being reworked.",
        kr: "콘텐츠를 손보는 동안 퍼블릭 카탈로그에서는 잠시 숨겨둔 카드입니다.",
      },
      tags: {
        en: ["Estrogen", "Testosterone", "Hormone Test"],
        kr: ["에스트로겐", "테스토스테론", "호르몬테스트"],
      },
      instruction: {
        en: "Hidden Beta explains the private prototype track that is temporarily hidden from the public catalog.",
        kr: "히든 베타는 현재 퍼블릭 카탈로그에서 숨겨진 비공개 프로토타입 트랙을 설명합니다.",
      },
      durationM: 3,
      sharedC: 1,
      engagedC: 9,
    },
    {
      seq: 80,
      type: "blog",
      variant: "ops-handbook",
      attribute: "available",
      title: {
        en: "Operational Handbook for Stable Releases",
        kr: "안정적인 배포를 위한 운영 핸드북",
      },
      subtitle: {
        en: "This long-form article walks through incident posture, deployment sequencing, rollback ergonomics, observability baselines, and a practical checklist for reducing mean-time-to-detect and mean-time-to-recover. It intentionally includes extended prose so subtitle clamp and overflow rules can be validated against realistic payload sizes in both desktop and mobile layouts.",
        kr: "이 글은 사고 대응 태세를 어떻게 준비할지, 배포 순서를 어떤 원칙으로 고정할지, 롤백을 얼마나 빠르고 안전하게 수행할지, 그리고 관측 가능성 기준선을 어디까지 갖춰야 하는지를 긴 호흡으로 정리합니다. 또한 탐지 시간과 복구 시간을 줄이기 위한 실전 체크리스트를 함께 다루며, 데스크톱과 모바일 레이아웃 모두에서 subtitle clamp 와 overflow 규칙을 충분히 검증할 수 있도록 의도적으로 긴 문장 길이를 유지합니다.",
      },
      tags: {
        en: ["operations", "release"],
        kr: ["운영", "배포"],
      },
      durationM: 8,
      sharedC: 1920,
      engagedC: 42401,
    },
    {
      seq: 90,
      type: "blog",
      variant: "build-metrics",
      attribute: "available",
      title: {
        en: "Build Metrics That Actually Matter",
        kr: "정말 중요한 빌드 지표",
      },
      subtitle: {
        en: "A compact field guide to selecting build-time, test-time, and runtime quality indicators that correlate with user outcomes.",
        kr: "사용자 결과와 실제로 연결되는 빌드, 테스트, 런타임 품질 지표를 고르는 짧고 실용적인 가이드입니다.",
      },
      tags: {},
      durationM: 6,
      sharedC: 1180,
      engagedC: 21502,
    },
    {
      seq: 100,
      type: "blog",
      variant: "release-gate",
      attribute: "available",
      title: {
        en: "Designing a Reliable Release Gate",
        kr: "신뢰할 수 있는 릴리스 게이트 설계",
      },
      subtitle: {
        en: "A practical implementation strategy for layering static checks, deterministic state assertions, and e2e smoke contracts into one release boundary.",
        kr: "정적 검사, 결정적 상태 단언, e2e 스모크 계약을 하나의 릴리스 경계 안에 겹겹이 쌓아 넣는 실용적인 구현 전략입니다.",
      },
      tags: {
        en: ["qa", "gate"],
        kr: ["QA", "게이트"],
      },
      durationM: 5,
      sharedC: 890,
      engagedC: 17943,
    },
  ] as const;

export function getVariantRegistrySourceFixture(): VariantRegistrySourceCard[] {
  return variantRegistrySourceFixture.map((card) => structuredClone(card));
}
