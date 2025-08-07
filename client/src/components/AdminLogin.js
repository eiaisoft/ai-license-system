import React, { useState } from 'react';
import axios from 'axios';
import ErrorMessage from './ErrorMessage';

function AdminLogin({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/admin-login', formData);
      const { user, token } = response.data;
      
      if (user.role !== 'admin') {
        setError('관리자 권한이 필요합니다.');
        setLoading(false);
        return;
      }

      onLogin(user, token);
    } catch (err) {
      console.error('관리자 로그인 오류:', err);
      setError(err.response?.data?.error || '관리자 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2 className="text-center mb-3">관리자 로그인</h2>
      
      <ErrorMessage message={error} />

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">관리자 이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={formData.email}
            onChange={handleChange}
            placeholder="admin@example.com"
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
            placeholder="관리자 비밀번호를 입력하세요"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-danger"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? '로그인 중...' : '관리자 로그인'}
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;