import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminLoanDashboard({ user }) {
  const [loans, setLoans] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    overdueLoans: 0,
    returnedLoans: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [loansResponse, licensesResponse] = await Promise.all([
        axios.get('/api/admin/loans', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/licenses', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setLoans(loansResponse.data);
      setLicenses(licensesResponse.data);
      calculateStats(loansResponse.data);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (loansData) => {
    const now = new Date();
    const totalLoans = loansData.length;
    const activeLoans = loansData.filter(loan => loan.status === 'active').length;
    const returnedLoans = loansData.filter(loan => loan.status === 'returned').length;
    const overdueLoans = loansData.filter(loan => {
      const returnDate = new Date(loan.return_date);
      return loan.status === 'active' && returnDate < now;
    }).length;

    setStats({
      totalLoans,
      activeLoans,
      overdueLoans,
      returnedLoans
    });
  };

  const getRecentLoans = () => {
    return loans
      .filter(loan => loan.status === 'active')
      .sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date))
      .slice(0, 10);
  };

  const getOverdueLoans = () => {
    const now = new Date();
    return loans.filter(loan => {
      const returnDate = new Date(loan.return_date);
      return loan.status === 'active' && returnDate < now;
    });
  };

  const getLicenseUtilization = () => {
    const licenseStats = licenses.map(license => {
      const activeLoanCount = loans.filter(loan => 
        loan.license_id === license.id && loan.status === 'active'
      ).length;
      
      return {
        ...license,
        activeLoans: activeLoanCount,
        utilization: license.total_licenses > 0 ? 
          ((activeLoanCount / license.total_licenses) * 100).toFixed(1) : 0
      };
    });

    return licenseStats.sort((a, b) => b.utilization - a.utilization);
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

  const getDaysRemaining = (returnDate) => {
    const now = new Date();
    const return_date = new Date(returnDate);
    const diffTime = return_date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)}일 연체`;
    } else if (diffDays === 0) {
      return '오늘 반납';
    } else {
      return `${diffDays}일 남음`;
    }
  };

  if (loading) {
    return <div className="text-center">대출 현황을 불러오는 중...</div>;
  }

  const recentLoans = getRecentLoans();
  const overdueLoans = getOverdueLoans();
  const licenseUtilization = getLicenseUtilization();

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">대출 현황 대시보드</h1>
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* 통계 카드 */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.totalLoans}</h4>
                      <p className="mb-0">전체 대출</p>
                    </div>
                    <div className="align-self-center">
                      <i className="fas fa-book fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.activeLoans}</h4>
                      <p className="mb-0">대출중</p>
                    </div>
                    <div className="align-self-center">
                      <i className="fas fa-clock fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-danger text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.overdueLoans}</h4>
                      <p className="mb-0">연체</p>
                    </div>
                    <div className="align-self-center">
                      <i className="fas fa-exclamation-triangle fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.returnedLoans}</h4>
                      <p className="mb-0">반납완료</p>
                    </div>
                    <div className="align-self-center">
                      <i className="fas fa-check-circle fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* 연체 대출 */}
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header bg-danger text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    연체 대출 ({overdueLoans.length}건)
                  </h5>
                </div>
                <div className="card-body">
                  {overdueLoans.length === 0 ? (
                    <p className="text-muted">연체된 대출이 없습니다.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>사용자</th>
                            <th>라이선스</th>
                            <th>연체일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overdueLoans.slice(0, 5).map(loan => (
                            <tr key={loan.id}>
                              <td>
                                <small>
                                  <strong>{loan.user_name}</strong><br/>
                                  {loan.user_email}
                                </small>
                              </td>
                              <td>
                                <small>{loan.license_name}</small>
                              </td>
                              <td>
                                <span className="badge bg-danger">
                                  {getDaysRemaining(loan.return_date)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {overdueLoans.length > 5 && (
                        <p className="text-muted text-center">
                          외 {overdueLoans.length - 5}건 더...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 라이선스 사용률 */}
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-chart-bar me-2"></i>
                    라이선스 사용률
                  </h5>
                </div>
                <div className="card-body">
                  {licenseUtilization.length === 0 ? (
                    <p className="text-muted">라이선스가 없습니다.</p>
                  ) : (
                    <div>
                      {licenseUtilization.slice(0, 5).map(license => (
                        <div key={license.id} className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="fw-bold">{license.name}</small>
                            <small>{license.activeLoans}/{license.total_licenses} ({license.utilization}%)</small>
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div 
                              className={`progress-bar ${
                                license.utilization >= 80 ? 'bg-danger' : 
                                license.utilization >= 60 ? 'bg-warning' : 'bg-success'
                              }`}
                              style={{ width: `${license.utilization}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 최근 대출 */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-history me-2"></i>
                    최근 대출 현황
                  </h5>
                </div>
                <div className="card-body">
                  {recentLoans.length === 0 ? (
                    <p className="text-muted">활성 대출이 없습니다.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>사용자</th>
                            <th>라이선스</th>
                            <th>대출일</th>
                            <th>반납예정일</th>
                            <th>남은기간</th>
                            <th>상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentLoans.map(loan => (
                            <tr key={loan.id}>
                              <td>
                                <div>
                                  <strong>{loan.user_name}</strong><br/>
                                  <small className="text-muted">{loan.user_email}</small>
                                </div>
                              </td>
                              <td>{loan.license_name}</td>
                              <td>{new Date(loan.loan_date).toLocaleDateString('ko-KR')}</td>
                              <td>{new Date(loan.return_date).toLocaleDateString('ko-KR')}</td>
                              <td>
                                <small className={
                                  getDaysRemaining(loan.return_date).includes('연체') ? 'text-danger' :
                                  getDaysRemaining(loan.return_date).includes('오늘') ? 'text-warning' : 'text-success'
                                }>
                                  {getDaysRemaining(loan.return_date)}
                                </small>
                              </td>
                              <td>{getStatusBadge(loan)}</td>
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
      </div>
    </div>
  );
}

export default AdminLoanDashboard;