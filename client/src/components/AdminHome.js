import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminHome({ user }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="text-center">관리자 대시보드를 불러오는 중...</div>;
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">관리자 대시보드</h1>
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <div className="row">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>시스템 정보</h5>
                </div>
                <div className="card-body">
                  <p><strong>관리자:</strong> {user.name}</p>
                  <p><strong>이메일:</strong> {user.email}</p>
                  <p><strong>권한:</strong> {user.role}</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>등록된 기관</h5>
                </div>
                <div className="card-body">
                  <p><strong>총 기관 수:</strong> {organizations.length}개</p>
                  <p><strong>자동 로그인 활성화:</strong> {organizations.filter(org => org.auto_login_enabled).length}개</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5>등록된 기관 목록</h5>
                </div>
                <div className="card-body">
                  {organizations.length === 0 ? (
                    <p>등록된 기관이 없습니다.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>기관명</th>
                            <th>도메인</th>
                            <th>자동 로그인</th>
                            <th>등록일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {organizations.map(org => (
                            <tr key={org.id}>
                              <td>{org.name}</td>
                              <td>{org.email_domain}</td>
                              <td>
                                {org.auto_login_enabled ? (
                                  <span className="badge bg-success">활성화</span>
                                ) : (
                                  <span className="badge bg-secondary">비활성화</span>
                                )}
                              </td>
                              <td>{new Date(org.created_at).toLocaleDateString('ko-KR')}</td>
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

          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5>빠른 작업</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <button className="btn btn-primary w-100 mb-2">
                        새 기관 추가
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-info w-100 mb-2">
                        기관 관리
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-warning w-100 mb-2">
                        시스템 설정
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminHome; 