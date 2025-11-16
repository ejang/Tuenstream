# Tuenstream 배포 가이드 (Supabase + Vercel)

## ⚠️ 중요: WebSocket 제한사항

**현재 이 애플리케이션은 WebSocket을 사용하여 실시간 동기화를 구현하고 있습니다.**

Vercel의 Serverless Functions는 **장시간 유지되는 WebSocket 연결을 지원하지 않습니다**.
이는 Vercel의 아키텍처 제한사항으로, 각 요청은 최대 60초(Pro 플랜) 또는 10초(Hobby 플랜)까지만 실행됩니다.

### 해결 방안

다음 중 하나를 선택하세요:

#### 옵션 1: Railway로 변경 (권장) ⭐
- WebSocket 완전 지원
- Supabase와 호환 가능
- 무료 티어: $5 크레딧/월
- 설정이 더 간단함

**Railway 배포 방법**:
```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인 및 배포
railway login
railway init
railway up
```

#### 옵션 2: Vercel + Supabase Realtime
Supabase의 Realtime 기능으로 WebSocket을 대체 (코드 수정 필요)

#### 옵션 3: Vercel + Pusher/Ably
외부 실시간 서비스 사용 (코드 수정 필요)

---

## Vercel + Supabase 배포 (WebSocket 제한 있음)

WebSocket이 제한적으로 작동할 수 있지만, 기본 배포를 진행하려면 아래 단계를 따르세요.

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

### 4단계: 데이터베이스 스키마 적용

현재 애플리케이션은 인메모리 스토리지를 사용 중입니다.
프로덕션 배포를 위해서는 **PostgreSQL 데이터베이스 연결**이 필요합니다.

```bash
# 환경 변수 설정
export DATABASE_URL="postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres"

# 데이터베이스 스키마 적용
npm run db:push
```

### 5단계: Vercel 배포

#### GitHub 연동 배포 (권장)

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com) 로그인
3. "New Project" 클릭
4. GitHub 저장소 연결
5. 환경 변수 설정:

```env
DATABASE_URL=postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres
GOOGLE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
```

6. Deploy 클릭

#### CLI 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add DATABASE_URL
vercel env add GOOGLE_API_KEY
vercel env add GEMINI_API_KEY

# 프로덕션 배포
vercel --prod
```

### 6단계: 배포 확인

1. Vercel이 제공하는 URL 접속
2. 음악 검색 기능 테스트
3. 방 생성 및 참가 테스트

---

## Railway 배포 (WebSocket 완전 지원) ⭐

### 1단계: Railway 프로젝트 생성

1. [Railway](https://railway.app) 로그인 (GitHub 계정으로)
2. "New Project" → "Deploy from GitHub repo"
3. 저장소 선택

### 2단계: PostgreSQL 추가

1. 프로젝트에서 "New" 클릭
2. "Database" → "PostgreSQL" 선택
3. 자동으로 `DATABASE_URL` 환경 변수 설정됨

또는 Supabase 사용:
1. "Variables" 탭
2. `DATABASE_URL` 추가 (Supabase 연결 문자열)

### 3단계: 환경 변수 설정

Variables 탭에서 추가:
```
GOOGLE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
```

### 4단계: 빌드 설정

Settings → Deploy에서:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 5단계: 도메인 설정

Settings → Networking에서 커스텀 도메인 추가 가능

---

## 환경 변수 전체 목록

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `GOOGLE_API_KEY` | ✅ | YouTube Data API v3 키 |
| `GEMINI_API_KEY` | ✅ | Google Gemini API 키 |
| `NODE_ENV` | ⚠️ | `production` (권장) |
| `PORT` | ❌ | 포트 번호 (Vercel/Railway가 자동 설정) |

---

## 주의사항

### 데이터베이스 마이그레이션
- 배포 전 반드시 `npm run db:push` 실행
- Supabase 대시보드에서 테이블 생성 확인

### API 할당량
- YouTube API: 무료 티어 일일 10,000 units
- Gemini API: 무료 티어 60 requests/분

### WebSocket 연결
- **Vercel**: WebSocket이 제한적으로 작동하거나 작동하지 않을 수 있음
- **Railway**: WebSocket 완전 지원

### CORS 설정
현재 CORS 설정이 없습니다. 필요시 `server/index.ts`에 추가:

```javascript
import cors from 'cors';
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
```

---

## 트러블슈팅

### 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# TypeScript 타입 체크
npm run check
```

### 데이터베이스 연결 실패
- DATABASE_URL 형식 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 방화벽 설정 확인 (Supabase는 기본적으로 모든 IP 허용)

### WebSocket 작동 안 함
- Vercel 사용 중이라면 Railway로 마이그레이션 고려
- 또는 Supabase Realtime으로 대체

### YouTube API 할당량 초과
- Google Cloud Console에서 할당량 확인
- 캐싱 로직 추가 고려

---

## 권장 배포 플랫폼

| 플랫폼 | WebSocket | 가격 | 추천도 |
|--------|-----------|------|--------|
| **Railway** | ✅ 완전 지원 | $5/월 무료 크레딧 | ⭐⭐⭐⭐⭐ |
| **Render** | ✅ 완전 지원 | 무료 티어 있음 | ⭐⭐⭐⭐ |
| **Fly.io** | ✅ 완전 지원 | 무료 티어 있음 | ⭐⭐⭐⭐ |
| **Vercel** | ❌ 제한적 | 무료 티어 있음 | ⭐⭐ |

**결론**: WebSocket이 필수인 이 프로젝트는 **Railway**나 **Render** 사용을 강력히 권장합니다.

---

## 다음 단계

1. ✅ `.env.example` 참고하여 환경 변수 준비
2. ✅ Supabase 프로젝트 생성
3. ✅ API 키 발급
4. ⚠️ 배포 플랫폼 선택 (Railway 권장)
5. 🚀 배포 및 테스트

배포 중 문제가 발생하면 이슈를 등록해주세요!
