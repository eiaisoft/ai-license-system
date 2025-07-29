import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand">
          AI 라이선스 대출 시스템
        </Link>
        
        <ul className="navbar-nav">
          {user ? (
            <>
              <li>
                <Link to="/">라이선스 목록</Link>
              </li>
              <li>
                <Link to="/loans">대출 내역</Link>
              </li>
              <li>
                <span style={{ color: '#fff', padding: '5px 10px' }}>
                  {user.name}님
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