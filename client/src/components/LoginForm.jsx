import { useState, useContext } from 'react';
import { AuthContext } from '../context/authContext';

export const LoginForm = () => {
  const { login, isLoading, error } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      setLocalError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-header">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to roster management</h1>
        <p className="auth-subtitle">
          Access your church member roster, subunit assignments, and duty schedules.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {localError && <div className="auth-error">{localError}</div>}

      <div className="auth-input-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="auth-input"
        />
      </div>

      <div className="auth-actions-row">
        <span className="auth-hint">Remember me</span>
        <button type="button" className="link-button">
          Forgot password?
        </button>
      </div>

      <button type="submit" disabled={isLoading} className="auth-button">
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};