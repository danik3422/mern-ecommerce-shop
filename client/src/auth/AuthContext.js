import { createContext } from 'react'

/** @type {React.Context<{ user, login, register, logout, updateUser } | null>} */
export const AuthContext = createContext(null)
