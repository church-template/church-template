# CLAUDE.md

**교회 홈페이지 템플릿 (모노레포)** — 새 교회 사이트를 만들 때 복사하는 출발점. 교회별 레포 이름은 `<교회>-church`.

| 폴더 | 내용 | 지침 |
|---|---|---|
| `client/` | 프론트엔드 — Next.js(App Router) + TypeScript, pnpm | `client/CLAUDE.md`, `client/AGENTS.md` |
| `server/` | 백엔드 — Spring Boot 4 + PostgreSQL, Gradle | `server/CLAUDE.md`, `server/AGENTS.md` |
| `.claude/rules/` | 규칙 — `DESIGN.md`는 `client/**`, 백엔드 규칙은 `server/**`에만 적용(frontmatter `paths`) | |

API 계약의 단일 진실은 `client/docs/api-docs.json`(백엔드 OpenAPI). 계약을 바꾸면 양쪽을 같은 PR에서 맞춘다.

## 공통 규칙

- **답변은 항상 한국어** — 코드/커맨드 제외.
- **커밋·푸시는 명시 요청 시에만**, Co-Authored-By 금지, **파일 삭제는 사용자 허락 후**.
- **커밋 형식** `<type>: <설명> #<이슈번호>` — 콜론 앞 공백 없음(projectops가 커밋 제목으로 버전 승격 폭을 정한다). 상세: `.claude/rules/versioning-ci.md`.
- **브랜치 흐름** — `develop`에서 작업, `develop` → `main` 릴리스 PR이 곧 배포.
- **교회별 값은 코드에 박지 않는다** — 프론트는 `client/src/constants/*`, 백엔드는 `.env`.

## 명령어

```bash
# 백엔드 (server/) — 로컬 기동·시드는 server/docs/setup-dev.md
cd server && docker compose up -d --build
cd server && ./gradlew build

# 프론트 (client/) — Node 22
cd client && pnpm install && pnpm dev
cd client && pnpm lint && pnpm test && pnpm build
```
