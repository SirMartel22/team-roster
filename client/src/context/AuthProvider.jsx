import { useState, useCallback } from 'react'
import { AuthContext } from './authContext'


export const AuthProvider = ({ children }) => {

    // token: the JWT returned from login, stored in memory (not persistent yet)
  // user: the user object returned from login (id, email, name, role, etc.)
    const [token, setToken ] = useState(null);
    const [user, setUser ] = useState(null);
    const [isLoading, setIsLoading ] = useState(false);
    const [ error, setError ] = useState(null)


    // Login function - calls auth-service's /login endpoint
    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        setError(null);
        try{
            const response = await fetch(
                `${import.meta.env.VITE_AUTH_SERVICE_URL}/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password}),
                }
            );

            if(!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Login failed');
            }

            const data = await response.json();

            // Store the token and user info in state
            setToken(data.token);
            setUser(data.user)

        } catch (error) {
            setError(error.message);
            throw error; //re-throw the error so the caller knows it failed
        } finally {
            setIsLoading(false)
        }
    }, []);

    // logout function - clear token and user from state
    const logout = useCallback(() => {
        setToken(null);
        setUser(null)
        setError(null)
    }, [])

    const value = { token, user, isLoading, error, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )

}
