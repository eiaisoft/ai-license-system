import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function UserHome({ user }) {
  const [stats, setStats] = useState({
    availableLicenses: 0,
    myActiveLoans: 0,
    totalLoans: 0
  });
  const [recentLicenses, setRecentLicenses] = useState([]);
  const [myActiveLoans, setMyActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 라이선스 목록과 내 대출 내역을 병렬로 가져오기
      const [licensesResponse, loansResponse] = await Promise.all([
        axios.get('/api/licenses', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/loans', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const licenses = licensesResponse.data;
      const loans = loansResponse.data;
      const activeLoans = loans.filter(loan => loan.status === 'active');

      console.log('홈 화면 - 받은 라이선스 데이터:', licenses);
      console.log('홈 화면 - 받은 대출 데이터:', loans);

      // 사용 가능한 라이선스 개수 계산 (available_count 또는 available_licenses > 0)
      const availableLicensesCount = licenses.filter(license => {
        const available = license.available_licenses || license.available_count || 0;
        return available > 0;
      }).length;

      setStats({
        availableLicenses: availableLicensesCount,
        myActiveLoans: activeLoans.length,
        totalLoans: loans.length
      });

      // 모든 라이선스를 표시 (사용 가능 여부와 관계없이)
      setRecentLicenses(licenses.slice(0, 3)); // 최근 3개 라이선스
      setMyActiveLoans(activeLoans.slice(0, 3)); // 최근 3개 활성 대출

    } catch (err) {
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="text-center">대시보드를 불러오는 중...</div>;
  }

  return (
    <div>
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-3">안녕하세요, {user.name}님! 👋</h1>
          <p className="text-muted">License Short-term Subscription System에 오신 것을 환영합니다.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          {error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-center bg-primary text-white">
            <div className="card-body">
              <h2 className="card-title">{stats.availableLicenses}</h2>
              <p className="card-text">사용 가능한 라이선스</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center bg-success text-white">
            <div className="card-body">
              <h2 className="card-title">{stats.myActiveLoans}</h2>
              <p className="card-text">현재 구독 중</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center bg-info text-white">
            <div className="card-body">
              <h2 className="card-title">{stats.totalLoans}</h2>
              <p className="card-text">총 구독 내역</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* 사용 가능한 라이선스 */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🎯 사용 가능한 라이선스</h5>
              <Link to="/licenses" className="btn btn-sm btn-outline-primary">
                전체 보기
              </Link>
            </div>
            <div className="card-body">
              {recentLicenses.length === 0 ? (
                <p className="text-muted text-center">사용 가능한 라이선스가 없습니다.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {recentLicenses.map(license => {
                    const available = license.available_licenses || license.available_count || 0;
                    return (
                      <div key={license.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{license.name}</h6>
                        </div>
                        <div className="text-center">
                          <span className={`badge rounded-pill ${available > 0 ? 'bg-success' : 'bg-danger'}`}>
                            {available > 0 ? '구독가능' : '구독불가'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 내 활성 대출 */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">📋 내 활성 구독</h5>
              <Link to="/loans" className="btn btn-sm btn-outline-success">
                전체 보기
              </Link>
            </div>
            <div className="card-body">
              {myActiveLoans.length === 0 ? (
                <p className="text-muted text-center">현재 구독 중인 라이선스가 없습니다.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {myActiveLoans.map(loan => (
                    <div key={loan.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">{loan.license_name}</h6>
                        <small className="text-muted">
                          만료 예정: {formatDate(loan.return_date)}
                        </small>
                      </div>
                      <span className="badge bg-success rounded-pill">구독중</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">🚀 빠른 액션</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <Link to="/licenses" className="btn btn-outline-primary w-100 mb-2">
                    <i className="fas fa-search me-2"></i>
                    라이선스 찾기
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/loans" className="btn btn-outline-success w-100 mb-2">
                    <i className="fas fa-history me-2"></i>
                    대출 내역
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/change-password" className="btn btn-outline-warning w-100 mb-2">
                    <i className="fas fa-key me-2"></i>
                    비밀번호 변경
                  </Link>
                </div>
                <div className="col-md-3">
                  <a href="/logout" className="btn btn-outline-danger w-100 mb-2">
                    <i className="fas fa-sign-out-alt me-2"></i>
                    로그아웃
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHome;