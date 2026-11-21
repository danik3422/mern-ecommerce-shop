import { createContext } from 'react'

/** @type {React.Context<((options) => Promise<boolean>) | null>} */
export const ConfirmContext = createContext(null)
