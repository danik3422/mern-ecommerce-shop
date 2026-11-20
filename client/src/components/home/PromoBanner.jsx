import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { SALE_CATEGORY } from '../../data/catalog'
import { cx } from '../../utils/cx'
import style from './PromoBanner.module.css'

/** Full-width sale announcement. */
const PromoBanner = () => (
	<section className={style.banner} aria-label='Sale'>
		<div className={cx('container', style.inner)}>
			<div>
				<p className={style.eyebrow}>Mid-season sale</p>
				<p className={style.title}>Up to 30% off selected styles</p>
			</div>
			<Link to={`/products/${SALE_CATEGORY}`} className={style.link}>
				Shop the sale <ArrowRight size={16} aria-hidden />
			</Link>
		</div>
	</section>
)

export default PromoBanner
