// src/pages/AuthPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css'; // Quan trọng: Import file CSS để áp dụng hiệu ứng

export default function AuthPage() {
  const [isRegisterActive, setIsRegisterActive] = useState(false);
  const navigate = useNavigate();

  // State và handlers cho Form Đăng nhập
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState('');
  // THÊM MỚI: State để hiện/ẩn mật khẩu form Đăng nhập
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    setLoginError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8800/api/auth/login', {
        identifier: loginForm.identifier,
        password: loginForm.password,
      });
      localStorage.setItem('token', res.data.token);
      alert('Đăng nhập thành công!');
      navigate('/');
    } catch (err) {
      setLoginError(err.response?.data?.msg || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };
  
  // State và handlers cho Form Đăng ký
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [registerError, setRegisterError] = useState('');
  // THÊM MỚI: State để hiện/ẩn mật khẩu form Đăng ký
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
    setRegisterError('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    // CẬP NHẬT: Thêm validation theo yêu cầu
    const { username, email, password, confirmPassword } = registerForm;
    if (username.length < 3 || username.length > 20) {
        setRegisterError('Username phải có từ 3–20 ký tự.');
        return;
    }
    if (email.length > 60) {
        setRegisterError('Email không được vượt quá 60 ký tự.');
        return;
    }
    if (password.length < 8 || password.length > 20) {
        setRegisterError('Mật khẩu phải có từ 8–20 ký tự.');
        return;
    }
    if (password !== confirmPassword) {
        setRegisterError('Mật khẩu xác nhận không khớp!');
        return;
    }

    try {
      const res = await axios.post('http://localhost:8800/api/auth/register', registerForm);
      alert(res.data.msg);
      setIsRegisterActive(false);
    } catch (err) {
      setRegisterError(err.response?.data?.msg || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const googleLogin = () => {
    window.location.href = 'http://localhost:8800/api/auth/google';
  };

  return (
    <div className="auth-page">
      <div className={`container ${isRegisterActive ? 'right-panel-active' : ''}`} id="container">
        
        {/* ======================= */}
        {/* == FORM ĐĂNG KÝ == */}
        {/* ======================= */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Create Account</h1>
            <div className="social-container">
               <div className="social" onClick={googleLogin}><i className="fab fa-google"></i></div>
               <div className="social"><i className="fab fa-facebook-f"></i></div>
               <div className="social"><i className="fab fa-github"></i></div>
            </div>
            <span>or use your email for registration</span>

            {/* CẬP NHẬT: Thêm minLength, maxLength */}
            <input name="username" placeholder="Username (3-20 characters)" minLength="3" maxLength="20" value={registerForm.username} onChange={handleRegisterChange} required />
            <input type="email" name="email" placeholder="Email (max 60 characters)" maxLength="60" value={registerForm.email} onChange={handleRegisterChange} required />
            
            {/* CẬP NHẬT: Thêm chức năng hiện/ẩn mật khẩu */}
            <div className="password-input-wrapper">
              <input type={showRegisterPassword ? 'text' : 'password'} name="password" placeholder="Password (8-20 characters)" minLength="8" maxLength="20" value={registerForm.password} onChange={handleRegisterChange} required />
              <i className={`fa ${showRegisterPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowRegisterPassword(!showRegisterPassword)}></i>
            </div>
            
            <div className="password-input-wrapper">
              <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Confirm Password" value={registerForm.confirmPassword} onChange={handleRegisterChange} required />
              <i className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}></i>
            </div>
            
            {registerError && <p className="error-message">{registerError}</p>}
            <button type="submit" style={{marginTop: '10px'}}>Register</button>
          </form>
        </div>

        {/* ======================= */}
        {/* == FORM ĐĂNG NHẬP == */}
        {/* ======================= */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleLoginSubmit}>
            <h1>Login</h1>
            <div className="social-container">
               <div className="social" onClick={googleLogin}><i className="fab fa-google"></i></div>
               <div className="social"><i className="fab fa-facebook-f"></i></div>
               <div className="social"><i className="fab fa-github"></i></div>
            </div>
            <span>or use your account</span>
            <input name="identifier" placeholder="Username or Email" value={loginForm.identifier} onChange={handleLoginChange} required/>
            
            {/* CẬP NHẬT: Thêm chức năng hiện/ẩn mật khẩu */}
            <div className="password-input-wrapper">
              <input type={showLoginPassword ? 'text' : 'password'} name="password" placeholder="Password" value={loginForm.password} onChange={handleLoginChange} required/>
              <i className={`fa ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowLoginPassword(!showLoginPassword)}></i>
            </div>

            <a href="#">Forgot your password?</a>
            {loginError && <p className="error-message">{loginError}</p>}
            <button type="submit">Login</button>
          </form>
        </div>
        
        {/* ======================= */}
        {/* == PANEL TRƯỢT (OVERLAY) == */}
        {/* ======================= */}
        <div className="overlay-container">
          {/* ... Phần này không thay đổi ... */}
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1 className="panel__title">Welcome Back!</h1>
              <p className="panel__subtitle">Already have an account? Login and enjoy the music!</p>
              <button className="ghost" onClick={() => setIsRegisterActive(false)}>Login</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1 className="panel__title">Welcome, SoundSpace</h1>
              <p className="panel__subtitle">
                Don't have an account?
                <br />
                Enter your details and start your journey with us
              </p>
              <button className="ghost" onClick={() => setIsRegisterActive(true)}>Register</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}