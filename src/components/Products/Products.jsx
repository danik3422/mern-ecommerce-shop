import { useEffect, useMemo, useState } from 'react'
import { api, getErrorMessage } from '../../api'
import Product from '../Product/Product'
import style from './Products.module.css'

const sorters = {
	newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
	asc: (a, b) => a.price - b.price,
	desc: (a, b) => b.price - a.price,
}

const matches = (values = [], wanted) =>
	!wanted || values.some((v) => v.toLowerCase() === wanted.toLowerCase())

const Products = ({ category, filters = {}, sort = 'newest', limit }) => {
	const [products, setProducts] = useState([])
	const [status, setStatus] = useState('loading')
	const [error, setError] = useState('')

	useEffect(() => {
		const controller = new AbortController()
		setStatus('loading')
		api
			.get('/products', { params: category ? { category } : {}, signal: controller.signal })
			.then(({ data }) => {
				setProducts(data)
				setStatus('done')
			})
			.catch((err) => {
				if (controller.signal.aborted) return
				setError(getErrorMessage(err))
				setStatus('error')
			})
		return () => controller.abort()
	}, [category])

	const visible = useMemo(() => {
		const list = products
			.filter((p) => matches(p.color, filters.color) && matches(p.size, filters.size))
			.sort(sorters[sort] || sorters.newest)
		return limit ? list.slice(0, limit) : list
	}, [products, filters.color, filters.size, sort, limit])

	if (status === 'loading') return <p className={style.message}>Loading products…</p>
	if (status === 'error')
		return <p className={style.message}>Could not load products: {error}</p>
	if (!visible.length) return <p className={style.message}>No products found.</p>

	return (
		<div className={style.container}>
			{visible.map((item) => (
				<Product item={item} key={item._id} />
			))}
		</div>
	)
}

export default Products
