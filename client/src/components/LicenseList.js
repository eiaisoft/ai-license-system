import React, { useState, useEffect } from 'react';
import axios from 'axios';

function LicenseList({ user }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLicenses(response.data);
    } catch (err) {
      setError('라이선스 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoan = async (licenseId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/licenses/${licenseId}/loan`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스 대출이 완료되었습니다.');
      fetchLicenses(); // 목록 새로고침
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '대출 신청 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };



  if (loading) {
    return <div className="text-center">라이선스 목록을 불러오는 중...</div>;
  }

  return (
    <div>
      <h1 className="mb-3">사용 가능한 AI 라이선스</h1>
      
      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {licenses.length === 0 ? (
        <div className="card text-center">
          <p>사용 가능한 라이선스가 없습니다.</p>
        </div>
      ) : (
        <div className="grid">
          {licenses.map(license => (
            <div key={license.id} className="license-card">
              <div className="license-name">{license.name}</div>
              <div className="license-description">{license.description}</div>
              
              <div className="license-stats">
                <div className="stat">
                  <div className="stat-value">{license.total_licenses}</div>
                  <div className="stat-label">전체</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{license.available_licenses}</div>
                  <div className="stat-label">사용 가능</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{license.max_loan_days}</div>
                  <div className="stat-label">대출 기간(일)</div>
                </div>
              </div>
              
              <div className="text-center">
                {license.available_licenses > 0 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleLoan(license.id)}
                  >
                    대출 신청
                  </button>
                ) : (
                  <button className="btn btn-primary" disabled>
                    대출 불가
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LicenseList; 