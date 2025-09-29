import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { SignupRequest } from '../types/auth.types';
import './SignupPage.css';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupRequest>({
    email: '',
    password: '',
    nickname: '',
  });
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.nickname || !confirmPassword) {
      setError('모든 항목을 입력해주세요');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('올바른 이메일 형식이 아닙니다');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return false;
    }
    
    if (formData.password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return false;
    }
    
    if (formData.nickname.length < 2) {
      setError('닉네임은 2자 이상이어야 합니다');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await authService.signup(formData);
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('회원가입 중 오류가 발생했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider: string) => {
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

  return (
    <div className="auth-container-split">
      {/* Left Panel - Design Section */}
      <div className="auth-left-panel">
        <div className="brand-logo-top">
          <span className="brand-icon">✈️</span>
          <h1 className="brand-name">Compass</h1>
        </div>
        
        <div className="panel-container">
          <div className="brand-content">
            <h2 className="brand-title"><span className="ai-text">AI</span>와 함께하는<br/>여행 계획</h2>
            <p className="brand-description">
              Compass와 함께 AI가 계획하는 완벽한 여행,<br/>
              잊지 못할 추억을 만들어보세요.<br/>
              전 세계 어디서든 당신의 여행을 더 특별하게 만들어 드립니다.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Compass에 오신 것을 환영합니다</h2>
            <p className="auth-subtitle">계정에 로그인하거나 새 계정을 만들어보세요</p>
          </div>

          <div className="auth-tabs">
            <Link to="/login" className="tab-button">로그인</Link>
            <button className="tab-button active">회원가입</button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일 주소"
              className="form-input"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="닉네임 (2자 이상)"
              className="form-input"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호 (8자 이상)"
              className="form-input"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호 확인"
              className="form-input"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="terms">
            <label className="terms-checkbox">
              <input type="checkbox" required />
              <span>
                <Link to="/terms" className="terms-link">이용약관</Link> 및 
                <Link to="/privacy" className="terms-link"> 개인정보처리방침</Link>에 동의합니다
              </span>
            </label>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

          <div className="social-divider">
            <span>소셜 계정으로 로그인</span>
          </div>

          <div className="social-buttons">
            <button 
              type="button"
              onClick={() => handleSocialSignup('kakao')} 
              className="social-button kakao"
            >
              <span className="kakao-icon">K</span>
            </button>
            <button 
              type="button"
              onClick={() => handleSocialSignup('naver')} 
              className="social-button naver"
            >
              <span className="naver-icon">N</span>
            </button>
            <button 
              type="button"
              onClick={() => handleSocialSignup('google')} 
              className="social-button google"
            >
              <svg className="social-icon" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64,9.205c0-0.639-0.057-1.252-0.164-1.841H9v3.481h4.844c-0.209,1.125-0.843,2.078-1.796,2.717v2.258h2.908C16.658,14.205,17.64,11.909,17.64,9.205z"/>
                <path fill="#34A853" d="M9,18c2.43,0,4.467-0.806,5.956-2.18l-2.908-2.258c-0.806,0.54-1.837,0.86-3.048,0.86c-2.344,0-4.328-1.584-5.036-3.711H0.957v2.332C2.438,15.983,5.482,18,9,18z"/>
                <path fill="#FBBC05" d="M3.964,10.71c-0.18-0.54-0.282-1.117-0.282-1.71s0.102-1.17,0.282-1.71V4.958H0.957C0.347,6.173,0,7.548,0,9s0.347,2.827,0.957,4.042L3.964,10.71z"/>
                <path fill="#EA4335" d="M9,3.58c1.321,0,2.508,0.454,3.44,1.345l2.582-2.58C13.463,0.891,11.426,0,9,0C5.482,0,2.438,2.017,0.957,4.958L3.964,7.29C4.672,5.163,6.656,3.58,9,3.58z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;