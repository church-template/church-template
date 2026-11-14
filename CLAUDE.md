# CLAUDE.md

**교회 홈페이지 템플릿 (모노레포)** — 새 교회 사이트를 만들 때 복사하는 출발점. 교회별 레포 이름은 `<교회>-church`.

| 폴더 | 내용 | 지침 |
|---|---|---|
| `client/` | 프론트엔드 — Next.js(App Router) + TypeScript, pnpm | `client/CLAUDE.md`, `client/AGENTS.md` |
| `.claude/rules/` | 규칙 — `DESIGN.md`(`client/**`에 적용), `versioning-ci.md` | |

백엔드는 이 레포에 없다 — 여러 교회가 함께 쓰는 공용 서버 [church-backend](https://github.com/church-template/church-backend)이고, API 주소 앞부분 `/church/<교회키>`로 교회를 구분한다.

API 계약은 `client/docs/api-docs.json`(church-backend OpenAPI 사본). 백엔드 계약이 바뀌면 이 파일을 갱신한다.

## 공통 규칙

- **답변은 항상 한국어** — 코드/커맨드 제외.
- **커밋·푸시는 명시 요청 시에만**, Co-Authored-By 금지, **파일 삭제는 사용자 허락 후**.
- **커밋 형식** `<type>: <설명> #<이슈번호>` — 콜론 앞 공백 없음(projectops가 커밋 제목으로 버전 승격 폭을 정한다). 상세: `.claude/rules/versioning-ci.md`.
- **브랜치 흐름** — `develop`에서 작업, `develop` → `main` 릴리스 PR이 곧 배포.
- **교회별 값은 코드에 박지 않는다** — `client/src/constants/*`에 둔다.

## 명령어

```bash
# 프론트 (client/) — Node 22
cd client && pnpm install && pnpm dev
cd client && pnpm lint && pnpm test && pnpm build
```
