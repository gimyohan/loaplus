# LoaPlus

로스트아크 원정대의 숙제를 위젯 대시보드로 관리하고, 보상과 골드 흐름을 기록하는 웹 서비스입니다.

**사이트: <https://loaplus.com>**

![원정대 대시보드](frontend/public/screenshots/dashboard-main.jpg)

## 주요 기능

- **원정대 대시보드**: 캐릭터마다 위젯을 원하는 순서로 쌓아 숙제판을 구성합니다. 일일·주간 숙제는 초기화 시각에 맞춰 자동으로 리셋됩니다.
- **콘텐츠 위젯**
  - 레이드 (관문별 골드, 더보기 보상, 골드 획득 지정)
  - 쿠르잔 전선, 가디언 토벌 (휴식 게이지 반영)
  - 낙원, 에브니 큐브, 할의 모래시계
  - 어빌리티 스톤 세공 확률 계산
- **자유 위젯**: 텍스트, 체크박스(요일별 초기화), 카운터, 이미지, 링크 아이콘
- **배치 템플릿**: 위젯 배치를 코드로 복사해 다른 캐릭터에 그대로 붙여넣을 수 있습니다.
- **원정대 관리**: 로스트아크 Open API로 캐릭터와 장비 정보를 불러오고, 드래그로 순서를 바꿉니다.
- **기록과 통계**: 숙제를 완료할 때 얻은 보상이 로그로 남고, 캐릭터별 수입 흐름과 비중을 차트로 봅니다.
- **거래소 시세** (프리미엄): 야간 배치로 모은 일·주·월 단위 시세를 보여줍니다.

| 원정대 | 기록 | 통계 |
| --- | --- | --- |
| ![원정대 목록](frontend/public/screenshots/roster-list.jpg) | ![기록 목록](frontend/public/screenshots/logs-list.jpg) | ![수입 흐름](frontend/public/screenshots/statistics-flow.jpg) |

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프론트엔드 | React 19, TypeScript, Vite, Tailwind CSS |
| 백엔드 | Node.js 22, Fastify 5, Prisma 6, Zod |
| 데이터베이스 | PostgreSQL 16 |
| 인증 | Google 로그인 (ID 토큰 검증 후 서명된 세션 쿠키 발급) |
| 배포 | GitHub Actions → AWS EC2 (Docker, nginx) |

## 저장소 구조

```
.
├── frontend/          # React SPA
│   ├── src/components # 대시보드, 위젯, 원정대, 기록, 통계, 시세 화면
│   ├── src/lib        # API 클라이언트, 위젯·초기화 로직
│   └── public/        # 아이콘, 스크린샷
├── backend/           # Fastify API 서버
│   ├── src/routes     # REST 라우트
│   ├── src/lib        # 보상 카탈로그, 초기화 규칙, 외부 API 연동
│   ├── src/jobs       # 거래소 시세 야간 배치
│   └── prisma/        # 스키마와 마이그레이션
└── .github/workflows  # CI 및 배포
```

## 로컬에서 실행하기

필요한 것: Node.js 22, Docker, Google OAuth 클라이언트 ID (승인된 JavaScript 원본에 `http://localhost:5173` 추가)

### 1. 데이터베이스

```bash
cd backend
docker compose up -d
```

`backend/docker-compose.yml`이 `localhost:5432`에 PostgreSQL을 띄웁니다 (계정·DB 이름 모두 `loaplus`).

### 2. 백엔드

`backend/.env.example`을 `backend/.env`로 복사한 뒤 값을 채웁니다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | 예: `postgresql://loaplus:loaplus@localhost:5432/loaplus?schema=public` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `SESSION_SECRET` | 세션 쿠키 서명용 임의 문자열 |
| `LOSTARK_KEY_ENCRYPTION_SECRET` | 사용자 API 키 암호화용 32바이트 hex (64자) |
| `CORS_ORIGINS` | 선택. 기본값 `http://localhost:5173` |
| `LOSTARK_SHARED_API_KEY` | 선택. 개인 키를 등록하지 않은 사용자가 대신 쓰는 공용 키 |
| `LOSTARK_BATCH_API_KEY` | 선택. 비워두면 거래소 시세 야간 배치가 꺼집니다 |

시크릿 값은 아래 명령으로 만들 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
npm install
npx prisma migrate dev
npm run dev
```

API 서버는 `http://localhost:4000`에서 뜨고, Swagger UI는 `http://localhost:4000/docs`에서 볼 수 있습니다.

### 3. 프론트엔드

`frontend/.env.local`을 만듭니다.

```
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=<Google OAuth 클라이언트 ID>
```

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173`에서 열립니다.

로스트아크 캐릭터 정보를 불러오려면 [로스트아크 Open API](https://developer-lostark.game.onstove.com/)에서 발급받은 키를 앱의 설정 화면에 등록하거나, 백엔드에 `LOSTARK_SHARED_API_KEY`를 넣어 주세요.

## 테스트

```bash
cd backend
npm test
```

보상 카탈로그, 초기화 규칙, 시세 집계 같은 순수 로직을 Vitest로 검사합니다. 같은 검사가 CI에서도 돌고, `main`에 push하면 테스트와 빌드를 통과한 뒤 자동으로 배포됩니다.

## 참고

- 버전은 `frontend/package.json`과 `backend/package.json`의 `version`, 그리고 git 태그 `vX.Y.Z`를 항상 같게 유지합니다.
- 코드 주석에 나오는 `docs/*.typ`는 이 저장소에 포함되지 않은 설계 문서입니다.

## 고지

LoaPlus는 개인이 만든 팬 서비스이며 Smilegate RPG와 관련이 없습니다. 로스트아크 및 게임 내 아이콘·이미지의 저작권은 Smilegate RPG에 있습니다.
