import { useContext } from 'react'
import { AuthProvider } from './context/AuthProvider';
import { AuthContext } from './context/authContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';


const AppContent = () => {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ fontfamily: 'sans-serif'}}>
      {user ? <Dashboard /> : <LoginForm/>}
    </div>
  );
} 

const App = () => {
  return(
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}


export default App