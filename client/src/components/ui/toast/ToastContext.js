import { createContext } from 'react'

/** @type {React.Context<{ show: (toast: { message, tone?, action? }) => void } | null>} */
export const ToastContext = createContext(null)
