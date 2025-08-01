import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function AdminHome({ user }) {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalLicenses: 0,
    totalLoans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 기관 수 조회
      const orgResponse = await axios.get('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 라이선스 수 조회
      const licenseResponse = await axios.get('/api/admin/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats({
        totalOrganizations: orgResponse.data.length,
        totalLicenses: licenseResponse.data.length,
        totalLoans: 0 // 대출 관리 기능이 제거되었으므로 0으로 설정
      });
    } catch (err) {
      setError('통계 정보를 불러오는 중 오류가 발생했습니다.');
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

          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">관리자 정보</h5>
                  <p><strong>이름:</strong> {user.name}</p>
                  <p><strong>이메일:</strong> {user.email}</p>
                  <p><strong>권한:</strong> {user.role}</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">등록된 기관</h5>
                  <h2 className="text-primary">{stats.totalOrganizations}</h2>
                  <p>개</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">등록된 라이선스</h5>
                  <h2 className="text-success">{stats.totalLicenses}</h2>
                  <p>개</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5>관리 메뉴</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <div className="d-flex align-items-center">
                        <Link to="/admin/organizations" className="btn btn-primary" style={{minWidth: '120px', marginRight: '1rem'}}>
                          <i className="fas fa-building me-2"></i>
                          기관 관리
                        </Link>
                        <div>
                          <p className="mb-0 text-muted small">기관 추가, 수정, 삭제 및 자동 로그인 설정</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="d-flex align-items-center">
                        <Link to="/admin/licenses" className="btn btn-success" style={{minWidth: '120px', marginRight: '1rem'}}>
                          <i className="fas fa-key me-2"></i>
                          라이선스 관리
                        </Link>
                        <div>
                          <p className="mb-0 text-muted small">AI 라이선스 추가, 수정, 삭제 및 수량 관리</p>
                        </div>
                      </div>
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