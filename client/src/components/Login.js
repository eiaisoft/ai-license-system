import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? '' 
    : 'http://localhost:3002';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('로그인 시도:', { email, API_BASE_URL });

    try {
      // jbnu.ac.kr 도메인 처리
      if (email.endsWith('@jbnu.ac.kr')) {
        console.log('jbnu.ac.kr 도메인 감지됨');
        
        try {
          // 기존 사용자 확인
          console.log('도메인 체크 API 호출 중...');
          const checkResponse = await fetch(`${API_BASE_URL}/api/auth/check-domain`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
          });

          console.log('도메인 체크 응답 상태:', checkResponse.status);
          const checkData = await checkResponse.json();
          console.log('도메인 체크 응답 데이터:', checkData);

          if (checkResponse.ok) {
            if (checkData.userExists) {
              console.log('기존 사용자 - 일반 로그인 시도');
              // 기존 사용자 - 일반 로그인
              const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: email,
                  password: password
                })
              });

              console.log('로그인 응답 상태:', loginResponse.status);
              const loginData = await loginResponse.json();
              console.log('로그인 응답 데이터:', loginData);

              if (loginResponse.ok && loginData.token) {
                console.log('로그인 성공');
                onLogin(loginData.user, loginData.token);
              } else {
                console.log('로그인 실패:', loginData.error);
                setError(loginData.error || '로그인에 실패했습니다.');
              }
            } else {
              console.log('신규 사용자 - 계정 생성 시도');
              // 신규 사용자 - 바로 계정 생성 및 로그인
              const firstLoginResponse = await fetch(`${API_BASE_URL}/api/auth/first-login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: email,
                  password: password,
                  name: email.split('@')[0], // 이메일 앞부분을 이름으로 사용
                  organization_id: checkData.organization_id
                })
              });

              console.log('계정 생성 응답 상태:', firstLoginResponse.status);
              const firstLoginData = await firstLoginResponse.json();
              console.log('계정 생성 응답 데이터:', firstLoginData);

              if (firstLoginResponse.ok && firstLoginData.token) {
                console.log('계정 생성 및 로그인 성공');
                onLogin(firstLoginData.user, firstLoginData.token);
              } else {
                console.log('계정 생성 실패:', firstLoginData.error);
                setError(firstLoginData.error || '계정 생성에 실패했습니다.');
              }
            }
          } else {
            console.log('도메인 체크 실패:', checkData.error);
            setError(checkData.error || '도메인 확인에 실패했습니다.');
          }
        } catch (domainError) {
          console.error('도메인 확인 오류:', domainError);
          setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        }
      } else {
        console.log('일반 도메인 - 일반 로그인 시도');
        // 일반 로그인
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              password: password
            })
          });

          console.log('일반 로그인 응답 상태:', response.status);
          const data = await response.json();
          console.log('일반 로그인 응답 데이터:', data);

          if (response.ok && data.token) {
            console.log('일반 로그인 성공');
            onLogin(data.user, data.token);
          } else {
            console.log('일반 로그인 실패:', data.error);
            setError(data.error || '로그인에 실패했습니다.');
          }
        } catch (error) {
          console.error('일반 로그인 오류:', error);
          setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        }
      }
    } catch (error) {
      console.error('전체 로그인 프로세스 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2 className="text-center mb-3">AI 라이선스 대출 시스템</h2>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">기관 이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@jbnu.ac.kr"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            name="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
          />
          <small className="form-text text-muted mt-2">
            비밀번호는 최초 로그인 시 1회만 신규로 작성. 추후 이 비밀번호를 입력하여 로그인.
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
};

export default Login;