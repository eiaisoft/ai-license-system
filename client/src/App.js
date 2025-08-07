import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './config'; // 이 줄 추가!
import Navbar from './components/Navbar';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import ChangePassword from './components/ChangePassword';
import AdminHome from './components/AdminHome';
import AdminLicenseList from './components/AdminLicenseList';
import AdminOrganizations from './components/AdminOrganizations';
import AdminLoanManagement from './components/AdminLoanManagement';
import UserHome from './components/UserHome';
import LicenseList from './components/LicenseList';
import LoanHistory from './components/LoanHistory';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // 최초 로그인인 경우 비밀번호 변경 화면 표시
    if (userData.isFirstLogin) {
      setShowChangePassword(true);
    }
  };

  const logout = () => {
    setUser(null);
    setShowChangePassword(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    // 사용자 정보 업데이트
    const updatedUser = { ...user, isFirstLogin: false };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return <div className="container text-center">로딩 중...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={logout} />
        <div className="container">
          {showChangePassword ? (
            <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />
          ) : (
            <Routes>
              {/* 메인 페이지 - 역할에 따라 리다이렉트 */}
              <Route 
                path="/" 
                element={
                  user ? (
                    user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
                  ) : (
                    <Navigate to="/login" />
                  )
                } 
              />

              {/* 관리자 라우트 */}
              <Route 
                path="/admin" 
                element={user && user.role === 'admin' ? <AdminHome user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin/licenses" 
                element={user && user.role === 'admin' ? <AdminLicenseList user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin/organizations" 
                element={user && user.role === 'admin' ? <AdminOrganizations user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin/loans" 
                element={user && user.role === 'admin' ? <AdminLoanManagement user={user} /> : <Navigate to="/" />} 
              />

              {/* 사용자 라우트 */}
              <Route 
                path="/dashboard" 
                element={user && user.role !== 'admin' ? <UserHome user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/licenses" 
                element={user && user.role !== 'admin' ? <LicenseList user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/loans" 
                element={user && user.role !== 'admin' ? <LoanHistory user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/change-password" 
                element={user ? <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} /> : <Navigate to="/login" />} 
              />

              {/* 로그인 라우트 */}
              <Route 
                path="/login" 
                element={user ? <Navigate to="/" /> : <Login onLogin={login} />} 
              />
              <Route 
                path="/admin-login" 
                element={user ? <Navigate to="/" /> : <AdminLogin onLogin={login} />} 
              />
            </Routes>
          )}
        </div>
      </div>
    </Router>
  );
}

export default App;