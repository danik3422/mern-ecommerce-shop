import { http } from './client'

/** @param order `{ items: [{ productId, quantity, color?, size? }], address }` */
export const createOrder = (order) => http.post('/orders', order).then((r) => r.data)
