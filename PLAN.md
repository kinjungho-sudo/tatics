# SRPG 모바일 게임 개발 계획서

> **프로젝트**: 오리지널 SRPG (파랜드 택틱스 레퍼런스)
> **개발사**: Co-Mind Works
> **기획·QA**: 정호
> **개발 주도**: Claude Code
> **최종 목표**: 파랜드 택틱스 수준의 모바일 SRPG
> **작성일**: 2026-04-02

---

## 1. 프로젝트 개요

### 핵심 컨셉
- **장르**: 격자 기반 전술 RPG (SRPG)
- **레퍼런스**: 파랜드 택틱스 1·2 (시스템 참고, 콘텐츠 오리지널)
- **플랫폼**: 모바일 (Phaser.js → Capacitor → Android/iOS)
- **수익 모델**: 무료 + 부분 유료화 (Pay-to-Win 배제)

### 핵심 재미 요소
1. **격자 기반 전술 이동** — 지형 활용, 포지셔닝 전략
2. **직업별 상성 시스템** — 원거리·근거리·지원 역할 분담
3. **캐릭터 성장** — 파랜드 스타일 50% 확률 성장, 레벨업 쾌감

---

## 2. 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 게임 엔진 | Phaser.js 3 | 2D 모바일 게임 최적화, Claude Code 지원 우수 |
| 빌드 도구 | Vite | 빠른 개발 서버, Capacitor 연동 용이 |
| 모바일 래핑 | Capacitor | iOS/Android 동시 지원 |
| 인증 | Supabase Auth (Google, GitHub OAuth) | 소셜 로그인 MVP |
| DB | Supabase PostgreSQL | profiles + save_slots 테이블 |
| 배포 (웹) | Vercel | SPA 라우팅 + 환경변수 관리 |
| AI 개발 | Claude Code | 주 개발 도구 |
| 배포 (앱) | Google Play → App Store | Phase 4 |

---

## 2-B. 백엔드 아키텍처 (2026-04-02 추가)

### DB 테이블 구조
```
profiles    ← auth.users와 1:1 연동 (id, username, avatar_url)
save_slots  ← 슬롯 1~3 세이브 (stage_progress JSONB, unit_data JSONB)
```

### 세이브 데이터 형식
```javascript
// stage_progress
{ "stage01": { "cleared": true, "turnCount": 12 }, "stage02": { ... } }

// unit_data
[{ id, name, job, lv, exp, hp, maxHp, atk, def, spd, move, range }]
```

### 오프라인 폴백
- Supabase 미설정 또는 미로그인 → localStorage로 자동 폴백
- 로그인 없이 플레이 → 로컬에만 저장

### 환경변수
```
VITE_SUPABASE_URL       = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY  = eyJ...
```

### Supabase 대시보드 설정 필수
1. Authentication > Providers > Google 활성화
2. Authentication > Providers > GitHub 활성화
3. Authentication > URL Configuration > Redirect URLs:
   - `http://localhost:5173` (개발)
   - `https://your-app.vercel.app` (프로덕션)
4. SQL Editor에서 `supabase/schema.sql` 실행

### 신규 파일 목록
| 파일 | 역할 |
|------|------|
| `src/lib/supabase.js` | Supabase 클라이언트 싱글톤 |
| `src/systems/AuthSystem.js` | 소셜 로그인 / 세션 관리 |
| `src/systems/SaveSystem.js` | 세이브/로드 (Supabase + localStorage) |
| `supabase/schema.sql` | DB 테이블 + RLS + 트리거 |
| `.env.example` | 환경변수 템플릿 |
| `vercel.json` | Vercel SPA 라우팅 설정 |

---

## 3. 핵심 게임 시스템 명세

### 맵 구조
- **격자 크기**: 14열 × 10행 (고정)
- **지형 타입**: 평지(1) / 장애물(∞) / 숲(2) / 강(3, 향후) / 산(∞, 향후)

### 검증 완료된 핵심 로직 (수정 금지)

```javascript
// 이동 범위 — BFS + 지형 코스트
// 평지:1 / 숲:2 / 장애물:통과불가 / 아군:통과불가 / 적:목적지불가

// 데미지 공식
damage = max(1, attacker.atk - defender.def) + random(0, 5)

// 경험치
공격 성공: +5 EXP / 적 처치: +15 EXP 추가
레벨업 필요 EXP = 현재레벨 × 20

// 레벨업 성장 (파랜드 스타일)
기본증가량 + 50% 확률 추가 +1

// 적 AI
1. SPD 높은 순 행동
2. 가장 가까운 아군 타겟
3. 공격 가능 → 즉시 공격
4. 불가 → 타겟 방향 최대 이동 후 재시도
```

### 스탯 시스템

#### 직업별 기본 스탯
| 직업   | HP  | ATK | DEF | SPD | MOVE | RNG | 역할 |
|--------|-----|-----|-----|-----|------|-----|------|
| 기사   | 100 | 30  | 15  | 8   | 3    | 1   | 탱커 |
| 마법사 | 70  | 45  | 5   | 12  | 2    | 2   | 고공격 |
| 궁수   | 80  | 25  | 10  | 10  | 3    | 3   | 장거리 |
| 성직자 | 75  | 15  | 8   | 9   | 2    | 1   | 회복 |
| 기병   | 90  | 28  | 8   | 11  | 5    | 1   | 고이동 |

#### 직업별 성장 테이블
| 직업   | HP | ATK | DEF | SPD |
|--------|----|-----|-----|-----|
| 기사   | 8  | 2   | 3   | 0   |
| 마법사 | 4  | 4   | 1   | 1   |
| 궁수   | 5  | 3   | 2   | 1   |
| 성직자 | 5  | 1   | 2   | 1   |
| 기병   | 6  | 3   | 1   | 1   |

### 턴 구조
```
[아군 턴]
  └─ 유닛 선택 → 이동 → 공격 (또는 대기)
  └─ 전원 행동 완료 or 수동 종료 → 적 턴
[적 턴]
  └─ SPD 순 자동 행동 (이동 + 공격)
[다음 아군 턴]
  └─ 모든 유닛 acted = false 초기화
  └─ turnCount++
```

---

## 4. Sub-Agent 구성 (6개)

```
setup-agent    → package.json, vite.config.js, main.js, config.js
data-agent     → src/data/ (순수 데이터만)
systems-agent  → src/systems/ (순수 JS, Phaser 의존 없음)
scene-agent    → src/scenes/ (Phaser Scene 구현)
ui-agent       → src/ui/ (HUD, 팝업, 패널)
qa-agent       → "검증 해줘" 트리거 시
```

### 실행 시퀀스
```
[1] setup-agent (단독)
         ↓
[2] data-agent ──┬── 병렬
   systems-agent ┘
         ↓
[3] scene-agent (핵심)
         ↓
[4] ui-agent
         ↓
[5] qa-agent ("검증 해줘")
```

### Agent 파일 위치
```
.claude/agents/
├── setup.md
├── data.md
├── systems.md
├── scene.md
├── ui.md
└── qa.md
```

---

## 5. 개발 로드맵

### Phase 0 — 프로토타입 ✅ 완료
순수 JS + Canvas로 핵심 로직 검증 완료

### Phase 1 — Phaser.js 마이그레이션 (현재 단계)
- [ ] 프로젝트 초기화 (Vite + Phaser.js)
- [ ] MoveSystem.js (BFS 이동 범위)
- [ ] AttackSystem.js (데미지, 반격)
- [ ] TurnSystem.js (턴 관리)
- [ ] AISystem.js (적 AI)
- [ ] ExpSystem.js (경험치, 레벨업)
- [ ] BattleScene.js (핵심 전투씬)
- [ ] 기본 UI (StatPanel, TurnBadge, DamagePopup)

### Phase 2 — MVP 완성 (5스테이지, 8주 목표)
- [ ] 스테이지 5개 완성
- [ ] UI/UX 완성 (모든 팝업, 패널)
- [ ] 승패 판정 로직
- [ ] TitleScene, MapScene 구현
- [ ] 기본 스프라이트 에셋 적용

### Phase 3 — 알파 (15스테이지)
- [ ] 스킬 시스템 추가
- [ ] 전직 시스템
- [ ] 스테이지 10개 추가

### Phase 4 — 베타 (30스테이지)
- [ ] 오리지널 스토리·캐릭터
- [ ] 일러스트·컷씬
- [ ] Capacitor 모바일 빌드

### Phase 5 — 정식 출시 (50스테이지+)
- [ ] Google Play 출시
- [ ] App Store 출시
- [ ] 인앱결제 시스템
- [ ] Supabase 연동 (리더보드 등)

---

## 6. 스프린트 계획 (Phase 1 → Phase 2, 8주)

| 주차 | 작업 | 담당 에이전트 | 스킬 |
|------|------|-------------|------|
| 1주차 | 프로젝트 세팅 + MoveSystem | setup + systems | `phaser`, `game-architecture` |
| 2주차 | AttackSystem + TurnSystem | systems | `dev:tdd-cycle` |
| 3주차 | AISystem + ExpSystem | systems | `dev:tdd-cycle` |
| 4주차 | BattleScene 뼈대 | scene | `phaser` |
| 5주차 | BattleScene 완성 + UI 기초 | scene + ui | `game-designer` |
| 6주차 | 스테이지 5개 데이터 | data | `srpg:stage-builder` |
| 7주차 | UI 완성 + 스테이지 통합 | ui + scene | `game:review-game` |
| 8주차 | QA + 버그 수정 + Google Play | qa | `game:qa-game` |

---

## 7. 스킬 목록 및 사용 시점

### Reference Skills (자동 로드)
| 스킬 | 언제 |
|------|------|
| `phaser` | Scene 작업 시 항상 참조 |
| `game-architecture` | 시스템 설계 시 참조 |
| `game-assets` | 스프라이트 교체 단계 (Phase 2) |
| `game-designer` | 데미지 팝업, 레벨업 연출 작업 시 |
| `game-qa` | QA 인프라 구축 시 |

### User-Invocable Commands
| 커맨드 | 언제 |
|--------|------|
| `/game:add-feature` | 새 기능 추가 시 |
| `/game:balance-check` | 스테이지 추가할 때마다 |
| `/game:team-combat` | 전투 시스템 멀티에이전트 작업 시 |
| `/game:team-level` | 스테이지 레벨 디자인 시 |
| `/game:qa-game` | 시스템 완성 후 자동 QA |
| `/game:review-game` | 코드 리뷰 필요 시 |
| `/game:playtest-report` | 플레이테스트 후 보고서 작성 시 |
| `/srpg:srpg-balance` | 직업 밸런스 조정 시 |
| `/srpg:stage-builder` | 스테이지 데이터 생성 시 |
| `/srpg:unit-check` | 유닛 스탯 검증 시 |
| `/dev:tdd-cycle` | BFS, 데미지 로직 테스트 작성 시 |
| `/dev:performance-optimization` | Phaser 렌더링 성능 이슈 시 |
| `/dev:context-save` | 장기 작업 세션 저장 시 |
| `simplify` | 시스템 완성 후 코드 정리 |

---

## 8. 밸런스 기준값

### 데미지 예시
```
기사(ATK:30) vs 병사(DEF:10) → 평균 데미지: max(1, 20) + 2.5 = 22.5
마법사(ATK:45) vs 기사(DEF:15) → 평균 데미지: max(1, 30) + 2.5 = 32.5
```

### 클리어율 목표
- 첫 시도: 60~70%
- 반복 플레이: 90%+

### 난이도 지수 공식
```
난이도 = (적 총 ATK × 적 수) / (아군 총 HP)
목표 범위: 0.15 ~ 0.35 (적정 난이도)
```

---

## 9. 프로젝트 파일 구조

```
srpg-game/
├── PLAN.md                    ← 이 파일
├── CLAUDE.md                  ← 핵심 로직 명세 (수정 금지 규칙 포함)
├── package.json
├── vite.config.js
├── index.html
│
├── .claude/
│   └── agents/
│       ├── setup.md
│       ├── data.md
│       ├── systems.md
│       ├── scene.md
│       ├── ui.md
│       └── qa.md
│
├── src/
│   ├── main.js                ← Phaser 진입점
│   ├── config.js              ← 전역 설정 (CELL_SIZE, 해상도 등)
│   │
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── TitleScene.js
│   │   ├── MapScene.js
│   │   └── BattleScene.js     ← 핵심
│   │
│   ├── systems/               ← Phaser 의존성 없음
│   │   ├── MoveSystem.js
│   │   ├── AttackSystem.js
│   │   ├── TurnSystem.js
│   │   ├── AISystem.js
│   │   └── ExpSystem.js
│   │
│   ├── data/                  ← 순수 데이터
│   │   ├── units.js
│   │   ├── growthTable.js
│   │   ├── terrain.js
│   │   └── stages/
│   │       ├── stage01.js
│   │       └── stage02.js
│   │
│   ├── ui/
│   │   ├── StatPanel.js
│   │   ├── TurnBadge.js
│   │   ├── OrderPanel.js
│   │   ├── DamagePopup.js
│   │   └── LevelUpPopup.js
│   │
│   └── utils/
│       ├── GridUtils.js
│       └── Random.js
│
├── assets/
│   ├── sprites/
│   ├── tilesets/
│   └── ui/
│
└── tests/                     ← Playwright QA
```

---

## 10. 작업 완료 체크리스트

### 각 시스템 완성 시 필수 확인
- [ ] 이동 범위가 장애물을 피하는가
- [ ] 데미지 공식이 min 1을 보장하는가
- [ ] 턴 종료 후 acted가 초기화되는가
- [ ] 레벨업 시 maxHp도 함께 증가하는가
- [ ] 모바일 터치 이벤트가 클릭과 동일하게 작동하는가

### 스테이지 추가 시 필수 확인
- [ ] `/srpg:srpg-balance stage0X` 검증 통과
- [ ] 클리어율 60~70% 범위 내
- [ ] 14×10 맵 규격 준수

### 배포 전 체크리스트
- [ ] `npm run build` 성공
- [ ] Playwright QA 전체 통과
- [ ] 모바일 터치 동작 확인
- [ ] 퍼포먼스: 60fps 유지

---

*마지막 업데이트: 2026-04-02*
*작성: 정호 + Claude Code*
