import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import ErrorMessage from './ErrorMessage';

function LicenseList({ user }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [loanStartDate, setLoanStartDate] = useState('');
  const [loanEndDate, setLoanEndDate] = useState('');
  const [recentLoanedLicense, setRecentLoanedLicense] = useState(null); // 추가: 최근 대출한 라이선스 정보
  
  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('받은 라이선스 데이터:', response.data);
      response.data.forEach(license => {
        console.log('라이선스:', {
          name: license.name,
          license_id: license.license_id,
          display_license_id: license.display_license_id
        });
      });
      
      setLicenses(response.data);
    } catch (err) {
      console.error('라이선스 목록 조회 오류:', err);
      setError('라이선스 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openLoanModal = (license) => {
    setSelectedLicense(license);
    
    // 기본 대출 시작일을 오늘로 설정
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    setLoanStartDate(startDate);
    
    // 기본 대출 종료일을 비워두거나 최대 대출 기간으로 설정할 수 있음
    // 여기서는 사용자가 직접 선택할 수 있도록 비워둠
    setLoanEndDate('');
    
    setShowLoanModal(true);
  };

  const closeLoanModal = () => {
    setShowLoanModal(false);
    setSelectedLicense(null);
    setLoanStartDate('');
    setLoanEndDate('');
    setError('');
  };

  const handleLoanStartDateChange = (e) => {
    const startDate = e.target.value;
    setLoanStartDate(startDate);
    
    // 시작일이 변경되면 종료일은 초기화 (사용자가 직접 선택하도록)
    setLoanEndDate('');
  };
  
  // 대출 종료일 변경 핸들러 추가
  const handleLoanEndDateChange = (e) => {
    const endDate = e.target.value;
    
    // 선택한 종료일이 최대 대출 기간을 초과하는지 확인
    if (loanStartDate && selectedLicense) {
      const start = new Date(loanStartDate);
      const end = new Date(endDate);
      const maxEnd = new Date(start);
      maxEnd.setDate(maxEnd.getDate() + selectedLicense.max_loan_days);
      
      // 최대 대출 기간을 초과하면 경고 표시
      if (end > maxEnd) {
        setError(`최대 대출 기간(${selectedLicense.max_loan_days}일)을 초과할 수 없습니다.`);
        // 최대 허용 날짜로 설정
        setLoanEndDate(maxEnd.toISOString().split('T')[0]);
        return;
      }
    }
    
    setLoanEndDate(endDate);
    setError(''); // 오류 메시지 초기화
  };

  const handleLoan = async () => {
    if (!selectedLicense || !loanStartDate || !loanEndDate) {
      setError('대출 시작일과 종료일을 모두 선택해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/licenses/${selectedLicense.id}/loan`, {
        loan_start_date: loanStartDate,
        loan_end_date: loanEndDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 대출 완료된 라이선스 정보 저장
      setRecentLoanedLicense({
        id: response.data.loan.id,
        name: selectedLicense.name,
        license_id: selectedLicense.id,
        display_license_id: selectedLicense.display_license_id
      });
      
      setMessage('라이선스 대출이 완료되었습니다.');
      fetchLicenses();
      closeLoanModal();
      
      // 메시지는 바로가기 버튼을 클릭하거나 다른 작업을 할 때까지 유지
    } catch (err) {
      console.error('대출 신청 오류:', err);
      setError(err.response?.data?.error || '라이선스 대출 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 바로가기 버튼 클릭 시 메시지 제거
  const clearRecentLoan = () => {
    setRecentLoanedLicense(null);
    setMessage('');
  };

  if (loading) {
    return <div className="text-center">라이선스 목록을 불러오는 중...</div>;
  }

  return (
    <div>
      <h1 className="mb-3">사용 가능한 라이선스</h1>
      
      {message && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <div>{message}</div>
          {recentLoanedLicense && (
            <div className="d-flex gap-2">
              <Link 
                to="/loans" 
                className="btn btn-primary btn-sm"
                onClick={clearRecentLoan}
              >
                구독 내역 바로가기
              </Link>
              <Link 
                to="/dashboard" 
                className="btn btn-outline-primary btn-sm"
                onClick={clearRecentLoan}
              >
                홈으로 이동
              </Link>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {licenses.length === 0 ? (
        <div className="card text-center">
          <p>사용 가능한 라이선스가 없습니다.</p>
        </div>
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
                const availableCount = license.available_licenses || license.available_count || 0;
                
                return (
                  <tr key={license.id}>
                    <td>{license.organization_name}</td>
                    <td>
                      <div>
                        <strong>{license.name}</strong>
                      </div>
                    </td>
                    <td>
                      <code>{license.display_license_id}</code>
                    </td>
                    <td>
                      <span className={`badge ${
                        availableCount > 0 
                          ? 'bg-success' 
                          : 'bg-danger'
                      }`}>
                        {availableCount > 0 ? '구독가능' : '구독불가'}
                      </span>
                    </td>
                    <td>최대 {license.max_loan_days}일</td>
                    <td>
                      {availableCount > 0 ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openLoanModal(license)}
                        >
                          구독 신청
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" disabled>
                          구독 불가
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 대출 신청 모달 */}
      {showLoanModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">라이선스 구독 신청</h5>
                <button type="button" className="btn-close" onClick={closeLoanModal}></button>
              </div>
              <div className="modal-body">
                {selectedLicense && (
                  <div>
                    <div className="mb-3">
                      <strong>라이선스:</strong> {selectedLicense.name}
                    </div>
                    <div className="mb-3">
                      <strong>라이선스 ID:</strong> <code>{selectedLicense.display_license_id}</code>
                    </div>
                    <div className="mb-3">
                      <strong>최대 구독 기간:</strong> {selectedLicense.max_loan_days}일
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="loanStartDate" className="form-label">구독 시작일</label>
                      <input
                        type="date"
                        className="form-control"
                        id="loanStartDate"
                        value={loanStartDate}
                        onChange={handleLoanStartDateChange}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="loanEndDate" className="form-label">구독 종료일</label>
                      <input
                        type="date"
                        className="form-control"
                        id="loanEndDate"
                        value={loanEndDate}
                        onChange={handleLoanEndDateChange}
                        min={loanStartDate}
                        max={loanStartDate ? (() => {
                          const start = new Date(loanStartDate);
                          const maxEnd = new Date(start);
                          maxEnd.setDate(maxEnd.getDate() + selectedLicense.max_loan_days);
                          return maxEnd.toISOString().split('T')[0];
                        })() : ''}
                      />
                      <small className="form-text text-muted">
                        시작일로부터 최대 {selectedLicense.max_loan_days}일까지 선택 가능합니다.
                      </small>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeLoanModal}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleLoan}>
                  구독 신청
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LicenseList;