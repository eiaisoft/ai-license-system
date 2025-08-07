import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorMessage from './ErrorMessage';

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
      console.log('받은 라이선스 데이터:', response.data);
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
      fetchLicenses();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '라이선스 대출 중 오류가 발생했습니다.');
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
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>구독기관</th>
                <th>라이선스명</th>
                <th>라이선스 ID</th>
                <th>상태</th>
                <th>대출기간</th>
                <th>사용가능/전체</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(license => (
                <tr key={license.id}>
                  <td>{license.organization_name || '전북대학교'}</td>
                  <td>
                    <div>
                      <strong>{license.name}</strong>
                      <br />
                      <small className="text-muted">{license.description}</small>
                    </div>
                  </td>
                  <td>
                    <code>{license.license_key || license.id}</code>
                  </td>
                  <td>
                    <span className={`badge ${
                      (license.available_licenses || license.available_count || 0) > 0 
                        ? 'bg-success' 
                        : 'bg-danger'
                    }`}>
                      {(license.available_licenses || license.available_count || 0) > 0 
                        ? '대출가능' 
                        : '대출불가'}
                    </span>
                  </td>
                  <td>최대 {license.max_loan_days}일</td>
                  <td>
                    <strong>{license.available_licenses || license.available_count || 0}</strong>
                    /
                    {license.total_licenses || license.total_count || 0}
                  </td>
                  <td>
                    {(license.available_licenses || license.available_count || 0) > 0 ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleLoan(license.id)}
                      >
                        대출 신청
                      </button>
                    ) : (
                      <button className="btn btn-secondary btn-sm" disabled>
                        대출 불가
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LicenseList;