import { useContext } from 'react'
import { ToastContext } from './ToastContext'

const noop = { show: () => {} }

/**
 * `const toast = useToast(); toast.show({ message: 'Saved', tone: 'success' })`
 * Outside a ToastProvider (e.g. isolated component tests) calls are ignored.
 */
export const useToast = () => useContext(ToastContext) ?? noop
