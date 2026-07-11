import { createContext } from 'react'

// AuthContext holds login state and the token across the entire app.
// Instead of passing props down through 10 levels of components,

export const AuthContext = createContext(null);
