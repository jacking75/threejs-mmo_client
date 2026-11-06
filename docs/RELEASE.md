# 공개 빌드와 검증

## 재현 환경

Node 22.14 이상(권장 24), npm, Google Chrome을 사용한다.
Windows에서 로컬 검증한다. 다른 OS의 지원을 검증 없이 주장하지 않는다.
검증 명령은 로컬에서 수행한다. CI는 제공하지 않는다.

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

Vite 8, Vitest 5, ESLint 10, typescript-eslint 8을 사용한다.
전이 의존성 minimatch는 11.0.1 이상을 override한다.
상위 도구가 이전 minimatch 범위를 유지하고 있어 보안 수정 버전을 명시적으로 사용한다.
린트·테스트·빌드로 현재 패턴 사용의 호환성을 확인했다. 상위 의존성이 갱신되면 override 제거를 검토한다.
의존성을 변경할 때 `npm audit`와 로컬 검사를 다시 수행한다.
[Vitest 마이그레이션 안내](https://vitest.dev/guide/migration/)에 맞춰 Node 최소 버전도 올렸다.

## 정적 배포

서버 없이 파일을 직접 열려면 `npm run build:standalone`으로 만든 `dist-standalone/index.html`을 사용한다.
기본 게임의 JS·CSS·GLB가 하나의 HTML에 포함되며 실행할 PC에는 WebGL 2 브라우저만 필요하다.
Node.js/npm은 제작 단계에서만 사용한다. 개발 도구와 네트워크 실습은 포함하지 않는다.
`npm run test:standalone`은 Chrome의 네트워크를 끄고 file URL에서 GLB 표시·이동·공격·장착·새로고침 복원을 검사한다.
게임용 생성 HTML은 Git에서 제외하며 소스 변경 후 다시 빌드한다. 다른 PC에 전달할 때는 이 HTML 한 개를 복사한다.

갤러리는 `npm run build:gallery`로 `docs/gallery.html`을 별도로 생성하고 Git으로 관리한다.
저장소를 받은 PC에서는 빌드 없이 이 파일을 열 수 있다. 갤러리 소스를 변경하면 재생성한 HTML도 함께 커밋한다.
705종 리소스의 코드·스타일·캐릭터 GLB를 포함하며 서버 없이 카테고리·검색·3D 미리보기를 제공한다.
`npm run test:gallery`는 HTML 하나를 다른 폴더로 복사해 Chrome 오프라인 모드에서 검사한다.
게임과 갤러리 빌드는 서로의 HTML을 덮어쓰지 않는다. 갤러리 HTML에 편집기 호스트나 네트워크 API는 포함하지 않는다.

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
[Vite 정적 배포 안내](https://vite.dev/guide/static-deploy.html)를 참고한다.
