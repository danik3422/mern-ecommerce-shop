import { Link } from 'react-router'
import { useFacets } from '../../hooks/useProducts'
import style from './BrandStrip.module.css'

const ALL_PRODUCTS = {}

/** Every brand in the shop, each linking to its filtered catalog. */
const BrandStrip = () => {
	const { data } = useFacets(ALL_PRODUCTS)
	if (!data?.brands.length) return null

	return (
		<ul role='list' className={style.brands}>
			{data.brands.map(({ value, count }) => (
				<li key={value}>
					<Link to={`/products?brand=${encodeURIComponent(value)}`} className={style.brand}>
						{value}
						<span className={style.count}>
							{count} <span className='visually-hidden'>products</span>
						</span>
					</Link>
				</li>
			))}
		</ul>
	)
}

export default BrandStrip
