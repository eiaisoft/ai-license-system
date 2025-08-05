import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorMessage from './ErrorMessage';

function AdminLicenseList({ user }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [loanInfo, setLoanInfo] = useState({});
  const [newLicense, setNewLicense] = useState({
    name: '',
    organization: '전북대학교',
    license_id: '',
    max_loan_days: 30
  });

  const fetchLicenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLicenses(response.data);
    } catch (err) {
      setError('라이선스 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/loans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 라이선스별 대출 정보 매핑
      const loanMap = {};
      response.data.forEach(loan => {
        if (loan.status === 'active') {
          if (!loanMap[loan.license_id]) {
            loanMap[loan.license_id] = [];
          }
          loanMap[loan.license_id].push(loan);
        }
      });
      setLoanInfo(loanMap);
    } catch (err) {
      console.error('대출 정보 조회 실패:', err);
    }
  };

  useEffect(() => {
    fetchLicenses();
    fetchLoanInfo();
  }, []);

  const handleAddLicense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/licenses', newLicense, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스가 성공적으로 추가되었습니다.');
      setNewLicense({ 
        name: '', 
        organization: '전북대학교',
        license_id: '',
        max_loan_days: 30
      });
      setShowAddForm(false);
      fetchLicenses();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '라이선스 추가 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditLicense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/licenses/${editingLicense.id}`, editingLicense, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스가 성공적으로 수정되었습니다.');
      setEditingLicense(null);
      fetchLicenses();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '라이선스 수정 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteLicense = async (licenseId) => {
    if (!window.confirm('정말로 이 라이선스를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/licenses/${licenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스가 성공적으로 삭제되었습니다.');
      fetchLicenses();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '라이선스 삭제 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const startEdit = (license) => {
    setEditingLicense({...license});
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingLicense(null);
  };

  if (loading) {
    return <div className="text-center">라이선스 목록을 불러오는 중...</div>;
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>라이선스 관리</h1>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingLicense(null);
              }}
            >
              {showAddForm ? '취소' : '새 라이선스 추가'}
            </button>
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

          {/* 라이선스 추가 폼 */}
          {showAddForm && (
            <div className="card mb-4">
              <div className="card-header">
                <h5>새 라이선스 추가</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddLicense}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">라이선스명</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newLicense.name}
                          onChange={(e) => setNewLicense({...newLicense, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">구독기관</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newLicense.organization}
                          onChange={(e) => setNewLicense({...newLicense, organization: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">라이선스 ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newLicense.license_id}
                          onChange={(e) => setNewLicense({...newLicense, license_id: e.target.value})}
                          placeholder="예: jbnuaispace01@eiaisoft.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">최대 대출기간 (일)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newLicense.max_loan_days}
                          onChange={(e) => setNewLicense({...newLicense, max_loan_days: parseInt(e.target.value)})}
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-success">
                    라이선스 추가
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 라이선스 수정 폼 */}
          {editingLicense && (
            <div className="card mb-4">
              <div className="card-header">
                <h5>라이선스 수정</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleEditLicense}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">라이선스명</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingLicense.name}
                          onChange={(e) => setEditingLicense({...editingLicense, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">구독기관</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingLicense.organization || '전북대학교'}
                          onChange={(e) => setEditingLicense({...editingLicense, organization: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">라이선스 ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingLicense.license_id || ''}
                          onChange={(e) => setEditingLicense({...editingLicense, license_id: e.target.value})}
                          placeholder="예: jbnuaispace01@eiaisoft.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">최대 대출기간 (일)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={editingLicense.max_loan_days || 30}
                          onChange={(e) => setEditingLicense({...editingLicense, max_loan_days: parseInt(e.target.value)})}
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success">
                      수정 완료
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h5>등록된 라이선스 목록</h5>
            </div>
            <div className="card-body">
              {licenses.length === 0 ? (
                <p>등록된 라이선스가 없습니다.</p>
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
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map(license => {
                        // 해당 라이선스의 대출 정보 확인
                        const activeLoan = loanInfo[license.id];
                        const isOnLoan = activeLoan && activeLoan.length > 0;
                        
                        return (
                          <tr key={license.id}>
                            <td>{license.organization || '전북대학교'}</td>
                            <td>{license.name || '-'}</td>
                            <td>{license.license_id || 'jbnuaispace01@eiaisoft.com'}</td>
                            <td>
                              {isOnLoan ? (
                                <span className="badge bg-warning">대출 중</span>
                              ) : (
                                <span className="badge bg-success">대출 가능</span>
                              )}
                            </td>
                            <td>
                              {(() => {
                                if (isOnLoan) {
                                  // 대출 중인 경우 - 실제 대출 기간 표시
                                  const loanDate = new Date(activeLoan[0].loan_date);
                                  const returnDate = new Date(activeLoan[0].return_date);
                                  const loanDays = Math.ceil((returnDate - loanDate) / (1000 * 60 * 60 * 24));
                                  const remainingDays = Math.ceil((returnDate - new Date()) / (1000 * 60 * 60 * 24));
                                  
                                  if (remainingDays > 0) {
                                    return `${loanDays}일 대출 (${remainingDays}일 남음)`;
                                  } else {
                                    return `${loanDays}일 대출 (연체)`;
                                  }
                                } else {
                                  // 대출 가능한 경우 - 최대 대출 기간 표시
                                  return `최대 ${license.max_loan_days || 30}일`;
                                }
                              })()}
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <button 
                                  className="btn btn-warning btn-sm"
                                  onClick={() => startEdit(license)}
                                >
                                  수정
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteLicense(license.id)}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

export default AdminLicenseList;