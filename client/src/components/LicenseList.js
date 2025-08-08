import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('로그인이 필요합니다. 다시 로그인해주세요.');
        setLoading(false);
        return;
      }

      console.log('토큰으로 라이선스 조회 시작:', token.substring(0, 20) + '...');
      
      const response = await axios.get('/api/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('받은 라이선스 데이터:', response.data);
      console.log('라이선스 개수:', response.data.length);
      
      // 모든 라이선스 표시 (필터링 완전 제거)
      setLicenses(response.data || []);
      setError(''); // 성공 시 에러 메시지 초기화
    } catch (err) {
      console.error('라이선스 조회 오류:', err);
      
      if (err.response?.status === 401) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        // 토큰 제거
        localStorage.removeItem('token');
        // 페이지 새로고침하여 로그인 페이지로 이동
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (err.response?.status === 403) {
        setError('접근 권한이 없습니다.');
      } else {
        setError(err.response?.data?.error || '라이선스 목록을 불러오는 중 오류가 발생했습니다.');
      }
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
    
    // 기본 대출 종료일을 최대 대출 기간으로 설정
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + license.max_loan_days);
    setLoanEndDate(endDate.toISOString().split('T')[0]);
    
    setShowLoanModal(true);
  };

  const closeLoanModal = () => {
    setShowLoanModal(false);
    setSelectedLicense(null);
    setLoanStartDate('');
    setLoanEndDate('');
  };

  const handleLoanStartDateChange = (e) => {
    const startDate = e.target.value;
    setLoanStartDate(startDate);
    
    // 시작일이 변경되면 종료일도 자동으로 계산
    if (startDate && selectedLicense) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + selectedLicense.max_loan_days);
      setLoanEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleLoan = async () => {
    if (!selectedLicense || !loanStartDate || !loanEndDate) {
      setError('대출 시작일과 종료일을 모두 선택해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/licenses/${selectedLicense.id}/loan`, {
        loan_start_date: loanStartDate,
        loan_end_date: loanEndDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('라이선스 대출이 완료되었습니다.');
      fetchLicenses();
      closeLoanModal();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('대출 신청 오류:', err);
      setError(err.response?.data?.error || '라이선스 대출 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return <div className="text-center">라이선스 목록을 불러오는 중...</div>;
  }

  return (
    <div>
      <h1 className="mb-3">사용 가능한 AI 라이선스</h1>
      
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
                        {availableCount > 0 ? '대출가능' : '대출불가'}
                      </span>
                    </td>
                    <td>최대 {license.max_loan_days}일</td>
                    <td>
                      {availableCount > 0 ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openLoanModal(license)}
                        >
                          대출 신청
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" disabled>
                          대출 불가
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
                <h5 className="modal-title">라이선스 대출 신청</h5>
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
                      <strong>최대 대출 기간:</strong> {selectedLicense.max_loan_days}일
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="loanStartDate" className="form-label">대출 시작일</label>
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
                      <label htmlFor="loanEndDate" className="form-label">대출 종료일</label>
                      <input
                        type="date"
                        className="form-control"
                        id="loanEndDate"
                        value={loanEndDate}
                        onChange={(e) => setLoanEndDate(e.target.value)}
                        min={loanStartDate}
                        readOnly
                      />
                      <small className="form-text text-muted">
                        시작일로부터 최대 {selectedLicense.max_loan_days}일까지 자동 설정됩니다.
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
                  대출 신청
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