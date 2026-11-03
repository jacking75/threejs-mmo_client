# 공개 빌드와 검증

## 재현 환경

Node 22.14 이상(권장 24), npm, Google Chrome을 사용한다.
Windows에서 로컬 검증한다. 다른 OS의 지원을 검증 없이 주장하지 않는다.
사용자 요청에 따라 자동 CI는 제공하지 않는다. 명시적으로 요청받기 전에는 추가하거나 실행하지 않는다.

```sh
npm ci
npm audit --audit-level=moderate
npm run lint
npm run check:docs
npm run test
npm run build
npm run test:e2e
```

E2E 서버를 띄우기 전에 4173 포트의 개발 서버를 종료한다.
검증 명령은 셸 문자열 대신 `process.execPath`와 npm CLI의 argv로 실행해 Windows `.cmd` 실행 문제를 피한다.
브라우저 검사 실패 시 test-results에 trace/스크린샷을 보관한다.

## 의존성

공개 준비에서 Vite 8.3.5, Vitest 5.1.0, ESLint 10.14.0, typescript-eslint 8.72.1로 갱신했다.
나머지 전이 의존성을 수정하고 minimatch 11.0.1 이상을 override했다.
상위 도구가 이전 minimatch 범위를 유지하고 있어 보안 수정 버전을 명시적으로 사용한다.
린트·테스트·빌드로 현재 패턴 사용의 호환성을 확인했다. 상위 의존성이 갱신되면 override 제거를 검토한다.
2026-11-03 npm audit 결과는 0건이다. 결과는 고정 보증이 아니므로 의존성을 변경할 때 로컬에서 다시 검사한다.
[Vitest 마이그레이션 안내](https://vitest.dev/guide/migration/)에 맞춰 Node 최소 버전도 올렸다.

## 정적 배포

서버 없이 파일을 직접 열려면 `npm run build:standalone`으로 만든 `dist-standalone/index.html`을 사용한다.
기본 게임의 JS·CSS·GLB가 하나의 HTML에 포함되며 실행할 PC에는 WebGL 2 브라우저만 필요하다.
Node.js/npm은 제작 단계에서만 사용한다. 개발 도구와 네트워크 실습은 포함하지 않는다.
`npm run test:standalone`은 Chrome의 네트워크를 끄고 file URL에서 GLB 표시·이동·공격·장착·새로고침 복원을 검사한다.
생성 HTML은 Git에서 제외하며 소스 변경 후 다시 빌드한다. 다른 PC에 전달할 때는 이 HTML 한 개를 복사한다.

웹 주소로 배포하려면 아래 일반 빌드를 사용한다.

`npm run build`의 dist만 배포한다. 프로덕션에서는 갤러리·편집기·성능 계측·네트워크 실습을 제거한다.
로컬 ACP 호스트나 Vite 개발 서버를 공개 서버로 사용하지 않는다.
GLB URL은 `import.meta.env.BASE_URL`을 사용한다.

루트 배포는 기본 빌드를 사용한다. GitHub 프로젝트 페이지 등 하위 경로에서는 다음처럼 빌드한다.

```powershell
$env:BASE_PATH = '/threejs-mmo_client/'
npm run build
Remove-Item Env:BASE_PATH
npm run preview
```

POSIX 셸에서는 `BASE_PATH=/threejs-mmo_client/ npm run build`를 사용한다.
브라우저에서 생성→GLB 요청→필드→새로고침을 검사한다. `vite preview`는 로컬 확인용이다.
공개 데모는 `.github/workflows/pages.yml`을 수동 실행해 배포할 수 있다.
GitHub Settings → Pages의 Source를 GitHub Actions로 설정해야 한다.
실제 배포가 성공하기 전에는 README에 작동하는 데모라고 표시하지 않는다.
[Vite 정적 배포 안내](https://vite.dev/guide/static-deploy.html)를 참고한다.

## 이력과 로컬 자료

현재 트리의 docs_working은 Git에서 제외되지만 과거 커밋에는 제작 자료가 남는다.
2026-11-03 원격을 갱신한 뒤 모든 브랜치·태그의 11개 커밋에서 AWS/GitHub/OpenAI 키 및 개인키 헤더 패턴을 검색했고 일치 항목은 없었다.
패턴 검사는 모든 민감정보의 부재를 증명하지 않는다. 저장소는 이미 공개 상태였으며 파괴적인 이력 재작성은 하지 않았다.
라이선스 검토는 소유자가 문제가 없다고 확인해 생략했다. 코드 MIT LICENSE는 유지한다.
개인 제작 자료는 디스크에 보존하며 별도 백업 대상이다.
