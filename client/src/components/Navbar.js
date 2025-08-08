import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand">
          License Short-term Subscription System
        </Link>
        
        <ul className="navbar-nav">
          {user ? (
            <>
              {user.role === 'admin' ? (
                // 관리자 메뉴
                <>
                  <li>
                    <Link to="/admin">관리자 홈</Link>
                  </li>
                  <li>
                    <Link to="/admin/organizations">기관 관리</Link>
                  </li>
                  <li>
                    <Link to="/admin/licenses">라이선스 관리</Link>
                  </li>
                  <li>
                    <Link to="/admin/loans">구독 관리</Link>
                  </li>
                </>
              ) : (
                // 사용자 메뉴
                <>
                  <li>
                    <Link to="/dashboard">홈</Link>
                  </li>
                  <li>
                    <Link to="/licenses">라이선스 목록</Link>
                  </li>
                  <li>
                    <Link to="/loans">내 구독 내역</Link>
                  </li>
                  <li>
                    <Link to="/change-password">비밀번호 변경</Link>
                  </li>
                </>
              )}
              <li>
                <span style={{ color: '#fff', padding: '5px 10px' }}>
                  {user.name}님 ({user.role === 'admin' ? '관리자' : '사용자'})
                </span>
              </li>
              <li>
                <button 
                  onClick={onLogout}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer',
                    padding: '5px 10px'
                  }}
                >
                  로그아웃
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link 
                  to="/admin-login"
                  style={{ 
                    color: '#fff', 
                    textDecoration: 'none', 
                    fontSize: '18px',
                    opacity: 0.7,
                    padding: '5px 10px'
                  }}
                  title="관리자 로그인"
                >
                  ⚙️
                </Link>
              </li>
              <li>
                <Link to="/login">로그인</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;