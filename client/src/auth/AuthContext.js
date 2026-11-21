import { createContext } from 'react'

/** @type {React.Context<{ user, isRestoring, login, loginAsDemo, register, logout, updateUser } | null>} */
export const AuthContext = createContext(null)
