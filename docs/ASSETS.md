# 에셋 안내

## 저장소에 포함되는 에셋

| 위치 | 용도·제작 경로 |
| --- | --- |
| `src/assets/` | 프로젝트의 절차형 TypeScript 팩토리. 캐릭터·장비·NPC·동물·몬스터·소품을 생성한다 |
| `public/assets/characters/female-warrior.glb` | 여성형 전사용 스키닝 모델. `tools/blender/build_female_warrior.py`로 생성한다 |
| `docs/screenshots/` | 로컬 앱 실행 화면을 캡처한 README용 이미지 |

현재 에셋은 학습용 임시 아트다. 여성형 전사 GLB에는 애니메이션 클립이 없으며 런타임의
절차 애니메이션을 사용한다. GLB 로딩·리그 검증 실패 시 절차형 아바타로 복구한다.
이름 있는 소켓, 그립 원점, 축, 폐기 규약은 [런타임 어댑터](img2threejs/RUNTIME_ADAPTER.md)를 참고한다.

## GLB 재생성

일반 앱 실행에는 Blender가 필요 없다. 모델을 다시 만들 때는 Blender의 Python 환경에서 실행한다.
기존 제작 기록의 버전은 Blender 5.2이며 다른 버전의 동일 결과는 검증하지 않았다.

```sh
blender --background --python tools/blender/build_female_warrior.py
```

`blender`가 PATH에 없다면 설치된 실행 파일 경로를 사용한다.
명령은 배포용 GLB를 덮어쓰고 로컬 `docs_working/blender/female-warrior.blend`를 생성한다.
GLB 변경 diff와 테스트, 생성·필드·장비 교체 화면을 검수한 뒤 반영한다.

## 출처 관리

코드의 라이선스는 루트 [LICENSE](../LICENSE)에 있다. 외부 에셋을 추가할 때는 배포 가능 여부,
원본 URL, 제작자, 라이선스, 수정 내역을 에셋별로 기록한다. 참조 이미지의 권리를 코드 라이선스로 대신하지 않는다.
현재 `userData`의 `docs_working/reference/...` 경로는 로컬 제작 참고용 메타데이터이며 런타임에서 가져오는 파일이 아니다.
해당 자료와 리뷰 점수는 현재 공개 트리에 포함하지 않는다. 과거 Git 이력에는 남아 있다.
2026-11-03 소유자가 라이선스 문제가 없다고 확인했으며 별도 라이선스 검토는 생략했다.
