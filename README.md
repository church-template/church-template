<div align="center">

<h1>교회 홈페이지 템플릿</h1>

교회 홈페이지를 새로 만들 때 복사해서 쓰는 풀스택 템플릿 — 프론트엔드(`client/`)와 백엔드(`server/`)를 한 레포에 둔 모노레포

</div>

## 구조

| 폴더 | 내용 | 안내 |
|---|---|---|
| [`client/`](client) | Next.js 16 + TypeScript 프론트엔드 (pnpm, Node 22) | [client/README.md](client/README.md) |
| [`server/`](server) | Spring Boot 4 + PostgreSQL 백엔드 (Gradle, Java 21, Docker Compose) | [server/README.md](server/README.md) |
| `.github/` | projectops 자동화(버전·릴리스·이슈) + `CLIENT-DEPLOY`·`SERVER-CI`·`SERVER-DEPLOY` | 아래 "배포" |
| `.claude/` | AI 에이전트용 명령어·규칙 (`DESIGN.md`는 client, 나머지 규칙은 server에 적용) | [CLAUDE.md](CLAUDE.md) |

이 템플릿의 콘텐츠는 가상의 **예시교회** 값이고, 사진·영상은 회색 placeholder입니다.

## 빠른 시작 (로컬)

```bash
# 1) 백엔드 — 로컬 오버라이드를 만든 뒤(server/docs/setup-dev.md 1장) 기동하면 dev 시드가 들어간다
cd server
docker compose up -d --build          # http://localhost:8080 · Swagger /docs/swagger-ui.html

# 2) 프론트
cd ../client
pnpm install
cp .env.example .env                  # NEXT_PUBLIC_API_BASE=http://localhost:8080
pnpm dev                              # http://localhost:3000
```

시드 계정(dev 전용): 관리자 `01090000001` / `church1234!`. 시드 날짜는 처음 시드되는 날 기준의 상대값이라 항상 최근 설교·다가오는 일정이 보입니다.

## 새 교회 만들기

1. GitHub에서 **Use this template** → 새 레포 이름은 `<교회>-church` (예: `example-church`).
2. 교회 정보 바꾸기 — 프론트 상수 파일:

   | 파일 | 바꿀 것 |
   |---|---|
   | `client/src/constants/church.ts` | 교회명·정식명·도메인·소개문·주소·전화·이메일·히어로 카피·기본 설교자 |
   | `client/src/constants/content.ts` | 소개·비전·연혁·목회자 인사말·교회 사진 목록·오시는 길·예배 시간 |
   | `client/src/constants/departments.ts` | 부서 소개·연락처·모임 장소 |
   | `client/src/constants/navigation.ts` | 메뉴 |

3. 사진 바꾸기 — `client/public/`의 같은 경로에 실제 사진을 넣는다. 비율이 코드에 박힌 파일은 상수도 함께 고친다:

   | 파일 | 비율 상수 |
   |---|---|
   | `hero.mp4`, `hero-poster.jpeg` | `HERO_POSTER_ASPECT` (church.ts) |
   | `collage-1~4.jpeg` | `COLLAGE_TILES[].aspect` (church.ts) |
   | `pastor.jpg` | `PASTOR.image.aspect` (content.ts) |
   | `onlyLogo.png`, `icon-*.png`, `og-image.jpg` | 로고·PWA 아이콘·공유 이미지 (크기 그대로) |
   | `photos/`, `history/`, `dept/`, `location/` | 상수의 경로만 맞추면 됨 |

4. 디자인 — 브랜드 색은 `.claude/rules/DESIGN.md` → `client/src/app/globals.css`의 primary 토큰 4개만 바꾸면 된다.
5. 백엔드 — 교회별 값은 전부 `server/.env` (서버에만 둔다). 절차: [server/docs/setup-new-church.md](server/docs/setup-new-church.md), 서버 준비: [server/docs/deploy-server-setup.md](server/docs/deploy-server-setup.md).
6. 배포 연결 — 아래 Secrets를 실제 값으로 등록하고, Vercel 프로젝트를 만든다(Root Directory는 비워 둔다 — 배포 워크플로가 `client/`에서 CLI를 실행한다).

## Secrets

템플릿 레포에는 형식만 맞춘 목값(`your-...`)이 들어 있습니다. 새 교회 레포에서 실제 값으로 바꿉니다.

| 이름 | 쓰는 곳 | 어디서 |
|---|---|---|
| `VERCEL_TOKEN` | CLIENT-DEPLOY | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | CLIENT-DEPLOY | `client/`에서 `vercel link` 후 `.vercel/project.json`의 `orgId`·`projectId` |
| `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` | SERVER-DEPLOY | 서버 주소·계정·배포용 SSH 개인키 ([deploy-server-setup.md](server/docs/deploy-server-setup.md)) |
| `_GITHUB_PAT_TOKEN` (선택) | projectops | 릴리스 자동 머지 후 후속 워크플로(배포)가 확실히 돌게 한다. org 시크릿으로 두면 레포마다 등록할 필요 없음 |

`DEPLOY_HOST`가 비어 있으면 서버 배포는 건너뛰고 이미지 push까지만 합니다. 이 템플릿 레포(`church-template/church-template`) 자체에서는 배포 워크플로가 실행되지 않습니다.

## 브랜치·배포

- 작업은 `develop`에서 한다 (작업 브랜치 → `develop` PR).
- `develop` → `main` 릴리스 PR을 열면 projectops가 커밋 제목으로 버전을 정하고(`feat:` = minor, 그 외 patch) 릴리스 노트를 쓴 뒤 자동 머지·태그한다.
- `main`에 `client/**` 변경 → Vercel 배포, `server/**` 변경 → GHCR 이미지 + SSH 배포.
- 버전은 루트 `version.yml` 하나로 `client`·`server`가 공유한다. 직접 고치지 않는다.

자동화 도구: [projectops](https://github.com/Cassiiopeia/projectops) 4.70.0 — 설정은 `version.yml`, 안내는 [PROJECTOPS-SETUP-GUIDE.md](PROJECTOPS-SETUP-GUIDE.md).

## License

[MIT](LICENSE)

---

<!-- AUTO-VERSION-SECTION: DO NOT EDIT MANUALLY -->
## 최신 버전 : v0.1.0 (2026-10-21)
