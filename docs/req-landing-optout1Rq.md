대부분 잘 구현되었으나, 아래 몇 가지 수정사항을 추가로 반영하겠습니다.

### instruction 메시지 조합 처리

각 test variant마다 별도로 정의된 instruction 메시지를 사용합니다.  
즉, **variant별 instruction 메시지는 서로 달라야 하며**, 각 variant에 대응하는 고유 메시지를 기준으로 UI를 구성하세요.

그 다음 아래 규칙에 따라 처리합니다.

중요:
- 아래 내용은 **가능한 케이스를 설명하기 위한 나열**일 뿐입니다.
- 따라서 아래 나열 순서나 케이스 목록 그대로 `if` 조건을 1:1로 복붙하듯 구현해서는 안 됩니다.
- **ingress type / consent state / card type**을 기준으로 분기 규칙을 일반화하고, 중복 없는 구조로 설계하세요.
- 구현 시에는 UI 문구 조합 규칙, CTA 구성 규칙, CTA 클릭 결과를 분리해서 관리할 수 있는 구조를 우선하세요.

#### 케이스 정의

- landing ingress & opt_in > available 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}` & `[Start]`

- landing ingress & opt_in > opt_out 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}` & `[Start]`

- landing ingress & opt_out > available 테스트  
  : 논리적/물리적으로 진입 불가  
  (랜딩 페이지에서 노출되지 않아야 하며, 일반 사용자 플로우상 진입 불가)

- landing ingress & opt_out > opt_out 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}` & `[Start]`

- 딥링크 유입 & opt_in > available 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}` & `[Start]`

- 딥링크 유입 & opt_in > opt_out 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}` & `[Start]`

- 딥링크 유입 & opt_out > available 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}`  
  + horizontal line (섹션 정보 grouping 목적)  
  + `"This test is only available to users who have agreed. We’re sorry, but if you keep your current preference, you will not be able to take this test."`  
  & `[Accept All and Start] / [Keep Current Preference]`  
  (`[Keep Current Preference]` 클릭 시 홈 화면으로 이동)

- 딥링크 유입 & opt_out > opt_out 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}` & `[Start]`

- 딥링크 유입 & Unknown > available 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}`  
  + horizontal line (섹션 정보 grouping 목적)  
  + `"For a better experience, please agree to the terms to proceed with the test."`  
  & `[Accept All and Start] / [Deny and Abandon]`  
  (`[Deny and Abandon]` 클릭 시 홈 화면으로 이동)

- 딥링크 유입 & Unknown > opt_out 테스트  
  : `{해당 variant의 사전 정의 instruction 메시지}`  
  + horizontal line (섹션 정보 grouping 목적)  
  + `"For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing."`  
  & `[Accept All and Start] / [Deny and Start]`  
  (`[Deny and Start]` 클릭 시 테스트 Q1으로 바로 시작)

---

### Consent UI 제거

위 변경된 규칙에 따라, **딥링크 유입 시 test 페이지 하단에 표시하던 Consent UI는 완전히 제거합니다.**
앞으로 **test 페이지에서 Consent UI가 표시되는 케이스는 절대 없어야 합니다.**

이는 단순 비노출이 아니라, 관련 분기/렌더링/상태 의존성까지 포함하여 **test 페이지 기준으로 완전히 제거**하는 방향을 우선 검토하세요.

---

### variant별 instruction dummy 메시지

각 테스트 variant마다 `{사전에 정의한 instruction 메시지}` 는 현 시점에서는 dummy 값으로 우선 정의합니다.  
추후 별도 업데이트 예정이므로, 지금은 **variant별로 서로 구분 가능한 dummy instruction 메시지**를 저장/연결하세요.

중요:
- e2e 테스트에서 검증할 수 있도록 **모든 variant에 동일한 instruction 메시지를 사용하면 안 됩니다.**
- 반드시 **variant마다 서로 다른 dummy instruction**을 사용해야 합니다.
- e2e에서는 CTA뿐 아니라 **variant별 instruction 메시지가 올바르게 노출되는지까지 함께 검증**해야 합니다.

---

### 구현 정리 원칙

이번 변경은 기존 대규모 수정 및 e2e 테스트와 깊게 연결되어 있으므로, **관련 코드를 단순 땜질식으로 수정하지 말고 구조적으로 정리**하세요.

현재 프로젝트는 아직 극초기 단계이므로, 필요하다면 관련 파일을 완전히 삭제하고 처음부터 다시 구현하는 것도 충분히 허용됩니다.

가장 중요한 원칙은 다음과 같습니다.

- 변경 전 요구사항을 전제로 한 분기/컴포넌트/상태/문구/테스트 흔적이 남지 않아야 합니다.
- 특히 test 페이지 하단 Consent UI, 기존 CTA 계약, 기존 deep-link 처리 규칙 등은 새 규칙으로 완전히 치환되어야 합니다.
- 구현 완료 후에는 **이전 요구사항 기반 동작이 더 이상 남아 있지 않다**는 점이 코드와 테스트에서 명확해야 합니다.

---

### 작업 시 요구사항

- 현재 코드베이스를 기준으로 관련 구현을 정리하세요.
- 필요한 경우 단순 수정이 아니라 재구현 수준의 정리를 수행하세요.
- 중복 분기 대신 재사용 가능한 판정 규칙/메시지 조합 구조/CTA 액션 구조를 우선하세요.
- e2e 테스트도 반드시 새 규칙에 맞게 함께 정리하세요.
- 구현 후에는, 새 규칙 기준으로 남는 진입 케이스와 제거된 이전 규칙이 무엇인지 명확히 드러나야 합니다.
