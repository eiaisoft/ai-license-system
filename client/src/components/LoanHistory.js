import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorMessage from './ErrorMessage';

function LoanHistory({ user }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/loans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoans(response.data);
    } catch (err) {
      setError('대출 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanId) => {
    if (!window.confirm('정말로 이 라이선스를 반납하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/loans/${loanId}/return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스가 성공적으로 반납되었습니다.');
      fetchLoans();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '반납 처리 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status) => {
    return status === 'active' ? '대출 중' : '반납됨';
  };

  const getStatusClass = (status) => {
    return status === 'active' ? 'status-active' : 'status-returned';
  };

  if (loading) {
    return <div className="text-center">대출 내역을 불러오는 중...</div>;
  }

  return (
    <div>
      <h1 className="mb-3">내 대출 내역</h1>
      
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

      {loans.length === 0 ? (
        <div className="card text-center">
          <p>대출 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>라이선스명</th>
                <th>설명</th>
                <th>대출일</th>
                <th>반납 예정일</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => (
                <tr key={loan.id}>
                  <td>{loan.license_name}</td>
                  <td>{loan.license_description}</td>
                  <td>{formatDate(loan.loan_date)}</td>
                  <td>{formatDate(loan.return_date)}</td>
                  <td>
                    <span className={getStatusClass(loan.status)}>
                      {getStatusText(loan.status)}
                    </span>
                  </td>
                  <td>
                    {loan.status === 'active' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleReturn(loan.id)}
                      >
                        반납
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

export default LoanHistory;