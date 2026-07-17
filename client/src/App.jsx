import { useState, useContext } from 'react'
import { AuthProvider } from './context/AuthProvider';
import { AuthContext } from './context/authContext';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { Dashboard } from './components/Dashboard';



const AppContent = () => {
  const { user } = useContext(AuthContext);

  //Track whether we're showing the login login form or the signup form,
  //when the user isn't logged in yet.
  const [showSignup, setShowSignup] = useState(false)

  if(user){
    return <Dashboard />
  }

  // return (
  //   <div style={{ fontfamily: 'sans-serif'}}>
  //     {user ? <Dashboard /> : <LoginForm/>}
  //   </div>
  // );
  return (
     <div style={{ fontFamily: 'sans-serif' }}>
        {showSignup ? (
          <>
            <SignupForm onSignupComplete={() => setShowSignup(false)} />
            <p style={{ textAlign: 'center' }}>
              Already have an account?{' '}
              <button onClick={() => setShowSignup(false)}>Log in</button>
            </p>
          </>
        ) : (
          <>
            <LoginForm />
            <p style={{ textAlign: 'center' }}>
              Need an account?{' '}
              <button onClick={() => setShowSignup(true)}>Sign up</button>
            </p>
          </>
        )}
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