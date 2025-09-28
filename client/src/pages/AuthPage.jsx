// src/pages/AuthPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css'; // Quan trọng: Đảm bảo bạn sẽ cập nhật file CSS này

export default function AuthPage() {
  const [isRegisterActive, setIsRegisterActive] = useState(false);
  const navigate = useNavigate();

  // State và handlers cho Form Đăng nhập
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState('');
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

    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role); // lưu role

    alert('Đăng nhập thành công!');

    // Chuyển trang theo role
    if (user.role === 'admin') {
      navigate('/admin'); // admin panel
    } else {
      navigate('/'); // user thường
    }

  } catch (err) {
    setLoginError(err.response?.data?.msg || 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }
};
  
  // State và handlers cho Form Đăng ký
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [registerError, setRegisterError] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
    setRegisterError('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

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
      <div 
        className={`auth-page__container ${isRegisterActive ? 'auth-page__container--register-active' : ''}`} 
        id="container"
      >
        
        {/* ======================= */}
        {/* == FORM ĐĂNG KÝ == */}
        {/* ======================= */}
        <div className="auth-page__form-container auth-page__form-container--register">
          <form className="auth-page__form" onSubmit={handleRegisterSubmit}>
            <h1 className="auth-page__title">Create Account</h1>
            <div className="auth-page__social-container">
                <div className="auth-page__social-icon" onClick={googleLogin}><i className="fab fa-google"></i></div>
                <div className="auth-page__social-icon"><i className="fab fa-facebook-f"></i></div>
                <div className="auth-page__social-icon"><i className="fab fa-github"></i></div>
            </div>
            <span className="auth-page__subtitle">or use your email for registration</span>

            <input className="auth-page__input" name="username" placeholder="Username (3-20 characters)" minLength="3" maxLength="20" value={registerForm.username} onChange={handleRegisterChange} required />
            <input className="auth-page__input" type="email" name="email" placeholder="Email (max 60 characters)" maxLength="60" value={registerForm.email} onChange={handleRegisterChange} required />
            
            <div className="auth-page__password-wrapper">
              <input className="auth-page__input" type={showRegisterPassword ? 'text' : 'password'} name="password" placeholder="Password (8-20 characters)" minLength="8" maxLength="20" value={registerForm.password} onChange={handleRegisterChange} required />
              <i className={`fa auth-page__password-toggle-icon ${showRegisterPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowRegisterPassword(!showRegisterPassword)}></i>
            </div>
            
            <div className="auth-page__password-wrapper">
              <input className="auth-page__input" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Confirm Password" value={registerForm.confirmPassword} onChange={handleRegisterChange} required />
              <i className={`fa auth-page__password-toggle-icon ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}></i>
            </div>
            
            {registerError && <p className="auth-page__error-message">{registerError}</p>}
            <button className="auth-page__button" type="submit" style={{marginTop: '10px'}}>Register</button>
          </form>
        </div>

        {/* ======================= */}
        {/* == FORM ĐĂNG NHẬP == */}
        {/* ======================= */}
        <div className="auth-page__form-container auth-page__form-container--login">
          <form className="auth-page__form" onSubmit={handleLoginSubmit}>
            <h1 className="auth-page__title">Login</h1>
            <div className="auth-page__social-container">
                <div className="auth-page__social-icon" onClick={googleLogin}><i className="fab fa-google"></i></div>
                <div className="auth-page__social-icon"><i className="fab fa-facebook-f"></i></div>
                <div className="auth-page__social-icon"><i className="fab fa-github"></i></div>
            </div>
            <span className="auth-page__subtitle">or use your account</span>
            <input className="auth-page__input" name="identifier" placeholder="Username or Email" value={loginForm.identifier} onChange={handleLoginChange} required/>
            
            <div className="auth-page__password-wrapper">
              <input className="auth-page__input" type={showLoginPassword ? 'text' : 'password'} name="password" placeholder="Password" value={loginForm.password} onChange={handleLoginChange} required/>
              <i className={`fa auth-page__password-toggle-icon ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => setShowLoginPassword(!showLoginPassword)}></i>
            </div>

            <a className="auth-page__link" href="#">Forgot your password?</a>
            {loginError && <p className="auth-page__error-message">{loginError}</p>}
            <button className="auth-page__button" type="submit">Login</button>
          </form>
        </div>
        
        {/* ======================= */}
        {/* == PANEL TRƯỢT (OVERLAY) == */}
        {/* ======================= */}
        <div className="auth-page__overlay-container">
          <div className="auth-page__overlay">
            <div className="auth-page__overlay-panel auth-page__overlay-panel--left">
              <h1 className="auth-page__panel-title">Welcome Back!</h1>
              <p className="auth-page__panel-subtitle">Already have an account? Login and enjoy the music!</p>
              <button className="auth-page__button auth-page__button--ghost" onClick={() => setIsRegisterActive(false)}>Login</button>
            </div>
            <div className="auth-page__overlay-panel auth-page__overlay-panel--right">
              <h1 className="auth-page__panel-title">Welcome, SoundSpace</h1>
              <p className="auth-page__panel-subtitle">
                Don't have an account?
                <br />
                Enter your details and start your journey with us
              </p>
              <button className="auth-page__button auth-page__button--ghost" onClick={() => setIsRegisterActive(true)}>Register</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}