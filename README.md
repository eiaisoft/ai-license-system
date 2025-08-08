# AI 라이선스 대출 관리 시스템

# License Short-term Subscription System

## 프로젝트 구조

- `api/`: Vercel 서버리스 함수 (배포용)
- `server/`: 로컬 개발용 서버
- `client/`: React 클라이언트

## 개발 환경 설정

### 1. 필수 요구사항

- Node.js 18 이상
- npm 9 이상

### 2. 설치 및 실행

```bash
# 모든 패키지 설치
npm run install-all

# 개발 서버 실행 (클라이언트 + 서버)
npm run dev
```

## 사용 방법

### 1. 관리자 로그인

- 기본 관리자 계정: `admin@eiaisoft.com`
- 기본 비밀번호: `admin123` (환경 변수로 변경 가능)

### 2. 기관 및 사용자 관리

- 관리자 페이지에서 기관 추가
- 기관 이메일 도메인 설정 (예: `jbnu.ac.kr`)
- 사용자는 해당 도메인 이메일로 가입 가능

### 3. 라이선스 구독

- 메인 페이지에서 사용 가능한 라이선스 목록 확인
- 구독 신청 버튼 클릭
- 구독 기간 선택 후 신청
- 구독 내역 페이지에서 현재 구독 상태 확인

## API 엔드포인트

### 인증

- `POST /api/auth/login` - 일반 사용자 로그인
- `POST /api/auth/admin-login` - 관리자 로그인
- `POST /api/auth/check-domain` - 도메인 확인
- `POST /api/auth/first-login` - 최초 로그인 (계정 생성)
- `POST /api/auth/change-password` - 비밀번호 변경

### 기관

- `GET /api/organizations` - 기관 목록 조회
- `POST /api/organizations` - 기관 추가
- `PUT /api/organizations/:id` - 기관 정보 수정
- `DELETE /api/organizations/:id` - 기관 삭제

### 라이선스

- `GET /api/licenses` - 라이선스 목록 조회
- `POST /api/licenses` - 라이선스 추가
- `PUT /api/licenses/:id` - 라이선스 정보 수정
- `DELETE /api/licenses/:id` - 라이선스 삭제
- `POST /api/licenses/:id/loan` - 라이선스 구독 신청
- `POST /api/licenses/:id/return` - 라이선스 구독 해지

### 사용자

- `GET /api/users` - 사용자 목록 조회
- `POST /api/users` - 사용자 추가
- `PUT /api/users/:id` - 사용자 정보 수정
- `DELETE /api/users/:id` - 사용자 삭제

## 데이터베이스 구조

### organizations (기관)
- id: UUID (PK)
- name: 기관명
- email_domain: 이메일 도메인
- auto_login_enabled: 자동 로그인 허용 여부
- created_at: 생성일

### users (사용자)
- id: UUID (PK)
- name: 사용자명
- email: 이메일
- password: 암호화된 비밀번호
- organization_id: 기관 ID (FK)
- role: 역할 (user/admin)
- created_at: 생성일

### ai_licenses (라이선스)
- id: UUID (PK)
- name: 라이선스명
- description: 설명
- organization_id: 기관 ID (FK)
- total_licenses: 총 라이선스 수
- available_licenses: 사용 가능한 라이선스 수
- max_loan_days: 최대 구독 기간
- created_at: 생성일

### license_loans (라이선스 구독)
- id: UUID (PK)
- user_id: 사용자 ID (FK)
- license_id: 라이선스 ID (FK)
- loan_date: 구독 시작일
- due_date: 구독 종료 예정일
- return_date: 실제 구독 종료일
- status: 상태 (active/returned)
- created_at: 생성일

## 샘플 데이터

```sql
-- 기관 샘플 데이터
INSERT INTO organizations (id, name, email_domain, auto_login_enabled)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '전북대학교', 'jbnu.ac.kr', true);

-- 라이선스 샘플 데이터
INSERT INTO ai_licenses (id, name, description, organization_id, total_licenses, available_licenses, max_loan_days)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'ChatGPT Plus', 'OpenAI의 ChatGPT Plus 구독', '550e8400-e29b-41d4-a716-446655440000', 10, 10, 30);
```

## 환경 설정

### 환경 변수

- `PORT`: 서버 포트 (기본값: 3000)
- `JWT_SECRET`: JWT 토큰 암호화 키
- `SUPABASE_URL`: Supabase URL
- `SUPABASE_ANON_KEY`: Supabase Anon Key
- `ADMIN_EMAIL`: 관리자 이메일 (기본값: admin@eiaisoft.com)
- `ADMIN_PASSWORD`: 관리자 비밀번호 (기본값: admin123)

## 보안

- 비밀번호는 bcrypt로 암호화하여 저장
- JWT 토큰 기반 인증
- 관리자 권한 검증 미들웨어