import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminLicenseList({ user }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLicense, setNewLicense] = useState({
    name: '',
    description: '',
    total_licenses: 0,
    max_loan_days: 30
  });

  useEffect(() => {
    fetchLicenses();
  }, []);

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

  const handleAddLicense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/licenses', newLicense, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스가 성공적으로 추가되었습니다.');
      setShowAddForm(false);
      setNewLicense({ name: '', description: '', total_licenses: 0, max_loan_days: 30 });
      fetchLicenses();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '라이선스 추가 중 오류가 발생했습니다.');
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
              onClick={() => setShowAddForm(!showAddForm)}
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
                        <label className="form-label">총 라이선스 수</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newLicense.total_licenses}
                          onChange={(e) => setNewLicense({...newLicense, total_licenses: parseInt(e.target.value)})}
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">설명</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newLicense.description}
                      onChange={(e) => setNewLicense({...newLicense, description: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">최대 대출 기간 (일)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newLicense.max_loan_days}
                      onChange={(e) => setNewLicense({...newLicense, max_loan_days: parseInt(e.target.value)})}
                      min="1"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-success">
                    라이선스 추가
                  </button>
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
                        <th>라이선스명</th>
                        <th>설명</th>
                        <th>전체</th>
                        <th>사용 가능</th>
                        <th>대출 기간</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map(license => (
                        <tr key={license.id}>
                          <td>{license.name}</td>
                          <td>{license.description}</td>
                          <td>{license.total_licenses}</td>
                          <td>{license.available_licenses}</td>
                          <td>{license.max_loan_days}일</td>
                          <td>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteLicense(license.id)}
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

export default AdminLicenseList; 