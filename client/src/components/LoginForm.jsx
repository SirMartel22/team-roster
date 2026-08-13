import { useState, useContext } from 'react';
import { AuthContext } from '../context/authContext';

export const LoginForm = () => {
  const { login, isLoading, error } = useContext(AuthContext);
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!workspaceSlug || !email || !password) {
      setLocalError('Workspace, email and password are required');
      return;
    }

    try {
      await login(workspaceSlug, email, password);
    } catch (error) {
      setLocalError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-header">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to your workspace</h1>
        <p className="auth-subtitle">
          Access your teams, unit assignments, task plans and work schedules.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {localError && <div className="auth-error">{localError}</div>}

      <div className="auth-input-group">
        <label htmlFor="workspaceSlug">Workspace</label>
        <input
          id="workspaceSlug"
          value={workspaceSlug}
          onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase())}
          disabled={isLoading}
          className="auth-input"
          placeholder="e.g. bhbc-media"
          autoComplete="organization"
        />
      </div>

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
