# TRIZONE

트라이애슬론 훈련 기록 및 소셜 플랫폼

## 기능

- **훈련 기록** — 수영 / 사이클 / 런 / 브릭(복합) 기록 입력 및 조회. 종목별 세부 항목(페이스, 고도, 파워, 수영장 유형 등) 지원
- **소셜 피드** — 팔로우 기반 피드, 좋아요 및 댓글, 닉네임 검색
- **랭킹** — 주간 / 월간 / 연간 × 종목별 점수 랭킹
- **클럽** — 클럽 생성 및 참여
- **마이페이지** — 내 기록 통계 및 프로필 관리

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| DB | SQLite (sql.js) |
| 인증 | JWT, bcryptjs |

## 시작하기

### 서버

```bash
cd server
npm install
npm start
# http://localhost:3001
```

### 클라이언트

```bash
cd client
npm install
npm run dev
# http://localhost:5173
```

## 프로젝트 구조

```
trizone/
├── client/
│   ├── src/
│   │   ├── pages/        # FeedPage, WorkoutPage, RankingPage, ClubPage, MyPage
│   │   ├── components/   # Layout
│   │   ├── hooks/        # useAuth
│   │   └── utils/        # api, helpers
│   └── vite.config.js
└── server/
    ├── routes/           # auth, workouts, ranking, club, users, social
    ├── db.js
    └── index.js
```
