import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { load, save } from '../utils/storage'

const CartContext = createContext(null)

// Same product in a different color/size is a separate cart line.
const lineKey = (item) => `${item._id}|${item.color || ''}|${item.size || ''}`

export const CartProvider = ({ children }) => {
	const [items, setItems] = useState(() => load('cart', []))

	useEffect(() => save('cart', items), [items])

	const addItem = useCallback((product, { color, size, quantity = 1 }) => {
		setItems((prev) => {
			const key = lineKey({ _id: product._id, color, size })
			const existing = prev.find((i) => i.key === key)
			if (existing) {
				return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i))
			}
			const { _id, title, img, price } = product
			return [...prev, { key, _id, title, img, price, color, size, quantity }]
		})
	}, [])

	const setQuantity = useCallback((key, quantity) => {
		setItems((prev) =>
			quantity <= 0
				? prev.filter((i) => i.key !== key)
				: prev.map((i) => (i.key === key ? { ...i, quantity } : i))
		)
	}, [])

	const clear = useCallback(() => setItems([]), [])

	const value = useMemo(
		() => ({
			items,
			count: items.reduce((sum, i) => sum + i.quantity, 0),
			total: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
			addItem,
			setQuantity,
			clear,
		}),
		[items, addItem, setQuantity, clear]
	)

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
