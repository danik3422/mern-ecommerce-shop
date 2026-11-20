import { Link } from 'react-router'
import { useFacets } from '../../hooks/useProducts'
import style from './BrandStrip.module.css'
import { useI18n } from '../../i18n/useI18n'

const ALL_PRODUCTS = {}

/** Every brand in the shop, each linking to its filtered catalog. */
const BrandStrip = () => {
	const { data } = useFacets(ALL_PRODUCTS)
	const { t } = useI18n()
	if (!data?.brands.length) return null

	return (
		<ul role='list' className={style.brands}>
			{data.brands.map(({ value, count }) => (
				<li key={value}>
					<Link to={`/products?brand=${encodeURIComponent(value)}`} className={style.brand}>
						{value}
						<span className={style.count}>
							<span aria-hidden>{count}</span>
							<span className='visually-hidden'>{t('common.products', { count })}</span>
						</span>
					</Link>
				</li>
			))}
		</ul>
	)
}

export default BrandStrip
