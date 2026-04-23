/**
 * @generated 이 파일은 Google Sheets Sync 스크립트가 자동 생성한다.
 * 직접 편집하지 않는다. 편집이 필요하면 Sheets 원본을 수정하고 sync를 재실행한다.
 *
 * @see scripts/sync/sync-variant-registry.mjs (예정)
 * @see docs/req-test-plan.md ADR-D
 */
import type {VariantRegistry} from './types';

export const variantRegistryGenerated: VariantRegistry = {
  "landingCards": [
    {
      "attribute": "available",
      "subtitle": {
        "en": "Find your default deep-work cadence.",
        "kr": "내 기본 딥워크 리듬을 빠르게 찾아보세요."
      },
      "tags": {
        "en": [
          "Rapid",
          "ipsum",
          "Lorem"
        ],
        "kr": [
          "순식간에",
          "쌉가능",
          "어서와"
        ]
      },
      "test": {
        "instruction": {
          "en": "QMBTI opens with a quick personality rhythm check before you move into the main questions.",
          "kr": "QMBTI는 본 문항에 들어가기 전에 작업 리듬 성향을 짧게 점검하는 테스트입니다."
        },
        "meta": {
          "durationM": 3,
          "engagedC": 15236,
          "sharedC": 2184
        }
      },
      "title": {
        "en": "10m MBTI test",
        "kr": "10분컷 MBTI"
      },
      "type": "test",
      "variant": "qmbti"
    },
    {
      "attribute": "available",
      "subtitle": {
        "en": "LONGTOKENWITHOUTBREAKS_ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890_REPEAT_REPEAT_REPEAT",
        "kr": "집중기준점_LONGTOKENWITHOUTBREAKS_ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890_REPEAT_REPEAT_REPEAT"
      },
      "tags": {
        "en": [
          "workflow",
          "ipsum lorem long tag",
          "Lorem long tag example"
        ],
        "kr": [
          "워크플로",
          "ipsum lorem long tag",
          "Lorem long tag example here"
        ]
      },
      "test": {
        "instruction": {
          "en": "Rhythm B asks you to compare interruption patterns and pacing signals across your work blocks.",
          "kr": "리듬 B는 작업 블록마다 방해 패턴과 페이스 신호를 비교하도록 구성된 테스트입니다."
        },
        "meta": {
          "durationM": 4,
          "engagedC": 8392,
          "sharedC": 982
        }
      },
      "title": {
        "en": "Focus Rhythm B Long String example here goes ipsum lorem varaint string edge case here example",
        "kr": "집중 리듬 B Long String example here goes ipsum lorem varaint string edge case here example"
      },
      "type": "test",
      "variant": "rhythm-b"
    },
    {
      "attribute": "debug",
      "subtitle": {
        "en": "Internal reference card for QA and snapshots.",
        "kr": "QA와 스냅샷 검증을 위한 내부 참조 카드입니다."
      },
      "tags": {
        "en": [],
        "kr": []
      },
      "test": {
        "instruction": {
          "en": "Debug Sample exists only for internal QA and uses a deterministic planning prompt.",
          "kr": "디버그 샘플은 내부 QA 전용이며 결정형 계획 선호를 확인하는 프롬프트를 사용합니다."
        },
        "meta": {
          "durationM": 2,
          "engagedC": 640,
          "sharedC": 74
        }
      },
      "title": {
        "en": "Sample Debug Variant",
        "kr": "샘플 디버그 변형"
      },
      "type": "test",
      "variant": "debug-sample"
    },
    {
      "attribute": "opt_out",
      "subtitle": {
        "en": "Identify where your mental load leaks each day.",
        "kr": "하루 동안 정신 에너지가 새는 지점을 찾아봅니다."
      },
      "tags": {
        "en": [
          "energy",
          "planning"
        ],
        "kr": [
          "에너지",
          "계획"
        ]
      },
      "test": {
        "instruction": {
          "en": "Energy Check maps where your daily load leaks and asks you to follow the strongest drain signal.",
          "kr": "에너지 체크는 하루의 부담이 새는 지점을 추적하고 가장 큰 소모 신호를 따라가게 합니다."
        },
        "meta": {
          "durationM": 5,
          "engagedC": 10448,
          "sharedC": 1445
        }
      },
      "title": {
        "en": "Energy Allocation Check",
        "kr": "에너지 배분 점검"
      },
      "type": "test",
      "variant": "energy-check"
    },
    {
      "attribute": "unavailable",
      "subtitle": {
        "en": "Upcoming variant under editorial review.",
        "kr": "에디토리얼 검토 중인 예정 변형입니다."
      },
      "tags": {
        "en": [
          "coming-soon"
        ],
        "kr": [
          "출시예정"
        ]
      },
      "test": {
        "instruction": {
          "en": "Creativity Profile preview is a placeholder for the upcoming editorial release.",
          "kr": "창의성 프로필은 곧 공개될 에디토리얼 버전용 임시 안내문을 사용합니다."
        },
        "meta": {
          "durationM": 4,
          "engagedC": 0,
          "sharedC": 0
        }
      },
      "title": {
        "en": "Creativity Profile (Soon)",
        "kr": "창의성 프로필 (곧 공개)"
      },
      "type": "test",
      "variant": "creativity-profile"
    },
    {
      "attribute": "hide",
      "subtitle": {
        "en": "Upcoming resilience check for recurring fatigue patterns.",
        "kr": "반복되는 피로 패턴을 살피는 회복탄력성 체크가 곧 추가됩니다."
      },
      "tags": {
        "en": [
          "coming-soon",
          "wellbeing"
        ],
        "kr": [
          "출시예정",
          "웰빙"
        ]
      },
      "test": {
        "instruction": {
          "en": "Burnout Risk preview is a placeholder for the future recovery-signal test.",
          "kr": "번아웃 위험 신호 카드는 향후 회복 신호 테스트를 위한 임시 안내문을 사용합니다."
        },
        "meta": {
          "durationM": 4,
          "engagedC": 0,
          "sharedC": 0
        }
      },
      "title": {
        "en": "Burnout Risk Signal",
        "kr": "번아웃 위험 신호"
      },
      "type": "test",
      "variant": "burnout-risk"
    },
    {
      "attribute": "available",
      "subtitle": {
        "en": "Temporarily removed from the public catalog while content is being reworked.",
        "kr": "콘텐츠를 손보는 동안 퍼블릭 카탈로그에서는 잠시 숨겨둔 카드입니다."
      },
      "tags": {
        "en": [
          "Estrogen",
          "Testosterone",
          "Hormone Test"
        ],
        "kr": [
          "에스트로겐",
          "테스토스테론",
          "호르몬테스트"
        ]
      },
      "test": {
        "instruction": {
          "en": "Hidden Beta explains the private prototype track that is temporarily hidden from the public catalog.",
          "kr": "히든 베타는 현재 퍼블릭 카탈로그에서 숨겨진 비공개 프로토타입 트랙을 설명합니다."
        },
        "meta": {
          "durationM": 3,
          "engagedC": 9,
          "sharedC": 1
        }
      },
      "title": {
        "en": "Estrogen vs Testosterone Test",
        "kr": "에겐-테토 성향 테스트"
      },
      "type": "test",
      "variant": "egtt"
    },
    {
      "attribute": "available",
      "blog": {
        "meta": {
          "durationM": 8,
          "engagedC": 42401,
          "sharedC": 1920
        }
      },
      "subtitle": {
        "en": "This long-form article walks through incident posture, deployment sequencing, rollback ergonomics, observability baselines, and a practical checklist for reducing mean-time-to-detect and mean-time-to-recover. It intentionally includes extended prose so subtitle clamp and overflow rules can be validated against realistic payload sizes in both desktop and mobile layouts.",
        "kr": "이 글은 사고 대응 태세를 어떻게 준비할지, 배포 순서를 어떤 원칙으로 고정할지, 롤백을 얼마나 빠르고 안전하게 수행할지, 그리고 관측 가능성 기준선을 어디까지 갖춰야 하는지를 긴 호흡으로 정리합니다. 또한 탐지 시간과 복구 시간을 줄이기 위한 실전 체크리스트를 함께 다루며, 데스크톱과 모바일 레이아웃 모두에서 subtitle clamp 와 overflow 규칙을 충분히 검증할 수 있도록 의도적으로 긴 문장 길이를 유지합니다."
      },
      "tags": {
        "en": [
          "operations",
          "release"
        ],
        "kr": [
          "운영",
          "배포"
        ]
      },
      "title": {
        "en": "Operational Handbook for Stable Releases",
        "kr": "안정적인 배포를 위한 운영 핸드북"
      },
      "type": "blog",
      "variant": "ops-handbook"
    },
    {
      "attribute": "available",
      "blog": {
        "meta": {
          "durationM": 6,
          "engagedC": 21502,
          "sharedC": 1180
        }
      },
      "subtitle": {
        "en": "A compact field guide to selecting build-time, test-time, and runtime quality indicators that correlate with user outcomes.",
        "kr": "사용자 결과와 실제로 연결되는 빌드, 테스트, 런타임 품질 지표를 고르는 짧고 실용적인 가이드입니다."
      },
      "tags": {
        "en": [],
        "kr": []
      },
      "title": {
        "en": "Build Metrics That Actually Matter",
        "kr": "정말 중요한 빌드 지표"
      },
      "type": "blog",
      "variant": "build-metrics"
    },
    {
      "attribute": "available",
      "blog": {
        "meta": {
          "durationM": 5,
          "engagedC": 17943,
          "sharedC": 890
        }
      },
      "subtitle": {
        "en": "A practical implementation strategy for layering static checks, deterministic state assertions, and e2e smoke contracts into one release boundary.",
        "kr": "정적 검사, 결정적 상태 단언, e2e 스모크 계약을 하나의 릴리스 경계 안에 겹겹이 쌓아 넣는 실용적인 구현 전략입니다."
      },
      "tags": {
        "en": [
          "qa",
          "gate"
        ],
        "kr": [
          "QA",
          "게이트"
        ]
      },
      "title": {
        "en": "Designing a Reliable Release Gate",
        "kr": "신뢰할 수 있는 릴리스 게이트 설계"
      },
      "type": "blog",
      "variant": "release-gate"
    }
  ],
  "testPreviewPayloadByVariant": {
    "burnout-risk": {
      "answerChoiceA": {
        "en": "Option A",
        "kr": "옵션 A"
      },
      "answerChoiceB": {
        "en": "Option B",
        "kr": "옵션 B"
      },
      "previewQuestion": {
        "en": "Placeholder preview question for upcoming card.",
        "kr": "공개 예정 카드를 위한 임시 미리보기 질문입니다."
      }
    },
    "creativity-profile": {
      "answerChoiceA": {
        "en": "Option A",
        "kr": "옵션 A"
      },
      "answerChoiceB": {
        "en": "Option B",
        "kr": "옵션 B"
      },
      "previewQuestion": {
        "en": "Placeholder preview question for upcoming card.",
        "kr": "공개 예정 카드를 위한 임시 미리보기 질문입니다."
      }
    },
    "debug-sample": {
      "answerChoiceA": {
        "en": "Deterministic",
        "kr": "정해진 흐름"
      },
      "answerChoiceB": {
        "en": "Exploratory",
        "kr": "탐색형 접근"
      },
      "previewQuestion": {
        "en": "Do you prefer deterministic or exploratory planning?",
        "kr": "계획은 정해진 흐름과 탐색형 접근 중 어느 쪽이 더 편한가요?"
      }
    },
    "egtt": {
      "answerChoiceA": {
        "en": "A lot",
        "kr": "많다"
      },
      "answerChoiceB": {
        "en": "Not at all",
        "kr": "없다"
      },
      "previewQuestion": {
        "en": "I'm interested in making me charming...",
        "kr": "패션이나 나를 꾸미는 일에 관심이"
      }
    },
    "energy-check": {
      "answerChoiceA": {
        "en": "Context switching",
        "kr": "잦은 맥락 전환"
      },
      "answerChoiceB": {
        "en": "Long meetings",
        "kr": "긴 회의"
      },
      "previewQuestion": {
        "en": "Which block drains your energy the most?",
        "kr": "어떤 시간대가 에너지를 가장 많이 소모시키나요?"
      }
    },
    "qmbti": {
      "answerChoiceA": {
        "en": "Early morning blocks",
        "kr": "처음 보는 친구랑도 금방 친해져"
      },
      "answerChoiceB": {
        "en": "Late-night sprints",
        "kr": "원래 잘 아는 친구랑 주로 어울려"
      },
      "previewQuestion": {
        "en": "🎉 At parties or birthday celebrations,",
        "kr": "🎉 파티나 생일잔치에 가면 나는"
      }
    },
    "rhythm-b": {
      "answerChoiceA": {
        "en": "Almost never",
        "kr": "거의 없다 동해물과 백두산이 마르고 닳도록 긴 응답 예시 여기"
      },
      "answerChoiceB": {
        "en": "Multiple times each hour",
        "kr": "한 시간에도 여러 번 있다 동해물과 백두산이 마르고 닳도록 긴 응답 예시 여기"
      },
      "previewQuestion": {
        "en": "How often do interruptions break your pace? How often do interruptions break your pace? How often do interruptions break your pace?",
        "kr": "방해가 흐름을 끊는 빈도는 어느 정도인가요? 방해가 흐름을 끊는 빈도는 어느 정도인가요? 방해가 흐름을 끊는 빈도는 어느 정도인가요?"
      }
    }
  }
} as const;
