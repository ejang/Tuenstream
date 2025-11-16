# Tuenstream 배포 가이드 (Supabase + Vercel/Railway)

## ✅ Vercel 배포 가능

**좋은 소식!** 이제 Tuenstream은 Vercel의 Serverless Functions에서 완벽하게 작동합니다.

### 최근 변경사항

- ✅ **WebSocket 제거**: HTTP 폴링으로 전환 (2초마다 상태 업데이트)
- ✅ **개인용 플레이어로 전환**: 멀티 사용자 방 기능 제거
- ✅ **Serverless 호환**: Vercel, Railway, Render 등 모든 플랫폼에서 작동

---

## 배포 옵션

### 옵션 1: Vercel (권장) ⭐⭐⭐⭐⭐

**장점**:
- 무료 티어 제공
- 자동 HTTPS
- GitHub 연동 자동 배포
- 글로벌 CDN
- 즉각적인 배포

**단점**:
- 실시간 동기화 없음 (2초 폴링 사용)

### 옵션 2: Railway ⭐⭐⭐⭐

**장점**:
- PostgreSQL 자동 프로비저닝
- 간단한 설정
- $5 무료 크레딧/월

**단점**:
- 무료 크레딧 소진 후 유료

### 옵션 3: Render ⭐⭐⭐

**장점**:
- 무료 티어 (제한적)
- PostgreSQL 포함

**단점**:
- 무료 티어는 느림 (콜드 스타트)

---

## Vercel 배포 가이드

### 1단계: Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호, 리전 설정
4. 프로젝트 생성 대기 (약 2분)

### 2단계: Supabase 연결 정보 가져오기

1. Supabase 대시보드 → Settings → Database
2. **Connection String** 섹션에서 `URI` 복사
3. `[YOUR-PASSWORD]`를 실제 비밀번호로 교체

예시:
```
postgresql://postgres:your_password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 3단계: API 키 발급

#### YouTube API 키
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성
3. "API 및 서비스" → "라이브러리"
4. "YouTube Data API v3" 검색 후 활성화
5. "사용자 인증 정보" → "사용자 인증 정보 만들기" → "API 키"
6. API 키 복사

#### Gemini API 키
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. API 키 복사

### 4단계: Vercel 배포

#### GitHub 연동 배포 (권장)

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com) 로그인
3. "New Project" 클릭
4. GitHub 저장소 연결
5. 환경 변수 설정:

```env
GOOGLE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
```

**참고**: DATABASE_URL은 선택 사항입니다. 현재는 인메모리 스토리지를 사용하며, 데이터는 서버 재시작 시 초기화됩니다.

6. Deploy 클릭

#### CLI 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add GOOGLE_API_KEY
vercel env add GEMINI_API_KEY

# 프로덕션 배포
vercel --prod
```

### 5단계: 배포 확인

1. Vercel이 제공하는 URL 접속
2. 음악 검색 기능 테스트
3. 플레이리스트 추가 및 재생 테스트

---

## Railway 배포 가이드

### 1단계: Railway 프로젝트 생성

1. [Railway](https://railway.app) 로그인 (GitHub 계정으로)
2. "New Project" → "Deploy from GitHub repo"
3. 저장소 선택

### 2단계: 환경 변수 설정

Variables 탭에서 추가:
```
GOOGLE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
```

### 3단계: 빌드 설정

Settings → Deploy에서:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4단계: 도메인 설정

Settings → Networking에서 커스텀 도메인 추가 가능

---

## 환경 변수 전체 목록

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `GOOGLE_API_KEY` | ✅ | YouTube Data API v3 키 |
| `GEMINI_API_KEY` | ✅ | Google Gemini API 키 |
| `NODE_ENV` | ⚠️ | `production` (권장) |
| `PORT` | ❌ | 포트 번호 (Vercel/Railway가 자동 설정) |
| `DATABASE_URL` | ❌ | PostgreSQL 연결 문자열 (선택 사항) |

---

## 데이터 지속성 (선택 사항)

현재 앱은 **인메모리 스토리지**를 사용합니다:
- ✅ 빠르고 간단함
- ✅ 추가 설정 불필요
- ❌ 서버 재시작 시 데이터 손실
- ❌ 여러 서버 인스턴스 간 상태 동기화 불가

### PostgreSQL 연결하기 (고급)

데이터를 영구적으로 저장하려면:

1. Supabase 또는 Railway PostgreSQL 사용
2. DATABASE_URL 환경 변수 설정
3. 데이터베이스 마이그레이션 실행: `npm run db:push`
4. `server/storage.ts`를 데이터베이스 기반 구현으로 수정 필요

**참고**: 현재 버전은 데이터베이스 연결 없이도 작동합니다.

---

## API 할당량 및 제한

### YouTube API
- 무료 티어: 일일 10,000 units
- 검색 1회 = 100 units
- 비디오 정보 조회 1회 = 1 unit
- **할당량 초과 시**: 다음 날까지 대기 또는 유료 플랜 구독

### Gemini API
- 무료 티어: 60 requests/분
- AI 추천 기능 사용 시 적용

---

## 트러블슈팅

### 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# TypeScript 타입 체크
npm run check
```

### YouTube API 할당량 초과
- Google Cloud Console에서 할당량 확인
- 검색 빈도 줄이기
- 캐싱 로직 추가 고려

### Vercel Function Timeout
- Vercel Hobby: 10초
- Vercel Pro: 60초
- 현재 앱은 HTTP 폴링을 사용하므로 타임아웃 문제 없음

---

## 성능 최적화

### HTTP 폴링 간격 조정

`client/src/pages/home.tsx`에서:
```typescript
const { data: room, isLoading } = useQuery<Room>({
  queryKey: ["/api/player"],
  refetchInterval: 2000, // 2초 → 원하는 간격으로 변경 (밀리초)
});
```

**권장값**:
- 빠른 응답: 1000ms (1초)
- 균형: 2000ms (2초) - **기본값**
- 배터리 절약: 5000ms (5초)

---

## 다음 단계

1. ✅ `.env.example` 참고하여 환경 변수 준비
2. ✅ API 키 발급 (YouTube, Gemini)
3. ✅ 배포 플랫폼 선택 (Vercel 권장)
4. 🚀 배포 및 테스트
5. 🎵 음악 즐기기!

배포 중 문제가 발생하면 GitHub Issues에 문의해주세요!
