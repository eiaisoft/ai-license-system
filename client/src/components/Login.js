import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFirstLogin, setShowFirstLogin] = useState(false);
  const [firstLoginData, setFirstLoginData] = useState({
    name: '',
    email: '',
    organization_id: ''
  });
  const [organizations, setOrganizations] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFirstLoginChange = (e) => {
    setFirstLoginData({
      ...firstLoginData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', formData);
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다. 최초 로그인이신가요?');
        setShowFirstLogin(true);
        // 기관 목록 가져오기
        try {
          const orgResponse = await axios.get('/api/organizations');
          setOrganizations(orgResponse.data);
        } catch (orgErr) {
          console.error('기관 목록 조회 실패:', orgErr);
        }
      } else {
        setError(err.response?.data?.error || '로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFirstLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/first-login', firstLoginData);
      alert(`계정이 생성되었습니다!\n임시 비밀번호: ${response.data.tempPassword}\n이 비밀번호로 로그인해주세요.`);
      setShowFirstLogin(false);
      setFormData({ email: firstLoginData.email, password: '' });
    } catch (err) {
      setError(err.response?.data?.error || '계정 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2 className="text-center mb-3">AI 라이선스 대출 시스템</h2>
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {!showFirstLogin ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">기관 이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@eiaisoft.com"
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
              value={formData.password}
              onChange={handleChange}
              required
            />
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
      ) : (
        <form onSubmit={handleFirstLogin}>
          <h4 className="text-center mb-3">최초 로그인</h4>
          <p className="text-muted text-center mb-3">
            기관 이메일로 계정을 생성합니다.
          </p>

          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={firstLoginData.name}
              onChange={handleFirstLoginChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstEmail">기관 이메일</label>
            <input
              type="email"
              id="firstEmail"
              name="email"
              className="form-control"
              value={firstLoginData.email}
              onChange={handleFirstLoginChange}
              placeholder="example@eiaisoft.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="organization_id">소속 기관</label>
            <select
              id="organization_id"
              name="organization_id"
              className="form-control"
              value={firstLoginData.organization_id}
              onChange={handleFirstLoginChange}
              required
            >
              <option value="">기관을 선택하세요</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-success"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? '계정 생성 중...' : '계정 생성'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '10px' }}
            onClick={() => setShowFirstLogin(false)}
          >
            로그인으로 돌아가기
          </button>
        </form>
      )}
    </div>
  );
}

export default Login; 