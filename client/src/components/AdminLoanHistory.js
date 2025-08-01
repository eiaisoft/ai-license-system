import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorMessage from './ErrorMessage';

function AdminLoanHistory({ user }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, returned, overdue

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/loans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoans(response.data);
    } catch (err) {
      setError('대출 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleForceReturn = async (loanId) => {
    if (!window.confirm('정말로 이 대출을 강제 반납 처리하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/loans/${loanId}/force-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('대출이 강제 반납 처리되었습니다.');
      fetchLoans();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '강제 반납 처리 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('정말로 이 대출 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/loans/${loanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('대출 기록이 삭제되었습니다.');
      fetchLoans();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '대출 기록 삭제 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStatusBadge = (loan) => {
    const returnDate = new Date(loan.return_date);
    const now = new Date();
    
    if (loan.status === 'returned') {
      return <span className="badge bg-success">반납됨</span>;
    } else if (returnDate < now) {
      return <span className="badge bg-danger">연체</span>;
    } else {
      return <span className="badge bg-primary">대출중</span>;
    }
  };

  const getFilteredLoans = () => {
    switch (filter) {
      case 'active':
        return loans.filter(loan => loan.status === 'active');
      case 'returned':
        return loans.filter(loan => loan.status === 'returned');
      case 'overdue':
        return loans.filter(loan => {
          const returnDate = new Date(loan.return_date);
          const now = new Date();
          return loan.status === 'active' && returnDate < now;
        });
      default:
        return loans;
    }
  };

  if (loading) {
    return <div className="text-center">대출 내역을 불러오는 중...</div>;
  }

  const filteredLoans = getFilteredLoans();

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>대출 내역 관리</h1>
            <div className="d-flex gap-2">
              <select 
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="active">대출중</option>
                <option value="returned">반납됨</option>
                <option value="overdue">연체</option>
              </select>
            </div>
          </div>
          
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

          <div className="card">
            <div className="card-header">
              <h5>전체 대출 내역 ({filteredLoans.length}건)</h5>
            </div>
            <div className="card-body">
              {filteredLoans.length === 0 ? (
                <p>대출 내역이 없습니다.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>사용자</th>
                        <th>라이선스</th>
                        <th>대출일</th>
                        <th>반납예정일</th>
                        <th>상태</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoans.map(loan => (
                        <tr key={loan.id}>
                          <td>
                            <div>
                              <strong>{loan.user_name}</strong><br/>
                              <small className="text-muted">{loan.user_email}</small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{loan.license_name}</strong><br/>
                              <small className="text-muted">{loan.license_description}</small>
                            </div>
                          </td>
                          <td>{new Date(loan.loan_date).toLocaleDateString('ko-KR')}</td>
                          <td>{new Date(loan.return_date).toLocaleDateString('ko-KR')}</td>
                          <td>{getStatusBadge(loan)}</td>
                          <td>
                            {loan.status === 'active' && (
                              <button 
                                className="btn btn-warning btn-sm me-2"
                                onClick={() => handleForceReturn(loan.id)}
                              >
                                강제 반납
                              </button>
                            )}
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteLoan(loan.id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLoanHistory;