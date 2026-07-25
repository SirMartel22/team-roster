import { useState, useContext } from 'react'
import { AuthProvider } from './context/AuthProvider';
import { AuthContext } from './context/authContext';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { Dashboard } from './components/Dashboard';
import './auth.css';



const AppContent = () => {
  const { user, isInitializing } = useContext(AuthContext);

  //Track whether we're showing the login login form or the signup form,
  //when the user isn't logged in yet.
  const [showSignup, setShowSignup] = useState(false);

  // NEW: while we're still checking localStorage/validating the token,
  // show a simple loading state instead of prematurely showing the
  // login form (which would just flash and then disappear).

  if(isInitializing){
    return <div style={{ padding: '2rem', textAlign: 'center'}}>Loading...</div>;
  }
  if(user){
    return <Dashboard />
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-content">
          {showSignup ? (
            <SignupForm onSignupComplete={() => setShowSignup(false)} />
          ) : (
            <LoginForm />
          )}

          <div className="auth-toggle">
            {showSignup ? (
              <>
                <span>Already have an account?</span>
                <button type="button" onClick={() => setShowSignup(false)}>
                  Log in
                </button>
              </>
            ) : (
              <>
                <span>Need an account?</span>
                <button type="button" onClick={() => setShowSignup(true)}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 

const App = () => {
  return(
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}


export default App