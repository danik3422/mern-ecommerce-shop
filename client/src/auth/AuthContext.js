import { createContext } from 'react'

/** @type {React.Context<{ user, login, register, logout } | null>} */
export const AuthContext = createContext(null)
