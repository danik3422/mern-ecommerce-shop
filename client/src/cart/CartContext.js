import { createContext } from 'react'

/** @type {React.Context<{ lines, count, addItem, setQuantity, removeProducts, clear } | null>} */
export const CartContext = createContext(null)
