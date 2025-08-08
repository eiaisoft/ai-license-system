# AI 라이선스 대출 관리 시스템

## 프로젝트 구조 설명

이 프로젝트는 다음과 같은 구조로 구성되어 있습니다:

### 폴더 구조

- `api/`: Vercel 서버리스 함수로 배포되는 API 코드
  - Vercel 배포 환경에서 사용됩니다.
  - 각 파일은 독립적인 서버리스 함수로 동작합니다.

- `server/`: 로컬 개발 환경용 Express 서버 코드
  - 로컬 개발 환경에서만 사용됩니다.
  - Vercel 배포에는 사용되지 않습니다.

- `client/`: React 기반 프론트엔드 코드
  - 로컬 개발 및 Vercel 배포 환경 모두에서 사용됩니다.

### 개발 환경 설정

1. 로컬 개발 환경에서는 `server/` 폴더의 Express 서버를 사용합니다:

```bash
# 루트 디렉토리에서
npm run install-all
```

또는 각각 설치:

```bash
# 서버 의존성 설치
cd server
npm install

# 클라이언트 의존성 설치
cd ../client
npm install
```

### 2. 서버 실행

```bash
# 개발 모드 (서버만)
cd server
npm run dev

# 또는 루트에서
npm run server
```

### 3. 클라이언트 실행

```bash
# 새 터미널에서
cd client
npm start

# 또는 루트에서
npm run client
```

### 4. 전체 애플리케이션 실행

```bash
# 루트 디렉토리에서 (서버 + 클라이언트 동시 실행)
npm run dev
```

## 사용법

### 1. 회원가입
- `/register` 페이지에서 소속 기관을 선택하고 계정 생성
- 기관 정보는 관리자가 미리 등록해야 함

### 2. 로그인
- `/login` 페이지에서 이메일과 비밀번호로 로그인

### 3. 라이선스 대출
- 메인 페이지에서 사용 가능한 AI 라이선스 목록 확인
- 원하는 라이선스의 "대출 신청" 버튼 클릭
- 대출 기간은 라이선스별로 설정된 기간만큼 자동 설정

### 4. 대출 내역 확인
- "대출 내역" 메뉴에서 본인의 대출 기록 확인
- 대출 중인 라이선스는 "반납" 버튼으로 조기 반납 가능

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입

### 라이선스
- `GET /api/licenses` - 기관별 라이선스 목록 조회
- `POST /api/licenses/:id/loan` - 라이선스 대출 신청

### 대출 관리
- `GET /api/loans` - 사용자 대출 내역 조회
- `POST /api/loans/:id/return` - 라이선스 반납

### 기관
- `GET /api/organizations` - 기관 목록 조회

## 데이터베이스 구조

### organizations (기관)
- id: 고유 식별자
- name: 기관명
- email: 기관 이메일

### users (사용자)
- id: 고유 식별자
- organization_id: 소속 기관 ID
- name: 사용자명
- email: 이메일
- password: 암호화된 비밀번호
- role: 사용자 역할

### ai_licenses (AI 라이선스)
- id: 고유 식별자
- organization_id: 소유 기관 ID
- name: 라이선스명
- description: 설명
- total_licenses: 전체 라이선스 수
- available_licenses: 사용 가능한 라이선스 수
- max_loan_days: 최대 대출 기간

### license_loans (라이선스 대출)
- id: 고유 식별자
- license_id: 라이선스 ID
- user_id: 사용자 ID
- loan_date: 대출일
- return_date: 반납 예정일
- status: 대출 상태 (active/returned)

## 샘플 데이터

시스템 실행 시 자동으로 다음 샘플 데이터가 생성됩니다:

- **기관**: 테스트 기관
- **사용자**: 테스트 사용자 (user@test.com / password123)
- **라이선스**: 
  - ChatGPT Pro (10개 중 8개 사용 가능, 30일 대출)
  - Claude Pro (5개 중 3개 사용 가능, 14일 대출)

## 환경 설정

### 서버 포트
기본 포트: 5000
환경변수 `PORT`로 변경 가능

### 데이터베이스
SQLite 파일: `server/database.sqlite`
자동으로 생성되며 초기 테이블과 샘플 데이터 포함

## 보안 기능

- JWT 토큰 기반 인증
- bcrypt를 사용한 비밀번호 암호화
- 기관별 라이선스 접근 제한
- 중복 대출 방지

## 라이선스

MIT License