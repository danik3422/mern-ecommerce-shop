import axios from 'axios'
import { useEffect, useState } from 'react'
import { popularProducts } from '../../data'
import Product from '../Product/Product'
import style from './Products.module.css'

const Products = ({ category, filters, sort }) => {
	const [products, setProducts] = useState([])
	const [filteredProducts, setFilteredProducts] = useState([])

	useEffect(() => {
		const getProducts = async () => {
			try {
				const res = await axios.get('http://localhost:500/api/products')
			} catch (err) {}
		}
	}, [category])

	return (
		<div className={style.container}>
			{popularProducts.map((item) => (
				<Product item={item} key={item.id} />
			))}
		</div>
	)
}

export default Products
