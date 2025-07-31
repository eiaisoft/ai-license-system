import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import LicenseList from './components/LicenseList';
import LoanHistory from './components/LoanHistory';
import ChangePassword from './components/ChangePassword';
import AdminHome from './components/AdminHome';
import AdminLicenseList from './components/AdminLicenseList';
import AdminLoanHistory from './components/AdminLoanHistory';
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
              <Route 
                path="/" 
                element={user ? <LicenseList user={user} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/admin" 
                element={user && user.role === 'admin' ? <AdminHome user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin/licenses" 
                element={user && user.role === 'admin' ? <AdminLicenseList user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin/loans" 
                element={user && user.role === 'admin' ? <AdminLoanHistory user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/login" 
                element={user ? <Navigate to="/" /> : <Login onLogin={login} />} 
              />
              <Route 
                path="/loans" 
                element={user ? <LoanHistory user={user} /> : <Navigate to="/login" />} 
              />
            </Routes>
          )}
        </div>
      </div>
    </Router>
  );
}

export default App; 