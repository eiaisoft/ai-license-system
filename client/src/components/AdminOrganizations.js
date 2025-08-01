import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminOrganizations({ user }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    email_domain: '',
    auto_login_enabled: false
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrganizations(response.data);
    } catch (err) {
      setError('기관 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrganization = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/organizations', newOrganization, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewOrganization({
        name: '',
        email_domain: '',
        auto_login_enabled: false
      });
      setShowAddForm(false);
      fetchOrganizations();
      setError('');
    } catch (err) {
      setError('기관 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteOrganization = async (orgId) => {
    if (!window.confirm('정말로 이 기관을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrganizations();
      setError('');
    } catch (err) {
      setError('기관 삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleAutoLogin = async (orgId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('인증 토큰이 없습니다. 다시 로그인해주세요.');
        return;
      }
      
      // 현재 기관 정보를 찾아서 전체 데이터를 포함하여 업데이트
      const currentOrg = organizations.find(org => org.id === orgId);
      if (!currentOrg) {
        setError('기관 정보를 찾을 수 없습니다.');
        return;
      }
      
      console.log('업데이트할 기관 정보:', {
        id: orgId,
        name: currentOrg.name,
        email_domain: currentOrg.email_domain,
        current_status: currentStatus,
        new_status: !currentStatus
      });
      
      console.log('요청 URL:', `/api/admin/organizations/${orgId}`);
      console.log('요청 헤더:', { Authorization: `Bearer ${token}` });
      
      const response = await axios.put(`/api/admin/organizations/${orgId}`, {
        name: currentOrg.name,
        email_domain: currentOrg.email_domain,
        auto_login_enabled: !currentStatus
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('서버 응답:', response.data);
      fetchOrganizations();
      setError('');
    } catch (err) {
      console.error('자동 로그인 설정 변경 오류:', err);
      console.error('오류 응답:', err.response?.data);
      console.error('오류 상태:', err.response?.status);
      console.error('오류 헤더:', err.response?.headers);
      
      if (err.response?.status === 401) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
      } else if (err.response?.status === 403) {
        setError('관리자 권한이 필요합니다.');
      } else {
        setError(`자동 로그인 설정 변경 중 오류가 발생했습니다: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="text-center">기관 목록을 불러오는 중...</div>;
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>기관 관리</h1>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? '취소' : '새 기관 추가'}
            </button>
          </div>
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {showAddForm && (
            <div className="card mb-4">
              <div className="card-header">
                <h5>새 기관 추가</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddOrganization}>
                  <div className="mb-3">
                    <label htmlFor="orgName" className="form-label">기관명</label>
                    <input
                      type="text"
                      className="form-control"
                      id="orgName"
                      value={newOrganization.name}
                      onChange={(e) => setNewOrganization({
                        ...newOrganization,
                        name: e.target.value
                      })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="emailDomain" className="form-label">이메일 도메인</label>
                    <input
                      type="text"
                      className="form-control"
                      id="emailDomain"
                      placeholder="예: university.ac.kr"
                      value={newOrganization.email_domain}
                      onChange={(e) => setNewOrganization({
                        ...newOrganization,
                        email_domain: e.target.value
                      })}
                      required
                    />
                  </div>
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="autoLogin"
                      checked={newOrganization.auto_login_enabled}
                      onChange={(e) => setNewOrganization({
                        ...newOrganization,
                        auto_login_enabled: e.target.checked
                      })}
                    />
                    <label className="form-check-label" htmlFor="autoLogin">
                      자동 로그인 활성화
                    </label>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success">추가</button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowAddForm(false)}
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h5>등록된 기관 목록 ({organizations.length}개)</h5>
            </div>
            <div className="card-body">
              {organizations.length === 0 ? (
                <p className="text-center text-muted">등록된 기관이 없습니다.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>기관명</th>
                        <th>도메인</th>
                        <th>자동 로그인</th>
                        <th>등록일</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.map(org => (
                        <tr key={org.id}>
                          <td>{org.name}</td>
                          <td>{org.email_domain}</td>
                          <td>
                            <button
                              className={`btn btn-sm ${org.auto_login_enabled ? 'btn-success' : 'btn-secondary'}`}
                              onClick={() => toggleAutoLogin(org.id, org.auto_login_enabled)}
                            >
                              {org.auto_login_enabled ? '활성화' : '비활성화'}
                            </button>
                          </td>
                          <td>{new Date(org.created_at).toLocaleDateString('ko-KR')}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteOrganization(org.id)}
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

export default AdminOrganizations;