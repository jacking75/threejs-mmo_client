# 개발·학습 안내

## 소스 읽기 순서

1. `src/main.ts`, `src/ClientApp.ts`: 앱 모드 선택과 화면 수명주기.
2. `src/domain/character.ts`, `catalog.ts`, `equipment.ts`, `save.ts`: 캐릭터 생성 → 장착 → 저장.
3. `src/ui/InventoryPanel.ts` → `src/game/GameApp.ts` → `src/render/EquipmentRenderer.ts`: UI 액션 → 정본 상태 → 렌더링.
4. `src/game/input.ts`, `movement.ts`, `collision.ts`, `animationState.ts`: 입력과 프레임 시간, 충돌, 공격 우선순위.
5. `src/render/ThirdPersonCamera.ts`, `AvatarRenderer.ts`와 [아바타 계약](img2threejs/RUNTIME_ADAPTER.md): 좌표계·소켓·애니메이션.

## 작은 실습

각 과제는 독립적으로 수행하고 관련 테스트와 브라우저 화면으로 확인한다.

| 과제 | 확인할 결과 |
| --- | --- |
| 카메라 거리/FOV 조정 | 줌 양끝에서 캐릭터·장비가 잘리지 않고 이동 방향을 읽을 수 있다 |
| 기존 검 팩토리와 카탈로그를 따라 검 1종 추가 | 소유·슬롯 검증, 변경 적용, 공격 중 부착, 저장 복원이 모두 동작한다 |
| 공격 지속 시간 조정 | 이동을 누른 채 공격해도 종료 전에 run으로 덮어쓰지 않는다 |
| 잘못된 저장 데이터 복구 살펴보기 | 잘못된 JSON·알 수 없는 아이템이 앱 시작을 중단시키지 않는다 |
| 리소스 생성·폐기 측정 | 로비/필드 반복 전환과 장비 교체 후 객체·메모리가 계속 증가하지 않는다 |

별도 [네트워크 실습](NETWORK_LAB.md)을 제공한다. 기본 게임은 오프라인으로 유지한다.
구체적인 장비 실습은 [클라이언트 데이터 흐름](CLIENT_FLOW.md), 측정 과제는 [성능 실험](PERFORMANCE.md)을 참고한다.

## 검사

`npm ci` 후 `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`를 실행한다.
E2E 설정은 `playwright.config.ts`이고 `channel: "chrome"`을 사용하므로 Google Chrome 설치가 필요하다.
테스트 서버는 127.0.0.1:4173의 `editor-test` 모드를 사용한다. 같은 포트에 일반 개발 서버를 켜 두었다면 먼저 종료한다.
편집기 E2E는 fake ACP를 사용하므로 실제 에이전트 인증 없이 동작한다.

수동 검수는 새 캐릭터 생성 → 이동·달리기·카메라 조작 → 검·지팡이·활/의상 교체 → 이동 중 공격 → 새로고침 복원 순서로 한다.
콘솔 오류와 에셋 요청 실패도 확인한다. 자동 테스트 통과만으로 시각 품질을 확정하지 않는다.

## 로컬 Resource Editor

에셋을 보기만 할 때는 저장소에 포함된 [gallery.html](gallery.html)을 브라우저에서 연다. 설치나 빌드는 필요 없다.
705종 갤러리의 검색·미리보기·회전·확대는 서버 없이 동작한다. HTML 한 개만 다른 PC로 복사할 수 있다.
변경 사항은 `npm run build:gallery`로 반영하고 생성된 `docs/gallery.html`도 소스와 함께 커밋한다.
`npm run test:gallery`는 복사된 HTML을 Chrome 오프라인 모드에서 검사한다.
소스를 수정하며 확인하려면 기존 개발 서버의 `/?mode=gallery`를 사용한다.

`npm run dev:editor`로 로컬 편집기를 연다. 선택한 리소스의 소유 파일, 이름 있는 부품,
소켓·bounds·collider와 카메라를 확인할 수 있다. Transform 조작은 요청 문맥용 초안이다.

실제 에이전트 기능에는 로컬 Codex 실행·인증 환경과 패키지에 고정된 `codex-acp`가 필요하다.
`npm run smoke:acp`는 ACP 초기화 연결을 확인하며 소스 변경 완료를 검증하는 명령은 아니다.
`npm run dev:editor:test`는 실제 호출 없이 UI 흐름을 확인할 때 사용한다.

계획을 검토한 뒤 승인·적용하며 자동 커밋·자동 되돌리기는 하지 않는다.
호스트는 로컬 개발 전용이므로 외부 공개 서버로 배포하지 않는다.
브라우저는 동일 출처 로컬 호스트의 API를 사용하고 호스트가 ACP 프로세스를 실행한다.
선택한 리소스·부품·소유 소스 파일이 변경 범위를 정하며 요청별 승인은 한 번만 유효하다.
Three.js 미리보기의 변환 값은 요청 문맥용 초안이고, 실제 소스 변경은 적용 결과의 diff에서 확인한다.

## 공개 참고 자료

- [클라이언트 데이터 흐름](CLIENT_FLOW.md): 장비 변경과 저장·렌더링의 연결 및 실습.
- [아바타·장비 계약](img2threejs/RUNTIME_ADAPTER.md): 리그, 소켓, 축과 자원 해제.
- [에셋 안내](ASSETS.md): 포함된 에셋과 재생성 방법.
- [네트워크 실습](NETWORK_LAB.md), [성능 실험](PERFORMANCE.md): 로컬 재현 방법과 측정 해석.
- [공개 빌드](RELEASE.md): 독립 HTML 및 정적 웹 배포.

문서는 현재 사용법과 기술 계약을 설명한다. 내부 구현 계획·승인 이력·작업 로그는 공개 문서에 넣지 않는다.
