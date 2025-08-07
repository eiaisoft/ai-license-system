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
      
      // 대출 수는 임시로 0으로 설정 (나중에 대출 API 구현 시 추가)
      setStats({
        totalOrganizations: orgResponse.data.length,
        totalLicenses: licenseResponse.data.length,
        totalLoans: 0 // 임시로 0으로 설정
      });
    } catch (err) {
      console.error('통계 정보 로딩 오류:', err);
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
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">관리자 정보</h5>
                  <p><strong>이름:</strong> {user.name}</p>
                  <p><strong>이메일:</strong> {user.email}</p>
                  <p><strong>권한:</strong> {user.role}</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title mb-0">등록된 기관</h5>
                    <Link to="/admin/organizations" className="btn btn-primary btn-sm">
                      <i className="fas fa-building me-1"></i>
                      기관 관리
                    </Link>
                  </div>
                  <h2 className="text-primary">{stats.totalOrganizations}</h2>
                  <p>개</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title mb-0">등록된 라이선스</h5>
                    <Link to="/admin/licenses" className="btn btn-success btn-sm">
                      <i className="fas fa-key me-1"></i>
                      라이선스 관리
                    </Link>
                  </div>
                  <h2 className="text-success">{stats.totalLicenses}</h2>
                  <p>개</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title mb-0">대출된 라이선스</h5>
                    <Link to="/admin/loans" className="btn btn-sm" style={{backgroundColor: '#e91e63', borderColor: '#e91e63', color: 'white'}}>
                      <i className="fas fa-clipboard-list me-1"></i>
                      대출 관리
                    </Link>
                  </div>
                  <h2 className="text-warning">{stats.totalLoans}</h2>
                  <p>개</p>
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