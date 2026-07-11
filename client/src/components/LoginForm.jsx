import { useState, useContext } from 'react';
import { AuthContext } from '../context/authContext'

export const LoginForm = () => {
  const { login, isLoading, error } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if(!email || !password) {
            setLocalError("Email and password are required");
            return;
        }

        try {
            await login(email, password);
            // On success, AuthContext is updated, and the app can react to it
            // (e.g., redirect to dashboard)

        }  catch(error){
            setLocalError(error.message);
        }
    }

     return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Login</h2>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      {localError && <div style={{ color: 'red', marginBottom: '1rem' }}>{localError}</div>}

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Email:
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Password:
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.75rem' }}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}