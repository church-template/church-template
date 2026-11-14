# Versioning & CI (projectops)

이 레포는 [projectops](https://github.com/Cassiiopeia/projectops)로 버전·릴리스·이슈 자동화를 한다. 버전·CHANGELOG 파일은 **자동화 소유** — 손으로 고치면 워크플로와 충돌한다.

## 브랜치 흐름

- 작업은 `develop`(작업 브랜치 → `develop` PR). `main`은 릴리스 전용.
- `develop` → `main` 릴리스 PR을 열면 `PROJECT-COMMON-RELEASE-CHANGELOG`가 커밋 제목으로 버전을 정하고 릴리스 노트를 쓴 뒤 자동 머지·태그한다.
- `main`에 `client/**` 변경이 들어오면 `CLIENT-DEPLOY`(Vercel)가 돈다. 백엔드 배포는 church-backend 레포 소관이다.

## 손으로 고치지 말 것

- 루트 `version.yml` — 버전 단일 출처. `client/package.json`의 `version`은 `project_paths`로 동기화된다.
- `CHANGELOG.md`·`CHANGELOG.json`.
- `.github/workflows/PROJECT-*`·`.github/scripts/*`·`.github/.projectops/*` — projectops 관리. 업데이트는 `npx projectops@<버전> --mode workflows --force`.
- 직접 관리하는 워크플로는 `CLIENT-DEPLOY`뿐이다(projectops의 React CI/CICD는 모노레포 미지원이라 `excluded_workflows`로 제외).

## 커밋 제목 = 버전 승격 폭

`<type>: <설명> #<이슈번호>` — **콜론 앞에 공백을 두지 않는다.** `feat :`처럼 띄우면 projectops가 승격 폭을 못 읽어 항상 patch가 된다.
`feat:` = minor, `feat!:` = major, 그 외 = patch. 한국어로 쓴다. 커밋·푸시는 요청받았을 때만.
