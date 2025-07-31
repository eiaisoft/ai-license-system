# AI 라이선스 관리 시스템 - 관리자 기능

## 구현된 기능

### 1. 관리자 설정
- **관리자 이메일**: `admin@eiaisoft.com`
- **기본 비밀번호**: `admin123`
- 관리자 전용 로그인 API 제공

### 2. 기관 도메인 관리
관리자는 다음 기능을 통해 기관 도메인을 관리할 수 있습니다:

#### 기관 도메인 추가
```http
POST /api/admin/organizations
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "기관명",
  "email_domain": "example.ac.kr",
  "auto_login_enabled": true
}
```

#### 기관 도메인 목록 조회
```http
GET /api/admin/organizations
Authorization: Bearer <admin_token>
```

#### 기관 도메인 수정
```http
PUT /api/admin/organizations/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "수정된 기관명",
  "email_domain": "example.ac.kr",
  "auto_login_enabled": false
}
```

#### 기관 도메인 삭제
```http
DELETE /api/admin/organizations/:id
Authorization: Bearer <admin_token>
```

### 3. 자동 등록된 기관
- **전북대학교 (jbnu.ac.kr)**: 서버 시작 시 자동으로 등록되며 자동 로그인이 활성화됩니다.

### 4. 자동 로그인 시스템
- 관리자가 등록한 기관의 도메인 메일을 사용하는 사용자는 자동 로그인이 가능합니다.
- `auto_login_enabled: true`로 설정된 기관의 사용자는 이메일만으로 로그인할 수 있습니다.

## API 엔드포인트

### 관리자 인증
- `POST /api/auth/admin-login` - 관리자 로그인
- `POST /api/admin/change-password` - 관리자 비밀번호 변경

### 기관 관리 (관리자 전용)
- `GET /api/admin/organizations` - 기관 목록 조회
- `POST /api/admin/organizations` - 기관 추가
- `PUT /api/admin/organizations/:id` - 기관 수정
- `DELETE /api/admin/organizations/:id` - 기관 삭제

### 사용자 인증
- `POST /api/auth/check-domain` - 도메인 확인 및 자동 로그인
- `POST /api/auth/login` - 일반 로그인
- `POST /api/auth/first-login` - 최초 로그인
- `POST /api/auth/change-password` - 비밀번호 변경

## 환경 변수 설정

`env.example` 파일을 참고하여 `.env` 파일을 생성하고 다음 설정을 추가하세요:

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
JWT_SECRET=your_jwt_secret_key_here
ADMIN_PASSWORD=admin123
PORT=3000
```

## 사용 방법

### 1. 관리자 로그인
```javascript
const response = await fetch('/api/auth/admin-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@eiaisoft.com',
    password: 'admin123'
  })
});
```

### 2. 기관 도메인 추가
```javascript
const response = await fetch('/api/admin/organizations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    name: '새로운 대학교',
    email_domain: 'newuniversity.ac.kr',
    auto_login_enabled: true
  })
});
```

### 3. 사용자 자동 로그인
```javascript
const response = await fetch('/api/auth/check-domain', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@jbnu.ac.kr'
  })
});
```

## 보안 고려사항

1. **관리자 비밀번호**: 실제 운영 환경에서는 더 안전한 비밀번호 관리 방식을 사용하세요.
2. **JWT 시크릿**: 강력한 시크릿 키를 사용하세요.
3. **환경 변수**: 민감한 정보는 환경 변수로 관리하세요.
4. **HTTPS**: 프로덕션 환경에서는 HTTPS를 사용하세요.

## 데이터베이스 스키마

### organizations 테이블
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email_domain VARCHAR UNIQUE NOT NULL,
  auto_login_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'user',
  is_first_login BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
``` 