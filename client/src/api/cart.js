import { http } from './client'

export const fetchCart = () => http.get('/cart').then((r) => r.data.items)

export const saveCart = (items) => http.put('/cart', { items }).then((r) => r.data.items)
